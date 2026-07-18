import { describe, it, expect } from 'vitest'
import { encodeBoard, decodeBoard } from './boardCodec'

describe('boardCodec', () => {
  it('round-trips seed + length through the v1 format', () => {
    const param = encodeBoard('k3q9x1z7', 50)
    expect(param).toBe('v1.k3q9x1z7.50')
    expect(decodeBoard(param)).toEqual({ seed: 'k3q9x1z7', length: 50 })
  })

  it('accepts all three board lengths', () => {
    expect(decodeBoard('v1.abc.30')).toEqual({ seed: 'abc', length: 30 })
    expect(decodeBoard('v1.abc.50')).toEqual({ seed: 'abc', length: 50 })
    expect(decodeBoard('v1.abc.100')).toEqual({ seed: 'abc', length: 100 })
  })

  it('rejects malformed input with null (never throws)', () => {
    expect(decodeBoard(null)).toBeNull()
    expect(decodeBoard('')).toBeNull()
    expect(decodeBoard('v2.abc.50')).toBeNull()          // unknown version
    expect(decodeBoard('v1.abc')).toBeNull()             // missing length
    expect(decodeBoard('v1.abc.50.extra')).toBeNull()    // extra part
    expect(decodeBoard('v1.abc.40')).toBeNull()          // not a real board length
    expect(decodeBoard('v1.ABC.50')).toBeNull()          // uppercase seed
    expect(decodeBoard('v1.a b.50')).toBeNull()          // whitespace
    expect(decodeBoard('v1..50')).toBeNull()             // empty seed
    expect(decodeBoard('v1.' + 'a'.repeat(33) + '.50')).toBeNull() // oversize seed
  })
})
