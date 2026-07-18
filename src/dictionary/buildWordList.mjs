// Single source of truth for the final word set (ENABLE + supplement − denylist).
// Plain ESM so scripts/gen-dict.mjs (Node) AND the vitest tests share ONE merge
// implementation — the shipped dict.bin is therefore provably equal to what the tests
// validate. The runtime does NOT use this (it decompresses the already-merged dict.bin).
export function buildWordList(enableRaw, extraRaw, denyRaw) {
  const deny = new Set(denyRaw.split('\n').map((w) => w.trim().toLowerCase()).filter((w) => w.length > 0))
  const seen = new Set()
  const out = []
  for (const chunk of [enableRaw, extraRaw]) {
    for (const line of chunk.split('\n')) {
      const w = line.trim()
      if (w.length === 0) continue
      const lo = w.toLowerCase()
      if (deny.has(lo) || seen.has(lo)) continue
      seen.add(lo)
      out.push(w)
    }
  }
  return out
}
