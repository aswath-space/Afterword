import { useEffect, useRef, useState } from 'react'
import type { GameEvent, PlayerState } from '../engine/types'
import { EmblemChip } from './EmblemChip'

// The live race readout: players ranked by square, each showing its gap behind the
// leader, so the competition is legible at a glance. A transient flash fires on the
// two moments that matter — a bump (BUMPED!, tinted the victim's colour) and an
// overtake (OVERTAKE!, the mover's colour). Purely derived from players + the
// committed event log; no store surface of its own.
type Flash = { text: string; color: string } | null

export function StandingsStrip({ players, lastEvents, moveSeq }: {
  players: PlayerState[]; lastEvents: GameEvent[]; moveSeq: number
}) {
  const ranked = [...players].sort((a, b) => b.square - a.square)
  const leader = ranked[0]

  // Flash detection keys off a new committed move (moveSeq change), comparing the
  // previous rank order to the new one to spot an overtake.
  const prev = useRef<{ seq: number; order: string[] }>({ seq: moveSeq, order: ranked.map((p) => p.id) })
  const [flash, setFlash] = useState<Flash>(null)
  const [flashKey, setFlashKey] = useState(0)

  useEffect(() => {
    if (moveSeq === prev.current.seq) return
    const prevOrder = prev.current.order
    const nextOrder = ranked.map((p) => p.id)
    let next: Flash = null
    const cap = lastEvents.find((e) => e.type === 'CAPTURE')
    if (cap && cap.type === 'CAPTURE') {
      const victim = players.find((p) => p.id === cap.playerId)
      next = { text: 'BUMPED!', color: victim?.color ?? 'var(--terracotta)' }
    } else {
      const move = lastEvents.find((e) => e.type === 'MOVE')
      if (move && move.type === 'MOVE') {
        const m = move.playerId
        // Rank = index in the sorted order; a smaller index = ahead. Passing anyone
        // (fewer players ahead than before) is an overtake.
        if (nextOrder.indexOf(m) < prevOrder.indexOf(m)) {
          const mover = players.find((p) => p.id === m)
          next = { text: 'OVERTAKE!', color: mover?.color ?? 'var(--teal)' }
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
        position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none', minHeight: 26,
      }}
    >
      {/* SR summary of the standings; announced (politely) when the leader changes. */}
      <span aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', border: 0 }}>
        {leader ? `${leader.name} leads` : ''}
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
                color: i === 0 ? 'var(--tile)' : 'var(--ink-soft)',
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
            position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em',
            padding: '3px 10px', borderRadius: 999, color: 'var(--paper)', background: flash.color,
            boxShadow: '0 2px 8px rgba(0,0,0,0.28)', pointerEvents: 'none',
          }}
        >
          {flash.text}
        </span>
      )}
    </div>
  )
}
