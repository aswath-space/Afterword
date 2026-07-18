import type { PlayerState } from '../engine/types'
import { boardLayout } from './boardLayout'

const CLIP: Record<string, string> = {
  circle: 'circle(50%)',
  diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
  triangle: 'polygon(50% 5%, 95% 95%, 5% 95%)',
  hex: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)',
}

export function TokenLayer({ players, length }: { players: PlayerState[]; length: number }) {
  const layout = boardLayout(length)
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {players.map((p) => {
        const c = layout.centerOf(p.square)
        const left = (c.x / layout.width) * 100
        const top = (c.y / layout.height) * 100
        return (
          <div
            key={p.id}
            data-token={p.id}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: `${top}%`,
              width: '7%',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              background: p.color,
              clipPath: CLIP[p.emblem] ?? CLIP.circle,
              boxShadow: '0 2px 5px rgba(0,0,0,0.35)',
              border: '1.5px solid rgba(255,255,255,0.6)',
            }}
          />
        )
      })}
    </div>
  )
}
