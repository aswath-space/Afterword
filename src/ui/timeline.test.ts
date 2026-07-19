import { describe, it, expect } from 'vitest'
import { actingPlayerId, buildTimeline, presentedSquares, type Beat } from './timeline'
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
  it('maps a CAPTURE to a knockback beat, ordered after the mover hop', () => {
    const ev: GameEvent[] = [
      { type: 'MOVE', playerId: 'p1', from: 10, to: 14, squares: 4 },
      { type: 'CAPTURE', playerId: 'p2', from: 14, to: 10, byPlayerId: 'p1' },
      { type: 'TURN', playerId: 'p2' },
    ]
    expect(buildTimeline(ev)).toEqual([
      { kind: 'hops', playerId: 'p1', squares: [11, 12, 13, 14] },
      { kind: 'knockback', playerId: 'p2', from: 14, to: 10 },
    ])
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

describe('actingPlayerId', () => {
  it('is the mover on a move+capture batch (not the bumped victim)', () => {
    expect(actingPlayerId([
      { type: 'MOVE', playerId: 'p1', from: 10, to: 14, squares: 4 },
      { type: 'CAPTURE', playerId: 'p2', from: 14, to: 10, byPlayerId: 'p1' },
      { type: 'TURN', playerId: 'p3' },
    ])).toBe('p1')
  })
  it('is the escaper on an escape batch', () => {
    expect(actingPlayerId([{ type: 'ESCAPE_FAIL', playerId: 'p2', head: 20, tail: 8 }, { type: 'TURN', playerId: 'p3' }])).toBe('p2')
  })
  it('is undefined when there is no actionable event', () => {
    expect(actingPlayerId([{ type: 'TURN', playerId: 'p2' }])).toBeUndefined()
    expect(actingPlayerId([])).toBeUndefined()
  })
})

describe('presentedSquares', () => {
  it('is empty for an empty queue (all tokens fall back to committed)', () => {
    expect(presentedSquares([], 0)).toEqual({})
  })

  it('holds a bumped victim at its square until its own knockback beat plays', () => {
    // p1 hops 10→14 (foot), bumps p2 (14→10), then climbs a ladder 14→30.
    const queue: Beat[] = [
      { kind: 'hops', playerId: 'p1', squares: [11, 12, 13, 14] },
      { kind: 'knockback', playerId: 'p2', from: 14, to: 10 },
      { kind: 'climb', playerId: 'p1', from: 14, to: 30 },
    ]
    // Nothing played yet: both at their pre-move squares (p1 at 10, victim p2 at 14).
    expect(presentedSquares(queue, 0)).toEqual({ p1: 10, p2: 14 })
    // After the hop: mover on the foot (14); victim STILL at 14 (not pre-retreated).
    expect(presentedSquares(queue, 1)).toEqual({ p1: 14, p2: 14 })
    // After the knockback: victim now at 10; mover STILL on the foot (not the top yet).
    expect(presentedSquares(queue, 2)).toEqual({ p1: 14, p2: 10 })
    // All beats played: committed positions.
    expect(presentedSquares(queue, 3)).toEqual({ p1: 30, p2: 10 })
  })
})
