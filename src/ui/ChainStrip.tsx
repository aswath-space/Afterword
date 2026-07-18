import { useEffect, useRef } from 'react'
import type { ChainEntry } from '../store/gameStore'
import type { PlayerState } from '../engine/types'

export function ChainStrip({ entries, players }: { entries: ChainEntry[]; players: PlayerState[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const colorOf = (id: string) => players.find((p) => p.id === id)?.color ?? 'var(--ink)'

  // Pop the newest entry only when the chain GREW — when a take-back shrinks it,
  // the previous word must not re-bounce as if it were just played.
  const prevLen = useRef(0)
  const grew = entries.length > prevLen.current
  useEffect(() => { prevLen.current = entries.length }, [entries.length])

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollLeft = el.scrollWidth // keep newest in view
  }, [entries.length])

  return (
    <div
      ref={ref}
      aria-label="Word chain"
      // minWidth/maxWidth make the strip yield to ANY ancestor (grid tracks size to
      // min-content by default, which would let the strip widen the page instead of
      // scrolling — seen as a transient page overflow on the win screen).
      style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '12px 2px', margin: '10px 0', minWidth: 0, maxWidth: '100%' }}
    >
      {entries.length === 0 && (
        <span style={{ fontSize: 'var(--fs-chain-empty, 13px)', color: 'var(--ink-soft)' }}>The chain starts here…</span>
      )}
      {entries.map((e, i) => (
        <span
          key={i}
          data-chain-entry
          className={grew && i === entries.length - 1 ? 'aw-pop' : undefined}
          style={{
            display: 'inline-flex', alignItems: 'baseline', gap: 2, flex: '0 0 auto',
            fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'var(--fs-chain-word, 18px)', color: 'var(--ink)',
            borderBottom: `3px solid ${colorOf(e.playerId)}`, paddingBottom: 3,
          }}
        >
          {e.word}
          <sup
            className={e.kind === 'stuck' ? 'aw-stuck' : undefined}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-chain-sup, 11px)', color: 'var(--ink-soft)' }}
          >
            +{e.squares}
          </sup>
        </span>
      ))}
    </div>
  )
}
