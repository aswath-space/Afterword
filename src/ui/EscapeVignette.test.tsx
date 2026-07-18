// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { EscapeVignette } from './EscapeVignette'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const el = (c: HTMLElement) => c.firstElementChild as HTMLElement

describe('EscapeVignette', () => {
  it('is an aria-hidden overlay that intensifies as time drains (motion allowed)', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
    const { container: early } = render(<EscapeVignette fraction={0.9} />)
    const { container: late } = render(<EscapeVignette fraction={0.1} />)
    expect(el(early).getAttribute('aria-hidden')).toBe('true')
    expect(Number(el(late).style.opacity)).toBeGreaterThan(Number(el(early).style.opacity))
  })

  it('is static under reduced motion (fixed intensity, no transition)', () => {
    // no matchMedia stub → prefersReducedMotion() is true
    const { container: early } = render(<EscapeVignette fraction={0.9} />)
    const { container: late } = render(<EscapeVignette fraction={0.1} />)
    expect(el(early).style.opacity).toBe(el(late).style.opacity) // does not intensify
    expect(el(early).style.transition).toBe('')
  })
})
