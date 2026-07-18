import { useState } from 'react'
import { useTheme } from './useTheme'
import { DisplayDialog } from './DisplayDialog'

export function Header({ compact = false, onNewGame }: { compact?: boolean; onNewGame?: () => void } = {}) {
  const [theme, toggle] = useTheme()
  const [displayOpen, setDisplayOpen] = useState(false)

  const newGameBtn = onNewGame ? (
    <button
      onClick={onNewGame}
      style={{
        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
        color: 'var(--ink-soft)', background: 'transparent', border: '1px solid var(--line)',
        borderRadius: 999, padding: '0 12px', cursor: 'pointer', whiteSpace: 'nowrap',
        minHeight: 44, display: 'inline-flex', alignItems: 'center', // ≥44px tap target
      }}
    >
      New game
    </button>
  ) : null

  const themeBtn = (
    <button
      onClick={toggle}
      aria-label="Switch theme"
      title={theme === 'dark' ? 'Foolscap' : 'Reading Lamp'}
      style={{
        fontFamily: 'var(--font-sans)', fontSize: compact ? 16 : 12.5, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--ink)', background: 'var(--tile)', border: '1px solid var(--line)',
        borderRadius: 999, padding: compact ? '0 10px' : '0 16px', cursor: 'pointer', lineHeight: 1,
        minHeight: 44, minWidth: compact ? 44 : undefined, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', // ≥44px tap target
      }}
    >
      {compact ? '◐' : `◐ ${theme === 'dark' ? 'Foolscap' : 'Reading Lamp'}`}
    </button>
  )

  const aaBtn = (
    <button
      onClick={() => setDisplayOpen(true)}
      aria-label="Display settings"
      style={{
        fontFamily: 'var(--font-sans)', fontSize: compact ? 15 : 14, fontWeight: 700,
        color: 'var(--ink)', background: 'var(--tile)', border: '1px solid var(--line)',
        borderRadius: 999, padding: compact ? '0 10px' : '0 14px', cursor: 'pointer', lineHeight: 1,
        minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', // ≥44px tap target
      }}
    >
      Aa
    </button>
  )

  if (compact) {
    return (
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        {/* Wordmark shrinks a touch on very narrow screens so the 3-button group fits at 320px. */}
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(18px, 5.6vw, 22px)', margin: 0, lineHeight: 1 }}>
          <span style={{ color: 'var(--ink-soft)' }}>After</span>
          <span style={{ color: 'var(--teal)' }}>word</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {newGameBtn}
          {aaBtn}
          {themeBtn}
        </div>
        <DisplayDialog open={displayOpen} onClose={() => setDisplayOpen(false)} />
      </header>
    )
  }

  return (
    <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(34px,7vw,56px)', margin: 0, lineHeight: 0.95 }}>
          <span style={{ color: 'var(--ink-soft)' }}>After</span>
          <span style={{ color: 'var(--teal)', borderBottom: '3px solid color-mix(in srgb, var(--teal) 55%, transparent)', paddingBottom: 3 }}>word</span>
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '8px 0 0' }}>
          Build one shared chain of words, race a snakes-and-ladders board.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {aaBtn}
        {themeBtn}
      </div>
      <DisplayDialog open={displayOpen} onClose={() => setDisplayOpen(false)} />
    </header>
  )
}
