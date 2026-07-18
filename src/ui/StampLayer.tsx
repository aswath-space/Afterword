import type { PlayerState } from '../engine/types'
import type { Stamp } from '../store/gameStore'
import { boardLayout } from './boardLayout'

// A DOM overlay that imprints each played word's letters onto the board squares it
// walked. Sits above the static BoardView (covering that square's number, which is
// re-shown small in the corner) and below the token layer. Read-only / decorative.
export function StampLayer({ stamps, length, players }: { stamps: Record<number, Stamp>; length: number; players: PlayerState[] }) {
  const layout = boardLayout(length)
  const wPct = 100 / layout.cols
  const hPct = 100 / layout.rows
  const colorOf = (id: string) => players.find((p) => p.id === id)?.color ?? 'var(--line)'

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Object.entries(stamps).map(([sqStr, stamp]) => {
        const sq = Number(sqStr)
        const c = layout.centerOf(sq)
        const left = (c.x / layout.width) * 100
        const top = (c.y / layout.height) * 100
        return (
          <div
            key={sq}
            data-stamp={sq}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: `${wPct * 0.88}%`,
              height: `${hPct * 0.88}%`,
              transform: 'translate(-50%, -50%)',
              containerType: 'size',
              display: 'grid',
              placeItems: 'center',
              borderRadius: 6,
              background: 'linear-gradient(180deg, var(--tile), var(--tile-2))',
              boxShadow: 'inset 0 2px 0 var(--deboss-hi), inset 0 -3px 4px var(--deboss-lo), 0 1px 0 var(--deboss-hi)',
              borderBottom: `2px solid ${colorOf(stamp.playerId)}`,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 600,
                fontSize: '52cqmin',
                lineHeight: 1,
                color: 'var(--ink)',
                textShadow: '0 1px 0 var(--deboss-hi), 0 -1px 1px var(--deboss-lo)',
              }}
            >
              {stamp.letter}
            </span>
            <span
              style={{
                position: 'absolute',
                top: '6%',
                left: '10%',
                fontFamily: 'var(--font-sans)',
                fontSize: '16cqmin',
                lineHeight: 1,
                color: 'var(--ink-soft)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {sq}
            </span>
          </div>
        )
      })}
    </div>
  )
}
