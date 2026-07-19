// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, within } from '@testing-library/react'
import { PlayScreen } from './PlayScreen'
import { gameStore } from '../../store/appStore'
import type { GameConfig } from '../../engine/types'

afterEach(() => cleanup())

const CONFIG: GameConfig = {
  players: [
    { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle' },
    { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond' },
  ],
  boardLength: 30, timer: 'off', seed: 'play-screen-test',
}

beforeEach(() => {
  localStorage.clear()
  gameStore.getState().newGame()
})

describe('PlayScreen', () => {
  it('shows the hand-off curtain first, then the board and input after Start', () => {
    gameStore.getState().configureAndStart(CONFIG)
    const { getByRole, container, getByText } = render(<PlayScreen />)
    // curtain up: dialog present, no word input yet
    expect(getByRole('dialog')).toBeTruthy()
    fireEvent.click(getByText(/start turn/i))
    // curtain down: board + input visible
    expect(container.querySelector('.board-svg')).toBeTruthy()
    expect(container.querySelector('input')).toBeTruthy()
  })

  it('renders a single word input (no duplicate hidden Stuck input) and a Stuck toggle', () => {
    gameStore.getState().configureAndStart(CONFIG)
    const { container, getByText } = render(<PlayScreen />)
    fireEvent.click(getByText(/start turn/i))
    expect(container.querySelectorAll('input')).toHaveLength(1)
    expect(getByText(/stuck\?/i)).toBeTruthy()
  })

  it('previews the landing square live as the player types a chain word', () => {
    gameStore.getState().configureAndStart(CONFIG)
    const { container, getByText } = render(<PlayScreen />)
    fireEvent.click(getByText(/start turn/i))
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'CAT' } }) // player at square 0 → lands on 3
    expect(container.querySelector('[data-landing="3"]')).toBeTruthy()
  })

  it('uses the compact header (no marketing tagline) on the play screen', () => {
    gameStore.getState().configureAndStart(CONFIG)
    const { queryByText } = render(<PlayScreen />)
    expect(queryByText(/build one shared chain of words/i)).toBeNull()
  })

  it('calms the board: no reach highlights while the input is blurred and empty', () => {
    gameStore.getState().configureAndStart(CONFIG)
    const { container, getByText } = render(<PlayScreen />)
    fireEvent.click(getByText(/start turn/i))
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.blur(input)
    expect(container.querySelector('[data-reach]')).toBeNull()
  })

  it('accents the primary action with the current player colour', () => {
    gameStore.getState().configureAndStart(CONFIG)
    const { container, getByText } = render(<PlayScreen />)
    fireEvent.click(getByText(/start turn/i))
    expect(container.querySelector('button[data-accent="on"]')).toBeTruthy()
  })

  it('renders the animated token layer in place of the static one', () => {
    gameStore.getState().configureAndStart(CONFIG)
    const { container, getByText } = render(<PlayScreen />)
    fireEvent.click(getByText(/start turn/i))
    expect(container.querySelector('[data-token]')).toBeTruthy() // AnimatedTokenLayer wired
  })

  it('renders the acting player in the HUD after a turn starts (Slice 2 integration non-regression)', () => {
    gameStore.getState().configureAndStart(CONFIG)
    const { getAllByText, getByText } = render(<PlayScreen />)
    fireEvent.click(getByText(/start turn/i))
    // Acting player named in the HUD AND the context strip (deliberate redundancy —
    // the strip stays visible while typing when the HUD scrolls away).
    expect(getAllByText(/Ana/).length).toBeGreaterThanOrEqual(1)
  })

  it('holds the rescue clock while the resume prompt is up, arming it fresh on release', () => {
    gameStore.getState().configureAndStart(CONFIG)
    const g = gameStore.getState().game!
    gameStore.setState({
      game: { ...g, phase: 'awaiting-escape', pendingEscape: { playerId: 'p1', fromSquare: 9, toSquare: 4, drop: 5, need: 5 } },
      handoff: false,
      deadlineTs: null,
    })
    const { rerender } = render(<PlayScreen holdClock />)
    expect(gameStore.getState().deadlineTs).toBeNull() // NOT armed behind the prompt
    rerender(<PlayScreen holdClock={false} />)         // prompt dismissed (Continue)
    expect(gameStore.getState().deadlineTs).not.toBeNull() // full window armed now
  })

  it('offers a take-back on the hand-off curtain and during an escape', () => {
    gameStore.getState().configureAndStart(CONFIG)
    gameStore.getState().beginTurn()
    const g = gameStore.getState().game!
    // Simulate a committed word: hand-off with an open take-back window.
    gameStore.setState({
      handoff: true,
      undoState: { snapshot: { game: g, chainLog: [], stamps: {} }, playerId: 'p1', word: 'CARD' },
    })
    const { getByText } = render(<PlayScreen />)
    fireEvent.click(getByText(/take back CARD/i))
    const st = gameStore.getState()
    expect(st.undoState).toBeNull()
    expect(st.handoff).toBe(false)   // back to the mover's live turn
    expect(st.undosUsed).toBe(1)
  })

  it('opens the new-game confirm from the header and resets on confirm', () => {
    // start a real game so PlayScreen renders
    gameStore.getState().configureAndStart({
      players: [
        { id: 'p1', name: 'Ada', color: '#6D351E', emblem: 'circle' },
        { id: 'p2', name: 'Bo', color: '#214036', emblem: 'square' },
      ],
      boardLength: 30, timer: 'off', seed: 'seed-p5',
    })
    gameStore.getState().beginTurn()
    const { getByText, queryByText, getByRole } = render(<PlayScreen />)
    fireEvent.click(getByText('New game')) // header button (only one at this point) opens the confirm
    const dialog = getByRole('dialog')
    expect(within(dialog).getByText('Start a new game?')).toBeTruthy()
    // Two "New game" texts now exist (header + confirm) — scope the confirm click to the dialog.
    fireEvent.click(within(dialog).getByText('New game')) // confirm (destructive)
    // store returned to setup; PlayScreen renders null once game is cleared
    expect(gameStore.getState().screen).toBe('setup')
    expect(queryByText('Start a new game?')).toBeNull()
  })
})
