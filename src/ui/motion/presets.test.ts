import { describe, it, expect } from 'vitest'
import { prefersReducedMotion } from './presets'

describe('presets', () => {
  it('treats an unavailable matchMedia as reduced-motion (safe default)', () => {
    const g = globalThis as { matchMedia?: unknown }
    const saved = g.matchMedia
    delete g.matchMedia
    expect(prefersReducedMotion()).toBe(true)
    if (saved) g.matchMedia = saved
  })
})
