// Share-a-board codec: a board is fully determined by (seed, length) via the
// seeded generator, so sharing is a pure client-side URL parameter — no backend.
// The explicit `v1` version tag exists so a future generateBoard change can mint
// `v2` links instead of silently reinterpreting old ones onto different boards.

export type SharedBoard = { seed: string; length: 30 | 50 | 100 }

const LENGTHS = new Set([30, 50, 100])
const SEED = /^[a-z0-9]{1,32}$/

export function encodeBoard(seed: string, length: 30 | 50 | 100): string {
  return `v1.${seed}.${length}`
}

// Strict parse of an untrusted `?b=` value; anything unexpected → null (never throws).
export function decodeBoard(param: string | null): SharedBoard | null {
  if (!param) return null
  const parts = param.split('.')
  if (parts.length !== 3) return null
  const [version, seed, lengthRaw] = parts
  if (version !== 'v1') return null
  if (!SEED.test(seed)) return null
  const length = Number(lengthRaw)
  if (!LENGTHS.has(length)) return null
  return { seed, length: length as 30 | 50 | 100 }
}
