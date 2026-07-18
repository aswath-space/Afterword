import { useEffect, useRef } from 'react'

type Sentinel = { release: () => Promise<void>; addEventListener: (t: string, cb: () => void) => void }
type NavWithWakeLock = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } }

export function useWakeLock(active: boolean): void {
  const ref = useRef<Sentinel | null>(null)
  useEffect(() => {
    if (!active) return
    let cancelled = false
    const nav = navigator as NavWithWakeLock

    const request = async () => {
      if (!nav.wakeLock) return
      try {
        const sentinel = await nav.wakeLock.request('screen')
        if (cancelled) { sentinel.release().catch(() => {}); return }
        sentinel.addEventListener('release', () => { ref.current = null })
        ref.current = sentinel
      } catch {
        /* best-effort: not user-activated / low battery / unsupported */
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !ref.current) request()
    }

    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      ref.current?.release().catch(() => {})
      ref.current = null
    }
  }, [active])
}
