// One place for motion tuning + the reduced-motion branch.
export const HOP_STAGGER_MS = 105

// SSR/jsdom-safe: with no matchMedia we cannot know, so default to reduced (no motion).
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
