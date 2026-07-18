import { describe, it, expect } from 'vitest'
import { previewLanding, reachFeatures } from './aiming'
import type { Board } from '../engine/types'

const board = (over: Partial<Board> = {}): Board => ({ length: 30, snakes: [], ladders: [], seed: 't', ...over })

describe('previewLanding', () => {
  it('is too-short below the minimum word length', () => {
    expect(previewLanding(board(), 5, 2)).toEqual({ kind: 'too-short' })
  })
  it('marks a plain landing square', () => {
    expect(previewLanding(board(), 5, 4)).toEqual({ kind: 'plain', square: 9 })
  })
  it('reports a ladder climb', () => {
    expect(previewLanding(board({ ladders: [{ foot: 9, top: 18 }] }), 5, 4)).toEqual({ kind: 'ladder', square: 9, top: 18 })
  })
  it('reports a snake drop', () => {
    expect(previewLanding(board({ snakes: [{ head: 9, tail: 2 }] }), 5, 4)).toEqual({ kind: 'snake', square: 9, tail: 2, drop: 7 })
  })
  it('reports a win when the landing reaches or passes the final square', () => {
    expect(previewLanding(board(), 27, 4)).toEqual({ kind: 'win', square: 30 })
  })
})

describe('reachFeatures', () => {
  it('includes features within [from+MIN, from+reach] and excludes too-near / too-far', () => {
    const b = board({
      ladders: [{ foot: 8, top: 16 }, { foot: 25, top: 29 }], // 8 → d=3 in reach; 25 → d=20 too far
      snakes: [{ head: 10, tail: 2 }, { head: 7, tail: 2 }],   // 10 → d=5 in reach; 7 → d=2 too near
    })
    const r = reachFeatures(b, 5, 12)
    expect(r).toContainEqual({ square: 8, kind: 'ladder' })
    expect(r).toContainEqual({ square: 10, kind: 'snake' })
    expect(r.some((f) => f.square === 7)).toBe(false)
    expect(r.some((f) => f.square === 25)).toBe(false)
  })
})
