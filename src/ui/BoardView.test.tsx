// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BoardView } from './BoardView'
import { generateBoard } from '../board/board'

describe('BoardView', () => {
  it('renders one numbered tile per square plus the snakes and ladders', () => {
    const board = generateBoard('board-test', 30)
    const { container } = render(<BoardView board={board} />)
    expect(container.querySelectorAll('[data-square]')).toHaveLength(30)
    const nums = [...container.querySelectorAll('text')].map((t) => t.textContent)
    expect(nums).toContain('1')
    expect(nums).toContain('30')
    expect(container.querySelectorAll('.snake-body')).toHaveLength(board.snakes.length)
    expect(container.querySelectorAll('.ladder-railBody').length).toBe(board.ladders.length * 2)
  })
})
