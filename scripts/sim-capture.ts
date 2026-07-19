// Balance simulation for the capture ("bump") rule. Plays full auto-games with the
// REAL engine to tune CAPTURE_KNOCKBACK and decide whether a catch-up rule is needed.
//
// Run: npx vite-node scripts/sim-capture.ts
//
// Bots model a vocabulary gap via `maxLen` (the longest word they can produce):
// strong bots also play tactically (grab ladders, dodge snakes, aim bumps); weak
// bots just move as far as their vocabulary allows. Deterministic: a seeded PRNG
// drives every board and word choice, so results are reproducible run to run.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { buildWordList } from '../src/dictionary/buildWordList.mjs'
import { generateBoard } from '../src/board/board'
import { submitWord } from '../src/engine/submitWord'
import { resolveSnakeEscape } from '../src/engine/resolveSnakeEscape'
import { findLadder, findSnake, MIN_WORD_LENGTH, RESCUE_NEED_CAP } from '../src/engine/helpers'
import type { Dictionary, GameState, PlayerState } from '../src/engine/types'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p: string) => readFileSync(resolve(root, 'src/dictionary', p), 'utf8')
const words = buildWordList(read('enable.txt'), read('extra-words.txt'), read('denylist.txt'))

// ---- word indexes -------------------------------------------------------------
const MAXLEN_IDX = 12
const byStartLen = new Map<string, Map<number, string[]>>() // 'A' -> 5 -> [...]
const byLen = new Map<number, string[]>() // 5 -> [...] (any start; first move / rescue)
for (const raw of words) {
  const w = raw.toUpperCase()
  const len = w.length
  if (len < MIN_WORD_LENGTH || len > MAXLEN_IDX) continue
  const s = w[0]
  if (!byStartLen.has(s)) byStartLen.set(s, new Map())
  const m = byStartLen.get(s)!
  if (!m.has(len)) m.set(len, [])
  m.get(len)!.push(w)
  if (!byLen.has(len)) byLen.set(len, [])
  byLen.get(len)!.push(w)
}

// ---- seeded PRNG (mulberry32) -------------------------------------------------
function makePrng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A permissive dictionary — the bots only ever submit words drawn from the real
// list, so validity is guaranteed; this just satisfies the engine's isValid gate.
const dict: Dictionary = { isValid: () => true, version: 'sim' }

// Pick an unused word of a given (start, length); random sampling then scan.
function pickWord(start: string | null, len: number, used: Set<string>, rng: () => number): string | null {
  const pool = start ? byStartLen.get(start)?.get(len) : byLen.get(len)
  if (!pool || pool.length === 0) return null
  for (let i = 0; i < 24; i++) {
    const w = pool[Math.floor(rng() * pool.length)]
    if (!used.has(w)) return w
  }
  for (const w of pool) if (!used.has(w)) return w
  return null
}

type Bot = { maxLen: number; tactical: boolean }

// Choose a chain word for the acting player. Returns the word, or null if the bot
// cannot produce any legal word (→ forfeit).
function chooseChainWord(state: GameState, bot: Bot, rng: () => number): string | null {
  const player = state.players[state.currentPlayerIndex]
  const used = new Set(state.usedWords)
  const letter = state.requiredLetter
  const leader = Math.max(...state.players.filter((p) => p.id !== player.id).map((p) => p.square))
  const occupied = new Set(state.players.filter((p) => p.id !== player.id).map((p) => p.square))

  type Cand = { word: string; score: number }
  const cands: Cand[] = []
  for (let len = MIN_WORD_LENGTH; len <= bot.maxLen; len++) {
    const word = pickWord(letter, len, used, rng)
    if (!word) continue
    const dest = player.square + len
    const snake = findSnake(state.board, dest)
    let score: number
    if (dest >= state.board.length) score = 1e9 // win
    else if (findLadder(state.board, dest)) score = dest + 40 // ladder: big boost
    else if (snake) score = dest - (snake.head - snake.tail) * 3 // avoid
    else if (state.capture && occupied.has(dest) && dest <= leader) score = dest + 30 // bump a leader
    else score = dest
    cands.push({ word, score })
  }
  if (cands.length === 0) return null
  if (!bot.tactical) {
    // Weak bot: just move as far as its vocabulary allows (longest word), ignoring tactics.
    return cands[cands.length - 1].word
  }
  cands.sort((a, b) => b.score - a.score)
  return cands[0].word
}

// Choose a rescue word (length >= need, any start), or null to give up.
function chooseRescue(state: GameState, bot: Bot, rng: () => number): string | null {
  const esc = state.pendingEscape!
  const need = esc.need ?? Math.min(esc.drop, RESCUE_NEED_CAP)
  const used = new Set(state.usedWords)
  for (let len = need; len <= bot.maxLen; len++) {
    const w = pickWord(null, len, used, rng)
    if (w) return w
  }
  return null // can't meet the requirement → slide
}

type GameResult = { winner: number | null; margin: number; captures: number; turns: number }

function playGame(seed: number, boardLength: 30 | 50 | 100, bots: Bot[], knockback: number, catchup: boolean): GameResult {
  const rng = makePrng(seed)
  const board = generateBoard(`sim-${seed}`, boardLength)
  let state: GameState = {
    board, timer: 'off',
    players: bots.map((_, i) => ({ id: `p${i}`, name: `p${i}`, color: 'c', emblem: 'e', square: 0 } as PlayerState)),
    currentPlayerIndex: 0, requiredLetter: null, usedWords: [], phase: 'awaiting-word',
    pendingEscape: null, winnerId: null, lastWord: null, dictVersion: 'sim',
    capture: knockback > 0, // knockback 0 encodes "capture off"
  }
  let captures = 0
  let turns = 0
  const MAX_TURNS = 4000
  while (state.phase !== 'won' && turns < MAX_TURNS) {
    turns++
    if (state.phase === 'awaiting-escape') {
      const bot = bots[state.players.findIndex((p) => p.id === state.pendingEscape!.playerId)]
      const w = chooseRescue(state, bot, rng)
      const r = resolveSnakeEscape(state, w, dict)
      if (!r.ok) { state = { ...state, phase: 'won', winnerId: state.pendingEscape!.playerId }; break } // defensive
      state = r.next
      continue
    }
    const idx = state.currentPlayerIndex
    const bot = bots[idx]
    const word = chooseChainWord(state, bot, rng)
    if (!word) {
      // forfeit: advance to next player without moving
      state = { ...state, currentPlayerIndex: (idx + 1) % state.players.length }
      continue
    }
    // Apply the knockback magnitude for this run by temporarily shimming: the engine
    // uses its own CAPTURE_KNOCKBACK, so we re-derive captures with the run's value
    // by post-processing CAPTURE events (see below).
    const r = submitWord(state, word, dict)
    if (!r.ok) { // shouldn't happen (words are valid + unused), but guard by forfeiting
      state = { ...state, currentPlayerIndex: (idx + 1) % state.players.length }
      continue
    }
    let next = r.next
    // Re-apply capture with the RUN's knockback (engine constant may differ): move
    // each victim to dest - knockback (clamped) instead of the engine's default.
    for (const e of r.events) {
      if (e.type === 'CAPTURE') {
        captures++
        const to = Math.max(1, e.from - knockback)
        next = { ...next, players: next.players.map((p) => (p.id === e.playerId ? { ...p, square: to } : p)) }
      }
    }
    // Optional catch-up: after a normal turn pass (not escape/win), nudge the mover
    // forward by how many 10-square rows they trail the leader (capped at +3).
    if (catchup && next.phase === 'awaiting-word') {
      const mover = next.players[idx]
      const leader = Math.max(...next.players.map((p) => p.square))
      const behindRows = Math.floor((leader - mover.square) / 10)
      const bonus = Math.min(Math.max(behindRows, 0), 3)
      if (bonus > 0 && mover.square + bonus < board.length) {
        next = { ...next, players: next.players.map((p, i) => (i === idx ? { ...p, square: p.square + bonus } : p)) }
      }
    }
    state = next
  }
  const winner = state.winnerId ? Number(state.winnerId.slice(1)) : null
  const squares = state.players.map((p) => p.square)
  const margin = Math.max(...squares) - Math.min(...squares)
  return { winner, margin, captures, turns }
}

// ---- run sweeps ---------------------------------------------------------------
function pct(n: number, d: number) { return d ? ((100 * n) / d).toFixed(0) + '%' : '—' }

function runConfig(label: string, bots: Bot[], knockback: number, catchup: boolean, games: number, boards: Array<30 | 50 | 100>) {
  let strongWins = 0, decided = 0, totalMargin = 0, totalCaps = 0, totalTurns = 0
  // The strongest bot = highest maxLen (ties → most tactical); index 0 is set strong.
  const strongIdx = 0
  for (let g = 0; g < games; g++) {
    const board = boards[g % boards.length]
    const res = playGame(g * 2654435761 + knockback * 131 + (catchup ? 7 : 0), board, bots, knockback, catchup)
    if (res.winner != null) { decided++; if (res.winner === strongIdx) strongWins++ }
    totalMargin += res.margin
    totalCaps += res.captures
    totalTurns += res.turns
  }
  console.log(
    `${label.padEnd(26)} strongWin=${pct(strongWins, decided).padStart(4)}  ` +
    `margin=${(totalMargin / games).toFixed(1).padStart(5)}  ` +
    `caps/game=${(totalCaps / games).toFixed(1).padStart(4)}  ` +
    `turns=${(totalTurns / games).toFixed(0).padStart(3)}  (n=${decided})`,
  )
}

const GAMES = 400
const BOARDS: Array<30 | 50 | 100> = [30, 50, 100]

// Scenario A — skill gap: 1 strong (maxLen 8, tactical) vs weak (maxLen 5).
console.log('\n=== Scenario A: skill gap (1 strong maxLen8 vs weak maxLen5), 3 players ===')
const gapBots: Bot[] = [{ maxLen: 8, tactical: true }, { maxLen: 5, tactical: false }, { maxLen: 5, tactical: false }]
console.log('CAPTURE OFF (baseline):')
runConfig('  capture off', gapBots, 0, false, GAMES, BOARDS)
console.log('CAPTURE ON (knockback sweep):')
for (const k of [3, 4, 5, 6, 8]) runConfig(`  knockback=${k}`, gapBots, k, false, GAMES, BOARDS)
console.log('CAPTURE ON + CATCH-UP:')
for (const k of [4, 5, 6]) runConfig(`  knockback=${k}+catchup`, gapBots, k, true, GAMES, BOARDS)
console.log('CATCH-UP ONLY (no capture):')
runConfig('  catchup only', gapBots, 0, true, GAMES, BOARDS)

// Scenario B — even match: all maxLen 6, tactical. Measures capture frequency + swing.
console.log('\n=== Scenario B: even match (all maxLen6 tactical), 4 players ===')
const evenBots: Bot[] = [
  { maxLen: 6, tactical: true }, { maxLen: 6, tactical: true },
  { maxLen: 6, tactical: true }, { maxLen: 6, tactical: true },
]
runConfig('  capture off', evenBots, 0, false, GAMES, BOARDS)
for (const k of [3, 4, 5, 6, 8]) runConfig(`  knockback=${k}`, evenBots, k, false, GAMES, BOARDS)

console.log('\n(strongWin = how often the strongest-vocab bot wins; lower vs baseline = more balance.')
console.log(' margin = squares between 1st and last at game end; caps/game = captures per game.)')
