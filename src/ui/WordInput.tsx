import { useState } from 'react'
import type { Feedback } from '../store/gameStore'
import type { RejectReason } from '../engine/types'

export function rejectMessage(reason: RejectReason, ctx: { requiredLetter: string | null; minLength: number }): string {
  switch (reason) {
    case 'wrong-start-letter': return `Must start with ${ctx.requiredLetter ?? ''}`.trim()
    case 'not-a-word': return 'Not in the word list'
    case 'already-used': return 'Already played'
    // During an escape (minLength > 3) a 1-2 letter word must not contradict the
    // "≥ N letters" placeholder with a smaller number.
    case 'too-short': return ctx.minLength > 3 ? `Needs ${ctx.minLength}+ letters to escape` : '3 letters or more'
    case 'rescue-too-short': return `Needs ${ctx.minLength}+ letters to escape`
    case 'wrong-phase': return ''
  }
}

type Props = {
  mode: 'chain' | 'escape'
  requiredLetter: string | null
  minLength: number
  feedback: Feedback | null
  onSubmit: (word: string) => boolean | void
  onClearFeedback: () => void
  onValueChange?: (text: string) => void
  onFocusChange?: (focused: boolean) => void
  accent?: string
  // False only during the brief async dictionary load (default true so callers/tests that
  // don't pass it behave exactly as before). While false the input is disabled.
  dictReady?: boolean
  // Rendered inside the input row (between field and button) — stays in view when
  // the browser scrolls the focused input on-screen (e.g. the escape countdown).
  trailing?: React.ReactNode
}

export function WordInput({ mode, requiredLetter, minLength, feedback, onSubmit, onClearFeedback, onValueChange, onFocusChange, accent, dictReady = true, trailing }: Props) {
  const [value, setValue] = useState('')
  const message = feedback ? rejectMessage(feedback.reason, { requiredLetter, minLength }) : ''

  const accented = mode !== 'escape' && !!accent
  // Darken the player hue with a FIXED dark anchor (NOT var(--ink), which flips by
  // theme) so the literal cream text stays AA-legible on every player colour in both
  // themes. 48% player / 52% anchor is the measured point where all four colours clear
  // WCAG AA (≥4.5:1) in BOTH themes — dark-mode brass is the binding case (worst 4.92:1).
  const buttonBg = mode === 'escape' ? 'var(--teal)' : accented ? `color-mix(in srgb, ${accent} 48%, #23190E)` : 'var(--terracotta)'
  const buttonColor = accented ? '#F3EAD7' : 'var(--tile)'
  const borderColor = feedback ? 'var(--terracotta)' : (accent ?? 'var(--line)')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dictReady) return
    const word = value.trim()
    if (!word) return
    // Keep the word if the move was rejected (returns false) so the player can fix a
    // typo/wrong-letter instead of retyping; clear on success (true) or void.
    if (onSubmit(word) !== false) {
      setValue('')
      onValueChange?.('')
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8, marginTop: 14 }}>
      <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); onValueChange?.(e.target.value); if (feedback) onClearFeedback() }}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          className={feedback ? 'aw-shake' : undefined}
          disabled={!dictReady}
          aria-label={mode === 'escape' ? 'Escape word' : 'Your word'}
          placeholder={!dictReady ? 'Loading dictionary…' : mode === 'escape' ? `≥ ${minLength} letters` : 'Type a word'}
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          autoFocus
          style={{
            flex: 1, minWidth: 0, fontFamily: 'var(--font-serif)', fontSize: 'var(--fs-input, 22px)', letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--ink)', background: 'var(--tile)',
            border: `2px solid ${borderColor}`, borderRadius: 10, padding: '12px 14px',
          }}
        />
        {trailing}
        <button
          type="submit"
          data-accent={accented ? 'on' : undefined}
          disabled={!dictReady}
          style={{
            fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: buttonColor,
            background: buttonBg, border: 'none',
            borderRadius: 10, padding: '0 18px', cursor: dictReady ? 'pointer' : 'default',
            opacity: dictReady ? 1 : 0.6,
          }}
        >
          {mode === 'escape' ? 'Escape' : 'Go'}
        </button>
      </div>
      <div aria-live="polite" style={{ minHeight: 18, fontSize: 'var(--fs-input-msg, 13px)', color: 'var(--terracotta)' }}>{message}</div>
    </form>
  )
}
