// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StampLayer } from './StampLayer'
import type { Board, PlayerState } from '../engine/types'

const players: PlayerState[] = [
  { id: 'p1', name: 'Ana', color: 'rgb(190, 84, 48)', emblem: 'circle', square: 4 },
]

describe('StampLayer', () => {
  it('renders a lettered tile per stamped square with a corner number', () => {
    const { container } = render(
      <StampLayer stamps={{ 1: { letter: 'C', playerId: 'p1' }, 4: { letter: 'D', playerId: 'p1' } }} length={30} players={players} />,
    )
    const nodes = container.querySelectorAll('[data-stamp]')
    expect(nodes).toHaveLength(2)
    const first = container.querySelector('[data-stamp="1"]') as HTMLElement
    expect(first.textContent).toContain('C')
    expect(first.textContent).toContain('1') // corner position number
  })

  it('renders nothing when there are no stamps', () => {
    const { container } = render(<StampLayer stamps={{}} length={30} players={players} />)
    expect(container.querySelectorAll('[data-stamp]')).toHaveLength(0)
  })

  describe('feature-square badges (board prop)', () => {
    const board: Board = { length: 30, seed: 't', snakes: [{ head: 9, tail: 2 }], ladders: [{ foot: 12, top: 21 }] }
    const stamps = {
      2: { letter: 'T', playerId: 'p1' },  // snake tail  → full tile
      4: { letter: 'P', playerId: 'p1' },  // plain       → full tile
      9: { letter: 'S', playerId: 'p1' },  // snake head  → badge
      12: { letter: 'L', playerId: 'p1' }, // ladder foot → badge
      21: { letter: 'O', playerId: 'p1' }, // ladder top  → full tile
    }

    it('badges snake heads and ladder feet; plain squares, tails and tops stay full tiles', () => {
      const { container } = render(<StampLayer stamps={stamps} length={30} players={players} board={board} />)
      expect(container.querySelector('[data-stamp="9"]')?.hasAttribute('data-stamp-badge')).toBe(true)
      expect(container.querySelector('[data-stamp="12"]')?.hasAttribute('data-stamp-badge')).toBe(true)
      expect(container.querySelector('[data-stamp="4"]')?.hasAttribute('data-stamp-badge')).toBe(false)
      expect(container.querySelector('[data-stamp="2"]')?.hasAttribute('data-stamp-badge')).toBe(false)
      expect(container.querySelector('[data-stamp="21"]')?.hasAttribute('data-stamp-badge')).toBe(false)
      // the badge still carries the letter
      expect(container.querySelector('[data-stamp="9"]')?.textContent).toContain('S')
    })

    it('without the board prop, no stamp renders in badge mode', () => {
      const { container } = render(<StampLayer stamps={stamps} length={30} players={players} />)
      expect(container.querySelectorAll('[data-stamp]')).toHaveLength(5)
      expect(container.querySelector('[data-stamp-badge]')).toBeNull()
    })
  })
})
