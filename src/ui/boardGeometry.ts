import type { Point } from './boardLayout'

function cubic(p0: Point, c1: Point, c2: Point, p3: Point, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  }
}
function cubicAngle(p0: Point, c1: Point, c2: Point, p3: Point, t: number): number {
  const u = 1 - t
  const dx = 3 * u * u * (c1.x - p0.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (p3.x - c2.x)
  const dy = 3 * u * u * (c1.y - p0.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (p3.y - c2.y)
  return Math.atan2(dy, dx)
}

export interface Serpent {
  body: string
  scales: string[]
  head: { x: number; y: number; angle: number }
  grad: { x1: number; y1: number; x2: number; y2: number }
  spinePoints: Point[]
}

export function serpentGeometry(head: Point, tail: Point): Serpent {
  const dx = tail.x - head.x
  const dy = tail.y - head.y
  const mid = { x: (head.x + tail.x) / 2, y: (head.y + tail.y) / 2 }
  const c1 = { x: head.x + dx * 0.1 + dy * 0.32, y: head.y + dy * 0.1 - dx * 0.32 }
  const c2 = { x: head.x + dx * 0.74 - dy * 0.34, y: head.y + dy * 0.74 + dx * 0.34 }
  const N = 54
  const samples: Array<{ p: Point; a: number; tt: number }> = []
  for (let i = 0; i <= N; i++) {
    const tt = i / N
    let p: Point
    let a: number
    if (tt <= 0.5) {
      const t = tt / 0.5
      p = cubic(head, c1, mid, mid, t)
      a = cubicAngle(head, c1, mid, mid, t)
    } else {
      const t = (tt - 0.5) / 0.5
      p = cubic(mid, mid, c2, tail, t)
      a = cubicAngle(mid, mid, c2, tail, t)
    }
    samples.push({ p, a, tt })
  }
  const halfWidth = (tt: number) => 12 * (1 - tt) + 2 * tt
  const left: Point[] = []
  const right: Point[] = []
  for (const s of samples) {
    const hw = halfWidth(s.tt)
    const nx = Math.cos(s.a + Math.PI / 2)
    const ny = Math.sin(s.a + Math.PI / 2)
    left.push({ x: s.p.x + nx * hw, y: s.p.y + ny * hw })
    right.push({ x: s.p.x - nx * hw, y: s.p.y - ny * hw })
  }
  let body = `M ${left[0].x} ${left[0].y}`
  for (let i = 1; i < left.length; i++) body += ` L ${left[i].x} ${left[i].y}`
  for (let i = right.length - 1; i >= 0; i--) body += ` L ${right[i].x} ${right[i].y}`
  body += ' Z'

  const scales: string[] = []
  for (let i = 4; i < samples.length - 3; i += 3) {
    const s = samples[i]
    const nx = Math.cos(s.a + Math.PI / 2)
    const ny = Math.sin(s.a + Math.PI / 2)
    const tx = Math.cos(s.a)
    const ty = Math.sin(s.a)
    const ww = halfWidth(s.tt) * 0.78
    scales.push(`M ${s.p.x + nx * ww} ${s.p.y + ny * ww} L ${s.p.x - tx * 3} ${s.p.y - ty * 3} L ${s.p.x - nx * ww} ${s.p.y - ny * ww}`)
  }
  return {
    body,
    scales,
    head: { x: head.x, y: head.y, angle: (samples[0].a * 180) / Math.PI },
    grad: { x1: head.x, y1: head.y, x2: tail.x, y2: tail.y },
    spinePoints: samples.map((s) => ({ x: s.p.x, y: s.p.y })),
  }
}

export interface LadderGeom {
  lines: Array<{ x1: number; y1: number; x2: number; y2: number; kind: 'railBody' | 'railFace' | 'railHi' | 'rung' | 'foot' }>
  bolts: Array<{ cx: number; cy: number }>
}

export function ladderGeometry(foot: Point, top: Point): LadderGeom {
  const ang = Math.atan2(top.y - foot.y, top.x - foot.x)
  const nx = Math.cos(ang + Math.PI / 2)
  const ny = Math.sin(ang + Math.PI / 2)
  const ux = Math.cos(ang)
  const uy = Math.sin(ang)
  const w = 14
  const lines: LadderGeom['lines'] = []
  const bolts: LadderGeom['bolts'] = []
  for (const sgn of [1, -1]) {
    const s = sgn * w
    const ax = foot.x + nx * s
    const ay = foot.y + ny * s
    const bx = top.x + nx * s
    const by = top.y + ny * s
    lines.push({ x1: ax, y1: ay, x2: bx, y2: by, kind: 'railBody' })
    lines.push({ x1: ax - nx * 1.6, y1: ay - ny * 1.6, x2: bx - nx * 1.6, y2: by - ny * 1.6, kind: 'railFace' })
    lines.push({ x1: ax - nx * 3, y1: ay - ny * 3, x2: bx - nx * 3, y2: by - ny * 3, kind: 'railHi' })
    lines.push({ x1: ax, y1: ay, x2: ax - ux * 8, y2: ay - uy * 8, kind: 'foot' })
  }
  const len = Math.hypot(top.x - foot.x, top.y - foot.y)
  const rungs = Math.max(3, Math.round(len / 30))
  for (let i = 1; i < rungs; i++) {
    const t = i / rungs
    const px = foot.x + (top.x - foot.x) * t
    const py = foot.y + (top.y - foot.y) * t
    lines.push({ x1: px + nx * w, y1: py + ny * w, x2: px - nx * w, y2: py - ny * w, kind: 'rung' })
    bolts.push({ cx: px + nx * w, cy: py + ny * w })
    bolts.push({ cx: px - nx * w, cy: py - ny * w })
  }
  return { lines, bolts }
}
