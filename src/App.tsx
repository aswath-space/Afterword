import { useEffect, useState } from 'react'
import { useGameStore, gameStore } from './store/appStore'
import { SetupScreen } from './ui/screens/SetupScreen'
import { PlayScreen } from './ui/screens/PlayScreen'
import { WonScreen } from './ui/screens/WonScreen'
import { ResumePrompt } from './ui/ResumePrompt'
import { withScreenTransition } from './ui/viewTransition'
import { decodeBoard, type SharedBoard } from './share/boardCodec'

export default function App() {
  const screen = useGameStore((s) => s.screen)
  const game = useGameStore((s) => s.game)

  // A `?b=` link routes to a PRE-SEEDED setup regardless of any saved game (explicit
  // link intent beats auto-resume; the saved game stays in localStorage until they
  // actually Start). One-shot: the param is stripped immediately so reload/refresh
  // doesn't re-trigger it, and starting (or dismissing the chip) consumes the intent.
  const [sharedBoard, setSharedBoard] = useState<SharedBoard | null>(() => {
    const parsed = decodeBoard(new URLSearchParams(window.location.search).get('b'))
    if (parsed) window.history.replaceState(null, '', window.location.pathname)
    return parsed
  })

  // One-shot: if the app rehydrated straight into a running game, ask before resuming.
  // A game persisted mid-win-walk (screen 'play', phase 'won') is NOT a resumable game —
  // PlayScreen flips it straight to the win screen, so asking would only flash a prompt.
  const [resumePending, setResumePending] = useState(() => {
    const s = gameStore.getState()
    return s.screen === 'play' && !!s.game && s.game.phase !== 'won'
  })
  // If anything other than the prompt's own buttons navigates away (e.g. the win-flip),
  // consume the pending flag — otherwise it would reopen over the NEXT game.
  useEffect(() => {
    if (resumePending && screen !== 'play') setResumePending(false)
  }, [resumePending, screen])

  const resumeSummary = (() => {
    if (!game) return ''
    const cur = game.players[game.currentPlayerIndex]
    return `${game.players.length} players · square ${cur.square}`
  })()

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(16px,4vw,36px)', paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
      {(screen === 'setup' || sharedBoard != null) && (
        <SetupScreen
          sharedBoard={sharedBoard}
          onClearShared={() => setSharedBoard(null)}
          onStart={(config) => {
            setSharedBoard(null)
            // Starting ANY game from here consumes a pending resume: without this, a
            // saved game's prompt (suppressed while sharedBoard was set, and never
            // consumed because screen stays 'play' throughout) would pop over the
            // freshly started shared game — where "Start fresh" destroys it.
            setResumePending(false)
            withScreenTransition(() => gameStore.getState().configureAndStart(config))
          }}
        />
      )}
      {screen === 'play' && sharedBoard == null && <PlayScreen holdClock={resumePending} />}
      {screen === 'won' && sharedBoard == null && game && (
        <WonScreen
          game={game}
          onPlayAgain={() => withScreenTransition(() => gameStore.getState().playAgain())}
          onNewGame={() => withScreenTransition(() => gameStore.getState().newGame())}
        />
      )}
      <ResumePrompt
        open={resumePending && screen === 'play' && !!game && sharedBoard == null}
        summary={resumeSummary}
        onContinue={() => {
          setResumePending(false)
          // Fairness: rehydrate dropped any stale deadline; give a timed mid-turn
          // resume a FRESH turn clock (escapes re-arm via the arm-on-arrival effect).
          const s = gameStore.getState()
          if (s.game && !s.handoff && s.game.phase === 'awaiting-word' && s.game.timer !== 'off') s.beginTurn()
        }}
        onStartFresh={() => { setResumePending(false); withScreenTransition(() => gameStore.getState().newGame()) }}
      />
    </main>
  )
}
