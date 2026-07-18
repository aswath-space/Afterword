import { describe, it, expect } from 'vitest'
import { prefersReducedMotion, beatDurationMs } from './presets'
import type { Beat } from '../timeline'

describe('presets', () => {
  it('treats an unavailable matchMedia as reduced-motion (safe default)', () => {
    const g = globalThis as { matchMedia?: unknown }
    const saved = g.matchMedia
    delete g.matchMedia
    expect(prefersReducedMotion()).toBe(true)
    if (saved) g.matchMedia = saved
  })
  it('reports zero beat duration under reduced motion, positive otherwise', () => {
    const beat: Beat = { kind: 'hops', playerId: 'p1', squares: [1, 2, 3] }
    expect(beatDurationMs(beat, true)).toBe(0)
    expect(beatDurationMs(beat, false)).toBeGreaterThan(0)
  })
})
