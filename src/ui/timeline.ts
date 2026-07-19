import type { GameEvent } from '../engine/types'

export type Beat =
  | { kind: 'hops'; playerId: string; squares: number[] }
  | { kind: 'climb'; playerId: string; from: number; to: number }
  | { kind: 'slither'; playerId: string; head: number; tail: number }
  | { kind: 'knockback'; playerId: string; from: number; to: number }
  | { kind: 'settle'; playerId: string; square: number }

// The player who ACTED this turn (the mover / escaper): the first non-TURN event's
// player. The HUD attributes the animation to them — during a bump the knockback beat
// belongs to the VICTIM, so keying off the beat would mislabel the actor's turn.
// Undefined when the batch has no actionable event.
export function actingPlayerId(events: GameEvent[]): string | undefined {
  return events.find((e) => e.type !== 'TURN')?.playerId
}

// The square each player occupies given the beats PLAYED SO FAR (`queue[0..index)`).
// Non-active tokens must render HERE — where the animation has reached — not at their
// final committed square, or a bumped victim pre-retreats before the mover arrives and
// a mover that climbs AFTER a bump teleports to the ladder top during the victim's
// knockback beat. Each player starts at their pre-move square (the start of their first
// beat) and advances to each played beat's end square; players with no beat are absent
// (the caller falls back to the committed square, which never changed for them).
export function presentedSquares(queue: Beat[], index: number): Record<string, number> {
  const beatStart = (b: Beat): number | null =>
    b.kind === 'hops' ? b.squares[0] - 1
      : b.kind === 'climb' || b.kind === 'knockback' ? b.from
        : b.kind === 'slither' ? b.head
          : null // settle has no distinct start square
  const beatEnd = (b: Beat): number =>
    b.kind === 'hops' ? b.squares[b.squares.length - 1]
      : b.kind === 'climb' || b.kind === 'knockback' ? b.to
        : b.kind === 'slither' ? b.tail
          : b.square // settle
  const map: Record<string, number> = {}
  for (const b of queue) {
    if (!(b.playerId in map)) { const s = beatStart(b); if (s !== null) map[b.playerId] = s }
  }
  for (let i = 0; i < index && i < queue.length; i++) map[queue[i].playerId] = beatEnd(queue[i])
  return map
}

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
