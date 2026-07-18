import { flushSync } from 'react-dom'
import { prefersReducedMotion } from './motion/presets'

type DocWithVT = Document & { startViewTransition?: (cb: () => void) => unknown }

export function withScreenTransition(fn: () => void): void {
  const doc = typeof document !== 'undefined' ? (document as DocWithVT) : undefined
  if (doc && typeof doc.startViewTransition === 'function' && !prefersReducedMotion()) {
    doc.startViewTransition(() => flushSync(fn))
  } else {
    fn()
  }
}
