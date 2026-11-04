import type { Dictionary, GameState, SubmitResult } from './types'
import { checkWord, currentPlayer, lastLetter, normalize, passTurn } from './helpers'

export function useStuck(state: GameState, raw: string, dict: Dictionary): SubmitResult {
  if (state.phase !== 'awaiting-word') return { ok: false, reason: 'wrong-phase' }
  const word = normalize(raw)
  // Any starting letter allowed (requiredLetter: null skips the start-letter check).
  const reason = checkWord(word, { requiredLetter: null, usedWords: state.usedWords, isValid: dict.isValid })
  if (reason) return { ok: false, reason }

  return passTurn(
    { ...state, usedWords: [...state.usedWords, word], requiredLetter: lastLetter(word), lastWord: word },
    [{ type: 'STUCK', playerId: currentPlayer(state).id }],
  )
}

export function forfeitTurn(state: GameState): SubmitResult {
  if (state.phase !== 'awaiting-word') return { ok: false, reason: 'wrong-phase' }
  // No word played: advance 0 and leave requiredLetter unchanged.
  return passTurn(state, [{ type: 'STUCK', playerId: currentPlayer(state).id }])
}
