// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AimLayer } from './AimLayer'
import type { Board } from '../engine/types'

const board = (over: Partial<Board> = {}): Board => ({ length: 30, snakes: [], ladders: [], seed: 't', ...over })

describe('AimLayer', () => {
  it('marks the landing square with a climb consequence', () => {
    const { container, getByText } = render(<AimLayer board={board({ ladders: [{ foot: 9, top: 18 }] })} from={5} draftLength={4} />)
    expect(container.querySelector('[data-landing="9"]')).toBeTruthy()
    expect(getByText('▲ climbs to 18')).toBeTruthy()
  })

  it('warns about a snake drop', () => {
    const { getByText } = render(<AimLayer board={board({ snakes: [{ head: 9, tail: 2 }] })} from={5} draftLength={4} />)
    expect(getByText('▼ drops to 2')).toBeTruthy()
  })

  it('renders no landing marker when the draft is too short', () => {
    const { container } = render(<AimLayer board={board()} from={5} draftLength={2} />)
    expect(container.querySelector('[data-landing]')).toBeNull()
  })

  it('highlights reachable ladders and snakes', () => {
    const { container } = render(
      <AimLayer board={board({ ladders: [{ foot: 8, top: 16 }], snakes: [{ head: 10, tail: 2 }] })} from={5} draftLength={0} reach={12} />,
    )
    expect(container.querySelector('[data-reach="8"]')).toBeTruthy()
    expect(container.querySelector('[data-reach="10"]')).toBeTruthy()
  })

  it('hides reach highlights when showReach is false, but keeps the landing marker', () => {
    const { container } = render(
      <AimLayer board={board({ ladders: [{ foot: 8, top: 16 }] })} from={5} draftLength={4} showReach={false} />,
    )
    expect(container.querySelector('[data-reach]')).toBeNull()
    expect(container.querySelector('[data-landing]')).toBeTruthy()
  })

  it('ghosts the landing marker and says "needs X" when the draft is invalid', () => {
    const { container } = render(
      <AimLayer board={board()} from={5} draftLength={4} draftValid={false} requiredLetter="S" />,
    )
    const landing = container.querySelector('[data-landing="9"]') // square attr survives
    expect(landing).toBeTruthy()
    expect(landing?.textContent).toBe('needs S')
  })

  it('keeps the normal label when draftValid is omitted', () => {
    const { container } = render(<AimLayer board={board()} from={5} draftLength={4} requiredLetter="S" />)
    expect(container.querySelector('[data-landing="9"]')?.textContent).toBe('land 9')
  })

  it('stamps a corner glyph in each reach box: ▲ for ladders, ▼ for snakes', () => {
    const { container } = render(
      <AimLayer board={board({ ladders: [{ foot: 8, top: 16 }], snakes: [{ head: 10, tail: 2 }] })} from={5} draftLength={0} reach={12} />,
    )
    expect(container.querySelector('[data-reach="8"]')?.textContent).toBe('▲')
    expect(container.querySelector('[data-reach="10"]')?.textContent).toBe('▼')
  })
})
