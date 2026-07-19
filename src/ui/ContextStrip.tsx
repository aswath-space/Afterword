import type { PlayerState } from '../engine/types'
import type { Landing } from './aiming'
import { EmblemChip } from './EmblemChip'

// The one strip of game voice that is ALWAYS on screen while typing: the browser
// keeps the focused input in view, and this rides directly above it. Carries the
// acting player, the required letter, the live landing readout (or a ghost when
// the draft breaks the chain rule), and — crucially — the rejection reason, which
// otherwise renders below the fold. (All four UX lenses converged on this.)
export function ContextStrip({
  player,
  requiredLetter,
  landing,
  draftValid = true,
  feedbackText = null,
  mode = 'chain',
  need = null,
}: {
  player: PlayerState
  requiredLetter: string | null
  landing: Landing | null
  draftValid?: boolean
  feedbackText?: string | null
  mode?: 'chain' | 'stuck' | 'escape'
  need?: number | null
}) {
  const chip = (bg: string, text: string, color = 'var(--paper)') => (
    <span
      data-strip-chip
      style={{
        fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-secondary, 13px)', fontWeight: 700,
        padding: '4px 10px', borderRadius: 8, background: bg, color, whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  )

  // What the right side says, in priority order: a rejection beats everything;
  // then the mode's own message; then the live landing readout while aiming.
  let readout: React.ReactNode = null
  if (feedbackText) readout = chip('var(--terracotta)', feedbackText)
  else if (mode === 'escape') readout = chip('var(--plum)', `any word · ${need ?? 3}+ letters`)
  else if (mode === 'stuck') readout = chip('var(--ink-soft)', 'any word · you stay put')
  else if (landing && landing.kind !== 'too-short') {
    if (!draftValid) readout = chip('var(--ink-soft)', `needs ${requiredLetter ?? 'a letter'}`)
    else if (landing.kind === 'win') readout = chip('var(--teal)', 'WIN!')
    else if (landing.kind === 'ladder') readout = chip('var(--brass)', `▲ climbs to ${landing.top}`, 'var(--ink)')
    else if (landing.kind === 'snake') readout = chip('var(--plum)', `▼ drops to ${landing.tail}`)
    else readout = chip('var(--ink)', `→ land ${landing.square}`)
  }

  return (
    <div
      data-context-strip
      style={{
        display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, minWidth: 0,
        minHeight: 36,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <EmblemChip color={player.color} emblem={player.emblem} size={11} />
        <span
          style={{
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--ink-soft)', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110,
          }}
        >
          {player.name}
        </span>
      </span>
      {mode === 'chain' && (
        <span
          data-letter-tile
          aria-label={requiredLetter ? `start with ${requiredLetter}` : 'any word'}
          style={{
            display: 'inline-grid', placeItems: 'center',
            width: requiredLetter ? 32 : 'auto', height: 32, padding: requiredLetter ? 0 : '0 10px',
            background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 8,
            boxShadow: 'inset 0 1.5px 3px color-mix(in srgb, var(--ink) 14%, transparent)',
            fontFamily: 'var(--font-serif)', fontWeight: 600,
            fontSize: requiredLetter ? 20 : 12, color: 'var(--ink)', flex: '0 0 auto',
          }}
        >
          {requiredLetter ?? 'any word'}
        </span>
      )}
      <span style={{ marginLeft: 'auto', minWidth: 0, overflow: 'hidden', display: 'inline-flex' }}>{readout}</span>
    </div>
  )
}
