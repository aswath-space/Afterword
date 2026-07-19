// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { ContextStrip } from './ContextStrip'
import type { PlayerState } from '../engine/types'

afterEach(() => cleanup())

const player: PlayerState = { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 4 }

describe('ContextStrip', () => {
  it('shows the player, the required-letter tile, and a live landing readout', () => {
    const { getByText, container } = render(
      <ContextStrip player={player} requiredLetter="S" landing={{ kind: 'plain', square: 9 }} />,
    )
    expect(getByText('Ana')).toBeTruthy()
    expect(container.querySelector('[data-letter-tile]')?.textContent).toBe('S')
    expect(getByText('→ land 9')).toBeTruthy()
  })

  it('reads "any word" when the chain has no required letter yet', () => {
    const { container } = render(<ContextStrip player={player} requiredLetter={null} landing={null} />)
    expect(container.querySelector('[data-letter-tile]')?.textContent).toBe('any word')
  })

  it('ghosts the readout when the draft breaks the first-letter rule', () => {
    const { getByText } = render(
      <ContextStrip player={player} requiredLetter="S" landing={{ kind: 'plain', square: 9 }} draftValid={false} />,
    )
    expect(getByText('needs S')).toBeTruthy()
  })

  it('shows ladder and win consequences in the readout', () => {
    const ladder = render(
      <ContextStrip player={player} requiredLetter="S" landing={{ kind: 'ladder', square: 9, top: 21 }} />,
    )
    expect(ladder.getByText('▲ climbs to 21')).toBeTruthy()
    cleanup()
    const win = render(
      <ContextStrip player={player} requiredLetter="S" landing={{ kind: 'win', square: 30 }} />,
    )
    expect(win.getByText('WIN!')).toBeTruthy()
  })

  it('a rejection beats the landing readout', () => {
    const { getByText, queryByText } = render(
      <ContextStrip
        player={player}
        requiredLetter="S"
        landing={{ kind: 'plain', square: 9 }}
        feedbackText="Must start with S"
      />,
    )
    expect(getByText('Must start with S')).toBeTruthy()
    expect(queryByText('→ land 9')).toBeNull()
  })

  it('escape mode states the any-word rule and the needed length', () => {
    const { getByText, container } = render(
      <ContextStrip player={player} requiredLetter={null} landing={null} mode="escape" need={8} />,
    )
    expect(getByText('any word · 8+ letters')).toBeTruthy()
    expect(container.querySelector('[data-letter-tile]')).toBeNull() // chain letter is suspended
  })
})
