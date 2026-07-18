import { Dialog } from './Dialog'

export function ConfirmDialog({
  open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, destructive,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}) {
  return (
    <Dialog open={open} onClose={onCancel} labelledById="aw-confirm-title">
      <h2 id="aw-confirm-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
        {title}
      </h2>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-soft)', margin: '10px 0 22px' }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button
          onClick={onCancel}
          style={{
            fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 15, color: 'var(--ink)',
            background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 999,
            padding: '0 22px', minHeight: 44, cursor: 'pointer',
          }}
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          style={{
            fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15,
            color: destructive ? '#F3EAD7' : 'var(--tile)',
            background: destructive ? 'color-mix(in srgb, var(--terracotta) 72%, #23190E)' : 'var(--teal)',
            border: 'none', borderRadius: 999, padding: '0 22px', minHeight: 44, cursor: 'pointer',
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
