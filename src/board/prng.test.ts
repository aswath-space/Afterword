import { describe, it, expect } from 'vitest'
import { makeRng } from './prng'

describe('makeRng', () => {
  it('produces floats in [0, 1)', () => {
    const rng = makeRng('seed-a')
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is deterministic for the same seed', () => {
    const a = makeRng('same-seed')
    const b = makeRng('same-seed')
    const seqA = Array.from({ length: 20 }, () => a())
    const seqB = Array.from({ length: 20 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('differs for different seeds', () => {
    const a = makeRng('seed-1')
    const b = makeRng('seed-2')
    const seqA = Array.from({ length: 20 }, () => a())
    const seqB = Array.from({ length: 20 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })
})
