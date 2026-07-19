import type { Board, PlayerState } from '../engine/types'
import { CAPTURE_KNOCKBACK, findLadder, findSnake, MIN_WORD_LENGTH } from '../engine/helpers'

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

// A bump the current draft would land: the opponent resting exactly on the landing
// square, and where they'd be knocked back to. Null when capture is off, the word is
// too short, the landing wins (capture never applies to a win), or nobody is there.
// Pure occupancy read layered on top of previewLanding, so that helper stays board-only.
export function capturePreview(
  board: Board, players: PlayerState[], from: number, n: number, moverId: string, captureOn: boolean,
): { victim: PlayerState; to: number } | null {
  if (!captureOn || n < MIN_WORD_LENGTH) return null
  const dest = from + n
  if (dest >= board.length) return null // win — no capture
  const victim = players.find((p) => p.id !== moverId && p.square === dest)
  if (!victim) return null
  return { victim, to: Math.max(1, dest - CAPTURE_KNOCKBACK) }
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
