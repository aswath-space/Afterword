import { Fragment, useRef, useState } from 'react'
import type { GameState } from '../../engine/types'
import { EmblemChip } from '../EmblemChip'
import { Confetti } from '../Confetti'
import { ChainStrip } from '../ChainStrip'
import { Dialog } from '../Dialog'
import { useGameStore } from '../../store/appStore'
import { encodeBoard } from '../../share/boardCodec'

export function WonScreen({ game, onPlayAgain, onNewGame }: { game: GameState; onPlayAgain: () => void; onNewGame: () => void }) {
  const chainLog = useGameStore((s) => s.chainLog)
  const winner = game.players.find((p) => p.id === game.winnerId) ?? game.players[0]
  const standings = [...game.players].sort((a, b) => b.square - a.square)

  // Share-a-board: the rematch moment is when "play THIS board" gets asked for.
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const linkRef = useRef<HTMLInputElement>(null)
  const shareLink = `${window.location.origin}${import.meta.env.BASE_URL}?b=${encodeBoard(game.board.seed, game.board.length as 30 | 50 | 100)}`
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // No clipboard permission (rare) — select the text for a manual copy.
      linkRef.current?.select()
    }
  }

  const colorOf = (id: string) => game.players.find((p) => p.id === id)?.color ?? winner.color
  // The winning word is the last committed move (stuck plays keep the chain but can't win).
  const winningEntry = [...chainLog].reverse().find((e) => e.kind === 'move')
  // Longest by letter count across ALL entries (stuck words are still played words);
  // strict > keeps the first-played word on ties.
  const longest = chainLog.reduce<(typeof chainLog)[number] | null>(
    (best, e) => (best === null || e.word.length > best.word.length ? e : best),
    null,
  )
  const countFor = (id: string) => chainLog.filter((e) => e.playerId === id).length
  const words = (n: number) => `${n} ${n === 1 ? 'word' : 'words'}`

  return (
    <div style={{ position: 'relative', display: 'grid', gap: 22, textAlign: 'center', paddingTop: 24 }}>
      <Confetti color={winner.color} />
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        Afterword
      </div>
      <div style={{ display: 'grid', placeItems: 'center', gap: 12 }}>
        <EmblemChip color={winner.color} emblem={winner.emblem} size={30} />
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px,8vw,52px)', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
          {winner.name} wins!
        </h2>
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: '0 auto', maxWidth: 320, display: 'grid', gap: 8 }}>
        {standings.map((p) => (
          <li key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontFamily: 'var(--font-sans)', fontSize: 16, padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--tile)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <EmblemChip color={p.color} emblem={p.emblem} size={12} />
              {p.name}
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-soft)' }}>square {p.square}</span>
          </li>
        ))}
      </ol>
      {chainLog.length > 0 && (
        // minWidth: 0 down this subtree stops the ChainStrip's max-content width from
        // propagating up through grid min-sizing and blowing the page wider than the
        // viewport (its own overflow-x only engages once an ancestor constrains it).
        <section style={{ display: 'grid', gap: 12, minWidth: 0 }}>
          {winningEntry && (
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--fs-chain-word, 20px)', margin: 0, color: 'var(--ink)' }}>
              won with{' '}
              <span style={{ fontWeight: 600, borderBottom: `3px solid ${colorOf(winningEntry.playerId)}`, paddingBottom: 3 }}>
                {winningEntry.word}
              </span>
            </p>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
              The chain
            </div>
            <ChainStrip entries={chainLog} players={game.players} wrap />
          </div>
          <div
            data-stats
            style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '4px 10px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-soft)' }}
          >
            <span>{words(chainLog.length)}</span>
            {longest && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  longest <strong style={{ fontWeight: 600, color: 'var(--ink)' }}>{longest.word}</strong>
                </span>
              </>
            )}
            {game.players.map((p) => (
              <Fragment key={p.id}>
                <span aria-hidden="true">·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <EmblemChip color={p.color} emblem={p.emblem} size={10} />
                  {p.name} {words(countFor(p.id))}
                </span>
              </Fragment>
            ))}
          </div>
        </section>
      )}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={onPlayAgain} style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'var(--tile)', background: 'var(--teal)', border: 'none', borderRadius: 999, padding: '13px 24px', cursor: 'pointer' }}>
          Play again
        </button>
        <button onClick={onNewGame} style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'var(--ink)', background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 999, padding: '13px 24px', cursor: 'pointer' }}>
          New game
        </button>
      </div>
      <button
        onClick={() => setShareOpen(true)}
        style={{
          fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-secondary, 13px)', fontWeight: 600, color: 'var(--ink-soft)',
          background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline',
          minHeight: 44, justifySelf: 'center',
        }}
      >
        Share this board
      </button>
      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} label="Share this board">
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 600, margin: '0 0 10px', color: 'var(--ink)' }}>
          Share this board
        </h3>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-soft)', margin: '0 0 16px' }}>
          Anyone with this link plays this exact board — same snakes, same ladders.
        </p>
        <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
          <input
            ref={linkRef}
            readOnly
            value={shareLink}
            aria-label="Board link"
            onFocus={(e) => e.currentTarget.select()}
            style={{
              // ≥16px like every other input — sub-16px focused inputs make iOS Safari
              // zoom the whole page (the dialog would shift/crop mid-share).
              flex: 1, minWidth: 0, fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--ink)',
              background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 12px',
            }}
          />
          <button
            onClick={copyLink}
            style={{
              fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: 'var(--tile)',
              background: 'var(--teal)', border: 'none', borderRadius: 10, padding: '0 16px', cursor: 'pointer', minHeight: 44,
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button
          data-autofocus
          onClick={() => setShareOpen(false)}
          style={{
            marginTop: 16, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, color: 'var(--ink)',
            background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 999, padding: '11px 22px', cursor: 'pointer', minHeight: 44,
          }}
        >
          Done
        </button>
      </Dialog>
    </div>
  )
}
