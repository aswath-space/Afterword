import { Dialog } from './Dialog'
import { useDisplayStore, displayStore } from '../store/displayStore'

function SwitchRow({ label, hint, checked, onToggle }: {
  label: string
  hint: string
  checked: boolean
  onToggle: () => void
}) {
  // aria-label overrides the button's content for AT, so the hint must be exposed
  // separately via aria-describedby or screen-reader users never hear it.
  const hintId = 'aw-switch-hint-' + label.toLowerCase().replace(/[^a-z]+/g, '-')
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={hintId}
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, width: '100%',
        textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--line)',
        padding: '10px 2px', minHeight: 56, cursor: 'pointer',
      }}
    >
      <span>
        <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{label}</span>
        <span id={hintId} style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>{hint}</span>
      </span>
      {/* Track + thumb, colour-independent state (thumb position) for CVD safety */}
      <span aria-hidden style={{
        flex: '0 0 auto', width: 46, height: 26, borderRadius: 999, position: 'relative',
        background: checked ? 'var(--teal)' : 'color-mix(in srgb, var(--line) 55%, transparent)',
        border: '1px solid var(--line)', transition: 'background 120ms ease',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: '50%',
          background: 'var(--tile)', boxShadow: '0 1px 2px rgba(0,0,0,0.25)', transition: 'left 120ms ease',
        }} />
      </span>
    </button>
  )
}

export function DisplayDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const contrast = useDisplayStore((s) => s.contrast)
  const palette = useDisplayStore((s) => s.palette)
  const text = useDisplayStore((s) => s.text)
  return (
    <Dialog open={open} onClose={onClose} labelledById="aw-display-title">
      <h2 id="aw-display-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, margin: '0 0 6px', color: 'var(--ink)' }}>
        Display
      </h2>
      <div style={{ textAlign: 'left' }}>
        <SwitchRow
          label="High contrast"
          hint="Stronger ink and lines"
          checked={contrast === 'high'}
          onToggle={() => displayStore.getState().setContrast(contrast === 'high' ? 'normal' : 'high')}
        />
        <SwitchRow
          label="Colour-blind palette"
          hint="Blue / orange / green / purple player colours"
          checked={palette === 'cvd'}
          onToggle={() => displayStore.getState().setPalette(palette === 'cvd' ? 'classic' : 'cvd')}
        />
        <SwitchRow
          label="Larger text"
          hint="Bigger chain, status and input text"
          checked={text === 'large'}
          onToggle={() => displayStore.getState().setText(text === 'large' ? 'normal' : 'large')}
        />
      </div>
      <button
        onClick={onClose}
        data-autofocus
        style={{
          marginTop: 18, fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'var(--tile)',
          background: 'var(--teal)', border: 'none', borderRadius: 999, padding: '0 26px', minHeight: 44, cursor: 'pointer',
        }}
      >
        Done
      </button>
    </Dialog>
  )
}
