import type { RejectReason } from '../engine/types'

export function rejectMessage(reason: RejectReason, ctx: { requiredLetter: string | null; minLength: number }): string {
  switch (reason) {
    case 'wrong-start-letter': return `Must start with ${ctx.requiredLetter ?? ''}`.trim()
    case 'not-a-word': return 'Not in the word list'
    case 'already-used': return 'Already played'
    // During an escape (minLength > 3) a 1-2 letter word must not contradict the
    // "≥ N letters" placeholder with a smaller number.
    case 'too-short': return ctx.minLength > 3 ? `Needs ${ctx.minLength}+ letters to escape` : '3 letters or more'
    case 'rescue-too-short': return `Needs ${ctx.minLength}+ letters to escape`
    case 'wrong-phase': return ''
  }
}
