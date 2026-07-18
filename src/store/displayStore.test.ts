// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { displayStore } from './displayStore'

const html = () => document.documentElement

afterEach(() => {
  displayStore.setState({ contrast: 'normal', palette: 'classic', text: 'normal' })
})

describe('displayStore', () => {
  it('defaults to normal/classic/normal with no data attributes', () => {
    const s = displayStore.getState()
    expect([s.contrast, s.palette, s.text]).toEqual(['normal', 'classic', 'normal'])
    expect(html().hasAttribute('data-contrast')).toBe(false)
    expect(html().hasAttribute('data-palette')).toBe(false)
    expect(html().hasAttribute('data-text')).toBe(false)
  })

  it('stamps and removes data attributes as settings change', () => {
    displayStore.getState().setContrast('high')
    expect(html().getAttribute('data-contrast')).toBe('high')
    displayStore.getState().setPalette('cvd')
    expect(html().getAttribute('data-palette')).toBe('cvd')
    displayStore.getState().setText('large')
    expect(html().getAttribute('data-text')).toBe('large')
    displayStore.getState().setContrast('normal')
    expect(html().hasAttribute('data-contrast')).toBe(false)
  })

  it('persists only the three mode fields', () => {
    displayStore.getState().setPalette('cvd')
    const raw = localStorage.getItem('afterword-display')
    expect(raw).toBeTruthy()
    const persisted = JSON.parse(raw!).state
    expect(persisted).toEqual({ contrast: 'normal', palette: 'cvd', text: 'normal' })
  })
})
