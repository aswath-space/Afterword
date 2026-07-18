import { prefersReducedMotion } from './motion/presets'

// A board-edge vignette that tightens as the escape clock drains (fraction 1→0).
// Under reduced motion it is STATIC (a fixed, mild frame — no intensify/transition),
// per the spec's reduced-motion branch.
export function EscapeVignette({ fraction }: { fraction: number }) {
  const reduced = prefersReducedMotion()
  const spent = Math.max(0, Math.min(1, 1 - fraction))
  const opacity = reduced ? 0.3 : 0.15 + spent * 0.55
  const inner = reduced ? 50 : 62 - spent * 26 // clear centre shrinks → the frame closes in
  return (
    <div
      aria-hidden="true"
      data-escape-vignette
      style={{
        position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none', opacity,
        background: `radial-gradient(ellipse at center, transparent ${inner}%, color-mix(in srgb, var(--terracotta) 65%, #000) 130%)`,
        transition: reduced ? undefined : 'opacity 0.3s linear',
      }}
    />
  )
}
