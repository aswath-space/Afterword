import type { Beat } from '../timeline'

// One place for motion tuning + the reduced-motion branch.
export const HOP_STAGGER_MS = 105

// SSR/jsdom-safe: with no matchMedia we cannot know, so default to reduced (no motion).
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Nominal beat duration (ms); 0 under reduced motion. Used for tuning/telemetry —
// the orchestrator advances on the real WAAPI onfinish, not this value.
export function beatDurationMs(beat: Beat, reduced: boolean): number {
  if (reduced) return 0
  switch (beat.kind) {
    case 'hops': return beat.squares.length * HOP_STAGGER_MS + 400
    case 'climb': return 700
    case 'slither': return 1200
    case 'knockback': return 500
    case 'settle': return 500
  }
}
