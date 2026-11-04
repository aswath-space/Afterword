import { EMBLEM_CLIP } from './emblems'

export function EmblemChip({ color, emblem, size = 14 }: { color: string; emblem: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-block', width: size, height: size, background: color, clipPath: EMBLEM_CLIP[emblem] ?? EMBLEM_CLIP.circle, flex: '0 0 auto' }}
    />
  )
}
