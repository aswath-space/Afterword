import { makeRng } from './prng'
import type { Board, Ladder, Snake } from '../engine/types'

// Structural invariants only: endpoint ordering, in-range [2, length-1], and
// uniqueness. Completability is NOT re-checked here — the movement rules
// (min-3-letter words, escapable snakes, reach-or-pass win) make every
// generated board trivially completable at all supported lengths.
export function validateBoard(board: Board): true | string {
  const { length, snakes, ladders } = board
  const endpoints: number[] = []
  for (const l of ladders) {
    if (l.foot >= l.top) return `ladder foot ${l.foot} not below top ${l.top}`
    endpoints.push(l.foot, l.top)
  }
  for (const s of snakes) {
    if (s.head <= s.tail) return `snake head ${s.head} not above tail ${s.tail}`
    endpoints.push(s.head, s.tail)
  }
  for (const e of endpoints) {
    if (e < 2 || e > length - 1) return `endpoint ${e} out of range [2, ${length - 1}]`
  }
  const seen = new Set<number>()
  for (const e of endpoints) {
    if (seen.has(e)) return `endpoint ${e} used more than once`
    seen.add(e)
  }
  return true
}

export function assertValidBoard(board: Board): void {
  const result = validateBoard(board)
  if (result !== true) throw new Error(`Invalid board: ${result}`)
}

// Span bands keep the board readable AND make the snake-escape mechanic bite:
// small snakes (drop ~4) need a short rescue word, but a fearsome one (drop up
// to 14) needs a ~14-letter word under the tight rescue clock — near-hopeless,
// so aiming to DODGE it is a real skill payoff. Ladders climb a touch further
// for a satisfying boost. Bounded spans still stop serpents from tangling.
export const SNAKE_DROP = { min: 4, max: 14 }
export const LADDER_RISE = { min: 5, max: 12 }

export function generateBoard(seed: string, length: number): Board {
  const rng = makeRng(seed)
  const randInt = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1)) // inclusive
  const used = new Set<number>()

  // Place a feature: a lower and higher endpoint `span` apart, both in
  // [2, length-1] and unused. Returns null if no spot found (dense board).
  const place = (band: { min: number; max: number }): { lo: number; hi: number } | null => {
    const maxSpan = Math.min(band.max, length - 3)
    for (let attempt = 0; attempt < 300; attempt++) {
      const span = randInt(band.min, maxSpan)
      const lo = randInt(2, length - 1 - span)
      const hi = lo + span
      if (used.has(lo) || used.has(hi)) continue
      used.add(lo)
      used.add(hi)
      return { lo, hi }
    }
    return null
  }

  // ~1 snake + 1 ladder per 8 squares (30 -> 3, 50 -> 6) keeps the board readable. The
  // 100-square Marathon board packs into 10-wide (much smaller) cells, so it thins to
  // ~1 per 12 (100 -> 8) — otherwise the long snakes/ladders overlap into a tangle.
  const count = Math.max(1, Math.floor(length / (length >= 100 ? 12 : 8)))
  const ladders: Ladder[] = []
  const snakes: Snake[] = []
  for (let i = 0; i < count; i++) {
    const p = place(LADDER_RISE)
    if (p) ladders.push({ foot: p.lo, top: p.hi })
  }
  for (let i = 0; i < count; i++) {
    const p = place(SNAKE_DROP)
    if (p) snakes.push({ head: p.hi, tail: p.lo })
  }

  const board: Board = { length, snakes, ladders, seed }
  assertValidBoard(board)
  return board
}
