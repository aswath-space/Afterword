import { describe, it, expect } from 'vitest'
import { buildTimeline } from './timeline'
import type { GameEvent } from '../engine/types'

describe('buildTimeline', () => {
  it('maps a plain move to one hop per crossed square', () => {
    const ev: GameEvent[] = [{ type: 'MOVE', playerId: 'p1', from: 3, to: 7, squares: 4 }, { type: 'TURN', playerId: 'p2' }]
    expect(buildTimeline(ev)).toEqual([{ kind: 'hops', playerId: 'p1', squares: [4, 5, 6, 7] }])
  })
  it('appends a climb after a move that lands on a ladder foot', () => {
    const ev: GameEvent[] = [
      { type: 'MOVE', playerId: 'p1', from: 2, to: 5, squares: 3 },
      { type: 'LADDER', playerId: 'p1', foot: 5, top: 14 },
      { type: 'TURN', playerId: 'p2' },
    ]
    expect(buildTimeline(ev)).toEqual([
      { kind: 'hops', playerId: 'p1', squares: [3, 4, 5] },
      { kind: 'climb', playerId: 'p1', from: 5, to: 14 },
    ])
  })
  it('maps an escape fail to a slither', () => {
    const ev: GameEvent[] = [{ type: 'ESCAPE_FAIL', playerId: 'p1', head: 20, tail: 8 }, { type: 'TURN', playerId: 'p2' }]
    expect(buildTimeline(ev)).toEqual([{ kind: 'slither', playerId: 'p1', head: 20, tail: 8 }])
  })
  it('maps escape success and win to a settle, and stuck/turn to nothing', () => {
    expect(buildTimeline([{ type: 'ESCAPE_SUCCESS', playerId: 'p1', head: 20 }])).toEqual([{ kind: 'settle', playerId: 'p1', square: 20 }])
    expect(buildTimeline([{ type: 'MOVE', playerId: 'p1', from: 26, to: 30, squares: 4 }, { type: 'WIN', playerId: 'p1' }])).toEqual([
      { kind: 'hops', playerId: 'p1', squares: [27, 28, 29, 30] },
      { kind: 'settle', playerId: 'p1', square: 30 },
    ])
    expect(buildTimeline([{ type: 'STUCK', playerId: 'p1' }, { type: 'TURN', playerId: 'p2' }])).toEqual([])
  })
})
