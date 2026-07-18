// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Confetti } from './Confetti'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const allowMotion = () =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))

describe('Confetti', () => {
  it('renders the requested number of shards when motion is allowed', () => {
    allowMotion()
    const { container } = render(<Confetti color="var(--p1)" count={20} />)
    expect(container.querySelectorAll('[data-shard]').length).toBe(20)
  })

  it('defaults to a full 72-shard burst', () => {
    allowMotion()
    const { container } = render(<Confetti color="var(--p1)" />)
    expect(container.querySelectorAll('[data-shard]').length).toBe(72)
  })

  it('staggers two waves: second-wave shards are delayed ~0.75s beyond the first', () => {
    allowMotion()
    const { container } = render(<Confetti color="var(--p1)" />)
    const delayOf = (el: Element) => parseFloat((el as HTMLElement).style.animationDelay)
    const first = [...container.querySelectorAll('[data-wave="0"]')].map(delayOf)
    const second = [...container.querySelectorAll('[data-wave="1"]')].map(delayOf)
    expect(first.length).toBeGreaterThan(0)
    expect(second.length).toBeGreaterThan(0)
    expect(Math.max(...first)).toBeLessThan(0.75)
    expect(Math.min(...second)).toBeGreaterThanOrEqual(0.75)
  })

  it('falls long enough that shards are still drifting past 2.5s', () => {
    allowMotion()
    const { container } = render(<Confetti color="var(--p1)" />)
    const ends = [...container.querySelectorAll('[data-shard]')].map((el) => {
      const s = (el as HTMLElement).style
      return parseFloat(s.animationDelay) + parseFloat(s.animationDuration)
    })
    expect(Math.min(...ends)).toBeGreaterThanOrEqual(2.3)
    expect(Math.max(...ends)).toBeGreaterThan(2.5)
  })

  it('gives every shard a deterministic sway + tilt for the keyframe to consume', () => {
    allowMotion()
    const { container } = render(<Confetti color="var(--p1)" />)
    const shards = [...container.querySelectorAll('[data-shard]')] as HTMLElement[]
    expect(shards.every((el) => /px$/.test(el.style.getPropertyValue('--aw-sway')))).toBe(true)
    expect(shards.every((el) => /deg$/.test(el.style.getPropertyValue('--aw-tilt')))).toBe(true)
    // deterministic: two renders agree shard-for-shard
    const { container: again } = render(<Confetti color="var(--p1)" />)
    const rerun = [...again.querySelectorAll('[data-shard]')] as HTMLElement[]
    expect(rerun.map((el) => el.style.getPropertyValue('--aw-sway'))).toEqual(
      shards.map((el) => el.style.getPropertyValue('--aw-sway')),
    )
  })

  it('renders nothing under reduced motion (no matchMedia → reduced)', () => {
    const { container } = render(<Confetti color="var(--p1)" count={20} />)
    expect(container.querySelectorAll('[data-shard]').length).toBe(0)
  })
})
