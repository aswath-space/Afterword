export type PlayerId = string
export interface PlayerState { id: PlayerId; name: string; color: string; emblem: string; square: number }
export interface Snake { head: number; tail: number }   // head > tail
export interface Ladder { foot: number; top: number }   // top > foot
export interface Board { length: number; snakes: Snake[]; ladders: Ladder[]; seed: string }
export type TurnTimer = 'off' | 30 | 60
export interface GameConfig {
  players: Array<{ id: PlayerId; name: string; color: string; emblem: string }>
  boardLength: 30 | 50 | 100
  timer: TurnTimer
  seed: string
  // Whether the "bump" rule is on: landing exactly on an opponent knocks them
  // back. Optional; createGame defaults new games to ON.
  capture?: boolean
}
export type GamePhase = 'awaiting-word' | 'awaiting-escape' | 'won'
// `need` = the rescue word length actually required (≤ drop; drop capped at RESCUE_NEED_CAP).
// Optional because pre-cap persisted games lack it; readers must apply the RESCUE_NEED_CAP fallback.
export interface PendingEscape { playerId: PlayerId; fromSquare: number; drop: number; toSquare: number; need?: number }
export interface GameState {
  board: Board
  timer: TurnTimer
  players: PlayerState[]
  currentPlayerIndex: number
  requiredLetter: string | null
  usedWords: string[]
  phase: GamePhase
  pendingEscape: PendingEscape | null
  winnerId: PlayerId | null
  lastWord: string | null
  dictVersion: string
  // Whether this game applies the capture ("bump") rule. Optional with a
  // documented fallback (`state.capture ?? false`), mirroring PendingEscape.need:
  // legacy persisted saves predate the field, so they resume capture-free.
  capture?: boolean
}
export type RejectReason =
  | 'wrong-phase' | 'too-short' | 'wrong-start-letter'
  | 'not-a-word' | 'already-used' | 'rescue-too-short'
export type GameEvent =
  | { type: 'MOVE'; playerId: PlayerId; from: number; to: number; squares: number }
  | { type: 'LADDER'; playerId: PlayerId; foot: number; top: number }
  | { type: 'ESCAPE_START'; playerId: PlayerId; head: number; drop: number }
  | { type: 'ESCAPE_SUCCESS'; playerId: PlayerId; head: number }
  | { type: 'ESCAPE_FAIL'; playerId: PlayerId; head: number; tail: number }
  // A player was bumped back after an opponent landed exactly on their square.
  // playerId = the victim; from/to = victim's squares; byPlayerId = the mover.
  | { type: 'CAPTURE'; playerId: PlayerId; from: number; to: number; byPlayerId: PlayerId }
  | { type: 'STUCK'; playerId: PlayerId }
  | { type: 'WIN'; playerId: PlayerId }
  | { type: 'TURN'; playerId: PlayerId }
export type SubmitResult =
  | { ok: true; next: GameState; events: GameEvent[] }
  | { ok: false; reason: RejectReason }
export interface Dictionary { isValid(word: string): boolean; version: string }
