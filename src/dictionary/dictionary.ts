import type { Dictionary } from '../engine/types'

export function createSetDictionary(words: string[], version: string): Dictionary {
  const set = new Set(words.map((w) => w.trim().toUpperCase()))
  return {
    isValid: (word: string) => set.has(word.trim().toUpperCase()),
    version,
  }
}

let cached: Dictionary | null = null

// The final word set (ENABLE + supplement − denylist) is built at build time by
// scripts/gen-dict.mjs and shipped gzip-compressed as public/dict.bin (opaque .bin so
// hosts serve it as-is rather than auto-decoding a .gz). Fetched + decompressed once, on
// demand — keeps the word list out of the JS bundle and off the startup parse path.
export async function loadEnableDictionary(): Promise<Dictionary> {
  if (cached) return cached
  const url = import.meta.env.BASE_URL + 'dict.bin'
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`dict.bin fetch failed: ${res.status}`)
  const stream = res.body.pipeThrough(new DecompressionStream('gzip'))
  const text = await new Response(stream).text()
  const words = text.split('\n').filter((w) => w.length > 0)
  cached = createSetDictionary(words, 'enable1+aw1')
  return cached
}
