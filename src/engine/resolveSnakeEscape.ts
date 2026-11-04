import type { Dictionary, GameState, SubmitResult } from './types'
import { MIN_WORD_LENGTH, normalize, passTurn, rescueNeed, updateSquare } from './helpers'

export function resolveSnakeEscape(state: GameState, raw: string | null, dict: Dictionary): SubmitResult {
  if (state.phase !== 'awaiting-escape' || !state.pendingEscape) {
    return { ok: false, reason: 'wrong-phase' }
  }
  const esc = state.pendingEscape

  // Timeout / give up → slide to tail
  if (raw === null) {
    return passTurn({ ...state, players: updateSquare(state.players, esc.playerId, esc.toSquare) }, [
      { type: 'ESCAPE_FAIL', playerId: esc.playerId, head: esc.fromSquare, tail: esc.toSquare },
    ])
  }

  const word = normalize(raw)
  if (word.length < MIN_WORD_LENGTH) return { ok: false, reason: 'too-short' }
  if (word.length < rescueNeed(esc)) return { ok: false, reason: 'rescue-too-short' }
  if (state.usedWords.includes(word)) return { ok: false, reason: 'already-used' }
  if (!dict.isValid(word)) return { ok: false, reason: 'not-a-word' }

  // Success — stay on the head, consume the rescue word, keep requiredLetter, pass the turn
  return passTurn({ ...state, usedWords: [...state.usedWords, word] }, [
    { type: 'ESCAPE_SUCCESS', playerId: esc.playerId, head: esc.fromSquare },
  ])
}
