// @vitest-environment jsdom
import { render, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DisplayDialog } from './DisplayDialog'
import { displayStore } from '../store/displayStore'

afterEach(() => {
  cleanup()
  displayStore.setState({ contrast: 'normal', palette: 'classic', text: 'normal' })
})

describe('DisplayDialog', () => {
  it('renders three switches reflecting the store and toggles on click', () => {
    const { getByRole } = render(<DisplayDialog open onClose={() => {}} />)
    const contrast = getByRole('switch', { name: /high contrast/i })
    const palette = getByRole('switch', { name: /colour-blind palette/i })
    const text = getByRole('switch', { name: /larger text/i })
    expect(contrast.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(contrast)
    expect(displayStore.getState().contrast).toBe('high')
    expect(contrast.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(palette)
    expect(displayStore.getState().palette).toBe('cvd')
    fireEvent.click(text)
    expect(displayStore.getState().text).toBe('large')
    fireEvent.click(text)
    expect(displayStore.getState().text).toBe('normal')
  })

  it('is dismissible: ESC calls onClose', () => {
    const onClose = vi.fn()
    const { getByRole } = render(<DisplayDialog open onClose={onClose} />)
    fireEvent.keyDown(getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
