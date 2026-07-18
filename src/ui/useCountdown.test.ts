// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCountdown, formatClock } from './useCountdown'

describe('formatClock', () => {
  it('formats milliseconds as M:SS', () => {
    expect(formatClock(24_000)).toBe('0:24')
    expect(formatClock(65_000)).toBe('1:05')
    expect(formatClock(-500)).toBe('0:00')
  })
})

describe('useCountdown', () => {
  it('returns 0 and never fires when there is no deadline', () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() => useCountdown(null, onExpire))
    expect(result.current).toBe(0)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('fires onExpire once after the deadline passes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const onExpire = vi.fn()
    renderHook(() => useCountdown(1000 + 5000, onExpire))
    vi.advanceTimersByTime(6000)
    expect(onExpire).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(6000)
    expect(onExpire).toHaveBeenCalledTimes(1) // still once
    vi.useRealTimers()
  })
})
