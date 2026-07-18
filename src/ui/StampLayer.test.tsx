// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StampLayer } from './StampLayer'
import type { PlayerState } from '../engine/types'

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
})
