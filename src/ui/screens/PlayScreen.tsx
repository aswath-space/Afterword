import { useEffect, useRef, useState } from 'react'
import { Header } from '../Header'
import { BoardView } from '../BoardView'
import { StampLayer } from '../StampLayer'
import { AnimatedTokenLayer } from '../AnimatedTokenLayer'
import { TurnHud } from '../TurnHud'
import { WordInput } from '../WordInput'
import { ChainStrip } from '../ChainStrip'
import { HandoffCurtain } from '../HandoffCurtain'
import { AimLayer } from '../AimLayer'
import { EscapeVignette } from '../EscapeVignette'
import { EscapeRing } from '../EscapeRing'
import { ContextStrip } from '../ContextStrip'
import { previewLanding } from '../aiming'
import { rejectMessage } from '../WordInput'
import { ConfirmDialog } from '../ConfirmDialog'
import { useWakeLock } from '../useWakeLock'
import { withScreenTransition } from '../viewTransition'
import { useTurnAnimation } from '../useTurnAnimation'
import { useCountdown } from '../useCountdown'
import { gameStore, useGameStore } from '../../store/appStore'
import { RESCUE_MS, UNDO_PENALTY } from '../../store/gameStore'
import { RESCUE_NEED_CAP } from '../../engine/helpers'

const secondaryBtn: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-secondary, 13px)', fontWeight: 600, color: 'var(--ink-soft)',
  background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', textDecoration: 'underline',
  minHeight: 44, display: 'inline-flex', alignItems: 'center', // ≥44px tap height
}

// holdClock: true while the App-level ResumePrompt is open over this screen — the
// rescue clock must not arm (and drain) behind a dialog the player is still reading.
export function PlayScreen({ holdClock = false }: { holdClock?: boolean }) {
  const game = useGameStore((s) => s.game)
  const handoff = useGameStore((s) => s.handoff)
  const deadlineTs = useGameStore((s) => s.deadlineTs)
  const feedback = useGameStore((s) => s.feedback)
  const chainLog = useGameStore((s) => s.chainLog)
  const stamps = useGameStore((s) => s.stamps)
  const dictReady = useGameStore((s) => s.dictReady)
  const undoState = useGameStore((s) => s.undoState)
  const undosUsed = useGameStore((s) => s.undosUsed)
  const lastEvents = useGameStore((s) => s.lastEvents)
  const [stuckMode, setStuckMode] = useState(false)
  const [draft, setDraft] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [confirmNewGame, setConfirmNewGame] = useState(false)
  useWakeLock(true) // held for the whole play screen; released when it unmounts

  // Animation orchestrator: replays the committed move as token motion and gates
  // the curtain/input until it settles (ANIM_DONE). `presenting` is true while animating.
  const { presenting, beat, onBeatDone, skip } = useTurnAnimation()
  // Hold the pre-move stamp set while the token travels, so a word's letters never
  // appear ahead of the token; reveal the full committed set once it settles.
  const settledStamps = useRef(stamps)
  useEffect(() => { if (!presenting) settledStamps.current = stamps }, [presenting, stamps])

  // Reveal a move's stamps letter-by-letter as the token lands each square; the
  // accumulator clears when the turn settles (the full set shows then anyway).
  const [revealed, setRevealed] = useState<number[]>([])
  useEffect(() => { if (!presenting) setRevealed([]) }, [presenting])
  const revealSquare = (sq: number) => setRevealed((r) => (r.includes(sq) ? r : [...r, sq]))

  // Arm the rescue clock only when the token reaches the snake head (fair timing).
  const phase = useGameStore((s) => s.game?.phase)
  useEffect(() => {
    if (phase === 'awaiting-escape' && !presenting && deadlineTs == null && !holdClock) gameStore.getState().armEscapeDeadline()
  }, [phase, presenting, deadlineTs, holdClock])

  const remainingMs = useCountdown(deadlineTs, () => gameStore.getState().expireClock())

  // The winning move commits with screen still on 'play' so its token travel can
  // present; flip to the win screen once the presentation settles. On resume into
  // a won game (phase persisted), this flips immediately.
  useEffect(() => {
    if (phase === 'won' && !presenting) withScreenTransition(() => gameStore.getState().showWinScreen())
  }, [phase, presenting])

  // Leaving stuck mode when the turn hands off keeps it from bleeding into the next player's turn.
  useEffect(() => { if (handoff) { setStuckMode(false); setDraft(''); setInputFocused(false) } }, [handoff])
  // The escape-row take-back path never passes through handoff (submit → escape →
  // undo → live turn), so clear the aim draft on any escape↔chain flip too — the
  // WordInput itself remounts via its key, dropping the stale rescue text.
  const escapePhase = game?.phase === 'awaiting-escape'
  useEffect(() => { setDraft('') }, [escapePhase])

  if (!game) return null
  const player = game.players[game.currentPlayerIndex]
  const escape = game.phase === 'awaiting-escape'
  const won = game.phase === 'won'
  // Canonical rescue requirement: capped at RESCUE_NEED_CAP (legacy saves lack
  // `need`, so apply the same fallback the engine uses).
  const need = escape && game.pendingEscape
    ? (game.pendingEscape.need ?? Math.min(game.pendingEscape.drop, RESCUE_NEED_CAP))
    : null
  const minLength = escape ? (need ?? 3) : 3
  // Only show a clock once its deadline is actually armed: escapes arm on token
  // arrival, turn clocks arm at beginTurn — and a resumed game has NO deadline
  // until play re-arms one (otherwise a dead "0:00" shows behind the resume prompt).
  const showClock = deadlineTs != null && (escape || (game.timer !== 'off' && !handoff))
  const showReach = inputFocused || draft.trim().length >= 1
  // While presenting: show pre-move stamps plus the squares the token has already
  // landed this move (per-letter reveal). On settle: the full committed set.
  const shownStamps = presenting
    ? Object.fromEntries(
        Object.entries(stamps).filter(
          ([sq]) => settledStamps.current[Number(sq)] !== undefined || revealed.includes(Number(sq)),
        ),
      )
    : stamps
  // Attribute the moving token to the acting player during its animation (not the
  // committed next player) so the HUD reads honestly.
  const hudPlayer = presenting && beat ? (game.players.find((p) => p.id === beat.playerId) ?? player) : player

  const onSubmit = (w: string): boolean => {
    if (escape) return gameStore.getState().resolveEscape(w)
    if (stuckMode) return gameStore.getState().stuck(w)
    return gameStore.getState().submit(w)
  }

  // Context strip inputs: the live landing for the current draft, whether the draft
  // obeys the first-letter rule, and the rejection text (surfaced in-strip because
  // the below-input message can render under the fold).
  const draftLen = draft.trim().length
  const stripLanding = !escape && !stuckMode && !won && draftLen >= 1 ? previewLanding(game.board, player.square, draftLen) : null
  const draftValid = !game.requiredLetter || draftLen === 0 || draft.trim()[0].toUpperCase() === game.requiredLetter
  const feedbackText = feedback ? rejectMessage(feedback.reason, { requiredLetter: escape || stuckMode ? null : game.requiredLetter, minLength }) : null

  return (
    <div>
      <Header compact onNewGame={() => setConfirmNewGame(true)} />
      <TurnHud
        player={hudPlayer}
        phase={game.phase}
        requiredLetter={game.requiredLetter}
        need={need}
        remainingMs={remainingMs}
        showClock={showClock}
        presenting={presenting}
        stuckMode={stuckMode}
        escapeTotalMs={RESCUE_MS}
      />
      <div
        onClick={() => { if (presenting) skip() }}
        style={{ position: 'relative', border: '1px solid var(--line)', borderRadius: 14, padding: 14, background: 'linear-gradient(180deg, var(--paper-2), transparent)' }}
      >
        <BoardView board={game.board} />
        <StampLayer stamps={shownStamps} length={game.board.length} players={game.players} board={game.board} />
        <AnimatedTokenLayer players={game.players} length={game.board.length} beat={beat} onBeatDone={onBeatDone} onHopLand={revealSquare} />
        {escape && !presenting && deadlineTs != null && (
          <EscapeVignette fraction={remainingMs / RESCUE_MS} />
        )}
        {!handoff && !escape && !stuckMode && !presenting && !won && (
          <AimLayer
            board={game.board}
            from={player.square}
            draftLength={draft.trim().length}
            showReach={showReach}
            draftValid={draftValid}
            requiredLetter={game.requiredLetter}
          />
        )}
        {handoff && !presenting && (
          <HandoffCurtain
            player={player}
            onStart={() => gameStore.getState().beginTurn()}
            firstTurn={chainLog.length === 0}
            requiredLetter={game.requiredLetter}
            // The last-move story for the incoming player, from the transient event
            // log (absent after a reload — the recap simply doesn't render then).
            recap={(() => {
              const entry = chainLog[chainLog.length - 1]
              if (!entry || lastEvents.some((e) => e.type === 'STUCK')) return null
              const mover = game.players.find((p) => p.id === entry.playerId)
              if (!mover) return null
              const base = { word: entry.word, playerName: mover.name, playerColor: mover.color }
              const ladder = lastEvents.find((e) => e.type === 'LADDER')
              if (ladder && ladder.type === 'LADDER') return { ...base, from: ladder.foot, to: ladder.top, feature: 'ladder' as const }
              const fail = lastEvents.find((e) => e.type === 'ESCAPE_FAIL')
              if (fail && fail.type === 'ESCAPE_FAIL') return { ...base, from: fail.head, to: fail.tail, feature: 'snake-slid' as const }
              const rescued = lastEvents.find((e) => e.type === 'ESCAPE_SUCCESS')
              if (rescued && rescued.type === 'ESCAPE_SUCCESS') return { ...base, from: rescued.head, to: rescued.head, feature: 'snake-escaped' as const }
              const move = lastEvents.find((e) => e.type === 'MOVE')
              if (move && move.type === 'MOVE') return { ...base, from: move.from, to: move.to }
              return null
            })()}
            takeBack={undoState ? {
              word: undoState.word,
              free: undosUsed === 0,
              onTakeBack: () => gameStore.getState().undo(),
              playerName: game.players.find((p) => p.id === undoState.playerId)?.name,
            } : undefined}
          />
        )}
      </div>

      <ChainStrip entries={chainLog} players={game.players} />

      {!handoff && !presenting && !won && (
        <>
          <ContextStrip
            player={player}
            requiredLetter={stuckMode ? null : game.requiredLetter}
            landing={stripLanding}
            draftValid={draftValid}
            feedbackText={feedbackText}
            mode={escape ? 'escape' : stuckMode ? 'stuck' : 'chain'}
            need={need}
          />
          <WordInput
            key={escape ? 'escape' : 'chain'}
            mode={escape ? 'escape' : 'chain'}
            requiredLetter={escape || stuckMode ? null : game.requiredLetter}
            minLength={minLength}
            feedback={feedback}
            onSubmit={onSubmit}
            onClearFeedback={() => gameStore.getState().clearFeedback()}
            onValueChange={setDraft}
            onFocusChange={setInputFocused}
            accent={player.color}
            dictReady={dictReady}
            trailing={escape && deadlineTs != null ? (
              // In-row countdown: the browser keeps the focused input on-screen, so
              // this ring stays visible while typing (the HUD ring scrolls away).
              <span aria-hidden="true" style={{ alignSelf: 'center', display: 'inline-flex' }}>
                <EscapeRing remainingMs={remainingMs} totalMs={RESCUE_MS} size={40} />
              </span>
            ) : undefined}
            hideMessage
          />
          <div style={{ display: 'flex', gap: 16, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {escape ? (
              <>
                <button onClick={() => gameStore.getState().resolveEscape(null)} style={secondaryBtn}>
                  Give up &amp; slide to {game.pendingEscape?.toSquare}
                </button>
                {undoState && (
                  <button onClick={() => gameStore.getState().undo()} style={secondaryBtn}>
                    ↩ Take back {undoState.word} {undosUsed === 0 ? '(free)' : `(−${UNDO_PENALTY} squares)`}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => { setStuckMode((s) => !s); gameStore.getState().clearFeedback() }}
                style={secondaryBtn}
              >
                {stuckMode ? '← Back to the chain' : 'Stuck? Play any word (stay put)'}
              </button>
            )}
          </div>
          {stuckMode && !escape && (
            <p style={{ fontSize: 'var(--fs-secondary, 13px)', color: 'var(--ink-soft)', marginTop: 8 }}>
              Any valid word — you advance 0 and the chain continues from your word.
            </p>
          )}
        </>
      )}
      <ConfirmDialog
        open={confirmNewGame}
        title="Start a new game?"
        message="This ends the current game and returns to setup."
        confirmLabel="New game"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setConfirmNewGame(false)}
        onConfirm={() => { setConfirmNewGame(false); withScreenTransition(() => gameStore.getState().newGame()) }}
      />
    </div>
  )
}
