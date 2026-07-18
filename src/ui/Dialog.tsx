import { useRef } from 'react'
import { useModalFocus } from './useModalFocus'

export function Dialog({
  open,
  onClose,
  label,
  labelledById,
  children,
}: {
  open: boolean
  onClose?: () => void
  label?: string
  labelledById?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, { open, onClose, dismissible: !!onClose })
  if (!open) return null
  return (
    <div
      data-testid="aw-dialog-overlay"
      onClick={() => onClose?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', padding: 20,
        background: 'color-mix(in srgb, var(--ink) 42%, transparent)', backdropFilter: 'blur(3px)',
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={labelledById ? undefined : label}
        aria-labelledby={labelledById}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 100%)', textAlign: 'center', background: 'var(--paper)',
          border: '1px solid var(--line)', borderRadius: 16, padding: 24,
          boxShadow: '0 20px 60px color-mix(in srgb, var(--ink) 28%, transparent)', outline: 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
