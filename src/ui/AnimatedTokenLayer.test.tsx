// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { AnimatedTokenLayer } from './AnimatedTokenLayer'
import { boardLayout } from './boardLayout'
import type { PlayerState } from '../engine/types'

afterEach(() => cleanup())

const players: PlayerState[] = [{ id: 'p1', name: 'A', color: 'var(--p1)', emblem: 'circle', square: 8 }]

// The square centre in the layer's percentage space (mirrors its layout math).
const centreOf = (square: number, length = 30) => {
  const layout = boardLayout(length)
  const c = layout.centerOf(square)
  return { left: (c.x / layout.width) * 100, top: (c.y / layout.height) * 100 }
}

describe('AnimatedTokenLayer', () => {
  it('renders a token per player (and accepts the optional onHopLand)', () => {
    const { container } = render(
      <AnimatedTokenLayer players={players} length={30} beat={null} onBeatDone={() => {}} onHopLand={() => {}} />,
    )
    expect(container.querySelector('[data-token="p1"]')).toBeTruthy()
  })

  it('reports the beat done (reduced-motion path fires the callback)', async () => {
    const onBeatDone = vi.fn()
    render(
      <AnimatedTokenLayer
        players={players}
        length={30}
        beat={{ kind: 'slither', playerId: 'p1', head: 20, tail: 8 }}
        onBeatDone={onBeatDone}
      />,
    )
    await vi.waitFor(() => expect(onBeatDone).toHaveBeenCalled())
  })

  it('keeps a lone token at the exact square centre, full size', () => {
    const { container } = render(
      <AnimatedTokenLayer players={players} length={30} beat={null} onBeatDone={() => {}} />,
    )
    const el = container.querySelector('[data-token="p1"]') as HTMLElement
    const c = centreOf(8)
    expect(el.style.left).toBe(`${c.left}%`)
    expect(el.style.top).toBe(`${c.top}%`)
    expect(el.style.width).toBe('7%') // lone token unchanged
  })

  it('fans out AND shrinks co-located tokens: distinct positions, inside the tile', () => {
    const pair: PlayerState[] = [
      { id: 'p1', name: 'A', color: 'var(--p1)', emblem: 'circle', square: 17 },
      { id: 'p2', name: 'B', color: 'var(--p2)', emblem: 'triangle', square: 17 },
    ]
    const { container } = render(
      <AnimatedTokenLayer players={pair} length={30} beat={null} onBeatDone={() => {}} />,
    )
    const t1 = container.querySelector('[data-token="p1"]') as HTMLElement
    const t2 = container.querySelector('[data-token="p2"]') as HTMLElement
    expect(t1.style.left).not.toBe(t2.style.left)
    expect(t1.style.top).not.toBe(t2.style.top)
    const c = centreOf(17)
    for (const el of [t1, t2]) {
      // Inside the tile on the worst-case (100) board: max single-axis offset < 2.7%.
      expect(Math.abs(parseFloat(el.style.left) - c.left)).toBeLessThanOrEqual(2.7)
      expect(Math.abs(parseFloat(el.style.top) - c.top)).toBeLessThanOrEqual(2.7)
      expect(Math.abs(parseFloat(el.style.left) - c.left)).toBeGreaterThan(0)
      expect(el.style.width).toBe('5.2%') // pair → shrunk so the fan reads as two chips
    }
  })

  it('shrinks further as the cohort grows (four tokens on one square)', () => {
    const four: PlayerState[] = ['circle', 'diamond', 'triangle', 'hex'].map((emblem, i) => (
      { id: `p${i + 1}`, name: `P${i}`, color: `var(--p${i + 1})`, emblem, square: 1 }
    ))
    const { container } = render(
      <AnimatedTokenLayer players={four} length={100} beat={null} onBeatDone={() => {}} />,
    )
    const widths = four.map((p) => (container.querySelector(`[data-token="${p.id}"]`) as HTMLElement).style.width)
    expect(widths).toEqual(['4%', '4%', '4%', '4%'])
    // Every token stays inside its tile (100-board 5% half-cell): centre offset + half-token < 5%.
    const c = centreOf(1, 100)
    for (const p of four) {
      const el = container.querySelector(`[data-token="${p.id}"]`) as HTMLElement
      expect(Math.abs(parseFloat(el.style.left) - c.left) + 2.0).toBeLessThan(5)
      expect(Math.abs(parseFloat(el.style.top) - c.top) + 2.0).toBeLessThan(5)
    }
  })
})
