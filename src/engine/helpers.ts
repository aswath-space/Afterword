import type {
  Board, GameState, Ladder, PlayerId, PlayerState, RejectReason, Snake,
} from './types'

export const MIN_WORD_LENGTH = 3

// Cap on the rescue-word length a snake can demand: the rescue must stay humanly
// playable under the 20s clock; a drop beyond the cap still slides the full distance on failure.
export const RESCUE_NEED_CAP = 8

// How far a captured player is knocked back when an opponent lands exactly on
// their square (a "bump"). A PURE slide: never re-triggers snakes/ladders, clamped
// to >= 1. Tuned to 4 by scripts/sim-capture.ts: it is NOT a multiple of either
// board row-width (5 on Quick/Standard, 10 on Marathon), which avoids dropping the
// victim into the same serpentine column and causing repeated column-locked bumps
// (an alignment of 5 measurably stalled games). The sim also confirmed capture
// makes close matches contestable but cannot equalize a large vocabulary gap — by
// design for a word game — so no catch-up rule was added.
export const CAPTURE_KNOCKBACK = 4

export function normalize(word: string): string {
  return word.trim().toUpperCase()
}

export function lastLetter(word: string): string {
  return word[word.length - 1]
}

export function findLadder(board: Board, square: number): Ladder | undefined {
  return board.ladders.find((l) => l.foot === square)
}

export function findSnake(board: Board, square: number): Snake | undefined {
  return board.snakes.find((s) => s.head === square)
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex]
}

export function nextIndex(state: GameState): number {
  return (state.currentPlayerIndex + 1) % state.players.length
}

export function updateSquare(players: PlayerState[], id: PlayerId, square: number): PlayerState[] {
  return players.map((p) => (p.id === id ? { ...p, square } : p))
}

// Move to the next player and reset to a fresh awaiting-word turn.
export function advanceTurn(state: GameState): GameState {
  return {
    ...state,
    currentPlayerIndex: nextIndex(state),
    phase: 'awaiting-word',
    pendingEscape: null,
  }
}

export function checkWord(
  word: string,
  opts: {
    requiredLetter: string | null
    usedWords: string[]
    isValid: (w: string) => boolean
    minLength?: number
  },
): RejectReason | null {
  const min = opts.minLength ?? MIN_WORD_LENGTH
  if (word.length < min) return 'too-short'
  if (opts.requiredLetter && word[0] !== opts.requiredLetter) return 'wrong-start-letter'
  if (opts.usedWords.includes(word)) return 'already-used'
  if (!opts.isValid(word)) return 'not-a-word'
  return null
}
