// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { EscapeRing } from './EscapeRing'

afterEach(() => cleanup())

describe('EscapeRing', () => {
  it('drains as time runs down and reddens near the end', () => {
    const { container: full } = render(<EscapeRing remainingMs={20000} totalMs={20000} />)
    const { container: low } = render(<EscapeRing remainingMs={1000} totalMs={20000} />)
    const arc = (c: HTMLElement) => c.querySelectorAll('circle')[1] as SVGCircleElement
    // less drained (full) → smaller dash offset than nearly-drained (low)
    expect(Number(arc(full).style.strokeDashoffset)).toBeLessThan(Number(arc(low).style.strokeDashoffset))
    expect(arc(low).style.stroke).toBeTruthy() // colour set via inline style, not a var() in the attr
  })

  it('pulses only in the last 5 seconds', () => {
    const { container: calm } = render(<EscapeRing remainingMs={9000} totalMs={20000} />)
    const { container: tense } = render(<EscapeRing remainingMs={3000} totalMs={20000} />)
    expect(calm.querySelector('[data-escape-ring]')?.classList.contains('aw-escape-pulse')).toBe(false)
    expect(tense.querySelector('[data-escape-ring]')?.classList.contains('aw-escape-pulse')).toBe(true)
  })
})
