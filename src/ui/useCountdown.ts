import { useEffect, useRef, useState } from 'react'

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function useCountdown(deadlineTs: number | null, onExpire: () => void): number {
  const [remaining, setRemaining] = useState(() => (deadlineTs == null ? 0 : Math.max(0, deadlineTs - Date.now())))
  // Recompute synchronously on the render where the deadline changes (adjust-state-
  // during-render) so the first armed frame isn't a stale 0 — otherwise the escape
  // ring / clock flashes "0" for a frame before the interval's first tick.
  const seenDeadline = useRef(deadlineTs)
  if (seenDeadline.current !== deadlineTs) {
    seenDeadline.current = deadlineTs
    setRemaining(deadlineTs == null ? 0 : Math.max(0, deadlineTs - Date.now()))
  }
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (deadlineTs == null) { setRemaining(0); return }
    let fired = false
    const tick = () => {
      const left = deadlineTs - Date.now()
      setRemaining(Math.max(0, left))
      if (left <= 0 && !fired) { fired = true; onExpireRef.current() }
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [deadlineTs])

  return remaining
}
