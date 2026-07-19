// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { StandingsStrip } from './StandingsStrip'
import type { GameEvent, PlayerState } from '../engine/types'

afterEach(() => cleanup())

const mk = (squares: Array<[string, number]>): PlayerState[] =>
  squares.map(([id, square], i) => ({ id, name: id.toUpperCase(), color: `var(--p${i + 1})`, emblem: 'circle', square }))

describe('StandingsStrip', () => {
  it('ranks by square descending, tags the leader, and shows gaps to the leader', () => {
    const players = mk([['a', 9], ['b', 20], ['c', 14]]) // leader b(20), then c(14), then a(9)
    const { container } = render(<StandingsStrip players={players} lastEvents={[]} moveSeq={0} />)
    const ranks = [...container.querySelectorAll('[data-rank]')]
    const gaps = ranks.map((r) => r.querySelector('[data-gap]')!.textContent ?? '')
    expect(ranks[0].textContent).toContain('B') // b leads
    expect(gaps[0]).toBe('Lead')
    expect(gaps[1]).toContain('6') // 20 - 14
    expect(gaps[2]).toContain('11') // 20 - 9
  })

  it('flashes BUMPED! when a CAPTURE commits', () => {
    const players = mk([['a', 14], ['b', 10]])
    const { container, rerender } = render(<StandingsStrip players={players} lastEvents={[]} moveSeq={0} />)
    expect(container.querySelector('[data-flash]')).toBeNull()
    const moved = mk([['a', 14], ['b', 6]]) // b bumped back
    const ev: GameEvent[] = [{ type: 'CAPTURE', playerId: 'b', from: 10, to: 6, byPlayerId: 'a' }]
    rerender(<StandingsStrip players={moved} lastEvents={ev} moveSeq={1} />)
    expect(container.querySelector('[data-flash]')?.textContent).toBe('BUMPED!')
  })

  it('flashes OVERTAKE! when a move passes another player', () => {
    const before = mk([['a', 20], ['b', 8]]) // a leads
    const { container, rerender } = render(<StandingsStrip players={before} lastEvents={[]} moveSeq={0} />)
    const after = mk([['a', 20], ['b', 24]]) // b overtakes a
    const ev: GameEvent[] = [{ type: 'MOVE', playerId: 'b', from: 8, to: 24, squares: 16 }]
    rerender(<StandingsStrip players={after} lastEvents={ev} moveSeq={1} />)
    expect(container.querySelector('[data-flash]')?.textContent).toBe('OVERTAKE!')
  })

  it('does not flash on a move that changes no ranks', () => {
    const before = mk([['a', 20], ['b', 8]])
    const { container, rerender } = render(<StandingsStrip players={before} lastEvents={[]} moveSeq={0} />)
    const after = mk([['a', 24], ['b', 8]]) // leader extends the lead; no reorder
    const ev: GameEvent[] = [{ type: 'MOVE', playerId: 'a', from: 20, to: 24, squares: 4 }]
    rerender(<StandingsStrip players={after} lastEvents={ev} moveSeq={1} />)
    expect(container.querySelector('[data-flash]')).toBeNull()
  })
})
