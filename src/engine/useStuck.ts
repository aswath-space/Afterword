import type { Dictionary, GameEvent, GameState, SubmitResult } from './types'
import { advanceTurn, checkWord, currentPlayer, lastLetter, normalize } from './helpers'

export function useStuck(state: GameState, raw: string, dict: Dictionary): SubmitResult {
  if (state.phase !== 'awaiting-word') return { ok: false, reason: 'wrong-phase' }
  const word = normalize(raw)
  // Any starting letter allowed (requiredLetter: null skips the start-letter check).
  const reason = checkWord(word, {
    requiredLetter: null,
    usedWords: state.usedWords,
    isValid: (w) => dict.isValid(w),
  })
  if (reason) return { ok: false, reason }

  const player = currentPlayer(state)
  const events: GameEvent[] = [{ type: 'STUCK', playerId: player.id }]
  const advanced = advanceTurn({
    ...state,
    usedWords: [...state.usedWords, word],
    requiredLetter: lastLetter(word),
    lastWord: word,
  })
  events.push({ type: 'TURN', playerId: advanced.players[advanced.currentPlayerIndex].id })
  return { ok: true, next: advanced, events }
}

export function forfeitTurn(state: GameState): SubmitResult {
  if (state.phase !== 'awaiting-word') return { ok: false, reason: 'wrong-phase' }
  const player = currentPlayer(state)
  const events: GameEvent[] = [{ type: 'STUCK', playerId: player.id }]
  // No word played: advance 0 and leave requiredLetter unchanged.
  const advanced = advanceTurn(state)
  events.push({ type: 'TURN', playerId: advanced.players[advanced.currentPlayerIndex].id })
  return { ok: true, next: advanced, events }
}
