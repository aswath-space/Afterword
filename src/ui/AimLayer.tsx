import type { Board } from '../engine/types'
import { boardLayout } from './boardLayout'
import { previewLanding, reachFeatures, type Landing } from './aiming'

function label(l: Landing): string {
  switch (l.kind) {
    case 'win': return 'WIN'
    case 'ladder': return `▲ climbs to ${l.top}`
    case 'snake': return `▼ drops to ${l.tail}`
    case 'plain': return `land ${l.square}`
    case 'too-short': return ''
  }
}

export function AimLayer({ board, from, draftLength, reach = 12, showReach = true }: { board: Board; from: number; draftLength: number; reach?: number; showReach?: boolean }) {
  const layout = boardLayout(board.length)
  const wPct = 100 / layout.cols
  const hPct = 100 / layout.rows
  const pos = (square: number) => {
    const c = layout.centerOf(square)
    return { left: `${(c.x / layout.width) * 100}%`, top: `${(c.y / layout.height) * 100}%` }
  }
  const features = reachFeatures(board, from, reach)
  const landing = previewLanding(board, from, draftLength)

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {showReach && features.map((f) => {
        const hue = f.kind === 'ladder' ? 'var(--brass)' : 'var(--plum)'
        return (
          <div
            key={`reach-${f.square}`}
            data-reach={f.square}
            style={{
              position: 'absolute', ...pos(f.square),
              width: `${wPct * 0.96}%`, height: `${hPct * 0.96}%`,
              transform: 'translate(-50%, -50%)', borderRadius: 8,
              border: `2px dashed ${hue}`,
              boxShadow: `0 0 0 2px color-mix(in srgb, ${hue} 22%, transparent)`,
            }}
          />
        )
      })}

      {landing.kind !== 'too-short' && (
        <div
          data-landing={landing.square}
          style={{ position: 'absolute', ...pos(landing.square), transform: 'translate(-50%, -50%)', width: `${wPct}%`, height: `${hPct}%`, display: 'grid', placeItems: 'center' }}
        >
          <div style={{ width: '68%', height: '68%', borderRadius: '50%', border: '3px solid var(--ink)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--ink) 20%, transparent)' }} />
          <span
            style={{
              position: 'absolute', top: '100%', marginTop: 3, whiteSpace: 'nowrap',
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
              background: 'var(--ink)', color: 'var(--paper)',
            }}
          >
            {label(landing)}
          </span>
        </div>
      )}
    </div>
  )
}
