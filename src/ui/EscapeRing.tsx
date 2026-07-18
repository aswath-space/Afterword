const R = 26
const C = 2 * Math.PI * R

// green → amber → vermilion by remaining fraction. Literal colours kept OFF the SVG
// presentation attribute (applied via inline `style`, per the project's var()/SVG rule).
function stroke(frac: number): string {
  if (frac > 0.5) return '#2f9e6f'
  if (frac > 0.25) return '#c98a2b'
  return '#c0442e'
}

// A draining countdown ring for the snake-escape window.
export function EscapeRing({ remainingMs, totalMs, size = 64 }: { remainingMs: number; totalMs: number; size?: number }) {
  const frac = Math.max(0, Math.min(1, totalMs > 0 ? remainingMs / totalMs : 0))
  const secs = Math.max(0, Math.ceil(remainingMs / 1000))
  const pulse = remainingMs <= 5000 ? 'aw-escape-pulse' : undefined
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${secs} seconds to escape`} className={pulse} data-escape-ring>
      <circle cx={32} cy={32} r={R} fill="none" stroke="none" strokeWidth={5} style={{ stroke: 'var(--line)' }} />
      <circle
        cx={32} cy={32} r={R} fill="none" stroke="none" strokeWidth={5} strokeLinecap="round"
        transform="rotate(-90 32 32)"
        style={{ stroke: stroke(frac), strokeDasharray: C, strokeDashoffset: C * (1 - frac), transition: 'stroke-dashoffset 0.25s linear' }}
      />
      <text x={32} y={39} textAnchor="middle" style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 20, fill: 'var(--ink)' }}>{secs}</text>
    </svg>
  )
}
