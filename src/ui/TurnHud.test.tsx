// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { TurnHud } from './TurnHud'
import type { PlayerState } from '../engine/types'

afterEach(() => cleanup())

const player: PlayerState = { id: 'p1', name: 'Dot', color: 'var(--p4)', emblem: 'hex', square: 3 }

describe('TurnHud', () => {
  it('shows the active player, the required letter, and the clock', () => {
    const { getByText, container } = render(
      <TurnHud player={player} phase="awaiting-word" requiredLetter="E" need={null} remainingMs={24000} showClock />,
    )
    expect(getByText(/Dot/)).toBeTruthy()
    expect(container.querySelector('.aw-glow')?.textContent).toBe('E')
    expect((container.querySelector('[data-clock]') as HTMLElement).textContent).toBe('0:24')
  })

  it('switches to escape copy while awaiting an escape', () => {
    const { getByText } = render(
      <TurnHud player={player} phase="awaiting-escape" requiredLetter={null} need={7} remainingMs={30000} showClock />,
    )
    expect(getByText(/Escape/)).toBeTruthy()
    expect(getByText(/7/)).toBeTruthy()
  })

  it('hides the clock when showClock is false', () => {
    const { container } = render(
      <TurnHud player={player} phase="awaiting-word" requiredLetter="A" need={null} remainingMs={0} showClock={false} />,
    )
    expect(container.querySelector('[data-clock]')).toBeNull()
  })

  it('drops the detail line while presenting (attributes the moving token to the acting player)', () => {
    const { container, queryByText, getByText } = render(
      <TurnHud player={player} phase="awaiting-word" requiredLetter="E" need={null} remainingMs={24000} showClock presenting />,
    )
    expect(getByText(/Dot/)).toBeTruthy()
    expect(queryByText(/start with/i)).toBeNull()
    expect(container.querySelector('[data-clock]')).toBeNull() // clock hidden during the animation
  })

  it('swaps the letter line for any-word copy in stuck mode', () => {
    const { getByText, queryByText } = render(
      <TurnHud player={player} phase="awaiting-word" requiredLetter="E" need={null} remainingMs={0} showClock={false} stuckMode />,
    )
    expect(getByText(/any word/)).toBeTruthy()
    expect(queryByText(/start with/i)).toBeNull()
  })

  it('announces the winner and hides the detail line once the game is won', () => {
    const { getByText, queryByText } = render(
      <TurnHud player={player} phase="won" requiredLetter="E" need={null} remainingMs={0} showClock={false} />,
    )
    expect(getByText(/Dot wins!/)).toBeTruthy()
    expect(queryByText(/start with/i)).toBeNull()
  })

  it('renders the draining ring (not the number) during an escape', () => {
    const { container } = render(
      <TurnHud player={player} phase="awaiting-escape" requiredLetter={null} need={5} remainingMs={12000} showClock escapeTotalMs={20000} />,
    )
    expect(container.querySelector('[data-escape-ring]')).toBeTruthy()
    expect(container.querySelector('[data-clock]')).toBeNull()
  })
})
