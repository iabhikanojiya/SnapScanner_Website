// Original, programmatic decorations (SVG path data) used by the templates.
// Everything here is generated geometry; no external artwork is used.

const f = (n: number) => n.toFixed(2)

/** A smooth wave band from x0 to x1 around baseline y. */
export function wave(x0: number, x1: number, y: number, amp: number, periods: number, toBottom: number): string {
  const w = x1 - x0
  let d = `M${f(x0)} ${f(y)}`
  const step = w / (periods * 2)
  for (let i = 0; i < periods * 2; i++) {
    const cx = x0 + step * (i + 0.5)
    const ex = x0 + step * (i + 1)
    d += ` Q${f(cx)} ${f(y + (i % 2 ? amp : -amp))} ${f(ex)} ${f(y)}`
  }
  return `${d} L${f(x1)} ${f(toBottom)} L${f(x0)} ${f(toBottom)} Z`
}

/** Grid of small dots inside a box. */
export function dotGrid(x: number, y: number, w: number, h: number, gap: number, r: number): string {
  let d = ''
  for (let yy = y + r; yy <= y + h - r; yy += gap)
    for (let xx = x + r; xx <= x + w - r; xx += gap) d += `M${f(xx - r)} ${f(yy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`
  return d
}

/** Diagonal stripes clipped to a box (drawn as parallelograms). */
export function stripes(x: number, y: number, w: number, h: number, gap: number, thick: number): string {
  let d = ''
  for (let s = -h; s < w; s += gap) {
    const x0 = Math.max(x, x + s)
    const x1 = Math.min(x + w, x + s + h)
    if (x1 <= x0) continue
    // Band between the lines x - y = s and x - y = s + thick, within the box.
    const pts = [
      [x + s, y],
      [x + s + thick, y],
      [x + s + thick + h, y + h],
      [x + s + h, y + h],
    ].map(([px, py]) => [Math.min(x + w, Math.max(x, px)), py])
    d += `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L')} Z`
  }
  return d
}

/** Chevron row. */
export function chevrons(x: number, y: number, w: number, size: number, count: number): string {
  const step = w / count
  let d = ''
  for (let i = 0; i < count; i++) {
    const cx = x + step * i
    d += `M${f(cx)} ${f(y)} L${f(cx + size / 2)} ${f(y + size / 2)} L${f(cx + size)} ${f(y)} L${f(cx + size)} ${f(y + size * 0.3)} L${f(cx + size / 2)} ${f(y + size * 0.8)} L${f(cx)} ${f(y + size * 0.3)} Z`
  }
  return d
}

/** Concentric ring outlines (use as stroke). */
export function rings(cx: number, cy: number, r0: number, gap: number, count: number): string {
  let d = ''
  for (let i = 0; i < count; i++) {
    const r = r0 + gap * i
    d += `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`
  }
  return d
}

/** Star-shaped seal edge with n points (filled). */
export function seal(cx: number, cy: number, r: number, points: number, depth = 0.12): string {
  let d = ''
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2
    const rr = i % 2 ? r * (1 - depth) : r
    d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`
  }
  return `${d}Z`
}

/** Regular polygon (hexagon, octagon…). */
export function polygon(cx: number, cy: number, r: number, sides: number, rot = 0): string {
  let d = ''
  for (let i = 0; i < sides; i++) {
    const a = rot + (2 * Math.PI * i) / sides
    d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}`
  }
  return `${d}Z`
}

/** Guilloché-style rosette: overlapping ellipses (stroke). */
export function rosette(cx: number, cy: number, rx: number, ry: number, petals: number): string {
  let d = ''
  for (let i = 0; i < petals; i++) {
    const a = (Math.PI * i) / petals
    const pts: string[] = []
    for (let k = 0; k <= 48; k++) {
      const t = (2 * Math.PI * k) / 48
      const x = rx * Math.cos(t)
      const y = ry * Math.sin(t)
      pts.push(`${f(cx + x * Math.cos(a) - y * Math.sin(a))} ${f(cy + x * Math.sin(a) + y * Math.cos(a))}`)
    }
    d += `M${pts.join(' L')}`
  }
  return d
}

/** Wavy guilloché band across a rectangle (stroke). */
export function guilloche(x: number, y: number, w: number, h: number, lines: number, waves: number): string {
  let d = ''
  for (let l = 0; l < lines; l++) {
    const phase = (Math.PI * 2 * l) / lines
    const pts: string[] = []
    for (let k = 0; k <= 120; k++) {
      const px = x + (w * k) / 120
      const py = y + h / 2 + (h / 2) * Math.sin((waves * 2 * Math.PI * k) / 120 + phase)
      pts.push(`${f(px)} ${f(py)}`)
    }
    d += `M${pts.join(' L')}`
  }
  return d
}

/** Laurel branch from (x, y) curving up (filled leaves). */
export function laurel(x: number, y: number, size: number, mirror: boolean): string {
  const s = mirror ? -1 : 1
  let d = ''
  for (let i = 0; i < 7; i++) {
    const t = i / 6
    const ang = -Math.PI / 2 - s * (0.25 + t * 1.1)
    const px = x + s * Math.sin(t * 1.4) * size * 0.45
    const py = y - t * size
    const lx = Math.cos(ang) * size * 0.16
    const ly = Math.sin(ang) * size * 0.16
    d += `M${f(px)} ${f(py)} Q${f(px + lx + ly * 0.4)} ${f(py + ly - lx * 0.4)} ${f(px + lx * 1.6)} ${f(py + ly * 1.6)} Q${f(px + lx - ly * 0.4)} ${f(py + ly + lx * 0.4)} ${f(px)} ${f(py)}Z`
  }
  return d
}

/** Ornamental corner (two arcs and a dot) for the corner at (x, y). dirX/dirY = ±1 point inwards. */
export function cornerOrnament(x: number, y: number, size: number, dirX: 1 | -1, dirY: 1 | -1): string {
  const s = size
  const ax = x + dirX * s
  const ay = y + dirY * s
  return `M${f(x)} ${f(ay)} Q${f(x)} ${f(y)} ${f(ax)} ${f(y)} M${f(x + dirX * s * 0.35)} ${f(y + dirY * s * 0.7)} Q${f(x + dirX * s * 0.35)} ${f(y + dirY * s * 0.35)} ${f(x + dirX * s * 0.7)} ${f(y + dirY * s * 0.35)}`
}

/** Ribbon banner (filled) centred at cx. */
export function ribbon(cx: number, y: number, w: number, h: number): string {
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const n = h * 0.45
  return `M${f(x0 - n)} ${f(y + h * 0.25)} L${f(x0)} ${f(y + h * 0.25)} L${f(x0)} ${f(y)} L${f(x1)} ${f(y)} L${f(x1)} ${f(y + h * 0.25)} L${f(x1 + n)} ${f(y + h * 0.25)} L${f(x1 + n * 0.6)} ${f(y + h * 0.75)} L${f(x1 + n)} ${f(y + h * 1.25)} L${f(x1)} ${f(y + h * 1.25)} L${f(x1)} ${f(y + h)} L${f(x0)} ${f(y + h)} L${f(x0)} ${f(y + h * 1.25)} L${f(x0 - n)} ${f(y + h * 1.25)} L${f(x0 - n * 0.4)} ${f(y + h * 0.75)} Z`
}

/** Organic blob (filled). */
export function blob(cx: number, cy: number, r: number, seed: number): string {
  const pts: [number, number][] = []
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8
    const rr = r * (0.78 + 0.22 * Math.abs(Math.sin(seed * 3.7 + i * 1.9)))
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  let d = `M${f((pts[0][0] + pts[7][0]) / 2)} ${f((pts[0][1] + pts[7][1]) / 2)}`
  for (let i = 0; i < 8; i++) {
    const p = pts[i]
    const n = pts[(i + 1) % 8]
    d += ` Q${f(p[0])} ${f(p[1])} ${f((p[0] + n[0]) / 2)} ${f((p[1] + n[1]) / 2)}`
  }
  return `${d}Z`
}

/** Triangle mosaic across the top edge (filled). */
export function triangles(x: number, y: number, w: number, h: number, count: number): string {
  const step = w / count
  let d = ''
  for (let i = 0; i < count; i++) {
    const x0 = x + i * step
    d += i % 2 ? `M${f(x0)} ${f(y + h)} L${f(x0 + step / 2)} ${f(y)} L${f(x0 + step)} ${f(y + h)} Z` : `M${f(x0)} ${f(y)} L${f(x0 + step)} ${f(y)} L${f(x0 + step / 2)} ${f(y + h)} Z`
  }
  return d
}

/** Simple heart (filled). */
export function heart(cx: number, cy: number, s: number): string {
  return `M${f(cx)} ${f(cy + s * 0.35)} C${f(cx - s)} ${f(cy - s * 0.3)} ${f(cx - s * 0.45)} ${f(cy - s)} ${f(cx)} ${f(cy - s * 0.45)} C${f(cx + s * 0.45)} ${f(cy - s)} ${f(cx + s)} ${f(cy - s * 0.3)} ${f(cx)} ${f(cy + s * 0.35)}Z`
}

/** Five-point star (filled). */
export function star(cx: number, cy: number, r: number): string {
  return seal(cx, cy, r, 5, 0.55)
}

/** Strip of tape for scrapbook layouts (filled rectangle with notched ends). */
export function tape(cx: number, cy: number, w: number, h: number): string {
  const x0 = cx - w / 2
  const y0 = cy - h / 2
  let d = `M${f(x0)} ${f(y0)}`
  const teeth = 5
  for (let i = 1; i <= teeth; i++) d += ` L${f(x0 + w)} ${f(y0 + (h * (i - 0.5)) / teeth + (i % 2 ? 1 : -1) * 0.8)}`
  d += ` L${f(x0 + w)} ${f(y0 + h)} L${f(x0)} ${f(y0 + h)}`
  for (let i = teeth; i >= 1; i--) d += ` L${f(x0 + (i % 2 ? 1.2 : 0))} ${f(y0 + (h * (i - 0.5)) / teeth)}`
  return `${d}Z`
}
