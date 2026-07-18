// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { WordInput, rejectMessage } from './WordInput'

describe('rejectMessage', () => {
  it('maps reasons to player-facing copy', () => {
    expect(rejectMessage('wrong-start-letter', { requiredLetter: 'E', minLength: 3 })).toBe('Must start with E')
    expect(rejectMessage('not-a-word', { requiredLetter: null, minLength: 3 })).toBe('Not in the word list')
    expect(rejectMessage('already-used', { requiredLetter: null, minLength: 3 })).toBe('Already played')
    expect(rejectMessage('too-short', { requiredLetter: null, minLength: 3 })).toBe('3 letters or more')
    // A 1-2 letter rescue attempt must not contradict the "≥ N letters" placeholder.
    expect(rejectMessage('too-short', { requiredLetter: null, minLength: 8 })).toBe('Needs 8+ letters to escape')
    expect(rejectMessage('rescue-too-short', { requiredLetter: null, minLength: 7 })).toBe('Needs 7+ letters to escape')
  })
})

describe('WordInput', () => {
  const base = {
    mode: 'chain' as const,
    requiredLetter: 'E',
    minLength: 3,
    feedback: null,
    onSubmit: () => {},
    onClearFeedback: () => {},
  }

  it('submits the typed word and clears the field', () => {
    const onSubmit = vi.fn()
    const { container } = render(<WordInput {...base} onSubmit={onSubmit} />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'entry' } })
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(onSubmit).toHaveBeenCalledWith('entry')
    expect(input.value).toBe('')
  })

  it('disables input + button and blocks submit while the dictionary loads', () => {
    const onSubmit = vi.fn()
    const { container } = render(<WordInput {...base} onSubmit={onSubmit} dictReady={false} />)
    const input = container.querySelector('input') as HTMLInputElement
    const button = container.querySelector('button') as HTMLButtonElement
    expect(input.disabled).toBe(true)
    expect(button.disabled).toBe(true)
    expect(input.placeholder).toBe('Loading dictionary…')
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the word when the submit is rejected (returns false)', () => {
    const { container } = render(<WordInput {...base} onSubmit={() => false} />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'zzzz' } })
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(input.value).toBe('zzzz') // not erased — the player can fix it
  })

  it('renders reject micro-copy and shakes on feedback', () => {
    const { container, getByText } = render(
      <WordInput {...base} feedback={{ kind: 'reject', reason: 'not-a-word' }} />,
    )
    expect(getByText('Not in the word list')).toBeTruthy()
    expect((container.querySelector('input') as HTMLElement).className).toContain('aw-shake')
  })

  it('reports the live text via onValueChange, and clears it on submit', () => {
    const onValueChange = vi.fn()
    const onSubmit = vi.fn()
    const { container } = render(<WordInput {...base} onSubmit={onSubmit} onValueChange={onValueChange} />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'entry' } })
    expect(onValueChange).toHaveBeenCalledWith('entry')
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(onValueChange).toHaveBeenLastCalledWith('')
  })

  it('reports focus and blur via onFocusChange', () => {
    const onFocusChange = vi.fn()
    const { container } = render(<WordInput {...base} onFocusChange={onFocusChange} />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.focus(input)
    expect(onFocusChange).toHaveBeenLastCalledWith(true)
    fireEvent.blur(input)
    expect(onFocusChange).toHaveBeenLastCalledWith(false)
  })

  it('accents the Go button with the player colour in chain mode', () => {
    const { container } = render(<WordInput {...base} accent="var(--p2)" />)
    expect((container.querySelector('button') as HTMLButtonElement).getAttribute('data-accent')).toBe('on')
  })

  it('leaves the escape button un-accented (hazard state stays distinct)', () => {
    const { container } = render(<WordInput {...base} mode="escape" accent="var(--p2)" />)
    expect((container.querySelector('button') as HTMLButtonElement).getAttribute('data-accent')).toBeNull()
  })
})
