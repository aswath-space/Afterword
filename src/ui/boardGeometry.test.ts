import { describe, it, expect } from 'vitest'
import { serpentGeometry, ladderGeometry } from './boardGeometry'

describe('serpentGeometry', () => {
  const s = serpentGeometry({ x: 450, y: 50 }, { x: 150, y: 450 })
  it('produces a closed body path starting with a move', () => {
    expect(s.body.startsWith('M ')).toBe(true)
    expect(s.body.trim().endsWith('Z')).toBe(true)
  })
  it('emits chevron scales along the body', () => {
    expect(s.scales.length).toBeGreaterThan(3)
    expect(s.scales.every((p) => p.startsWith('M '))).toBe(true)
  })
  it('anchors the head at the head square', () => {
    expect(s.head.x).toBe(450)
    expect(s.head.y).toBe(50)
    expect(Number.isFinite(s.head.angle)).toBe(true)
  })
  it('sets the gradient across head→tail', () => {
    expect(s.grad).toEqual({ x1: 450, y1: 50, x2: 150, y2: 450 })
  })
  it('exposes an ordered head→tail spine centerline', () => {
    const head = { x: 100, y: 40 }
    const tail = { x: 30, y: 300 }
    const s = serpentGeometry(head, tail)
    expect(s.spinePoints.length).toBeGreaterThan(10)
    expect(s.spinePoints[0].x).toBeCloseTo(head.x, 3)
    expect(s.spinePoints[0].y).toBeCloseTo(head.y, 3)
    expect(s.spinePoints[s.spinePoints.length - 1].x).toBeCloseTo(tail.x, 3)
    expect(s.spinePoints[s.spinePoints.length - 1].y).toBeCloseTo(tail.y, 3)
    expect(s.body).toContain('Z')
  })
})

describe('ladderGeometry', () => {
  const g = ladderGeometry({ x: 150, y: 450 }, { x: 150, y: 150 })
  it('emits two of each rail line kind and some rungs', () => {
    const kinds = g.lines.map((l) => l.kind)
    expect(kinds.filter((k) => k === 'railBody')).toHaveLength(2)
    expect(kinds.filter((k) => k === 'railFace')).toHaveLength(2)
    expect(kinds.filter((k) => k === 'foot')).toHaveLength(2)
    expect(kinds.filter((k) => k === 'rung').length).toBeGreaterThanOrEqual(3)
  })
  it('emits two bolts per rung', () => {
    const rungs = g.lines.filter((l) => l.kind === 'rung').length
    expect(g.bolts).toHaveLength(rungs * 2)
  })
})
