import type { Board } from '../engine/types'
import { boardLayout } from './boardLayout'
import { serpentGeometry, ladderGeometry } from './boardGeometry'
import './board.css'

export function BoardView({ board }: { board: Board }) {
  const layout = boardLayout(board.length)
  const U = layout.unit

  return (
    <svg
      className="board-svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={`Afterword board, ${board.length} squares, ${board.ladders.length} ladders and ${board.snakes.length} snakes`}
    >
      <defs>
        <filter id="board-lift" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.6" floodColor="#3a2a18" floodOpacity="0.34" />
        </filter>
        {board.snakes.map((s, i) => {
          const g = serpentGeometry(layout.centerOf(s.head), layout.centerOf(s.tail)).grad
          return (
            <linearGradient key={i} id={`snake-grad-${i}`} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} gradientUnits="userSpaceOnUse">
              <stop offset="0%" style={{ stopColor: 'var(--teal)' }} />
              <stop offset="55%" style={{ stopColor: 'var(--teal-2)' }} />
              <stop offset="100%" style={{ stopColor: 'var(--plum)' }} />
            </linearGradient>
          )
        })}
      </defs>

      {layout.cells.map(({ square, cx, cy }) => {
        const x = cx - U / 2
        const y = cy - U / 2
        return (
          <g key={square} data-square={square}>
            <rect className={`tile-face${square % 2 ? '' : ' alt'}`} x={x + 5} y={y + 5} width={U - 10} height={U - 10} rx={10} />
            <rect className="tile-bevel" x={x + 6} y={y + 6} width={U - 12} height={5} rx={4} />
            <text x={x + 13} y={y + 26} fontSize={15} fontWeight={700}>{square}</text>
          </g>
        )
      })}

      {board.ladders.map((l, i) => {
        const geom = ladderGeometry(layout.centerOf(l.foot), layout.centerOf(l.top))
        return (
          <g key={`ladder-${i}`} filter="url(#board-lift)">
            {geom.lines.map((ln, j) => (
              <line key={j} className={`ladder-${ln.kind}`} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} />
            ))}
            {geom.bolts.map((b, j) => (
              <circle key={`b${j}`} className="ladder-bolt" cx={b.cx} cy={b.cy} r={2} />
            ))}
          </g>
        )
      })}

      {board.snakes.map((s, i) => {
        const geom = serpentGeometry(layout.centerOf(s.head), layout.centerOf(s.tail))
        return (
          <g key={`snake-${i}`} filter="url(#board-lift)">
            <path className="snake-body snake-outline" d={geom.body} fill={`url(#snake-grad-${i})`} />
            {geom.scales.map((d, j) => (
              <path key={j} className="snake-scale" d={d} />
            ))}
            <g transform={`translate(${geom.head.x} ${geom.head.y}) rotate(${geom.head.angle})`}>
              <ellipse className="snake-head" cx={0} cy={0} rx={15} ry={11} />
              <circle className="snake-eye" cx={-4} cy={-5.5} r={2.7} />
              <circle className="snake-pupil" cx={-3.2} cy={-5.5} r={1.4} />
              <circle className="snake-eye" cx={-4} cy={5.5} r={2.7} />
              <circle className="snake-pupil" cx={-3.2} cy={5.5} r={1.4} />
              <path className="snake-tongue" d="M -15 0 L -25 0 M -25 0 l -4 -3 M -25 0 l -4 3" />
            </g>
          </g>
        )
      })}
    </svg>
  )
}
