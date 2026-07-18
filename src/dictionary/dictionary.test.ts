import { describe, it, expect } from 'vitest'
import { createSetDictionary } from './dictionary'
import { buildWordList } from './buildWordList.mjs'
import enableRaw from './enable.txt?raw'
import extraRaw from './extra-words.txt?raw'
import denyRaw from './denylist.txt?raw'

describe('createSetDictionary', () => {
  const dict = createSetDictionary(['cat', 'DREAM', 'entry'], 'test-v1')

  it('validates words case-insensitively', () => {
    expect(dict.isValid('CAT')).toBe(true)
    expect(dict.isValid('cat')).toBe(true)
    expect(dict.isValid('  Dream ')).toBe(true)
  })

  it('rejects unknown words', () => {
    expect(dict.isValid('zzzz')).toBe(false)
  })

  it('exposes its version', () => {
    expect(dict.version).toBe('test-v1')
  })
})

// The final shipped set (ENABLE + supplement − denylist) is built by buildWordList — the
// SAME function scripts/gen-dict.mjs uses to produce dict.bin — so these data-driven checks
// prove exactly what the runtime loads. (The runtime loader itself is fetch+decompress,
// covered by the browser verification, not unit-testable in jsdom.)
describe('buildWordList (final dictionary set)', () => {
  const words = buildWordList(enableRaw, extraRaw, denyRaw)
  const set = new Set(words.map((w) => w.toUpperCase()))
  const valid = (w: string) => set.has(w.trim().toUpperCase())
  const extras = extraRaw.split('\n').map((w) => w.trim()).filter((w) => w.length > 0)
  const denied = denyRaw.split('\n').map((w) => w.trim()).filter((w) => w.length > 0)

  it('has no duplicates', () => {
    expect(words.length).toBe(new Set(words.map((w) => w.toLowerCase())).size)
  })

  it('has well-formed, non-empty data files (lowercase alpha, ≥3 letters)', () => {
    expect(extras.length).toBeGreaterThan(100)
    expect(denied.length).toBeGreaterThan(30)
    for (const w of [...extras, ...denied]) expect(w, w).toMatch(/^[a-z]{3,}$/)
  })

  it('validates every supplement word', () => {
    for (const w of extras) expect(valid(w), w).toBe(true)
  })

  it('excludes every denylist word (case-insensitively)', () => {
    for (const w of denied) {
      expect(valid(w), w).toBe(false)
      expect(valid(w.toUpperCase()), w).toBe(false)
    }
  })

  it('modern words playable, legacy ENABLE intact, 2-letter "aa" kept (engine enforces min length, not the lexicon)', () => {
    for (const w of ['EMAIL', 'SELFIE', 'APP', 'EMOJI', 'PODCAST', 'WIFI']) expect(valid(w), w).toBe(true)
    for (const w of ['card', 'DREAM', 'entry', 'stone', 'aa']) expect(valid(w), w).toBe(true)
  })
})
