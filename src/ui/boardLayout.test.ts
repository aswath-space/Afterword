import { describe, it, expect } from 'vitest'
import { boardLayout, readingIndexOf } from './boardLayout'

describe('boardLayout', () => {
  it('sizes each supported length', () => {
    expect(boardLayout(30)).toMatchObject({ cols: 5, rows: 6, width: 500, height: 600 })
    expect(boardLayout(50)).toMatchObject({ cols: 5, rows: 10, width: 500, height: 1000 })
    expect(boardLayout(100)).toMatchObject({ cols: 10, rows: 10, width: 1000, height: 1000 })
  })

  it('throws for an unsupported length', () => {
    expect(() => boardLayout(42)).toThrow()
  })

  it('places square 1 at the bottom-left and snakes upward (boustrophedon)', () => {
    const L = boardLayout(30) // 5 cols, 6 rows, unit 100
    expect(L.centerOf(1)).toEqual({ x: 50, y: 550 })
    expect(L.centerOf(5)).toEqual({ x: 450, y: 550 })
    expect(L.centerOf(6)).toEqual({ x: 450, y: 450 })
    expect(L.centerOf(10)).toEqual({ x: 50, y: 450 })
    expect(L.centerOf(30)).toEqual({ x: 50, y: 50 })
  })

  it('lists one cell per square', () => {
    expect(boardLayout(30).cells).toHaveLength(30)
    expect(boardLayout(30).cells[0]).toEqual({ square: 1, cx: 50, cy: 550 })
  })
})

describe('readingIndexOf', () => {
  it('ranks squares in screen reading order (top→bottom, left→right)', () => {
    // Top-left square on a 30 board is 30 (rank 0).
    expect(readingIndexOf(30, 30)).toBe(0)
    // Right-to-left row (6..10): square 10 is leftmost, so it reads before square 6.
    expect(readingIndexOf(10, 30)).toBeLessThan(readingIndexOf(6, 30))
    // Left-to-right row (1..5): square 1 is leftmost, so it reads before square 5.
    expect(readingIndexOf(1, 30)).toBeLessThan(readingIndexOf(5, 30))
  })
})
