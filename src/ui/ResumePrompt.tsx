import { Dialog } from './Dialog'

export function ResumePrompt({
  open, summary, onContinue, onStartFresh,
}: {
  open: boolean
  summary: string
  onContinue: () => void
  onStartFresh: () => void
}) {
  return (
    <Dialog open={open} labelledById="aw-resume-title">
      <h2 id="aw-resume-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
        Continue your game?
      </h2>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-soft)', margin: '10px 0 22px' }}>
        {summary}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={onStartFresh}
          style={{
            fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 15, color: 'var(--ink)',
            background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 999,
            padding: '0 22px', minHeight: 44, cursor: 'pointer',
          }}
        >
          Start fresh
        </button>
        <button
          onClick={onContinue}
          data-autofocus
          style={{
            fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'var(--tile)',
            background: 'var(--teal)', border: 'none', borderRadius: 999,
            padding: '0 22px', minHeight: 44, cursor: 'pointer',
          }}
        >
          Continue
        </button>
      </div>
    </Dialog>
  )
}
