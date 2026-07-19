import type { Board, PlayerState } from '../engine/types'
import { boardLayout } from './boardLayout'
import { capturePreview, previewLanding, reachFeatures, type Landing } from './aiming'

function label(l: Landing): string {
  switch (l.kind) {
    case 'win': return 'WIN'
    case 'ladder': return `▲ climbs to ${l.top}`
    case 'snake': return `▼ drops to ${l.tail}`
    case 'plain': return `land ${l.square}`
    case 'too-short': return ''
  }
}

export function AimLayer({ board, from, draftLength, reach = 12, showReach = true, draftValid = true, requiredLetter = null, players = [], moverId = '', captureOn = false }: { board: Board; from: number; draftLength: number; reach?: number; showReach?: boolean; draftValid?: boolean; requiredLetter?: string | null; players?: PlayerState[]; moverId?: string; captureOn?: boolean }) {
  const layout = boardLayout(board.length)
  const wPct = 100 / layout.cols
  const hPct = 100 / layout.rows
  const pos = (square: number) => {
    const c = layout.centerOf(square)
    return { left: `${(c.x / layout.width) * 100}%`, top: `${(c.y / layout.height) * 100}%` }
  }
  const features = reachFeatures(board, from, reach)
  const landing = previewLanding(board, from, draftLength)
  // A bump the current draft would land: shown as a tag on the landing label so the
  // player aims it deliberately. Only a plain landing on an opponent reads as a bump
  // (a ladder/snake/win at the square is the headline instead).
  const bump = draftValid && landing.kind === 'plain' ? capturePreview(board, players, from, draftLength, moverId, captureOn) : null

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
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', bottom: 1, right: 3,
                fontFamily: 'var(--font-sans)', fontSize: 10, lineHeight: 1,
                color: hue, pointerEvents: 'none',
              }}
            >
              {f.kind === 'ladder' ? '▲' : '▼'}
            </span>
          </div>
        )
      })}

      {landing.kind !== 'too-short' && (
        <div
          data-landing={landing.square}
          style={{ position: 'absolute', ...pos(landing.square), transform: 'translate(-50%, -50%)', width: `${wPct}%`, height: `${hPct}%`, display: 'grid', placeItems: 'center' }}
        >
          <div
            style={{
              width: '68%', height: '68%', borderRadius: '50%',
              border: draftValid ? '3px solid var(--ink)' : '3px dashed var(--ink-soft)',
              boxShadow: draftValid ? '0 0 0 3px color-mix(in srgb, var(--ink) 20%, transparent)' : 'none',
            }}
          />
          <span
            style={{
              position: 'absolute', top: '100%', marginTop: 3, whiteSpace: 'nowrap',
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
              // Darkened terracotta (mixed with --ink) so cream text clears AA in both themes.
              background: bump ? 'color-mix(in srgb, var(--terracotta) 55%, var(--ink))' : draftValid ? 'var(--ink)' : 'var(--ink-soft)', color: 'var(--paper)',
            }}
          >
            {draftValid || !requiredLetter
              ? (bump ? `bumps ${bump.victim.name} → ${bump.to}` : label(landing))
              : `needs ${requiredLetter}`}
          </span>
        </div>
      )}
    </div>
  )
}
