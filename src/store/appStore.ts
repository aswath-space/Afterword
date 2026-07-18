import { useStore } from 'zustand'
import { createGameStore, type GameStoreState } from './gameStore'
import { createEngine } from '../engine/engine'
import { loadEnableDictionary } from '../dictionary/dictionary'
import type { Dictionary } from '../engine/types'

// The dictionary now loads asynchronously (fetch + decompress dict.bin), but the store +
// engine are still created synchronously at module load. Bridge that with a proxy: the
// engine holds this object; `isValid` returns false until the real dictionary resolves,
// then we swap in the real implementation. The dictionary is only consulted at word
// submission (never at game start), which happens well after this fetch completes; the
// `dictReady` flag gates the input so the pre-load window can't wrongly reject a word.
const dictProxy: Dictionary = { isValid: () => false, version: 'loading' }

export const gameStore = createGameStore({ engine: createEngine(dictProxy) })

// Drop any deadline persisted while the app was closed — resumed play re-arms a
// fresh clock (never touches the dictionary).
gameStore.getState().resetClockForResume()

function applyDictionary(real: Dictionary): void {
  dictProxy.isValid = real.isValid
  dictProxy.version = real.version
  gameStore.setState({ dictReady: true })
}

// Kick off the async dictionary load in the real app. Skipped under vitest (jsdom has no
// usable fetch/DecompressionStream for dict.bin); unit tests that need word validation
// inject a dictionary synchronously via __setTestDictionary instead.
// A flaky network gets two quiet retries (1s, 3s); after that we stay fail-safe —
// the input keeps its disabled "Loading dictionary…" state rather than mis-rejecting.
const RETRY_DELAYS_MS = [1000, 3000]
function loadWithRetry(attempt = 0): void {
  loadEnableDictionary()
    .then(applyDictionary)
    .catch((e) => {
      if (attempt < RETRY_DELAYS_MS.length) setTimeout(() => loadWithRetry(attempt + 1), RETRY_DELAYS_MS[attempt])
      else console.error('Dictionary failed to load:', e)
    })
}
if (!import.meta.env.VITEST) loadWithRetry()

/** Test-only: synchronously supply a dictionary + mark it ready. */
export function __setTestDictionary(real: Dictionary): void {
  applyDictionary(real)
}

export function useGameStore<T>(selector: (s: GameStoreState) => T): T {
  return useStore(gameStore, selector)
}
