// @vitest-environment jsdom
import { render, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWakeLock } from './useWakeLock'

afterEach(() => {
  cleanup()
  delete (navigator as unknown as { wakeLock?: unknown }).wakeLock
})

function makeSentinel() {
  const listeners: Record<string, () => void> = {}
  return {
    released: false,
    release: vi.fn(async function (this: { released: boolean }) { this.released = true }),
    addEventListener: (type: string, cb: () => void) => { listeners[type] = cb },
    _fire: (type: string) => listeners[type]?.(),
  }
}

function Harness({ active }: { active: boolean }) {
  useWakeLock(active)
  return null
}

describe('useWakeLock', () => {
  it('does not throw when the API is absent', () => {
    expect(() => render(<Harness active />)).not.toThrow()
  })

  it('requests a screen lock when active and releases on unmount', async () => {
    const sentinel = makeSentinel()
    const request = vi.fn(async () => sentinel)
    ;(navigator as unknown as { wakeLock: unknown }).wakeLock = { request }
    const { unmount } = render(<Harness active />)
    await Promise.resolve()
    expect(request).toHaveBeenCalledWith('screen')
    unmount()
    await Promise.resolve()
    expect(sentinel.release).toHaveBeenCalled()
  })

  it('does not request when inactive', async () => {
    const request = vi.fn(async () => makeSentinel())
    ;(navigator as unknown as { wakeLock: unknown }).wakeLock = { request }
    render(<Harness active={false} />)
    await Promise.resolve()
    expect(request).not.toHaveBeenCalled()
  })
})
