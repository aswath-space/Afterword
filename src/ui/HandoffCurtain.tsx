import { useRef } from 'react'
import type { PlayerState } from '../engine/types'
import { useModalFocus } from './useModalFocus'
import { UNDO_PENALTY } from '../store/gameStore'

export function HandoffCurtain({ player, onStart, takeBack }: {
  player: PlayerState
  onStart: () => void
  // The take-back window: the previous mover can still reclaim their word while the
  // phone is being passed. Absent once the window closes (or nothing was played).
  takeBack?: { word: string; free: boolean; onTakeBack: () => void }
}) {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, { open: true, dismissible: false }) // no onClose → ESC is a no-op
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Pass to ${player.name}`}
      style={{
        position: 'absolute', inset: 0, zIndex: 5, display: 'grid', placeItems: 'center', textAlign: 'center',
        borderRadius: 14, padding: 24,
        background: `linear-gradient(180deg, color-mix(in srgb, ${player.color} 22%, var(--paper)), var(--paper))`,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
          Pass to
        </div>
        <div
          style={{
            fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 600, lineHeight: 1.1,
            // 30% ink pulls every player colour past large-text AA (3:1) against the
            // 22% tint at the gradient's top — measured worst case 3.39:1 (light brass,
            // was 2.21). Ink flips with the theme, so this darkens in light and
            // lightens in dark — identity stays, contrast holds both ways.
            color: `color-mix(in srgb, ${player.color} 70%, var(--ink))`,
          }}
        >
          {player.name}
        </div>
        <button
          onClick={onStart}
          autoFocus
          style={{
            marginTop: 18, fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, color: 'var(--tile)',
            background: player.color, border: 'none', borderRadius: 999, padding: '13px 30px', cursor: 'pointer',
          }}
        >
          Start turn
        </button>
        {takeBack && (
          <div style={{ marginTop: 14 }}>
            <button
              onClick={takeBack.onTakeBack}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-secondary, 13px)', fontWeight: 600, color: 'var(--ink-soft)',
                background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                minHeight: 44, display: 'inline-flex', alignItems: 'center',
              }}
            >
              ↩ Take back {takeBack.word} {takeBack.free ? '(free)' : `(−${UNDO_PENALTY} squares)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
