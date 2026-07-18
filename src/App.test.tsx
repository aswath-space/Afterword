// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import App from './App'
import { gameStore } from './store/appStore'

// This file renders <App/> in more than one test. The repo's vitest config has
// no globals/setupFile, so RTL's auto-cleanup never registers and the DOM would
// leak between tests (duplicate "Start game" nodes). Clean up explicitly.
afterEach(() => cleanup())

beforeEach(() => {
  localStorage.clear()
  gameStore.getState().newGame()
  window.history.replaceState(null, '', '/')
})

describe('App', () => {
  it('opens on the setup screen', () => {
    const { getByText } = render(<App />)
    expect(getByText('Start game')).toBeTruthy()
  })

  it('moves to the play screen (hand-off curtain) after starting', () => {
    const { getByText, getByRole } = render(<App />)
    fireEvent.click(getByText('Start game'))
    expect(getByRole('dialog')).toBeTruthy() // "Pass to Player 1"
  })

  it('a ?b= link opens a pre-seeded setup over a saved game, suppressing resume and stripping the URL', () => {
    gameStore.getState().configureAndStart({
      players: [
        { id: 'p1', name: 'Ada', color: '#6D351E', emblem: 'circle' },
        { id: 'p2', name: 'Bo', color: '#214036', emblem: 'square' },
      ],
      boardLength: 50, timer: 'off', seed: 'saved-game',
    })
    gameStore.getState().beginTurn()
    window.history.replaceState(null, '', '/?b=v1.zz99.30')
    const { getByText, queryByText } = render(<App />)
    expect(getByText(/playing a shared/i)).toBeTruthy() // setup with the chip, not the saved game
    expect(queryByText('Continue your game?')).toBeNull()      // link intent beats auto-resume
    expect(window.location.search).toBe('')                    // param consumed (reload-safe)
    expect(gameStore.getState().game).not.toBeNull()           // saved game untouched until Start
  })

  it('starting a shared game consumes the suppressed resume prompt (no ghost over the new game)', () => {
    gameStore.getState().configureAndStart({
      players: [
        { id: 'p1', name: 'Ada', color: '#6D351E', emblem: 'circle' },
        { id: 'p2', name: 'Bo', color: '#214036', emblem: 'square' },
      ],
      boardLength: 50, timer: 'off', seed: 'saved-game',
    })
    gameStore.getState().beginTurn() // saved MID-PLAY game → resumePending would arm
    window.history.replaceState(null, '', '/?b=v1.zz88.30')
    const { getByText, queryByText } = render(<App />)
    fireEvent.click(getByText('Start game')) // start the SHARED game over it
    // The old leak popped the non-dismissible prompt here, where "Start fresh"
    // would destroy the freshly started shared game.
    expect(queryByText('Continue your game?')).toBeNull()
    expect(gameStore.getState().game?.board.seed).toBe('zz88')
  })

  it('an invalid ?b= is ignored and the normal resume flow runs', () => {
    gameStore.getState().configureAndStart({
      players: [
        { id: 'p1', name: 'Ada', color: '#6D351E', emblem: 'circle' },
        { id: 'p2', name: 'Bo', color: '#214036', emblem: 'square' },
      ],
      boardLength: 50, timer: 'off', seed: 'saved-game',
    })
    gameStore.getState().beginTurn()
    window.history.replaceState(null, '', '/?b=not-a-board')
    const { getByText } = render(<App />)
    expect(getByText('Continue your game?')).toBeTruthy()
  })

  it('resuming a game persisted mid-win-walk skips the prompt, and Play again stays clean', () => {
    gameStore.getState().configureAndStart({
      players: [
        { id: 'p1', name: 'Ada', color: '#6D351E', emblem: 'circle' },
        { id: 'p2', name: 'Bo', color: '#214036', emblem: 'square' },
      ],
      boardLength: 30, timer: 'off', seed: 'won-resume-seed',
    })
    const g = gameStore.getState().game!
    // The persisted shape when the app dies during the winning walk: screen 'play',
    // phase 'won' (showWinScreen never ran).
    gameStore.setState({ game: { ...g, phase: 'won', winnerId: 'p1' }, handoff: false })
    const { getByText, queryByText } = render(<App />)
    expect(queryByText('Continue your game?')).toBeNull() // a finished game is not resumable
    expect(getByText(/Ada wins!/)).toBeTruthy()           // flipped straight to the win screen
    fireEvent.click(getByText('Play again'))
    // The old leak reopened the non-dismissible prompt over the fresh game here.
    expect(queryByText('Continue your game?')).toBeNull()
  })

  it('shows the resume prompt when rehydrated into a play game; Continue reveals the board', () => {
    gameStore.getState().configureAndStart({
      players: [
        { id: 'p1', name: 'Ada', color: '#6D351E', emblem: 'circle' },
        { id: 'p2', name: 'Bo', color: '#214036', emblem: 'square' },
      ],
      boardLength: 30, timer: 'off', seed: 'resume-seed',
    })
    gameStore.getState().beginTurn()
    expect(gameStore.getState().screen).toBe('play')
    const { getByText, queryByText } = render(<App />)
    // App decides resume-pending from the initial snapshot → prompt visible
    expect(getByText('Continue your game?')).toBeTruthy()
    fireEvent.click(getByText('Continue'))
    expect(queryByText('Continue your game?')).toBeNull()
  })
})
