import { describe, it, expect } from 'vitest'
import { capturePreview, previewLanding, reachFeatures } from './aiming'
import { CAPTURE_KNOCKBACK } from '../engine/helpers'
import type { Board, PlayerState } from '../engine/types'

const board = (over: Partial<Board> = {}): Board => ({ length: 30, snakes: [], ladders: [], seed: 't', ...over })
const mkPlayers = (squares: Record<string, number>): PlayerState[] =>
  Object.entries(squares).map(([id, square]) => ({ id, name: id, color: 'c', emblem: 'circle', square }))

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

describe('capturePreview', () => {
  const players = mkPlayers({ me: 5, foe: 9 }) // a 4-letter word from 5 lands on 9 = foe

  it('reports the bump when the draft lands exactly on an opponent', () => {
    const r = capturePreview(board(), players, 5, 4, 'me', true)
    expect(r).toEqual({ victim: players[1], to: 9 - CAPTURE_KNOCKBACK })
  })
  it('clamps the knockback target to square 1', () => {
    const r = capturePreview(board(), mkPlayers({ me: 0, foe: 3 }), 0, 3, 'me', true)
    expect(r?.to).toBe(1)
  })
  it('is null when passing over an opponent (not landing on them)', () => {
    expect(capturePreview(board(), mkPlayers({ me: 5, foe: 8 }), 5, 4, 'me', true)).toBeNull()
  })
  it('is null when capture is off', () => {
    expect(capturePreview(board(), players, 5, 4, 'me', false)).toBeNull()
  })
  it('is null on a winning landing (capture never applies to a win)', () => {
    expect(capturePreview(board(), mkPlayers({ me: 27, foe: 30 }), 27, 4, 'me', true)).toBeNull()
  })
  it('never targets the mover itself', () => {
    expect(capturePreview(board(), mkPlayers({ me: 9 }), 5, 4, 'me', true)).toBeNull()
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
