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

export function boardLayout(length: number): BoardLayout {
  const g = GRID[length]
  if (!g) throw new Error(`Unsupported board length: ${length}`)
  const { cols, rows } = g
  const unit = 100
  const width = cols * unit
  const height = rows * unit

  const centerOf = (square: number): Point => {
    const idx = square - 1
    const boardRow = Math.floor(idx / cols) // 0 = bottom
    const posInRow = idx % cols
    const gridCol = boardRow % 2 === 0 ? posInRow : cols - 1 - posInRow
    const gridRow = rows - 1 - boardRow // 0 = top row in screen space
    return { x: gridCol * unit + unit / 2, y: gridRow * unit + unit / 2 }
  }

  const cells: Array<{ square: number; cx: number; cy: number }> = []
  for (let s = 1; s <= length; s++) {
    const c = centerOf(s)
    cells.push({ square: s, cx: c.x, cy: c.y })
  }
  return { cols, rows, unit, width, height, centerOf, cells }
}

// Rank a square by where it sits on screen, reading top→bottom then left→right.
// Lower rank = earlier in natural reading order. Used to lay a played word's letters
// onto the squares it walked so the finished word reads forwards despite the
// serpentine (boustrophedon) path reversing direction every row.
export function readingIndexOf(square: number, length: number): number {
  const g = GRID[length]
  if (!g) throw new Error(`Unsupported board length: ${length}`)
  const { cols, rows } = g
  const idx = square - 1
  const boardRow = Math.floor(idx / cols)
  const posInRow = idx % cols
  const gridCol = boardRow % 2 === 0 ? posInRow : cols - 1 - posInRow
  const gridRow = rows - 1 - boardRow
  return gridRow * cols + gridCol
}
