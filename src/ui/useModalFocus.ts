import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useModalFocus(
  ref: React.RefObject<HTMLElement | null>,
  { open, onClose, dismissible = true }: { open: boolean; onClose?: () => void; dismissible?: boolean },
): void {
  // Keep the latest handler/flag in refs so the focus-setup effect depends only on
  // `open` — not on every parent re-render. Without this, a dialog opened during a
  // timed turn (useCountdown re-renders the screen every 250ms, passing a fresh inline
  // onClose) would tear down and re-run this effect each tick, yanking focus back to
  // the first control repeatedly and making the dialog unusable by keyboard/AT.
  const onCloseRef = useRef(onClose)
  const dismissibleRef = useRef(dismissible)
  useEffect(() => {
    onCloseRef.current = onClose
    dismissibleRef.current = dismissible
  })

  useEffect(() => {
    if (!open) return
    const node = ref.current
    if (!node) return
    const prev = document.activeElement as HTMLElement | null

    const focusables = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
    // Honor an explicit [data-autofocus] target (e.g. the SAFE action in a destructive
    // dialog) so initial focus never lands on a game-wiping button; otherwise focus the
    // first focusable, else the container. (React's autoFocus prop focuses imperatively
    // and emits no queryable attribute, so we use an explicit data-attribute instead.)
    const target = node.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0]
    ;(target ?? node).focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissibleRef.current) {
        e.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    node.addEventListener('keydown', onKeyDown)
    return () => {
      node.removeEventListener('keydown', onKeyDown)
      prev?.focus?.()
    }
  }, [open, ref])
}
