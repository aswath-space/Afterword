import type { Board, PlayerState } from '../engine/types'
import type { Stamp } from '../store/gameStore'
import { boardLayout } from './boardLayout'

// A DOM overlay that imprints each played word's letters onto the board squares it
// walked. Sits above the static BoardView (covering that square's number, which is
// re-shown small in the corner) and below the token layer. Read-only / decorative.
//
// When `board` is provided, stamps on snake HEADS and ladder FEET render as a small
// corner badge (bottom-left, ~38% of the cell) instead of a full tile, so the
// snake/ladder art underneath — the board's danger information — stays visible.
// Snake tails and ladder tops keep full tiles: they are destinations, not decision
// points, so covering their art costs nothing gameplay-wise.
export function StampLayer({ stamps, length, players, board }: { stamps: Record<number, Stamp>; length: number; players: PlayerState[]; board?: Board }) {
  const layout = boardLayout(length)
  const wPct = 100 / layout.cols
  const hPct = 100 / layout.rows
  const colorOf = (id: string) => players.find((p) => p.id === id)?.color ?? 'var(--line)'
  const badgeSquares = new Set<number>()
  if (board) {
    for (const s of board.snakes) badgeSquares.add(s.head)
    for (const l of board.ladders) badgeSquares.add(l.foot)
  }

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Object.entries(stamps).map(([sqStr, stamp]) => {
        const sq = Number(sqStr)
        const c = layout.centerOf(sq)
        const left = (c.x / layout.width) * 100
        const top = (c.y / layout.height) * 100
        const tileStyle = {
          position: 'absolute' as const,
          containerType: 'size' as const,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 6,
          background: 'linear-gradient(180deg, var(--tile), var(--tile-2))',
          boxShadow: 'inset 0 2px 0 var(--deboss-hi), inset 0 -3px 4px var(--deboss-lo), 0 1px 0 var(--deboss-hi)',
          borderBottom: `2px solid ${colorOf(stamp.playerId)}`,
        }
        const letterStyle = {
          fontFamily: 'var(--font-serif)',
          fontWeight: 600,
          lineHeight: 1,
          color: 'var(--ink)',
          textShadow: '0 1px 0 var(--deboss-hi), 0 -1px 1px var(--deboss-lo)',
        }

        if (badgeSquares.has(sq)) {
          // Corner badge: bottom-left of the cell, leaves the feature art visible.
          return (
            <div
              key={sq}
              data-stamp={sq}
              data-stamp-badge=""
              style={{
                ...tileStyle,
                left: `${left - wPct / 2 + wPct * 0.04}%`,
                top: `${top + hPct / 2 - hPct * 0.42}%`,
                width: `${wPct * 0.38}%`,
                height: `${hPct * 0.38}%`,
              }}
            >
              <span style={{ ...letterStyle, fontSize: '58cqmin' }}>{stamp.letter}</span>
            </div>
          )
        }

        return (
          <div
            key={sq}
            data-stamp={sq}
            style={{
              ...tileStyle,
              left: `${left}%`,
              top: `${top}%`,
              width: `${wPct * 0.88}%`,
              height: `${hPct * 0.88}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span style={{ ...letterStyle, fontSize: '52cqmin' }}>{stamp.letter}</span>
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
