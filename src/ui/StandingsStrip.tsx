import { useEffect, useRef, useState } from 'react'
import type { GameEvent, PlayerState } from '../engine/types'
import { EmblemChip } from './EmblemChip'

// The live race readout: players ranked by square, each showing its gap behind the
// leader, so the competition is legible at a glance. A transient flash fires on the
// two moments that matter — a bump (BUMPED!, tinted the victim's colour) and an
// overtake (OVERTAKE!, the mover's colour), and each is also announced to screen
// readers. Purely derived from players + the committed event log; no store surface.
type Flash = { text: string; color: string; sr: string } | null

export function StandingsStrip({ players, lastEvents, moveSeq }: {
  players: PlayerState[]; lastEvents: GameEvent[]; moveSeq: number
}) {
  const ranked = [...players].sort((a, b) => b.square - a.square)
  const leader = ranked[0]
  const orderSig = ranked.map((p) => p.id).join(',')

  // Flash detection keys off a new committed move (moveSeq change), comparing the
  // previous rank order to the new one to spot an overtake.
  const prev = useRef<{ seq: number; order: string[] }>({ seq: moveSeq, order: ranked.map((p) => p.id) })
  const [flash, setFlash] = useState<Flash>(null)
  const [flashKey, setFlashKey] = useState(0)

  // Resync the flash baseline after a board change that did NOT advance moveSeq — an
  // undo restores positions without a move, so without this the stale baseline would
  // mis-fire (or miss) an OVERTAKE on the next real move. Mutating the ref in render is
  // safe here: idempotent, triggers no re-render.
  if (moveSeq === prev.current.seq && prev.current.order.join(',') !== orderSig) {
    prev.current = { seq: moveSeq, order: ranked.map((p) => p.id) }
  }

  useEffect(() => {
    if (moveSeq === prev.current.seq) return
    const prevOrder = prev.current.order
    const nextOrder = ranked.map((p) => p.id)
    let next: Flash = null
    const cap = lastEvents.find((e) => e.type === 'CAPTURE')
    if (cap && cap.type === 'CAPTURE') {
      const victim = players.find((p) => p.id === cap.playerId)
      next = { text: 'BUMPED!', color: victim?.color ?? 'var(--terracotta)', sr: `${victim?.name ?? 'A player'} was bumped back` }
    } else {
      const move = lastEvents.find((e) => e.type === 'MOVE')
      if (move && move.type === 'MOVE') {
        const m = move.playerId
        // Rank = index in the sorted order; a smaller index = ahead. Passing anyone
        // (fewer players ahead than before) is an overtake.
        if (nextOrder.indexOf(m) < prevOrder.indexOf(m)) {
          const mover = players.find((p) => p.id === m)
          next = { text: 'OVERTAKE!', color: mover?.color ?? 'var(--teal)', sr: `${mover?.name ?? 'A player'} overtakes` }
        }
      }
    }
    prev.current = { seq: moveSeq, order: nextOrder }
    if (next) { setFlash(next); setFlashKey((k) => k + 1) }
    // Only re-run when a new move commits; ranked/order are recomputed from current props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveSeq])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 1500)
    return () => clearTimeout(t)
  }, [flash, flashKey])

  return (
    <div
      data-standings
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 12, minHeight: 26,
        // Wrap to a second row rather than clip a player behind a scroll — at 4
        // players on a narrow phone all ranks must stay visible.
        flexWrap: 'wrap', rowGap: 6,
      }}
    >
      {/* SR summary of the standings; announced (politely) when the leader changes. */}
      <span aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', border: 0 }}>
        {leader ? `${leader.name} leads` : ''}
      </span>
      {/* Bumps/overtakes are visual-only otherwise; announce each event to SR users too. */}
      <span aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', border: 0 }}>
        {flash?.sr ?? ''}
      </span>
      {ranked.map((p, i) => {
        const behind = leader.square - p.square
        return (
          <span
            key={p.id}
            data-rank={i}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flex: '0 0 auto' }}
          >
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ink-soft)' }}>{i + 1}</span>
            <EmblemChip color={p.color} emblem={p.emblem} size={11} />
            <span
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: 'var(--ink)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 74,
              }}
            >
              {p.name}
            </span>
            <span
              data-gap
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                padding: '1px 6px', borderRadius: 999,
                // Full --ink (not --ink-soft) on the faint tint to clear AA at 11px.
                color: i === 0 ? 'var(--tile)' : 'var(--ink)',
                background: i === 0 ? 'var(--teal)' : 'color-mix(in srgb, var(--ink) 8%, transparent)',
              }}
            >
              {i === 0 ? 'Lead' : behind === 0 ? '=' : `−${behind}`}
            </span>
          </span>
        )
      })}
      {flash && (
        <span
          key={flashKey}
          data-flash
          className="aw-flash"
          style={{
            // Anchored to the top-right corner (not vertically centred over the whole
            // strip) so it overlaps at most the trailing entry of the first row, never
            // the leader or a full second row when the strip wraps at 4 players.
            position: 'absolute', right: 0, top: -1,
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em',
            padding: '3px 10px', borderRadius: 999, color: 'var(--paper)',
            // Darken the player hue with --ink so cream (--paper) text clears WCAG AA
            // in BOTH themes + the CVD palette (bg and text move oppositely by theme).
            background: `color-mix(in srgb, ${flash.color} 55%, var(--ink))`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.28)', pointerEvents: 'none',
          }}
        >
          {flash.text}
        </span>
      )}
    </div>
  )
}
