// @vitest-environment jsdom
import { render, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

afterEach(() => cleanup())

const base = {
  open: true, title: 'Start a new game?', message: 'This ends the current game.',
  confirmLabel: 'New game', cancelLabel: 'Cancel',
}

describe('ConfirmDialog', () => {
  it('fires onConfirm and onCancel from the buttons', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { getByText } = render(<ConfirmDialog {...base} onConfirm={onConfirm} onCancel={onCancel} destructive />)
    fireEvent.click(getByText('New game'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels on ESC (dismissible)', () => {
    const onCancel = vi.fn()
    const { getByRole } = render(<ConfirmDialog {...base} onConfirm={() => {}} onCancel={onCancel} />)
    fireEvent.keyDown(getByRole('dialog'), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
