export interface Point { x: number; y: number }
export interface BoardLayout {
  cols: number
  rows: number
  unit: number
  width: number
  height: number
  centerOf(square: number): Point
  cells: Array<{ square: number; cx: number; cy: number }>
}

const GRID: Record<number, { cols: number; rows: number }> = {
  30: { cols: 5, rows: 6 },
  50: { cols: 5, rows: 10 },
  100: { cols: 10, rows: 10 },
}

function gridOf(length: number): { cols: number; rows: number } {
  const g = GRID[length]
  if (!g) throw new Error(`Unsupported board length: ${length}`)
  return g
}

// Screen-space grid cell of a square on the serpentine (boustrophedon) path:
// square 1 is bottom-left and each row reverses direction.
function gridCell(square: number, cols: number, rows: number): { col: number; row: number } {
  const idx = square - 1
  const boardRow = Math.floor(idx / cols) // 0 = bottom
  const posInRow = idx % cols
  return {
    col: boardRow % 2 === 0 ? posInRow : cols - 1 - posInRow,
    row: rows - 1 - boardRow, // 0 = top row in screen space
  }
}

export function boardLayout(length: number): BoardLayout {
  const { cols, rows } = gridOf(length)
  const unit = 100

  const centerOf = (square: number): Point => {
    const { col, row } = gridCell(square, cols, rows)
    return { x: col * unit + unit / 2, y: row * unit + unit / 2 }
  }

  const cells = Array.from({ length }, (_, i) => {
    const c = centerOf(i + 1)
    return { square: i + 1, cx: c.x, cy: c.y }
  })
  return { cols, rows, unit, width: cols * unit, height: rows * unit, centerOf, cells }
}

// Rank a square by where it sits on screen, reading top→bottom then left→right.
// Lower rank = earlier in natural reading order. Used to lay a played word's letters
// onto the squares it walked so the finished word reads forwards despite the
// serpentine path reversing direction every row.
export function readingIndexOf(square: number, length: number): number {
  const { cols, rows } = gridOf(length)
  const { col, row } = gridCell(square, cols, rows)
  return row * cols + col
}
