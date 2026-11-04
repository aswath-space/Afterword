import type { Dictionary, GameEvent, GameState, SubmitResult } from './types'
import {
  RESCUE_NEED_CAP, checkWord, currentPlayer, findLadder, findSnake, lastLetter, normalize, passTurn, updateSquare,
} from './helpers'

export function submitWord(state: GameState, raw: string, dict: Dictionary): SubmitResult {
  if (state.phase !== 'awaiting-word') return { ok: false, reason: 'wrong-phase' }

  const word = normalize(raw)
  const reason = checkWord(word, { requiredLetter: state.requiredLetter, usedWords: state.usedWords, isValid: dict.isValid })
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
  const moveTo = (square: number) => updateSquare(state.players, player.id, square)

  // WIN — reach or pass the final square
  const end = state.board.length
  if (dest >= end) {
    const events: GameEvent[] = [
      { type: 'MOVE', playerId: player.id, from, to: end, squares: end - from },
      { type: 'WIN', playerId: player.id },
    ]
    return { ok: true, next: { ...base, players: moveTo(end), phase: 'won', winnerId: player.id }, events }
  }

  const move: GameEvent = { type: 'MOVE', playerId: player.id, from, to: dest, squares: word.length }

  // LADDER (endpoints are unique, so a square is never both a ladder foot and a snake head)
  const ladder = findLadder(state.board, dest)
  if (ladder) {
    return passTurn({ ...base, players: moveTo(ladder.top) }, [
      move, { type: 'LADDER', playerId: player.id, foot: ladder.foot, top: ladder.top },
    ])
  }

  // SNAKE — enter the escape window; token sits on the head, turn does NOT advance yet
  const snake = findSnake(state.board, dest)
  if (snake) {
    const drop = snake.head - snake.tail
    const pendingEscape = {
      playerId: player.id, fromSquare: snake.head, drop, toSquare: snake.tail, need: Math.min(drop, RESCUE_NEED_CAP),
    }
    const events: GameEvent[] = [move, { type: 'ESCAPE_START', playerId: player.id, head: snake.head, drop }]
    return { ok: true, next: { ...base, players: moveTo(snake.head), phase: 'awaiting-escape', pendingEscape }, events }
  }

  // NORMAL landing
  return passTurn({ ...base, players: moveTo(dest) }, [move])
}
