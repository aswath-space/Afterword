const CLIP: Record<string, string> = {
  circle: 'circle(50%)',
  diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
  triangle: 'polygon(50% 5%, 95% 95%, 5% 95%)',
  hex: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)',
}

export function EmblemChip({ color, emblem, size = 14 }: { color: string; emblem: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-block', width: size, height: size, background: color, clipPath: CLIP[emblem] ?? CLIP.circle, flex: '0 0 auto' }}
    />
  )
}
