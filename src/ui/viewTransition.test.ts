// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { withScreenTransition } from './viewTransition'

afterEach(() => {
  vi.unstubAllGlobals()
  // remove any stubbed API between tests
  delete (document as unknown as { startViewTransition?: unknown }).startViewTransition
})

describe('withScreenTransition', () => {
  it('runs fn directly when startViewTransition is unavailable', () => {
    const fn = vi.fn()
    withScreenTransition(fn)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('bypasses the API under prefers-reduced-motion even if supported', () => {
    const start = vi.fn((cb: () => void) => { cb(); return {} })
    ;(document as unknown as { startViewTransition: unknown }).startViewTransition = start
    // no matchMedia stub → prefersReducedMotion() is true → bypass
    const fn = vi.fn()
    withScreenTransition(fn)
    expect(start).not.toHaveBeenCalled()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('uses startViewTransition when supported and motion is allowed', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: false, media: q, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    }))
    const start = vi.fn((cb: () => void) => { cb(); return {} })
    ;(document as unknown as { startViewTransition: unknown }).startViewTransition = start
    const fn = vi.fn()
    withScreenTransition(fn)
    expect(start).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
