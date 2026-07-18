import type { CSSProperties } from 'react'
import { prefersReducedMotion } from './motion/presets'

const ACCENTS = ['var(--brass)', 'var(--teal)']

// Second-wave stagger (s): interleaved shards re-seed the fall while the first
// wave is still drifting, so the celebration reads as a sustained shower.
const WAVE_DELAY = 0.75

// A hand-rolled winner burst — colored shards falling via the aw-confetti keyframe
// (play.css). Deterministic spread (no Math.random): every per-shard parameter is
// derived from the index. Two interleaved waves + per-shard sway/tilt CSS vars keep
// it fuller and longer-lived (shards still drifting past ~3s). Renders nothing
// under reduced motion.
export function Confetti({ color, count = 72 }: { color: string; count?: number }) {
  if (prefersReducedMotion()) return null
  const shards = Array.from({ length: count }, (_, i) => {
    const left = (i * 97) % 100
    const wave = i % 2 // interleave so both waves span the full width
    const delay = (i % 7) * 0.07 + wave * WAVE_DELAY
    const dur = 2.3 + (i % 5) * 0.22 // 2.3–3.18s fall
    const tilt = (i % 6) * 60
    const sway = ((i * 53) % 37) - 18 // −18..18px horizontal drift
    const w = 7 + (i % 3)
    const h = 11 + (i % 4)
    const c = i % 3 === 0 ? color : ACCENTS[i % 2]
    const style = {
      position: 'absolute',
      top: '-8%',
      left: `${left}%`,
      width: w,
      height: h,
      background: c,
      opacity: 0.9,
      animationName: 'aw-confetti',
      animationDuration: `${dur}s`,
      animationDelay: `${delay}s`,
      animationTimingFunction: 'ease-in',
      animationFillMode: 'both', // hidden (0% opacity) until its wave starts
      '--aw-tilt': `${tilt}deg`,
      '--aw-sway': `${sway}px`,
    } as CSSProperties
    return <span key={i} data-shard data-wave={wave} aria-hidden="true" style={style} />
  })
  return <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>{shards}</div>
}
