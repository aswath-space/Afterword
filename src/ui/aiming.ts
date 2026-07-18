import type { Board } from '../engine/types'
import { findLadder, findSnake, MIN_WORD_LENGTH } from '../engine/helpers'

export type Landing =
  | { kind: 'too-short' }
  | { kind: 'plain'; square: number }
  | { kind: 'ladder'; square: number; top: number }
  | { kind: 'snake'; square: number; tail: number; drop: number }
  | { kind: 'win'; square: number }

// Where a length-n word from `from` lands, and what happens there. Pure read of
// board data — never runs engine rules, so it is a safe side-effect-free preview.
export function previewLanding(board: Board, from: number, n: number): Landing {
  if (n < MIN_WORD_LENGTH) return { kind: 'too-short' }
  const square = from + n
  if (square >= board.length) return { kind: 'win', square: board.length }
  const ladder = findLadder(board, square)
  if (ladder) return { kind: 'ladder', square, top: ladder.top }
  const snake = findSnake(board, square)
  if (snake) return { kind: 'snake', square, tail: snake.tail, drop: snake.head - snake.tail }
  return { kind: 'plain', square }
}

// Ladder feet + snake heads this turn could reach: distance in [MIN_WORD_LENGTH, reach].
export function reachFeatures(board: Board, from: number, reach: number): Array<{ square: number; kind: 'ladder' | 'snake' }> {
  const out: Array<{ square: number; kind: 'ladder' | 'snake' }> = []
  for (const l of board.ladders) {
    const d = l.foot - from
    if (d >= MIN_WORD_LENGTH && d <= reach) out.push({ square: l.foot, kind: 'ladder' })
  }
  for (const s of board.snakes) {
    const d = s.head - from
    if (d >= MIN_WORD_LENGTH && d <= reach) out.push({ square: s.head, kind: 'snake' })
  }
  return out
}
