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

  it('keeps a lone token at the exact square centre', () => {
    const { container } = render(
      <AnimatedTokenLayer players={players} length={30} beat={null} onBeatDone={() => {}} />,
    )
    const el = container.querySelector('[data-token="p1"]') as HTMLElement
    const c = centreOf(8)
    expect(el.style.left).toBe(`${c.left}%`)
    expect(el.style.top).toBe(`${c.top}%`)
  })

  it('fans out co-located tokens: distinct resting positions, both near the square centre', () => {
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
      expect(Math.abs(parseFloat(el.style.left) - c.left)).toBeLessThanOrEqual(1.8)
      expect(Math.abs(parseFloat(el.style.top) - c.top)).toBeLessThanOrEqual(1.8)
      expect(Math.abs(parseFloat(el.style.left) - c.left)).toBeGreaterThan(0)
    }
  })
})
