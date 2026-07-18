import { describe, it, expect } from 'vitest'
import { generateBoard, validateBoard, SNAKE_DROP, LADDER_RISE } from './board'

describe('generateBoard', () => {
  it('produces a valid board for each supported length', () => {
    for (const length of [30, 50, 100]) {
      const board = generateBoard(`seed-${length}`, length)
      expect(validateBoard(board)).toBe(true)
      expect(board.length).toBe(length)
    }
  })

  it('is deterministic for the same seed + length', () => {
    const a = generateBoard('abc', 50)
    const b = generateBoard('abc', 50)
    expect(a).toEqual(b)
  })

  it('differs for different seeds', () => {
    const a = generateBoard('one', 50)
    const b = generateBoard('two', 50)
    expect(a).not.toEqual(b)
  })

  it('never places an endpoint on square 0, 1, or the final square', () => {
    const board = generateBoard('edge', 30)
    const endpoints = [
      ...board.ladders.flatMap((l) => [l.foot, l.top]),
      ...board.snakes.flatMap((s) => [s.head, s.tail]),
    ]
    for (const e of endpoints) {
      expect(e).toBeGreaterThanOrEqual(2)
      expect(e).toBeLessThanOrEqual(29)
    }
  })

  it('gives every endpoint a unique square (no chaining/loops)', () => {
    const board = generateBoard('unique', 100)
    const endpoints = [
      ...board.ladders.flatMap((l) => [l.foot, l.top]),
      ...board.snakes.flatMap((s) => [s.head, s.tail]),
    ]
    expect(new Set(endpoints).size).toBe(endpoints.length)
  })
})

describe('validateBoard', () => {
  it('rejects a ladder whose foot is not below its top', () => {
    const bad = { length: 50, seed: 'x', ladders: [{ foot: 20, top: 10 }], snakes: [] }
    expect(validateBoard(bad)).not.toBe(true)
  })

  it('rejects a snake whose head is not above its tail', () => {
    const bad = { length: 50, seed: 'x', ladders: [], snakes: [{ head: 5, tail: 15 }] }
    expect(validateBoard(bad)).not.toBe(true)
  })

  it('rejects a shared endpoint', () => {
    const bad = { length: 50, seed: 'x', ladders: [{ foot: 10, top: 20 }], snakes: [{ head: 20, tail: 5 }] }
    expect(validateBoard(bad)).not.toBe(true)
  })
})

describe('generateBoard — decluttered density & spans', () => {
  it('caps density near one snake + one ladder per eight squares', () => {
    for (const length of [30, 50, 100]) {
      const b = generateBoard(`density-${length}`, length)
      const cap = Math.max(1, Math.floor(length / 8))
      expect(b.snakes.length).toBeGreaterThan(0)
      expect(b.ladders.length).toBeGreaterThan(0)
      expect(b.snakes.length).toBeLessThanOrEqual(cap)
      expect(b.ladders.length).toBeLessThanOrEqual(cap)
    }
  })

  it('keeps every snake drop and ladder rise inside its span band', () => {
    for (const length of [30, 50, 100]) {
      const b = generateBoard(`spans-${length}`, length)
      for (const s of b.snakes) {
        const drop = s.head - s.tail
        expect(drop).toBeGreaterThanOrEqual(SNAKE_DROP.min)
        expect(drop).toBeLessThanOrEqual(SNAKE_DROP.max)
      }
      for (const l of b.ladders) {
        const rise = l.top - l.foot
        expect(rise).toBeGreaterThanOrEqual(LADDER_RISE.min)
        expect(rise).toBeLessThanOrEqual(LADDER_RISE.max)
      }
    }
  })

  it('now generates fearsome snakes (drops beyond the old 10-cap) while staying valid', () => {
    let maxDrop = 0
    for (let i = 0; i < 20; i++) {
      const b = generateBoard(`fearsome-${i}`, 50)
      expect(validateBoard(b)).toBe(true)
      for (const s of b.snakes) maxDrop = Math.max(maxDrop, s.head - s.tail)
    }
    expect(maxDrop).toBeGreaterThan(10) // the old ceiling was 10
  })
})
