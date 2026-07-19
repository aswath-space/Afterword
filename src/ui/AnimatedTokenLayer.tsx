import { useLayoutEffect, useRef } from 'react'
import type { PlayerState } from '../engine/types'
import { boardLayout } from './boardLayout'
import { serpentGeometry } from './boardGeometry'
import type { Beat } from './timeline'
import { HOP_STAGGER_MS, prefersReducedMotion } from './motion/presets'

const CLIP: Record<string, string> = {
  circle: 'circle(50%)',
  diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
  triangle: 'polygon(50% 5%, 95% 95%, 5% 95%)',
  hex: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)',
}
const BASE = 'translate(-50%, -50%)' // token is centered on its square

// When 2+ tokens REST on the same square they fan out around its centre AND shrink,
// so they read as separate chips instead of a 70%-overlapping pile (the old ~1.3%
// offset was far smaller than a token's 3.5% radius). Slots are assigned by
// players-array order among the co-located set. The invariant: every token stays
// inside its tile on ALL board sizes — worst case is the 100 board (5% half-cell),
// where max single-axis offset (~2.5%) + the shrunk half-token keeps the far edge
// < 5%. A lone token is byte-identical to before (7%, exact centre). Beat keyframes
// are untouched — the moving token animates centre-to-centre and takes its slot +
// size on settle. Co-located rest is now rare in play (capture prevents voluntary
// stacking); the common cases are the start clump and the odd knockback collision.
const FAN: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [], // 0 co-located — unused
  [[0, 0]], // alone — exact centre (the common case is byte-identical to before)
  [[-1.9, -1.9], [1.9, 1.9]], // pair — diagonal
  [[0, -2.5], [-2.4, 1.5], [2.4, 1.5]], // trio — triangle
  [[0, -2.4], [2.4, 0], [0, 2.4], [-2.4, 0]], // four — cross
]
// Token diameter as a % of board width, indexed by min(cohort size, 4). Smaller
// cohorts keep bigger tokens; larger cohorts shrink so the fan separates them.
const TOKEN_PCT = ['7%', '7%', '5.2%', '4.6%', '4%'] as const

// Token layer that plays ONE beat at a time via the Web Animations API in
// percentage space (auto-aligned with BoardView/StampLayer). WAAPI reliably
// animates left/top + a transform arc, so the token HOPS once per letter, climbs
// the ladder axis, and slithers along the real snake spine. Each beat's layout
// effect first snaps the active token to the beat's START square (before paint, so
// no flash) then animates to its END, calling onBeatDone on completion. Under
// reduced motion (also the SSR/jsdom default) it reports done immediately and the
// token sits at its committed square via React-rendered left/top.
export function AnimatedTokenLayer({ players, length, beat, onBeatDone, onHopLand, presented = {} }: {
  players: PlayerState[]; length: number; beat: Beat | null; onBeatDone: () => void; onHopLand?: (square: number) => void
  // Where each token should render given the beats played so far (from useTurnAnimation).
  // A non-active token uses this — the square the animation has REACHED — instead of its
  // final committed square, so a bumped victim doesn't slide back before it is hit and a
  // post-bump climber doesn't jump to the ladder top during the victim's knockback beat.
  presented?: Record<string, number>
}) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({})
  // Latest presented map, read by the beat cleanup (which runs after the index has
  // advanced, so it must settle to the AFTER-beat position, not the closure's stale one).
  const presentedRef = useRef(presented)
  presentedRef.current = presented
  const layout = boardLayout(length)
  const posXY = (square: number) => {
    // Square 0 ("start") rests ON square 1: the old off-board rest point (one cell
    // left of square 1) is clipped past the viewport edge on phone widths — all four
    // UX lenses measured tokens at x≈-37px, i.e. a first turn with NO visible piece.
    // Waiting tokens fan out inside square 1 with the sitting player instead.
    const base = layout.centerOf(Math.max(square, 1))
    return { x: (base.x / layout.width) * 100, y: (base.y / layout.height) * 100 }
  }
  // Exact square centre — used by every beat keyframe (moving tokens never fan out).
  const pos = (square: number) => {
    const c = posXY(square)
    return { left: `${c.x}%`, top: `${c.y}%` }
  }
  // A token's CURRENT square = where the animation has reached (presented), falling
  // back to the committed square for players with no beat this turn. Cohorts group by
  // the VISUAL square (square 0 rests on square 1), so starting tokens fan out together
  // with any token already sitting on square 1. Both position AND size derive from this
  // so a token only shrinks/fans once it is actually co-located in the presented state.
  const squareOf = (pl: PlayerState, pres: Record<string, number>) => pres[pl.id] ?? pl.square
  const cohortWith = (p: PlayerState, pres: Record<string, number>) => {
    const vis = (pl: PlayerState) => Math.max(squareOf(pl, pres), 1)
    return players.filter((pl) => vis(pl) === vis(p))
  }
  // Resting position: square centre plus this token's FAN slot when co-located.
  const restPosWith = (p: PlayerState, pres: Record<string, number>) => {
    const cohort = cohortWith(p, pres)
    const [dx, dy] = FAN[Math.min(cohort.length, 4)]?.[cohort.findIndex((pl) => pl.id === p.id)] ?? [0, 0]
    const c = posXY(squareOf(p, pres))
    return { left: `${c.x + dx}%`, top: `${c.y + dy}%` }
  }
  const restPos = (p: PlayerState) => restPosWith(p, presented)
  // Token diameter shrinks when the square is shared (see FAN/TOKEN_PCT).
  const tokenSize = (p: PlayerState) => TOKEN_PCT[Math.min(cohortWith(p, presented).length, 4)]
  const ptPos = (p: { x: number; y: number }) => ({ left: `${(p.x / layout.width) * 100}%`, top: `${(p.y / layout.height) * 100}%` })
  const reduced = prefersReducedMotion()

  useLayoutEffect(() => {
    if (!beat) return
    const el = refs.current[beat.playerId]
    if (reduced || !el || typeof el.animate !== 'function') { onBeatDone(); return }
    let cancelled = false

    const play = (keyframes: Keyframe[], duration: number, easing = 'ease-in-out') =>
      new Promise<void>((resolve) => {
        const a = el.animate(keyframes, { duration, easing, fill: 'forwards' })
        a.onfinish = () => resolve()
        a.oncancel = () => resolve()
      })
    const settle = (p: { left: string; top: string }) => { el.style.left = p.left; el.style.top = p.top; el.style.transform = BASE }

    const run = async () => {
      if (beat.kind === 'hops') {
        settle(pos(beat.squares[0] - 1)) // start on the previous square before paint
        let prev = beat.squares[0] - 1
        for (const sq of beat.squares) {
          if (cancelled) return
          const a = pos(prev), c = pos(sq)
          await play([
            { left: a.left, top: a.top, transform: `${BASE} translateY(0) scaleY(1)` },
            { transform: `${BASE} translateY(-48%) scaleY(1.12)`, offset: 0.5 },
            { left: c.left, top: c.top, transform: `${BASE} translateY(0) scaleY(0.9)` },
          ], HOP_STAGGER_MS + 70)
          if (!cancelled) { settle(c); onHopLand?.(sq) } // signal the landing (per-letter stamp reveal)
          prev = sq
        }
      } else if (beat.kind === 'climb') {
        const a = pos(beat.from), c = pos(beat.to)
        settle(a)
        await play([{ left: a.left, top: a.top }, { left: c.left, top: c.top }], 520, 'cubic-bezier(0.22,1,0.36,1)')
        if (!cancelled) settle(c)
      } else if (beat.kind === 'slither') {
        const sp = serpentGeometry(layout.centerOf(beat.head), layout.centerOf(beat.tail)).spinePoints
        const stepN = Math.max(1, Math.floor(sp.length / 24))
        const pts = sp.filter((_, i) => i % stepN === 0 || i === sp.length - 1)
        settle(ptPos(pts[0]))
        await play(pts.map((p) => ({ ...ptPos(p) })), 950, 'cubic-bezier(0.5,0,0.75,0)')
        if (!cancelled) settle(ptPos(pts[pts.length - 1]))
      } else if (beat.kind === 'knockback') {
        // The bumped victim is shoved straight back to its knocked-down square. A
        // recoil (quick nudge toward the mover, then an accelerating slide back)
        // sells the hit; it settles on the victim's committed (fanned) rest slot.
        const a = pos(beat.from), c = pos(beat.to)
        settle(a)
        await play([
          { left: a.left, top: a.top, transform: `${BASE} scale(1)` },
          { transform: `${BASE} scale(1.12)`, offset: 0.14 },
          { left: c.left, top: c.top, transform: `${BASE} scale(1)` },
        ], 500, 'cubic-bezier(0.5, 0, 0.75, 0)')
        if (!cancelled) settle(c)
      } else if (beat.kind === 'settle') {
        await play([
          { transform: `${BASE} scale(1)` },
          { transform: `${BASE} scale(1.18)`, offset: 0.5 },
          { transform: `${BASE} scale(1)` },
        ], 420)
      }
      if (!cancelled) onBeatDone()
    }
    run()
    // On interrupt (skip / beat change / unmount) AND after the final beat: cancel the
    // in-flight WAAPI animation (its fill:'forwards' would otherwise override the inline
    // style and strand the token), then snap the token to its COMMITTED resting slot
    // (fanned if co-located — beats end at the bare centre). React won't do this itself —
    // the committed rest style prop is constant across the presenting window, so it never
    // re-applies left/top over our imperative settle(). cancel() fires oncancel,
    // resolving the pending play() promise so run() unwinds.
    return () => {
      cancelled = true
      el.getAnimations?.().forEach((a) => a.cancel())
      // Settle to the AFTER-beat position: this cleanup runs once the index has already
      // advanced, so read the latest presented map (via ref) — a mover that still has a
      // climb ahead of it stays at the ladder foot here rather than snapping to the top.
      const mover = players.find((pl) => pl.id === beat.playerId)
      if (mover) settle(restPosWith(mover, presentedRef.current))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, reduced])

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {players.map((p) => {
        const home = restPos(p)
        const animating = !reduced && beat?.playerId === p.id
        return (
          <div
            key={p.id}
            data-token={p.id}
            data-anim={animating ? beat?.kind : undefined}
            ref={(el) => { refs.current[p.id] = el }}
            style={{
              position: 'absolute', left: home.left, top: home.top, transform: BASE,
              // Settled tokens ease between rest slots (fan-out reshuffles when a
              // square's occupancy changes; the mover glides into its slot when the
              // final beat's cleanup settle() runs). NEVER on the beat's own token:
              // its left/top are driven imperatively (pre-paint snaps + WAAPI with
              // fill:'forwards'), and a CSS transition would tween those snaps. React
              // commits this style removal in the mutation phase, before the layout
              // effect snaps the mover to its beat-start square — so the mover is
              // always transition-free while animating.
              transition: animating || reduced ? undefined : 'left 150ms ease, top 150ms ease, width 150ms ease',
              width: tokenSize(p), aspectRatio: '1', background: p.color, clipPath: CLIP[p.emblem] ?? CLIP.circle,
              boxShadow: '0 2px 5px rgba(0,0,0,0.35)', border: '1.5px solid rgba(255,255,255,0.6)',
            }}
          />
        )
      })}
    </div>
  )
}
