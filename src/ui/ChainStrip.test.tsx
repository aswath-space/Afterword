// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ChainStrip } from './ChainStrip'
import type { PlayerState } from '../engine/types'
import type { ChainEntry } from '../store/gameStore'

const players: PlayerState[] = [
  { id: 'p1', name: 'Ana', color: 'rgb(190, 84, 48)', emblem: 'circle', square: 4 },
  { id: 'p2', name: 'Ben', color: 'rgb(31, 107, 98)', emblem: 'diamond', square: 5 },
]

describe('ChainStrip', () => {
  it('renders each word with its player accent and +N', () => {
    const entries: ChainEntry[] = [
      { word: 'CARD', playerId: 'p1', squares: 4, kind: 'move' },
      { word: 'DREAM', playerId: 'p2', squares: 5, kind: 'move' },
    ]
    const { container } = render(<ChainStrip entries={entries} players={players} />)
    const nodes = container.querySelectorAll('[data-chain-entry]')
    expect(nodes).toHaveLength(2)
    expect((nodes[0] as HTMLElement).textContent).toContain('CARD')
    expect((nodes[0] as HTMLElement).textContent).toContain('+4')
    expect((nodes[0] as HTMLElement).style.borderBottomColor).toBe('rgb(190, 84, 48)')
  })

  it('marks a stuck entry with +0 and the stuck class', () => {
    const entries: ChainEntry[] = [{ word: 'DREAM', playerId: 'p1', squares: 0, kind: 'stuck' }]
    const { container } = render(<ChainStrip entries={entries} players={players} />)
    expect((container.querySelector('[data-chain-entry]') as HTMLElement).textContent).toContain('+0')
    expect(container.querySelector('.aw-stuck')).toBeTruthy()
  })

  it('bounces only the newest entry', () => {
    const entries: ChainEntry[] = [
      { word: 'CARD', playerId: 'p1', squares: 4, kind: 'move' },
      { word: 'DREAM', playerId: 'p1', squares: 5, kind: 'move' },
    ]
    const { container } = render(<ChainStrip entries={entries} players={players} />)
    const pops = container.querySelectorAll('.aw-pop')
    expect(pops).toHaveLength(1)
    expect((pops[0] as HTMLElement).textContent).toContain('DREAM')
  })

  it('does not re-bounce the previous word when the chain shrinks (take-back)', () => {
    const two: ChainEntry[] = [
      { word: 'CARD', playerId: 'p1', squares: 4, kind: 'move' },
      { word: 'DREAM', playerId: 'p1', squares: 5, kind: 'move' },
    ]
    const { container, rerender } = render(<ChainStrip entries={two} players={players} />)
    rerender(<ChainStrip entries={two.slice(0, 1)} players={players} />)
    expect(container.querySelector('.aw-pop')).toBeNull()
  })
})
