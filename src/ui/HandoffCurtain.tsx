import { useRef } from 'react'
import type { PlayerState } from '../engine/types'
import { useModalFocus } from './useModalFocus'
import { UNDO_PENALTY } from '../store/gameStore'

// Whole-surface tap arms shortly after mount so the previous player's final tap
// (the one that ended their turn) can't bleed through and instantly start the
// next turn. The Start button itself stays live for keyboard/AT users.
const ARM_DELAY_MS = 300

// The last-move story shown to the INCOMING player — they never saw the
// previous move play out (the animation ran for the player before them).
export type HandoffRecap = {
  word: string
  playerName: string
  playerColor: string
  from: number
  to: number
  feature?: 'ladder' | 'snake-slid' | 'snake-escaped'
}

/** The played word, mirroring the ChainStrip treatment: serif 600 over a 3px underline in the mover's colour. */
function RecapWord({ word, color }: { word: string; color: string }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--ink)',
        borderBottom: `3px solid ${color}`, paddingBottom: 2,
      }}
    >
      {word}
    </span>
  )
}

function recapStory(r: HandoffRecap) {
  const word = <RecapWord word={r.word} color={r.playerColor} />
  switch (r.feature) {
    case 'ladder':
      return (
        <>
          {word}
          {' landed on a ladder — '}
          <span style={{ color: 'var(--brass)' }}>▲</span>
          {` climbed ${r.from} → ${r.to}`}
        </>
      )
    case 'snake-slid':
      return (
        <>
          {word}
          {' found a snake — '}
          <span style={{ color: 'var(--plum)' }}>▼</span>
          {` slid ${r.from} → ${r.to}`}
        </>
      )
    case 'snake-escaped':
      return (
        <>
          {word}
          {` hit a snake at ${r.from} — but ${r.playerName} escaped`}
        </>
      )
    default:
      return (
        <>
          {`${r.playerName} played `}
          {word}
          {` — ${r.from} to ${r.to}`}
        </>
      )
  }
}

export function HandoffCurtain({ player, onStart, takeBack, firstTurn, recap, requiredLetter }: {
  player: PlayerState
  onStart: () => void
  // The take-back window: the previous mover can still reclaim their word while the
  // phone is being passed. Absent once the window closes (or nothing was played).
  // playerName attributes the link to the PREVIOUS mover, so the incoming player
  // doesn't read it as their own action.
  takeBack?: { word: string; free: boolean; onTakeBack: () => void; playerName?: string }
  // First curtain of the game: nobody is passing anything yet.
  firstTurn?: boolean
  // What just happened, told to the player who wasn't watching.
  recap?: HandoffRecap | null
  // The letter the next word must start with — shown so the pass moment doubles
  // as think-ahead time.
  requiredLetter?: string | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, { open: true, dismissible: false }) // no onClose → ESC is a no-op
  const mountedAt = useRef(Date.now())
  const startIfArmed = () => {
    if (Date.now() - mountedAt.current >= ARM_DELAY_MS) onStart()
  }
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={firstTurn ? `First up: ${player.name}` : `Pass to ${player.name}`}
      onClick={startIfArmed}
      style={{
        position: 'absolute', inset: 0, zIndex: 5, display: 'grid', placeItems: 'center', textAlign: 'center',
        borderRadius: 14, padding: 24, cursor: 'pointer',
        background: `linear-gradient(180deg, color-mix(in srgb, ${player.color} 22%, var(--paper)), var(--paper))`,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
          {firstTurn ? 'First up' : 'Pass to'}
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
        {firstTurn && (
          <div
            style={{
              marginTop: 12, fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-secondary, 14px)',
              color: 'var(--ink-soft)', maxWidth: 300, marginInline: 'auto', lineHeight: 1.45,
            }}
          >
            Any word starts the chain — every letter is a step.
          </div>
        )}
        {recap && (
          <div
            style={{
              marginTop: 12, fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-secondary, 14px)',
              color: 'var(--ink-soft)', maxWidth: 330, marginInline: 'auto', lineHeight: 1.5,
            }}
          >
            {recapStory(recap)}
          </div>
        )}
        {requiredLetter && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
              start with
            </span>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40,
                background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 8,
                boxShadow: 'inset 0 2px 0 var(--deboss-hi), inset 0 -3px 4px var(--deboss-lo)',
                fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 24, color: 'var(--ink)',
              }}
            >
              {requiredLetter.toUpperCase()}
            </span>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onStart() }}
          autoFocus
          style={{
            marginTop: 18, fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, color: 'var(--tile)',
            background: player.color, border: 'none', borderRadius: 999, padding: '13px 30px', cursor: 'pointer',
          }}
        >
          Start turn
        </button>
        <div style={{ marginTop: 10, fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
          tap anywhere
        </div>
        {takeBack && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={(e) => { e.stopPropagation(); takeBack.onTakeBack() }}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-secondary, 13px)', fontWeight: 600, color: 'var(--ink-soft)',
                background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                minHeight: 44, display: 'inline-flex', alignItems: 'center',
              }}
            >
              ↩ {takeBack.playerName ? `${takeBack.playerName} — take back ${takeBack.word}` : `Take back ${takeBack.word}`}{' '}
              {takeBack.free ? '(free)' : `(−${UNDO_PENALTY} squares)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
