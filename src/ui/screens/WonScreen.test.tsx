// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { WonScreen } from './WonScreen'
import { gameStore } from '../../store/appStore'
import type { ChainEntry } from '../../store/gameStore'
import type { GameState } from '../../engine/types'

afterEach(() => cleanup())

const game = {
  board: { length: 30, snakes: [], ladders: [], seed: 's' },
  timer: 'off',
  players: [
    { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 30 },
    { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 18 },
  ],
  currentPlayerIndex: 0, requiredLetter: null, usedWords: [], phase: 'won',
  pendingEscape: null, winnerId: 'p1', lastWord: 'RESIN', dictVersion: 'test',
} as GameState

// 4 plays incl. a stuck entry; DREAM/MAJOR/RESIN tie at 5 letters → longest is
// DREAM (first played). Winning word = last 'move' entry = RESIN.
const chainLog: ChainEntry[] = [
  { word: 'CARD', playerId: 'p1', squares: 4, kind: 'move' },
  { word: 'DREAM', playerId: 'p2', squares: 5, kind: 'move' },
  { word: 'MAJOR', playerId: 'p2', squares: 0, kind: 'stuck' },
  { word: 'RESIN', playerId: 'p1', squares: 5, kind: 'move' },
]

beforeEach(() => {
  localStorage.clear()
  gameStore.setState({ chainLog })
})

describe('WonScreen', () => {
  it('announces the winner and fires the actions', () => {
    const onPlayAgain = vi.fn(); const onNewGame = vi.fn()
    const { getByText } = render(<WonScreen game={game} onPlayAgain={onPlayAgain} onNewGame={onNewGame} />)
    expect(getByText(/Ana wins/i)).toBeTruthy()
    fireEvent.click(getByText(/play again/i)); expect(onPlayAgain).toHaveBeenCalledTimes(1)
    fireEvent.click(getByText(/new game/i)); expect(onNewGame).toHaveBeenCalledTimes(1)
  })

  it('calls out the winning word (last move entry, not the stuck word)', () => {
    const { getByText } = render(<WonScreen game={game} onPlayAgain={() => {}} onNewGame={() => {}} />)
    const callout = getByText(/won with/i)
    expect(callout.textContent).toMatch(/won with\s*RESIN/)
  })

  it('replays the full chain as a recap, stuck marker included', () => {
    const { container } = render(<WonScreen game={game} onPlayAgain={() => {}} onNewGame={() => {}} />)
    const entries = [...container.querySelectorAll('[data-chain-entry]')]
    expect(entries.length).toBe(4)
    expect(entries.map((e) => e.textContent)).toEqual(['CARD+4', 'DREAM+5', 'MAJOR+0', 'RESIN+5'])
    expect(container.querySelector('.aw-stuck')).toBeTruthy() // stuck entry keeps its ↺ marker
  })

  it('shows the stats line: total, longest (ties → first played), per-player counts', () => {
    const { container } = render(<WonScreen game={game} onPlayAgain={() => {}} onNewGame={() => {}} />)
    const stats = (container.querySelector('[data-stats]')?.textContent ?? '').replace(/\s+/g, ' ')
    expect(stats).toContain('4 words')
    expect(stats).toContain('longest DREAM') // beats the later 5-letter MAJOR/RESIN ties
    expect(stats).toContain('Ana 2 words')
    expect(stats).toContain('Ben 2 words')
  })

  it('opens the share dialog with a v1 board link and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const { getByText, getByLabelText, findByText } = render(<WonScreen game={game} onPlayAgain={() => {}} onNewGame={() => {}} />)
    fireEvent.click(getByText('Share this board'))
    const link = (getByLabelText('Board link') as HTMLInputElement).value
    expect(link).toContain('?b=v1.s.30') // this game's exact seed + length
    fireEvent.click(getByText('Copy'))
    expect(writeText).toHaveBeenCalledWith(link)
    expect(await findByText('Copied!')).toBeTruthy()
  })

  it('renders safely with an empty chain log (no summary section)', () => {
    gameStore.setState({ chainLog: [] })
    const { container, getByText, queryByText } = render(<WonScreen game={game} onPlayAgain={() => {}} onNewGame={() => {}} />)
    expect(getByText(/Ana wins/i)).toBeTruthy()
    expect(queryByText(/won with/i)).toBeNull()
    expect(container.querySelector('[data-stats]')).toBeNull()
  })
})
