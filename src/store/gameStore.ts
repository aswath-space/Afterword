import { createStore, type StoreApi } from 'zustand/vanilla'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { Engine } from '../engine/engine'
import { findEvent, normalize } from '../engine/helpers'
import { readingIndexOf } from '../ui/boardLayout'
import type { BoardLength, GameConfig, GameEvent, GameState, RejectReason, TurnTimer } from '../engine/types'

export const RESCUE_MS = 20_000
// Take-back cost after the one free undo: the mover restarts 3 squares behind
// where they stood. Positional only — never touches the chain/required letter,
// and never triggers snakes/ladders (those fire only on word landings).
export const UNDO_PENALTY = 3
export const takeBackCost = (free: boolean) => (free ? '(free)' : `(−${UNDO_PENALTY} squares)`)

// `feature`/`to` record what the board did to the word AFTER the raw move:
// a ladder climb, or a snake outcome (escaped = clung to the head, slid = fell
// to the tail). `to` is the square the player ultimately ended on for that word.
// Both are OPTIONAL — old persisted saves lack them, so every reader must
// tolerate absence (a plain landing simply has neither).
export type ChainEntry = {
  word: string
  playerId: string
  squares: number
  kind: 'move' | 'stuck'
  feature?: 'ladder' | 'snake-escaped' | 'snake-slid'
  to?: number
}
export type Feedback = { kind: 'reject'; reason: RejectReason }
// A letter imprinted onto a board square by the word that walked across it.
export type Stamp = { letter: string; playerId: string }
// The take-back window: the exact pre-move state of the last committed chain word,
// restorable until the next turn begins (or the escape resolves / the game is won).
export type UndoState = {
  snapshot: { game: GameState; chainLog: ChainEntry[]; stamps: Record<number, Stamp> }
  playerId: string
  word: string
}

export type GameStoreState = {
  screen: 'setup' | 'play' | 'won'
  game: GameState | null
  chainLog: ChainEntry[]
  stamps: Record<number, Stamp>
  handoff: boolean
  deadlineTs: number | null
  feedback: Feedback | null
  // Transient (never persisted): the most recent committed action's events + a
  // monotonic counter, so the UI animation orchestrator can replay the move.
  lastEvents: GameEvent[]
  moveSeq: number
  // Transient: false until the async dictionary (dict.bin) has loaded. The word input
  // is disabled while false so an early submission can't be wrongly rejected.
  dictReady: boolean
  // Take-back: last committed chain word's pre-move snapshot (null = window closed)
  // + how many undos this game has spent (first is free, then −3 squares each).
  undoState: UndoState | null
  undosUsed: number
  configureAndStart: (config: GameConfig) => void
  beginTurn: () => void
  armEscapeDeadline: () => void
  // Return true if the word committed, false if it was rejected — lets the input
  // keep a rejected word for editing instead of erasing it.
  submit: (word: string) => boolean
  resolveEscape: (word: string | null) => boolean
  stuck: (word: string) => boolean
  forfeit: () => void
  undo: () => void
  expireClock: () => void
  resetClockForResume: () => void
  showWinScreen: () => void
  clearFeedback: () => void
  playAgain: () => void
  newGame: () => void
}

export type GameStoreDeps = { engine: Engine; now?: () => number; storage?: StateStorage }

// The per-game slice reset by starting a new game or returning to setup.
const NO_GAME = {
  game: null, chainLog: [], stamps: {}, handoff: false, deadlineTs: null, feedback: null,
  lastEvents: [], moveSeq: 0, undoState: null, undosUsed: 0,
} satisfies Partial<GameStoreState>

// Which UI transition + clock the engine's events imply after a committed action.
// The deadline is always cleared: a turn clock arms at beginTurn, and an escape
// deadline is DEFERRED until the token has slithered/hopped to the snake head (the UI
// calls armEscapeDeadline on arrival) so travel time can't eat into the rescue window.
// A WIN also stays on the play screen so the winning move's token travel can play out;
// PlayScreen calls showWinScreen() once the presentation settles (and on resume,
// since game.phase === 'won' is persisted, the same effect flips immediately).
function transition(events: GameEvent[]) {
  const turnPassed = events.some((e) => e.type === 'TURN') // normal / ladder / stuck / escape resolved
  return { screen: 'play' as const, handoff: turnPassed, deadlineTs: null }
}

export function createGameStore(deps: GameStoreDeps): StoreApi<GameStoreState> {
  const { engine } = deps
  const now = deps.now ?? (() => Date.now())
  const turnDeadline = (timer: TurnTimer) => (timer === 'off' ? null : now() + timer * 1000)

  return createStore<GameStoreState>()(
    persist(
      (set, get) => ({
        screen: 'setup',
        ...NO_GAME,
        dictReady: false,

        configureAndStart: (config) => {
          const game = engine.createGame(config)
          set({ ...NO_GAME, game, screen: 'play', handoff: true })
        },

        beginTurn: () => {
          const { game } = get()
          if (!game) return
          // Starting the next turn locks the previous word in — the take-back window closes.
          set({ handoff: false, deadlineTs: turnDeadline(game.timer), undoState: null })
        },

        // Start the rescue countdown once the token has reached the snake head (called
        // by the UI on animation arrival). No-op if not escaping or already armed.
        armEscapeDeadline: () => {
          const { game, deadlineTs } = get()
          if (!game || game.phase !== 'awaiting-escape' || deadlineTs != null) return
          set({ deadlineTs: now() + RESCUE_MS })
        },

        submit: (raw) => {
          const { game, chainLog, stamps } = get()
          if (!game) return false
          const res = engine.submitWord(game, raw)
          if (!res.ok) { set({ feedback: { kind: 'reject', reason: res.reason } }); return false }
          const move = findEvent(res.events, 'MOVE')
          const player = game.players[game.currentPlayerIndex]
          const word = normalize(raw)
          const entry: ChainEntry = { word, playerId: player.id, squares: move?.squares ?? 0, kind: 'move' }
          // Record what the board did to the landing, so the chain doesn't lie:
          // a ladder climb resolves immediately (feature + final square); a snake
          // landing only notes the head as `to` — the escape hasn't resolved yet,
          // resolveEscape() patches the outcome onto this entry retroactively.
          const ladder = findEvent(res.events, 'LADDER')
          if (ladder) { entry.feature = 'ladder'; entry.to = ladder.top }
          const escapeStart = findEvent(res.events, 'ESCAPE_START')
          if (escapeStart) entry.to = escapeStart.head
          // Imprint the word's letters onto the squares it walked (first-stamp-sticks).
          // Purely a visual record derived from the MOVE event — never read back by the
          // engine, so it cannot affect turn/position logic or multiplayer correctness.
          // Letters are assigned in SCREEN reading order (top→bottom, left→right), not
          // path order, so the word reads forwards even on the board's right-to-left
          // (boustrophedon) rows instead of coming out mirrored.
          const nextStamps = { ...stamps }
          if (move) {
            const crossed = Array.from({ length: move.to - move.from }, (_, i) => move.from + 1 + i)
            crossed.sort((a, b) => readingIndexOf(a, game.board.length) - readingIndexOf(b, game.board.length))
            crossed.forEach((sq, j) => {
              if (j < word.length && nextStamps[sq] === undefined) {
                nextStamps[sq] = { letter: word[j], playerId: player.id }
              }
            })
          }
          set({
            game: res.next, chainLog: [...chainLog, entry], stamps: nextStamps, feedback: null,
            lastEvents: res.events, moveSeq: get().moveSeq + 1,
            // Open the take-back window with the exact pre-move state — except on a win,
            // which ends the game on the spot (no un-winning).
            undoState: findEvent(res.events, 'WIN')
              ? null
              : { snapshot: { game, chainLog, stamps }, playerId: player.id, word },
            ...transition(res.events),
          })
          return true
        },

        resolveEscape: (raw) => {
          const { game, chainLog } = get()
          if (!game) return false
          const res = engine.resolveSnakeEscape(game, raw)
          if (!res.ok) { set({ feedback: { kind: 'reject', reason: res.reason } }); return false }
          // The escape resolves the LAST chain entry retroactively (the word that
          // landed on the snake): success → 'snake-escaped' (`to` stays the head),
          // fail/timeout → 'snake-slid' with `to` moved to the tail. Patched
          // immutably; guarded so a foreign/absent last entry is never touched
          // (e.g. a resumed old save whose chain predates these fields).
          const outcome = res.events.find((e) => e.type === 'ESCAPE_SUCCESS' || e.type === 'ESCAPE_FAIL')
          const last = chainLog[chainLog.length - 1]
          let nextChainLog = chainLog
          if (outcome && last && last.playerId === outcome.playerId) {
            const patched: ChainEntry = outcome.type === 'ESCAPE_FAIL'
              ? { ...last, feature: 'snake-slid', to: outcome.tail }
              : { ...last, feature: 'snake-escaped' }
            nextChainLog = [...chainLog.slice(0, -1), patched]
          }
          // Resolving the escape (rescue, give-up or timeout) locks the word in.
          set({ game: res.next, chainLog: nextChainLog, feedback: null, lastEvents: res.events, moveSeq: get().moveSeq + 1, undoState: null, ...transition(res.events) })
          return true
        },

        stuck: (raw) => {
          const { game, chainLog } = get()
          if (!game) return false
          const res = engine.useStuck(game, raw)
          if (!res.ok) { set({ feedback: { kind: 'reject', reason: res.reason } }); return false }
          const player = game.players[game.currentPlayerIndex]
          const word = normalize(raw)
          const entry: ChainEntry = { word, playerId: player.id, squares: 0, kind: 'stuck' }
          set({
            game: res.next, chainLog: [...chainLog, entry], feedback: null,
            lastEvents: res.events, moveSeq: get().moveSeq + 1,
            undoState: { snapshot: { game, chainLog, stamps: get().stamps }, playerId: player.id, word },
            ...transition(res.events),
          })
          return true
        },

        forfeit: () => {
          const { game } = get()
          if (!game) return
          const res = engine.forfeitTurn(game)
          if (!res.ok) return
          set({ game: res.next, feedback: null, lastEvents: res.events, moveSeq: get().moveSeq + 1, undoState: null, ...transition(res.events) })
        },

        // Take back the last committed chain word: restore its pre-move snapshot and
        // return the mover to a live turn (fresh clock). First one is free; each later
        // one restarts the mover UNDO_PENALTY squares behind their pre-move square.
        // moveSeq is deliberately NOT bumped — there is nothing to replay, the token
        // simply snaps (well, glides) back via its resting-position render.
        undo: () => {
          const { undoState, undosUsed, game } = get()
          if (!undoState || !game) return
          const { snapshot, playerId } = undoState
          const penalty = undosUsed >= 1 ? UNDO_PENALTY : 0
          const players = snapshot.game.players.map((p) =>
            p.id === playerId ? { ...p, square: Math.max(0, p.square - penalty) } : p)
          set({
            game: { ...snapshot.game, players },
            chainLog: snapshot.chainLog,
            stamps: snapshot.stamps,
            undoState: null,
            undosUsed: undosUsed + 1,
            handoff: false,
            deadlineTs: turnDeadline(snapshot.game.timer),
            feedback: null,
            lastEvents: [],
          })
        },

        expireClock: () => {
          const { game, deadlineTs } = get()
          if (!game) return
          // Trust only the STORE's deadline, not the caller's belief: a countdown
          // tick whose closure saw the old deadline can fire right as an undo (or any
          // reset) replaces it — without this guard that stale tick would instantly
          // forfeit/slide the freshly restored turn.
          if (deadlineTs == null || now() < deadlineTs) return
          if (game.phase === 'awaiting-escape') get().resolveEscape(null)
          else if (game.phase === 'awaiting-word') get().forfeit()
        },

        // A reopened app must not punish the current player for wall-clock time away
        // (pass-and-play phones get pocketed mid-game): drop any persisted deadline and
        // let play re-arm a FRESH clock — Continue → beginTurn for a turn; the
        // arm-on-arrival effect for an escape (both key off deadlineTs === null).
        resetClockForResume: () => {
          if (get().deadlineTs != null) set({ deadlineTs: null })
        },

        // Flip to the win screen after the winning move's presentation has settled.
        showWinScreen: () => {
          const { game, screen } = get()
          if (!game || game.phase !== 'won' || screen === 'won') return
          set({ screen: 'won' })
        },

        clearFeedback: () => set({ feedback: null }),

        playAgain: () => {
          const { game } = get()
          if (!game) return
          get().configureAndStart({
            players: game.players.map((p) => ({ id: p.id, name: p.name, color: p.color, emblem: p.emblem })),
            boardLength: game.board.length as BoardLength,
            timer: game.timer,
            seed: game.board.seed,
          })
        },

        newGame: () => set({ ...NO_GAME, screen: 'setup' }),
      }),
      {
        name: 'afterword-game',
        version: 1,
        // A stored blob from a different schema version resets to a clean setup
        // screen rather than applying mismatched state (spec §5.2, never throws).
        migrate: () => ({ ...NO_GAME, screen: 'setup' }) as unknown as GameStoreState,
        storage: createJSONStorage(() => deps.storage ?? localStorage),
        // Persist only committed state; drop ephemeral feedback. Cast works around
        // zustand's default PersistedState = full state (we deliberately store a subset;
        // the actions are re-supplied from the initializer on rehydrate).
        partialize: (s) =>
          ({ screen: s.screen, game: s.game, chainLog: s.chainLog, stamps: s.stamps, handoff: s.handoff, deadlineTs: s.deadlineTs, undoState: s.undoState, undosUsed: s.undosUsed }) as unknown as GameStoreState,
        onRehydrateStorage: () => (state) => { state?.resetClockForResume() },
      },
    ),
  )
}
