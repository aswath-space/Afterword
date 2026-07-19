import type { GameEvent } from '../engine/types'

export type Beat =
  | { kind: 'hops'; playerId: string; squares: number[] }
  | { kind: 'climb'; playerId: string; from: number; to: number }
  | { kind: 'slither'; playerId: string; head: number; tail: number }
  | { kind: 'knockback'; playerId: string; from: number; to: number }
  | { kind: 'settle'; playerId: string; square: number }

// Pure: turn the engine's ordered event list into ordered animation beats.
// Never runs rules; derived entirely from committed events, so it cannot diverge
// from truth. STUCK / TURN / ESCAPE_START produce no motion.
export function buildTimeline(events: GameEvent[]): Beat[] {
  const beats: Beat[] = []
  const lastSquare: Record<string, number> = {}
  for (const e of events) {
    switch (e.type) {
      case 'MOVE': {
        const squares: number[] = []
        for (let s = e.from + 1; s <= e.to; s++) squares.push(s)
        if (squares.length) beats.push({ kind: 'hops', playerId: e.playerId, squares })
        lastSquare[e.playerId] = e.to
        break
      }
      case 'LADDER':
        beats.push({ kind: 'climb', playerId: e.playerId, from: e.foot, to: e.top })
        lastSquare[e.playerId] = e.top
        break
      case 'ESCAPE_FAIL':
        beats.push({ kind: 'slither', playerId: e.playerId, head: e.head, tail: e.tail })
        lastSquare[e.playerId] = e.tail
        break
      case 'CAPTURE':
        beats.push({ kind: 'knockback', playerId: e.playerId, from: e.from, to: e.to })
        lastSquare[e.playerId] = e.to
        break
      case 'ESCAPE_SUCCESS':
        beats.push({ kind: 'settle', playerId: e.playerId, square: e.head })
        break
      case 'WIN':
        beats.push({ kind: 'settle', playerId: e.playerId, square: lastSquare[e.playerId] ?? 0 })
        break
      // STUCK, TURN, ESCAPE_START → no beat
    }
  }
  return beats
}
