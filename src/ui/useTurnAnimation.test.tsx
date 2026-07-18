// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, beforeAll } from 'vitest'
import { render, cleanup, fireEvent, act } from '@testing-library/react'
import { useTurnAnimation } from './useTurnAnimation'
import { gameStore, __setTestDictionary } from '../store/appStore'
import { createSetDictionary } from '../dictionary/dictionary'

// The real dictionary loads async (fetch dict.bin) and is skipped under vitest, so inject
// one covering the word this test submits.
beforeAll(() => __setTestDictionary(createSetDictionary(['cloud'], 'test')))
afterEach(() => cleanup())
beforeEach(() => gameStore.getState().newGame())

const CONFIG = {
  players: [
    { id: 'p1', name: 'A', color: 'var(--p1)', emblem: 'circle' },
    { id: 'p2', name: 'B', color: 'var(--p2)', emblem: 'diamond' },
  ],
  boardLength: 30 as const,
  timer: 'off' as const,
  seed: 'seed-anim',
}

function Host() {
  const a = useTurnAnimation()
  return (
    <div>
      <span data-presenting={String(a.presenting)} data-beat={a.beat?.kind ?? 'none'} />
      <button onClick={a.onBeatDone}>done</button>
      <button onClick={a.skip}>skip</button>
    </div>
  )
}

describe('useTurnAnimation', () => {
  it('presents until every beat is done, then releases', () => {
    gameStore.getState().configureAndStart(CONFIG)
    const { container, getByText } = render(<Host />)
    expect(container.querySelector('[data-presenting="true"]')).toBeNull() // no action yet
    act(() => { gameStore.getState().submit('cloud') }) // opening word (no required letter) → a hops beat
    expect(container.querySelector('[data-presenting="true"]')).toBeTruthy()
    let guard = 0
    while (container.querySelector('[data-presenting="true"]') && guard++ < 10) fireEvent.click(getByText('done'))
    expect(container.querySelector('[data-presenting="true"]')).toBeNull()
  })

  it('skip jumps straight to the settled state', () => {
    gameStore.getState().configureAndStart(CONFIG)
    const { container, getByText } = render(<Host />)
    act(() => { gameStore.getState().submit('cloud') })
    expect(container.querySelector('[data-presenting="true"]')).toBeTruthy()
    fireEvent.click(getByText('skip'))
    expect(container.querySelector('[data-presenting="true"]')).toBeNull()
  })
})
