// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { HandoffCurtain } from './HandoffCurtain'
import { UNDO_PENALTY } from '../store/gameStore'
import type { PlayerState } from '../engine/types'

const player: PlayerState = { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 0 }

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('HandoffCurtain', () => {
  it('names the incoming player and starts on tap', () => {
    const onStart = vi.fn()
    const { getByText, getByRole } = render(<HandoffCurtain player={player} onStart={onStart} />)
    expect(getByText('Ben')).toBeTruthy()
    fireEvent.click(getByRole('button', { name: /start/i }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('traps focus and ignores ESC (non-dismissible)', () => {
    const onStart = vi.fn()
    const player: PlayerState = { id: 'p1', name: 'Ada', color: '#6D351E', emblem: 'circle', square: 3 }
    const { getByRole, getByText } = render(<HandoffCurtain player={player} onStart={onStart} />)
    // focus lands on the Start turn button
    expect(document.activeElement).toBe(getByText('Start turn'))
    // ESC must NOT dismiss a hand-off
    fireEvent.keyDown(getByRole('dialog'), { key: 'Escape' })
    expect(onStart).not.toHaveBeenCalled()
  })

  describe('last-move recap', () => {
    const base = { word: 'DREAM', playerName: 'Ada', playerColor: '#BE5430', from: 4, to: 12 }

    it('tells a plain move with the word underlined in the mover colour', () => {
      const { getByRole, getByText } = render(<HandoffCurtain player={player} onStart={() => {}} recap={base} />)
      expect(getByRole('dialog').textContent).toContain('Ada played DREAM — 4 to 12')
      // ChainStrip treatment: 3px underline in the mover's colour under the serif word
      const word = getByText('DREAM')
      expect(word.style.borderBottomColor).toBe('rgb(190, 84, 48)')
      expect(word.style.borderBottomWidth).toBe('3px')
    })

    it('tells a ladder climb with a brass ▲', () => {
      const { getByRole, getByText } = render(
        <HandoffCurtain player={player} onStart={() => {}} recap={{ ...base, from: 13, to: 23, feature: 'ladder' }} />,
      )
      expect(getByRole('dialog').textContent).toContain('DREAM landed on a ladder — ▲ climbed 13 → 23')
      expect(getByText('▲').style.color).toBe('var(--brass)')
    })

    it('tells a snake slide with a plum ▼', () => {
      const { getByRole, getByText } = render(
        <HandoffCurtain player={player} onStart={() => {}} recap={{ ...base, from: 32, to: 24, feature: 'snake-slid' }} />,
      )
      expect(getByRole('dialog').textContent).toContain('DREAM found a snake — ▼ slid 32 → 24')
      expect(getByText('▼').style.color).toBe('var(--plum)')
    })

    it('tells an escaped snake bite', () => {
      const { getByRole } = render(
        <HandoffCurtain player={player} onStart={() => {}} recap={{ ...base, from: 32, to: 32, feature: 'snake-escaped' }} />,
      )
      expect(getByRole('dialog').textContent).toContain('DREAM hit a snake at 32 — but Ada escaped')
    })
  })

  it('first turn: teaches the chain rule and never says "Pass to"', () => {
    const { getByText, queryByText } = render(<HandoffCurtain player={player} onStart={() => {}} firstTurn />)
    expect(getByText('First up')).toBeTruthy()
    expect(getByText('Any word starts the chain — every letter is a step.')).toBeTruthy()
    expect(queryByText(/pass to/i)).toBeNull()
  })

  it('shows the required starting letter as a tile', () => {
    const { getByText } = render(<HandoffCurtain player={player} onStart={() => {}} requiredLetter="d" />)
    expect(getByText('start with')).toBeTruthy()
    const tile = getByText('D')
    expect(tile.style.fontFamily).toBe('var(--font-serif)')
    expect(tile.style.width).toBe('40px')
  })

  it('whole-surface tap starts the turn only after the arming delay', () => {
    vi.useFakeTimers()
    const onStart = vi.fn()
    const { getByRole } = render(<HandoffCurtain player={player} onStart={onStart} />)
    const dialog = getByRole('dialog')
    // the previous player's tap bleeding through right after the curtain mounts
    fireEvent.click(dialog)
    expect(onStart).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    fireEvent.click(dialog)
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('take-back is attributed to the previous mover and never starts the turn', () => {
    vi.useFakeTimers()
    const onStart = vi.fn()
    const onTakeBack = vi.fn()
    const { getByRole } = render(
      <HandoffCurtain
        player={player}
        onStart={onStart}
        takeBack={{ word: 'DREAM', free: false, playerName: 'Ada', onTakeBack }}
      />,
    )
    vi.advanceTimersByTime(400) // fully armed — the click must still not leak to onStart
    const btn = getByRole('button', { name: /Ada — take back DREAM/ })
    expect(btn.textContent).toContain(`(−${UNDO_PENALTY} squares)`)
    fireEvent.click(btn)
    expect(onTakeBack).toHaveBeenCalledTimes(1)
    expect(onStart).not.toHaveBeenCalled()
  })

  it('take-back without a name keeps the unattributed label (incremental wiring)', () => {
    const onTakeBack = vi.fn()
    const { getByRole } = render(
      <HandoffCurtain player={player} onStart={() => {}} takeBack={{ word: 'MORE', free: true, onTakeBack }} />,
    )
    const btn = getByRole('button', { name: /take back MORE/i })
    expect(btn.textContent).toContain('(free)')
    fireEvent.click(btn)
    expect(onTakeBack).toHaveBeenCalledTimes(1)
  })
})
