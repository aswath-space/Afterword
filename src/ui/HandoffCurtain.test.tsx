// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { HandoffCurtain } from './HandoffCurtain'
import type { PlayerState } from '../engine/types'

const player: PlayerState = { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 0 }

afterEach(() => cleanup())

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
})
