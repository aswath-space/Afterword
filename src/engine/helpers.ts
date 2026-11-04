import type {
  Board, GameEvent, GameState, Ladder, PendingEscape, PlayerId, PlayerState, RejectReason, Snake, SubmitResult,
} from './types'

export const MIN_WORD_LENGTH = 3

// Cap on the rescue-word length a snake can demand: the rescue must stay humanly
// playable under the 20s clock; a drop beyond the cap still slides the full distance on failure.
export const RESCUE_NEED_CAP = 8

// The rescue word length an escape actually requires. The `??` fallback is REQUIRED:
// persisted saved games (zustand localStorage, version 1) contain `pendingEscape`
// WITHOUT `need`; without it `length < undefined` is false and any 3-letter word
// would escape a 14-drop.
export function rescueNeed(esc: PendingEscape): number {
  return esc.need ?? Math.min(esc.drop, RESCUE_NEED_CAP)
}

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

// First event of the given type, narrowed to that variant.
export function findEvent<T extends GameEvent['type']>(
  events: GameEvent[], type: T,
): Extract<GameEvent, { type: T }> | undefined {
  return events.find((e): e is Extract<GameEvent, { type: T }> => e.type === type)
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex]
}

export function updateSquare(players: PlayerState[], id: PlayerId, square: number): PlayerState[] {
  return players.map((p) => (p.id === id ? { ...p, square } : p))
}

// Move to the next player with a fresh awaiting-word turn, appending the TURN event.
export function passTurn(state: GameState, events: GameEvent[]): SubmitResult {
  const next: GameState = {
    ...state,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
    phase: 'awaiting-word',
    pendingEscape: null,
  }
  return { ok: true, next, events: [...events, { type: 'TURN', playerId: currentPlayer(next).id }] }
}

export function checkWord(
  word: string,
  opts: {
    requiredLetter: string | null
    usedWords: string[]
    isValid: (w: string) => boolean
  },
): RejectReason | null {
  if (word.length < MIN_WORD_LENGTH) return 'too-short'
  if (opts.requiredLetter && word[0] !== opts.requiredLetter) return 'wrong-start-letter'
  if (opts.usedWords.includes(word)) return 'already-used'
  if (!opts.isValid(word)) return 'not-a-word'
  return null
}
