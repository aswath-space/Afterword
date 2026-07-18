// @vitest-environment jsdom
import { render, cleanup, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useModalFocus } from './useModalFocus'

afterEach(() => cleanup())

function Harness({ open, onClose, dismissible }: { open: boolean; onClose?: () => void; dismissible?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, { open, onClose, dismissible })
  return (
    <div ref={ref} tabIndex={-1} data-testid="modal">
      <button data-testid="first">First</button>
      <button data-testid="last">Last</button>
    </div>
  )
}

describe('useModalFocus', () => {
  it('moves focus into the modal on open', () => {
    const { getByTestId } = render(<Harness open />)
    expect(document.activeElement).toBe(getByTestId('first'))
  })

  it('calls onClose on ESC only when dismissible', () => {
    const onClose = vi.fn()
    const { rerender, getByTestId } = render(<Harness open onClose={onClose} dismissible={false} />)
    fireEvent.keyDown(getByTestId('modal'), { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    rerender(<Harness open onClose={onClose} dismissible />)
    fireEvent.keyDown(getByTestId('modal'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('restores focus to the previously-focused element on close', () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    expect(document.activeElement).toBe(outside)
    const { rerender } = render(<Harness open />)
    rerender(<Harness open={false} />)
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('traps Tab from the last element back to the first', () => {
    const { getByTestId } = render(<Harness open />)
    getByTestId('last').focus()
    fireEvent.keyDown(getByTestId('modal'), { key: 'Tab' })
    expect(document.activeElement).toBe(getByTestId('first'))
  })

  it('prefers a [data-autofocus] element for initial focus', () => {
    function AutoFocusHarness() {
      const ref = useRef<HTMLDivElement>(null)
      useModalFocus(ref, { open: true })
      return (
        <div ref={ref} tabIndex={-1}>
          <button data-testid="a">A</button>
          <button data-testid="b" data-autofocus>B</button>
        </div>
      )
    }
    const { getByTestId } = render(<AutoFocusHarness />)
    expect(document.activeElement).toBe(getByTestId('b'))
  })

  it('does not steal focus when onClose identity changes across re-renders', () => {
    // Regression: a dialog open during a timed turn re-renders every 250ms with a fresh
    // inline onClose. Focus setup must NOT re-run (which would yank focus back to first).
    const { getByTestId, rerender } = render(<Harness open onClose={() => {}} dismissible />)
    getByTestId('last').focus()
    expect(document.activeElement).toBe(getByTestId('last'))
    rerender(<Harness open onClose={() => {}} dismissible />) // new onClose identity
    expect(document.activeElement).toBe(getByTestId('last')) // focus preserved
  })
})
