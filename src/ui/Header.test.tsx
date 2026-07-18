// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { Header } from './Header'

afterEach(() => cleanup())

describe('Header', () => {
  it('renders the full header with the tagline by default', () => {
    const { getByText, container } = render(<Header />)
    expect(container.querySelector('h1')).toBeTruthy()
    expect(getByText(/build one shared chain of words/i)).toBeTruthy()
  })

  it('compact: keeps the wordmark + theme toggle but drops the tagline', () => {
    const { container, getByLabelText, queryByText } = render(<Header compact />)
    expect(container.querySelector('h1')).toBeTruthy()
    expect(getByLabelText('Switch theme')).toBeTruthy()
    expect(queryByText(/build one shared chain of words/i)).toBeNull()
  })

  it('shows a New game button only when compact and onNewGame is provided', () => {
    const onNewGame = vi.fn()
    const { queryByText, rerender, getByText } = render(<Header compact />)
    expect(queryByText('New game')).toBeNull()
    rerender(<Header compact onNewGame={onNewGame} />)
    fireEvent.click(getByText('New game'))
    expect(onNewGame).toHaveBeenCalledTimes(1)
  })

  it('opens the Display dialog from the Aa button in both variants', () => {
    const { getByRole, getByLabelText, unmount } = render(<Header />)
    fireEvent.click(getByLabelText('Display settings'))
    expect(getByRole('dialog', { name: /display/i })).toBeTruthy()
    unmount()
    const compact = render(<Header compact />)
    fireEvent.click(compact.getByLabelText('Display settings'))
    expect(compact.getByRole('dialog', { name: /display/i })).toBeTruthy()
  })
})
