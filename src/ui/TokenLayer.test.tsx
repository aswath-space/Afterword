// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TokenLayer } from './TokenLayer'
import type { PlayerState } from '../engine/types'

const players: PlayerState[] = [
  { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 1 },
  { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 5 },
]

describe('TokenLayer', () => {
  it('renders one token per player positioned by percent', () => {
    const { container } = render(<TokenLayer players={players} length={30} />)
    const tokens = container.querySelectorAll('[data-token]')
    expect(tokens).toHaveLength(2)
    // square 1 → centre (50,550) on a 500x600 board → left 10%, top ~91.67%
    const p1 = container.querySelector('[data-token="p1"]') as HTMLElement
    expect(p1.style.left).toBe('10%')
    expect(parseFloat(p1.style.top)).toBeCloseTo(91.667, 2)
  })
})
