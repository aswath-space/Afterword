import { assertValidBoard, generateBoard } from '../board/board'
import type { Dictionary, GameConfig, GameState, SubmitResult } from './types'
import { submitWord } from './submitWord'
import { resolveSnakeEscape } from './resolveSnakeEscape'
import { useStuck, forfeitTurn } from './useStuck'

// The bundled engine surface: createGame plus the four reducers, all wired
// together through the createEngine factory at the bottom of this file.
export interface Engine {
  createGame(config: GameConfig): GameState
  submitWord(state: GameState, word: string): SubmitResult
  resolveSnakeEscape(state: GameState, word: string | null): SubmitResult
  useStuck(state: GameState, word: string): SubmitResult
  forfeitTurn(state: GameState): SubmitResult
}

export function createGame(config: GameConfig, dict: Dictionary): GameState {
  if (config.players.length < 2 || config.players.length > 4) {
    throw new Error('Afterword requires 2-4 players')
  }
  const board = generateBoard(config.seed, config.boardLength)
  assertValidBoard(board)
  return {
    board,
    timer: config.timer,
    players: config.players.map((p) => ({ ...p, square: 0 })),
    currentPlayerIndex: 0,
    requiredLetter: null,
    usedWords: [],
    phase: 'awaiting-word',
    pendingEscape: null,
    winnerId: null,
    lastWord: null,
    dictVersion: dict.version,
  }
}

export function createEngine(dict: Dictionary): Engine {
  return {
    createGame: (config) => createGame(config, dict),
    submitWord: (state, word) => submitWord(state, word, dict),
    resolveSnakeEscape: (state, word) => resolveSnakeEscape(state, word, dict),
    useStuck: (state, word) => useStuck(state, word, dict),
    forfeitTurn: (state) => forfeitTurn(state),
  }
}
