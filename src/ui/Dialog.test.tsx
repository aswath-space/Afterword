// @vitest-environment jsdom
import { render, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog'

afterEach(() => cleanup())

describe('Dialog', () => {
  it('renders a modal dialog when open', () => {
    const { getByRole } = render(<Dialog open label="Test"><p>Body</p></Dialog>)
    const dlg = getByRole('dialog')
    expect(dlg.getAttribute('aria-modal')).toBe('true')
    expect(dlg.getAttribute('aria-label')).toBe('Test')
  })

  it('renders nothing when closed', () => {
    const { queryByRole } = render(<Dialog open={false} label="Test"><p>Body</p></Dialog>)
    expect(queryByRole('dialog')).toBeNull()
  })

  it('closes on backdrop click only when dismissible', () => {
    const onClose = vi.fn()
    const { getByTestId, rerender } = render(
      <Dialog open label="Test"><p>Body</p></Dialog>,
    )
    // non-dismissible: no onClose → backdrop click is a no-op (no crash)
    fireEvent.click(getByTestId('aw-dialog-overlay'))
    rerender(<Dialog open label="Test" onClose={onClose}><p>Body</p></Dialog>)
    fireEvent.click(getByTestId('aw-dialog-overlay'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when the panel itself is clicked', () => {
    const onClose = vi.fn()
    const { getByRole } = render(<Dialog open label="Test" onClose={onClose}><p>Body</p></Dialog>)
    fireEvent.click(getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
