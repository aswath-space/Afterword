import type { GamePhase, PlayerState } from '../engine/types'
import { formatClock } from './useCountdown'
import { EmblemChip } from './EmblemChip'
import { EscapeRing } from './EscapeRing'

type Props = {
  player: PlayerState
  phase: GamePhase
  requiredLetter: string | null
  // The rescue word length actually required during an escape (already capped).
  need: number | null
  remainingMs: number
  showClock: boolean
  presenting?: boolean
  // The player has opened the "Stuck?" any-word mode — the start-letter rule is off.
  stuckMode?: boolean
  escapeTotalMs?: number
}

export function TurnHud({ player, phase, requiredLetter, need, remainingMs, showClock, presenting = false, stuckMode = false, escapeTotalMs }: Props) {
  const escape = phase === 'awaiting-escape'
  const won = phase === 'won'
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
      {/* Live region so screen readers announce turn hand-offs + the required letter.
          The clock is a sibling (outside this region) so it doesn't spam per-tick. */}
      <div aria-live="polite">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
          <EmblemChip color={player.color} emblem={player.emblem} size={12} />
          <span style={{ color: 'var(--ink)', fontSize: 'var(--fs-hud-name, 16px)' }}>{player.name}{won ? ' wins!' : '’s turn'}</span>
        </div>
        {/* While the token is animating (presenting), attribute it to the acting player
            above but drop the detail line — its context belongs to the committed next turn.
            A won game keeps just the headline while the winning walk settles. */}
        {!presenting && !won && (escape ? (
          <div style={{ fontSize: 'var(--fs-hud-detail, 14px)', color: 'var(--ink-soft)', marginTop: 4 }}>
            Escape! Play <b style={{ color: 'var(--teal)' }}>≥ {need}</b> letters — any start
          </div>
        ) : stuckMode ? (
          <div style={{ fontSize: 'var(--fs-hud-detail, 14px)', color: 'var(--ink-soft)', marginTop: 4 }}>
            play <b style={{ color: 'var(--teal)' }}>any word</b> — you stay put
          </div>
        ) : (
          <div style={{ fontSize: 'var(--fs-hud-detail, 14px)', color: 'var(--ink-soft)', marginTop: 4 }}>
            {requiredLetter ? (
              <>start with <b className="aw-glow" style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--fs-hud-letter, 18px)', color: 'var(--teal)' }}>{requiredLetter}</b></>
            ) : (
              <>play <b style={{ color: 'var(--teal)' }}>any word</b> — its last letter starts the chain</>
            )}
          </div>
        ))}
      </div>
      {showClock && !presenting && (
        escape ? (
          <EscapeRing remainingMs={remainingMs} totalMs={escapeTotalMs ?? remainingMs} />
        ) : (
          <div
            data-clock
            style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}
          >
            {formatClock(remainingMs)}
          </div>
        )
      )}
    </div>
  )
}
