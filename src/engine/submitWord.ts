import type { Dictionary, GameEvent, GameState, PendingEscape, SubmitResult } from './types'
import {
  RESCUE_NEED_CAP, advanceTurn, checkWord, currentPlayer, findLadder, findSnake,
  knockbackTarget, lastLetter, normalize, updateSquare,
} from './helpers'

export function submitWord(state: GameState, raw: string, dict: Dictionary): SubmitResult {
  if (state.phase !== 'awaiting-word') return { ok: false, reason: 'wrong-phase' }

  const word = normalize(raw)
  const reason = checkWord(word, {
    requiredLetter: state.requiredLetter,
    usedWords: state.usedWords,
    isValid: (w) => dict.isValid(w),
  })
  if (reason) return { ok: false, reason }

  const player = currentPlayer(state)
  const from = player.square
  const dest = from + word.length
  const base: GameState = {
    ...state,
    usedWords: [...state.usedWords, word],
    requiredLetter: lastLetter(word),
    lastWord: word,
  }
  const events: GameEvent[] = []

  // WIN — reach or pass the final square
  if (dest >= state.board.length) {
    const players = updateSquare(state.players, player.id, state.board.length)
    events.push({ type: 'MOVE', playerId: player.id, from, to: state.board.length, squares: state.board.length - from })
    events.push({ type: 'WIN', playerId: player.id })
    return { ok: true, next: { ...base, players, phase: 'won', winnerId: player.id }, events }
  }

  events.push({ type: 'MOVE', playerId: player.id, from, to: dest, squares: word.length })

  // CAPTURE — every OTHER player resting exactly on the landing square is knocked
  // back CAPTURE_KNOCKBACK (a pure slide, clamped >= 1; it never re-triggers a
  // snake/ladder and never chain-captures a third player already on `dest`).
  // Gated by the game's capture rule; legacy saves without the field fall back to
  // OFF. Resolved BEFORE the mover's own ladder/snake so the events read
  // MOVE → CAPTURE(s) → feature, and every landing branch below advances the
  // knocked-back positions rather than the pre-capture ones.
  let captured = state.players
  if (state.capture ?? false) {
    for (const victim of state.players) {
      if (victim.id === player.id || victim.square !== dest) continue
      const to = knockbackTarget(victim.square)
      captured = updateSquare(captured, victim.id, to)
      events.push({ type: 'CAPTURE', playerId: victim.id, from: dest, to, byPlayerId: player.id })
    }
  }

  // LADDER (endpoints are unique, so a square is never both a ladder foot and a snake head)
  const ladder = findLadder(state.board, dest)
  if (ladder) {
    const players = updateSquare(captured, player.id, ladder.top)
    events.push({ type: 'LADDER', playerId: player.id, foot: ladder.foot, top: ladder.top })
    const advanced = advanceTurn({ ...base, players })
    events.push({ type: 'TURN', playerId: advanced.players[advanced.currentPlayerIndex].id })
    return { ok: true, next: advanced, events }
  }

  // SNAKE — enter the escape window; token sits on the head, turn does NOT advance yet
  const snake = findSnake(state.board, dest)
  if (snake) {
    const players = updateSquare(captured, player.id, snake.head)
    const pendingEscape: PendingEscape = {
      playerId: player.id,
      fromSquare: snake.head,
      drop: snake.head - snake.tail,
      toSquare: snake.tail,
      need: Math.min(snake.head - snake.tail, RESCUE_NEED_CAP),
    }
    events.push({ type: 'ESCAPE_START', playerId: player.id, head: snake.head, drop: snake.head - snake.tail })
    return { ok: true, next: { ...base, players, phase: 'awaiting-escape', pendingEscape }, events }
  }

  // NORMAL landing
  const players = updateSquare(captured, player.id, dest)
  const advanced = advanceTurn({ ...base, players })
  events.push({ type: 'TURN', playerId: advanced.players[advanced.currentPlayerIndex].id })
  return { ok: true, next: advanced, events }
}
