import { describe, it, expect } from 'vitest'
import type { StateStorage } from 'zustand/middleware'
import { createGameStore, RESCUE_MS, type GameStoreState } from './gameStore'
import { createEngine } from '../engine/engine'
import type { Board, Dictionary, GameConfig, GameState } from '../engine/types'
import type { StoreApi } from 'zustand/vanilla'

const WORDS = new Set(['CARD', 'DREAM', 'ENTRY', 'MORE', 'EAGLE'])
const dict: Dictionary = { isValid: (w) => WORDS.has(w), version: 'test' }

function memStorage(): StateStorage {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => { m.set(k, v) },
    removeItem: (k) => { m.delete(k) },
  }
}

const board = (over: Partial<Board> = {}): Board => ({ length: 30, snakes: [], ladders: [], seed: 'test', ...over })

function makeGame(over: Partial<GameState> = {}): GameState {
  return {
    board: board(),
    timer: 'off',
    players: [
      { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 0 },
      { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 0 },
    ],
    currentPlayerIndex: 0,
    requiredLetter: null,
    usedWords: [],
    phase: 'awaiting-word',
    pendingEscape: null,
    winnerId: null,
    lastWord: null,
    dictVersion: 'test',
    ...over,
  }
}

function makeStore(now: () => number = () => 1000, storage: StateStorage = memStorage()): StoreApi<GameStoreState> {
  return createGameStore({ engine: createEngine(dict), now, storage })
}

const CONFIG: GameConfig = {
  players: [
    { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle' },
    { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond' },
  ],
  boardLength: 30,
  timer: 'off',
  seed: 'plan-seed',
}

describe('createGameStore', () => {
  it('configureAndStart puts the game behind the first hand-off curtain', () => {
    const s = makeStore()
    s.getState().configureAndStart(CONFIG)
    const st = s.getState()
    expect(st.screen).toBe('play')
    expect(st.handoff).toBe(true)
    expect(st.deadlineTs).toBeNull()
    expect(st.game?.phase).toBe('awaiting-word')
    expect(st.chainLog).toHaveLength(0)
  })

  it('beginTurn sets a deadline for a timed game and clears the curtain', () => {
    const s = makeStore(() => 1000)
    s.setState({ game: makeGame({ timer: 60 }) })
    s.getState().beginTurn()
    expect(s.getState().handoff).toBe(false)
    expect(s.getState().deadlineTs).toBe(1000 + 60 * 1000)
  })

  it('beginTurn leaves no deadline when the timer is off', () => {
    const s = makeStore(() => 1000)
    s.setState({ game: makeGame({ timer: 'off' }) })
    s.getState().beginTurn()
    expect(s.getState().deadlineTs).toBeNull()
  })

  it('submit of a plain landing appends a +N chain entry and raises the hand-off', () => {
    const s = makeStore()
    s.setState({ game: makeGame(), chainLog: [] })
    s.getState().submit('card')
    const st = s.getState()
    expect(st.chainLog).toHaveLength(1)
    expect(st.chainLog[0]).toEqual({ word: 'CARD', playerId: 'p1', squares: 4, kind: 'move' })
    expect(st.handoff).toBe(true)
    expect(st.game?.currentPlayerIndex).toBe(1)
    expect(st.game?.players[0].square).toBe(4)
  })

  it('submit of an invalid word sets feedback and does not change the game', () => {
    const s = makeStore()
    s.setState({ game: makeGame(), chainLog: [] })
    s.getState().submit('zzzzz') // not in dict
    const st = s.getState()
    expect(st.feedback).toEqual({ kind: 'reject', reason: 'not-a-word' })
    expect(st.game?.currentPlayerIndex).toBe(0)
    expect(st.chainLog).toHaveLength(0)
  })

  it('submit landing on a ladder foot auto-climbs and passes the turn', () => {
    const s = makeStore()
    s.setState({ game: makeGame({ board: board({ ladders: [{ foot: 4, top: 10 }] }) }) })
    s.getState().submit('CARD')
    const st = s.getState()
    expect(st.game?.players[0].square).toBe(10)
    expect(st.handoff).toBe(true)
  })

  it('submit landing on a snake head opens the escape, arming the rescue clock only on demand', () => {
    const s = makeStore(() => 1000)
    s.setState({ game: makeGame({ board: board({ snakes: [{ head: 4, tail: 1 }] }) }) })
    s.getState().submit('CARD')
    const st = s.getState()
    expect(st.game?.phase).toBe('awaiting-escape')
    expect(st.handoff).toBe(false)
    expect(st.deadlineTs).toBeNull() // deferred — armed when the token reaches the head
    expect(st.game?.players[0].square).toBe(4)
    s.getState().armEscapeDeadline()
    expect(s.getState().deadlineTs).toBe(1000 + RESCUE_MS)
  })

  it('submit that reaches the final square wins', () => {
    const s = makeStore()
    // Real board (default length 30); from square 27 a 4-letter word reaches/passes 30.
    s.setState({ game: makeGame({ players: [
      { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 27 },
      { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 0 },
    ] }) })
    s.getState().submit('CARD')
    const st = s.getState()
    // The screen stays on 'play' so the winning token travel can present;
    // showWinScreen() flips once the animation settles.
    expect(st.screen).toBe('play')
    expect(st.handoff).toBe(false)
    expect(st.game?.phase).toBe('won')
    expect(st.game?.winnerId).toBe('p1')
    expect(st.chainLog).toHaveLength(1)
    s.getState().showWinScreen()
    expect(s.getState().screen).toBe('won')
  })

  it('showWinScreen is a no-op unless the game is actually won', () => {
    const s = makeStore()
    s.setState({ game: makeGame({}), screen: 'play' })
    s.getState().showWinScreen()
    expect(s.getState().screen).toBe('play')
  })

  it('resolveEscape with a long-enough word clings on and passes the turn', () => {
    const s = makeStore()
    s.setState({ game: makeGame({
      phase: 'awaiting-escape',
      pendingEscape: { playerId: 'p1', fromSquare: 4, drop: 3, toSquare: 1 },
      players: [
        { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 4 },
        { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 0 },
      ],
    }), chainLog: [] })
    s.getState().resolveEscape('DREAM')
    const st = s.getState()
    expect(st.game?.players[0].square).toBe(4)      // clung on the head
    expect(st.game?.currentPlayerIndex).toBe(1)
    expect(st.handoff).toBe(true)
    expect(st.chainLog).toHaveLength(0)             // rescue words never enter the chain
  })

  it('resolveEscape(null) slides to the tail', () => {
    const s = makeStore()
    s.setState({ game: makeGame({
      phase: 'awaiting-escape',
      pendingEscape: { playerId: 'p1', fromSquare: 4, drop: 3, toSquare: 1 },
      players: [
        { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 4 },
        { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 0 },
      ],
    }) })
    s.getState().resolveEscape(null)
    expect(s.getState().game?.players[0].square).toBe(1)
    expect(s.getState().handoff).toBe(true)
  })

  it('resolveEscape rejects a rescue word shorter than the drop', () => {
    const s = makeStore()
    s.setState({ game: makeGame({
      phase: 'awaiting-escape',
      pendingEscape: { playerId: 'p1', fromSquare: 8, drop: 6, toSquare: 2 },
      players: [
        { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 8 },
        { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 0 },
      ],
    }) })
    s.getState().resolveEscape('DREAM') // length 5 < drop 6
    expect(s.getState().feedback).toEqual({ kind: 'reject', reason: 'rescue-too-short' })
    expect(s.getState().game?.phase).toBe('awaiting-escape')
  })

  it('stuck advances 0 and appends a stuck chain entry', () => {
    const s = makeStore()
    s.setState({ game: makeGame({ requiredLetter: 'Z' }), chainLog: [] })
    s.getState().stuck('DREAM')
    const st = s.getState()
    expect(st.chainLog[0]).toEqual({ word: 'DREAM', playerId: 'p1', squares: 0, kind: 'stuck' })
    expect(st.game?.players[0].square).toBe(0)
    expect(st.game?.requiredLetter).toBe('M')
    expect(st.game?.currentPlayerIndex).toBe(1)
    expect(st.handoff).toBe(true)
  })

  it('forfeit passes with no word and no chain entry', () => {
    const s = makeStore()
    s.setState({ game: makeGame({ requiredLetter: 'Z' }), chainLog: [] })
    s.getState().forfeit()
    const st = s.getState()
    expect(st.chainLog).toHaveLength(0)
    expect(st.game?.requiredLetter).toBe('Z')
    expect(st.game?.currentPlayerIndex).toBe(1)
  })

  it('resetClockForResume drops a stale turn deadline without forfeiting', () => {
    const s = makeStore(() => 1000)
    s.setState({ game: makeGame({ requiredLetter: 'Z' }), deadlineTs: 500 })
    s.getState().resetClockForResume()
    expect(s.getState().deadlineTs).toBeNull()
    expect(s.getState().game?.currentPlayerIndex).toBe(0) // turn NOT forfeited
  })

  it('resetClockForResume drops a stale escape deadline without sliding', () => {
    const s = makeStore(() => 1000)
    s.setState({ game: makeGame({
      phase: 'awaiting-escape',
      pendingEscape: { playerId: 'p1', fromSquare: 4, drop: 3, toSquare: 1 },
      players: [
        { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 4 },
        { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 0 },
      ],
    }), deadlineTs: 500 })
    s.getState().resetClockForResume()
    expect(s.getState().deadlineTs).toBeNull()  // fresh RESCUE_MS re-arms on arrival
    expect(s.getState().game?.players[0].square).toBe(4) // still on the head, not slid
  })

  it('a committed word opens the take-back window; Start turn closes it', () => {
    const s = makeStore()
    s.setState({ game: makeGame(), chainLog: [], stamps: {} })
    s.getState().submit('CARD')
    const u = s.getState().undoState
    expect(u?.word).toBe('CARD')
    expect(u?.playerId).toBe('p1')
    expect(u?.snapshot.game.players[0].square).toBe(0) // pre-move state captured
    s.getState().beginTurn()
    expect(s.getState().undoState).toBeNull()
  })

  it('first undo is free: full pre-move restore (position, chain, stamps, usedWords, turn)', () => {
    const s = makeStore()
    s.setState({ game: makeGame(), chainLog: [], stamps: {} })
    s.getState().submit('CARD')
    expect(s.getState().game?.players[0].square).toBe(4)
    s.getState().undo()
    const st = s.getState()
    expect(st.game?.players[0].square).toBe(0)      // no penalty on the free one
    expect(st.game?.currentPlayerIndex).toBe(0)     // mover's turn again
    expect(st.game?.usedWords).toEqual([])          // CARD is playable again
    expect(st.game?.requiredLetter).toBeNull()
    expect(st.chainLog).toEqual([])
    expect(st.stamps).toEqual({})
    expect(st.handoff).toBe(false)                  // live turn, not a curtain
    expect(st.undosUsed).toBe(1)
    expect(st.undoState).toBeNull()                 // single-level
  })

  it('later undos cost 3 squares off the restored position, floored at 0', () => {
    const s = makeStore()
    s.setState({ game: makeGame({ players: [
      { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 10 },
      { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 0 },
    ] }), chainLog: [], stamps: {}, undosUsed: 1 })
    s.getState().submit('CARD') // 10 → 14
    s.getState().undo()
    expect(s.getState().game?.players[0].square).toBe(7) // restored 10, minus 3
    expect(s.getState().undosUsed).toBe(2)
  })

  it('undo during an escape cancels the snake landing entirely', () => {
    const s = makeStore(() => 1000)
    s.setState({ game: makeGame({ board: board({ snakes: [{ head: 4, tail: 1 }] }) }), chainLog: [], stamps: {} })
    s.getState().submit('CARD') // lands on the head → awaiting-escape
    s.getState().armEscapeDeadline()
    expect(s.getState().game?.phase).toBe('awaiting-escape')
    s.getState().undo()
    const st = s.getState()
    expect(st.game?.phase).toBe('awaiting-word')
    expect(st.game?.pendingEscape).toBeNull()
    expect(st.game?.players[0].square).toBe(0)
    expect(st.deadlineTs).toBeNull() // untimed game: rescue clock gone, no turn clock
  })

  it('a winning word closes the window (no un-winning) and an escape resolution locks it too', () => {
    const s = makeStore()
    s.setState({ game: makeGame({ players: [
      { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 27 },
      { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 0 },
    ] }) })
    s.getState().submit('CARD') // 27+4 ≥ 30 → WIN
    expect(s.getState().undoState).toBeNull()

    const t = makeStore()
    t.setState({ game: makeGame({
      phase: 'awaiting-escape',
      pendingEscape: { playerId: 'p1', fromSquare: 4, drop: 3, need: 3, toSquare: 1 },
      players: [
        { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 4 },
        { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 0 },
      ],
    }), undoState: { snapshot: { game: makeGame(), chainLog: [], stamps: {} }, playerId: 'p1', word: 'CARD' } })
    t.getState().resolveEscape('DREAM')
    expect(t.getState().undoState).toBeNull()
  })

  it('undo in a timed game re-arms a fresh turn clock for the mover', () => {
    const s = makeStore(() => 5000)
    s.setState({ game: makeGame({ timer: 30 }), chainLog: [], stamps: {} })
    s.getState().submit('CARD')
    s.getState().undo()
    expect(s.getState().deadlineTs).toBe(5000 + 30_000)
  })

  it('expireClock trusts only an actually-expired store deadline (stale ticks no-op)', () => {
    const s = makeStore(() => 1000)
    s.setState({ game: makeGame({ requiredLetter: 'Z' }), deadlineTs: null })
    s.getState().expireClock() // stale tick after an undo/reset cleared the deadline
    expect(s.getState().game?.currentPlayerIndex).toBe(0)
    s.setState({ deadlineTs: 5000 }) // fresh future deadline (e.g. re-armed by undo)
    s.getState().expireClock()
    expect(s.getState().game?.currentPlayerIndex).toBe(0)
    s.setState({ deadlineTs: 900 }) // genuinely expired
    s.getState().expireClock()
    expect(s.getState().game?.currentPlayerIndex).toBe(1) // forfeits now
  })

  it('the take-back window survives a reload (persisted)', () => {
    const shared = memStorage()
    const a = makeStore(() => 1000, shared)
    a.getState().configureAndStart(CONFIG)
    a.getState().beginTurn()
    a.getState().submit('CARD')
    expect(a.getState().undoState?.word).toBe('CARD')
    const b = makeStore(() => 1000, shared)
    expect(b.getState().undoState?.word).toBe('CARD')
    expect(b.getState().undosUsed).toBe(0)
  })

  it('persists and rehydrates through storage', () => {
    // Compare a rehydrated store against the original rather than asserting a
    // specific landing outcome — the real generated board for CONFIG.seed may
    // put a snake/ladder under square 4, which is irrelevant to persistence.
    const shared = memStorage()
    const a = makeStore(() => 1000, shared)
    a.getState().configureAndStart(CONFIG)
    a.getState().beginTurn()
    a.getState().submit('CARD')
    const aState = a.getState()
    const b = makeStore(() => 1000, shared)
    expect(b.getState().screen).toBe(aState.screen)
    expect(b.getState().chainLog).toEqual(aState.chainLog)
    expect(b.getState().game).toEqual(aState.game)
    expect(b.getState().deadlineTs).toBe(aState.deadlineTs)
  })

  it('rehydrates a past-deadline turn with the clock dropped, not forfeited', () => {
    const shared = memStorage()
    const a = makeStore(() => 1000, shared)
    a.setState({ game: makeGame({ requiredLetter: 'Z' }), screen: 'play', deadlineTs: 500 })
    const b = makeStore(() => 1000, shared)
    expect(b.getState().deadlineTs).toBeNull()          // stale deadline dropped on rehydrate
    expect(b.getState().game?.currentPlayerIndex).toBe(0) // same player, fresh clock re-arms in the UI
  })
})

describe('createGameStore — board stamps', () => {
  it('stamps the squares a word walks, in order, with the player id', () => {
    const s = makeStore()
    s.setState({ game: makeGame(), stamps: {} })
    s.getState().submit('CARD') // from 0 → 4 on an empty board
    expect(s.getState().stamps).toEqual({
      1: { letter: 'C', playerId: 'p1' },
      2: { letter: 'A', playerId: 'p1' },
      3: { letter: 'R', playerId: 'p1' },
      4: { letter: 'D', playerId: 'p1' },
    })
  })

  it('keeps the first stamp on a square (first sticks, never overwritten)', () => {
    const s = makeStore()
    s.setState({ game: makeGame(), stamps: { 2: { letter: 'X', playerId: 'p2' } } })
    s.getState().submit('CARD')
    expect(s.getState().stamps[2]).toEqual({ letter: 'X', playerId: 'p2' }) // untouched
    expect(s.getState().stamps[1]).toEqual({ letter: 'C', playerId: 'p1' })
    expect(s.getState().stamps[4]).toEqual({ letter: 'D', playerId: 'p1' })
  })

  it('does not stamp on a stuck turn (zero squares walked)', () => {
    const s = makeStore()
    s.setState({ game: makeGame({ requiredLetter: 'Z' }), stamps: {} })
    s.getState().stuck('DREAM')
    expect(s.getState().stamps).toEqual({})
  })

  it('newGame clears stamps', () => {
    const s = makeStore()
    s.setState({ game: makeGame(), stamps: { 1: { letter: 'C', playerId: 'p1' } } })
    s.getState().newGame()
    expect(s.getState().stamps).toEqual({})
  })

  it('persists stamps across rehydration', () => {
    const shared = memStorage()
    const a = makeStore(() => 1000, shared)
    a.getState().configureAndStart(CONFIG)
    a.getState().beginTurn()
    a.getState().submit('CARD')
    const b = makeStore(() => 1000, shared)
    expect(b.getState().stamps).toEqual(a.getState().stamps)
    expect(Object.keys(b.getState().stamps).length).toBeGreaterThan(0)
  })

  it('assigns letters in reading order so a word on a right-to-left row reads forwards', () => {
    const s = makeStore()
    // Token at square 5 plays a 5-letter word → walks squares 6..10, which on a 30-board
    // is a right-to-left (boustrophedon) row displayed as 10,9,8,7,6 from left to right.
    s.setState({
      game: makeGame({
        requiredLetter: null,
        players: [
          { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle', square: 5 },
          { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond', square: 0 },
        ],
      }),
      stamps: {},
    })
    s.getState().submit('DREAM')
    const st = s.getState()
    // Reading that row left→right (squares 10,9,8,7,6) must spell D-R-E-A-M.
    expect(st.stamps[10]?.letter).toBe('D')
    expect(st.stamps[9]?.letter).toBe('R')
    expect(st.stamps[8]?.letter).toBe('E')
    expect(st.stamps[7]?.letter).toBe('A')
    expect(st.stamps[6]?.letter).toBe('M')
  })
})

describe('animation replay hooks (lastEvents + moveSeq)', () => {
  const CONFIG: GameConfig = {
    players: [
      { id: 'p1', name: 'Ana', color: 'var(--p1)', emblem: 'circle' },
      { id: 'p2', name: 'Ben', color: 'var(--p2)', emblem: 'diamond' },
    ],
    boardLength: 30,
    timer: 'off',
    seed: 'anim-test',
  }
  it('exposes the last action events and a monotonic moveSeq', () => {
    const store = makeStore()
    store.getState().configureAndStart(CONFIG)
    expect(store.getState().moveSeq).toBe(0)
    expect(store.getState().lastEvents).toEqual([])
    store.getState().submit('CARD')
    expect(store.getState().moveSeq).toBe(1)
    expect(store.getState().lastEvents.some((e) => e.type === 'MOVE')).toBe(true)
  })
})
