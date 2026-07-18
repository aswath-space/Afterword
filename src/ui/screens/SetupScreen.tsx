import { useState } from 'react'
import { Header } from '../Header'
import { EmblemChip } from '../EmblemChip'
import type { GameConfig, TurnTimer } from '../../engine/types'
import type { SharedBoard } from '../../share/boardCodec'

const IDENTITY = [
  { color: 'var(--p1)', emblem: 'circle' },
  { color: 'var(--p2)', emblem: 'diamond' },
  { color: 'var(--p3)', emblem: 'triangle' },
  { color: 'var(--p4)', emblem: 'hex' },
] as const

const LENGTHS: Array<{ v: 30 | 50 | 100; label: string }> = [
  { v: 30, label: 'Quick' }, { v: 50, label: 'Standard' }, { v: 100, label: 'Marathon' },
]
const TIMERS: Array<{ v: TurnTimer; label: string }> = [
  { v: 'off', label: 'Off' }, { v: 30, label: '30s' }, { v: 60, label: '60s' },
]

function Segmented<T extends string | number>({ options, value, onChange, label, disabled = false }: {
  options: Array<{ v: T; label: string }>; value: T; onChange: (v: T) => void; label: string; disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'inline-flex', border: '1px solid var(--line)', borderRadius: 999, overflow: 'hidden', opacity: disabled ? 0.55 : 1 }}>
      {options.map((o) => (
        <button
          key={String(o.v)}
          role="radio"
          aria-checked={o.v === value}
          disabled={disabled}
          onClick={() => onChange(o.v)}
          style={{
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, padding: '9px 16px', cursor: disabled ? 'default' : 'pointer', border: 'none', minHeight: 44,
            background: o.v === value ? 'var(--teal)' : 'transparent',
            color: o.v === value ? 'var(--tile)' : 'var(--ink)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SetupScreen({ onStart, sharedBoard = null, onClearShared }: {
  onStart: (config: GameConfig) => void
  // A decoded `?b=` link: the board (seed + length) is fixed so everyone plays the
  // exact same snakes and ladders; players/timer stay configurable.
  sharedBoard?: SharedBoard | null
  onClearShared?: () => void
}) {
  const [names, setNames] = useState<string[]>(['Player 1', 'Player 2'])
  const [boardLength, setBoardLength] = useState<30 | 50 | 100>(50)
  const [timer, setTimer] = useState<TurnTimer>('off')
  const effectiveLength = sharedBoard?.length ?? boardLength

  const setName = (i: number, v: string) => setNames(names.map((n, j) => (j === i ? v : n)))
  const addPlayer = () => { if (names.length < 4) setNames([...names, `Player ${names.length + 1}`]) }
  const removePlayer = (i: number) => { if (names.length > 2) setNames(names.filter((_, j) => j !== i)) }

  const start = () => {
    onStart({
      players: names.map((n, i) => ({
        id: `p${i + 1}`,
        name: n.trim() || `Player ${i + 1}`,
        color: IDENTITY[i].color,
        emblem: IDENTITY[i].emblem,
      })),
      boardLength: effectiveLength,
      timer,
      seed: sharedBoard?.seed ?? Math.random().toString(36).slice(2, 10),
    })
  }

  const label = { fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--ink-soft)', margin: '0 0 8px' }

  return (
    <div>
      <Header />
      <p style={{ margin: '0 0 20px', fontSize: 'var(--fs-body, 14px)', lineHeight: 1.55, color: 'var(--ink-soft)' }}>
        <b style={{ color: 'var(--ink)' }}>How it works:</b> each word must start with the last letter of the word before it —{' '}
        <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}>CARD → DREAM → MORE</span>. Longer words move you farther; land on a ladder to climb, dodge the snakes.
      </p>
      <section style={{ display: 'grid', gap: 22 }}>
        <div>
          <h2 style={label}>Players</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {names.map((n, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <EmblemChip color={IDENTITY[i].color} emblem={IDENTITY[i].emblem} size={16} />
                <input
                  aria-label={`Player name ${i + 1}`}
                  value={n}
                  onChange={(e) => setName(i, e.target.value)}
                  style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--ink)', background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}
                />
                {names.length > 2 && (
                  <button aria-label={`Remove player ${i + 1}`} onClick={() => removePlayer(i)} style={{ border: 'none', background: 'transparent', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 20, minWidth: 44, minHeight: 44, display: 'grid', placeItems: 'center' }}>×</button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addPlayer}
            disabled={names.length >= 4}
            style={{ marginTop: 10, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: names.length >= 4 ? 'var(--ink-soft)' : 'var(--teal)', background: 'transparent', border: '1px dashed var(--line)', borderRadius: 10, padding: '9px 14px', minHeight: 44, cursor: names.length >= 4 ? 'default' : 'pointer' }}
          >
            + Add player
          </button>
        </div>

        <div>
          <h2 style={label}>Board</h2>
          {sharedBoard && (
            <div
              data-shared-chip
              style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingLeft: 12,
                width: 'fit-content', maxWidth: '100%',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink)',
                border: '1px solid var(--teal)', borderRadius: 999,
                background: 'color-mix(in srgb, var(--teal) 10%, transparent)',
              }}
            >
              {/* Name the size in text: the locked radiogroup is out of the tab order,
                  so this line is what screen-reader users get. */}
              <span>
                Playing a shared {LENGTHS.find((l) => l.v === sharedBoard.length)?.label ?? sharedBoard.length} board
                ({sharedBoard.length} squares) — same snakes &amp; ladders for everyone
              </span>
              <button
                aria-label="Leave the shared board"
                onClick={() => onClearShared?.()}
                style={{ border: 'none', background: 'transparent', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 18, minWidth: 44, minHeight: 44, display: 'grid', placeItems: 'center' }}
              >
                ×
              </button>
            </div>
          )}
          <Segmented options={LENGTHS} value={effectiveLength} onChange={setBoardLength} label="Board length" disabled={!!sharedBoard} />
        </div>

        <div>
          <h2 style={label}>Turn timer</h2>
          <Segmented options={TIMERS} value={timer} onChange={setTimer} label="Turn timer" />
        </div>

        <button
          onClick={start}
          // Darkened terracotta + literal cream so the primary CTA clears WCAG AA in
          // both themes (bright terracotta on cream was only 3.9:1). Same recipe as the
          // in-game Go button; measured ~6.9:1 light / ~5.1:1 dark.
          style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 17, color: '#F3EAD7', background: 'color-mix(in srgb, var(--terracotta) 60%, #23190E)', border: 'none', borderRadius: 12, padding: '15px 20px', minHeight: 44, cursor: 'pointer' }}
        >
          Start game
        </button>
      </section>
    </div>
  )
}
