import type { Dictionary, GameEvent, GameState, SubmitResult } from './types'
import { MIN_WORD_LENGTH, RESCUE_NEED_CAP, advanceTurn, normalize, updateSquare } from './helpers'

export function resolveSnakeEscape(state: GameState, raw: string | null, dict: Dictionary): SubmitResult {
  if (state.phase !== 'awaiting-escape' || !state.pendingEscape) {
    return { ok: false, reason: 'wrong-phase' }
  }
  const esc = state.pendingEscape
  const events: GameEvent[] = []

  // Timeout / give up → slide to tail
  if (raw === null) {
    const players = updateSquare(state.players, esc.playerId, esc.toSquare)
    events.push({ type: 'ESCAPE_FAIL', playerId: esc.playerId, head: esc.fromSquare, tail: esc.toSquare })
    const advanced = advanceTurn({ ...state, players })
    events.push({ type: 'TURN', playerId: advanced.players[advanced.currentPlayerIndex].id })
    return { ok: true, next: advanced, events }
  }

  // The `??` fallback is REQUIRED: persisted saved games (zustand localStorage, version 1)
  // contain `pendingEscape` WITHOUT `need`; without it `length < undefined` is false and
  // any 3-letter word would escape a 14-drop.
  const need = esc.need ?? Math.min(esc.drop, RESCUE_NEED_CAP)

  const word = normalize(raw)
  if (word.length < MIN_WORD_LENGTH) return { ok: false, reason: 'too-short' }
  if (word.length < need) return { ok: false, reason: 'rescue-too-short' }
  if (state.usedWords.includes(word)) return { ok: false, reason: 'already-used' }
  if (!dict.isValid(word)) return { ok: false, reason: 'not-a-word' }

  // Success — stay on the head, consume the rescue word, keep requiredLetter, pass the turn
  events.push({ type: 'ESCAPE_SUCCESS', playerId: esc.playerId, head: esc.fromSquare })
  const advanced = advanceTurn({ ...state, usedWords: [...state.usedWords, word] })
  events.push({ type: 'TURN', playerId: advanced.players[advanced.currentPlayerIndex].id })
  return { ok: true, next: advanced, events }
}
