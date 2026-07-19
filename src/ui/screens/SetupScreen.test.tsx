// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup, within } from '@testing-library/react'
import { SetupScreen } from './SetupScreen'

// This repo's vitest config has no `test.globals: true` / setupFiles, so
// @testing-library/react's afterEach-based auto-cleanup never registers
// (it checks for a *global* `afterEach`). Without this, the two `it` blocks
// below share one un-cleaned jsdom document and collide on duplicate
// "Start game" text. Explicit cleanup restores per-test isolation.
afterEach(() => cleanup())

describe('SetupScreen', () => {
  it('starts with two players and can add up to four', () => {
    const { getAllByLabelText, getByText } = render(<SetupScreen onStart={() => {}} />)
    expect(getAllByLabelText(/player name/i)).toHaveLength(2)
    fireEvent.click(getByText(/add player/i))
    fireEvent.click(getByText(/add player/i))
    expect(getAllByLabelText(/player name/i)).toHaveLength(4)
    // no 5th
    expect(getByText(/add player/i).hasAttribute('disabled')).toBe(true)
  })

  it('calls onStart with a well-formed config', () => {
    const onStart = vi.fn()
    const { getByText } = render(<SetupScreen onStart={onStart} />)
    fireEvent.click(getByText('Start game'))
    expect(onStart).toHaveBeenCalledTimes(1)
    const config = onStart.mock.calls[0][0]
    expect(config.players).toHaveLength(2)
    expect(config.players[0]).toMatchObject({ id: 'p1', color: 'var(--p1)', emblem: 'circle' })
    expect(config.boardLength).toBe(50)
    expect(config.timer).toBe('off')
    expect(config.capture).toBe(true) // Bumps default on
    expect(typeof config.seed).toBe('string')
    expect(config.seed.length).toBeGreaterThan(0)
  })

  it('turning Bumps off sets capture: false in the config', () => {
    const onStart = vi.fn()
    const { getByText, getByRole } = render(<SetupScreen onStart={onStart} />)
    const bumps = getByRole('radiogroup', { name: 'Bumps' })
    fireEvent.click(within(bumps).getByText('Off'))
    fireEvent.click(getByText('Start game'))
    expect(onStart.mock.calls[0][0].capture).toBe(false)
  })

  it('locks the board to a shared link and starts with its exact seed + length', () => {
    const onStart = vi.fn()
    const { getByText, getAllByRole } = render(
      <SetupScreen onStart={onStart} sharedBoard={{ seed: 'link1234', length: 30 }} />,
    )
    expect(getByText(/playing a shared quick board \(30 squares\)/i)).toBeTruthy() // size is IN the text (SR users can't reach the locked radios)
    // The board-length radios are locked (players/timer stay usable).
    const boardRadios = getAllByRole('radio').filter((r) => ['Quick', 'Standard', 'Marathon'].includes(r.textContent ?? ''))
    expect(boardRadios.every((r) => r.hasAttribute('disabled'))).toBe(true)
    expect(boardRadios.find((r) => r.textContent === 'Quick')?.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(getByText('Start game'))
    expect(onStart.mock.calls[0][0]).toMatchObject({ seed: 'link1234', boardLength: 30 })
  })

  it('dismissing the shared-board chip hands control back via onClearShared', () => {
    const onClearShared = vi.fn()
    const { getByLabelText } = render(
      <SetupScreen onStart={() => {}} sharedBoard={{ seed: 'link1234', length: 30 }} onClearShared={onClearShared} />,
    )
    fireEvent.click(getByLabelText('Leave the shared board'))
    expect(onClearShared).toHaveBeenCalledTimes(1)
  })
})
