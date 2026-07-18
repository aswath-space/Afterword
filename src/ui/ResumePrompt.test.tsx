// @vitest-environment jsdom
import { render, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResumePrompt } from './ResumePrompt'

afterEach(() => cleanup())

describe('ResumePrompt', () => {
  it('shows the summary and fires both actions', () => {
    const onContinue = vi.fn()
    const onStartFresh = vi.fn()
    const { getByText } = render(
      <ResumePrompt open summary="3 players · square 24" onContinue={onContinue} onStartFresh={onStartFresh} />,
    )
    expect(getByText('3 players · square 24')).toBeTruthy()
    fireEvent.click(getByText('Continue'))
    expect(onContinue).toHaveBeenCalledTimes(1)
    fireEvent.click(getByText('Start fresh'))
    expect(onStartFresh).toHaveBeenCalledTimes(1)
  })

  it('is non-dismissible: ESC does nothing', () => {
    const onContinue = vi.fn()
    const onStartFresh = vi.fn()
    const { getByRole } = render(
      <ResumePrompt open summary="2 players · square 1" onContinue={onContinue} onStartFresh={onStartFresh} />,
    )
    fireEvent.keyDown(getByRole('dialog'), { key: 'Escape' })
    expect(onContinue).not.toHaveBeenCalled()
    expect(onStartFresh).not.toHaveBeenCalled()
  })

  it('gives initial focus to Continue (safe), never the destructive Start fresh', () => {
    const { getByText } = render(
      <ResumePrompt open summary="2 players · square 1" onContinue={() => {}} onStartFresh={() => {}} />,
    )
    expect(document.activeElement).toBe(getByText('Continue'))
  })
})
