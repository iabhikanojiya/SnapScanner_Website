// Shared building blocks and types for Create Studio templates.
import { MM, T, luminance, measure, onColor, type Design, type DesignPage, type El, type FontFamily, type ImageValue } from './engine'

export type Content = Record<string, unknown>

export interface Palette {
  primary: string
  secondary: string
  accent: string
  ink: string
  paper: string
}

export interface Fonts {
  head: FontFamily
  body: FontFamily
}

export interface RenderCtx {
  W: number
  H: number
  p: Palette
  f: Fonts
  c: Content
  /** Editor-only extras (placeholders) are allowed. */
  bleed: number
}

export interface TemplateDef {
  id: string
  name: string
  /** Style family shown as a filter in the gallery. */
  family: string
  /** Use-case tags, searchable. */
  tags: string[]
  palette: Palette
  fonts: Fonts
  /** Natural orientation of the layout. */
  orientation: 'landscape' | 'portrait' | 'square'
  render: (ctx: RenderCtx) => DesignPage[]
  /** Number of photo slots (collages). */
  slots?: number
  /** Fields this template doesn't show (the editor says so). */
  unused?: string[]
}

export type FieldType = 'text' | 'textarea' | 'date' | 'image' | 'color' | 'select' | 'toggle'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  group: string
  placeholder?: string
  maxLength?: number
  options?: { value: string; label: string }[]
  imageKind?: 'person' | 'logo' | 'photo' | 'signature'
  hint?: string
}

export interface SizeOption {
  id: string
  label: string
  /** Points. */
  w: number
  h: number
  orientation: 'landscape' | 'portrait' | 'square'
}

export interface ProjectOptions {
  sizeId: string
  /** Custom size in mm, used when sizeId is "custom". */
  customW?: number
  customH?: number
  primary?: string
  secondary?: string
  accent?: string
  headFont?: FontFamily
  /** Business cards: bleed and safe-area guides and print bleed in the PDF. */
  print?: boolean
}

// ---------------------------------------------------------------------------
// Content accessors

export const str = (c: Content, k: string, fallback = '') => (typeof c[k] === 'string' ? (c[k] as string) : fallback)
export const bool = (c: Content, k: string) => c[k] === true
export const img = (c: Content, k: string) => (c[k] && typeof c[k] === 'object' && 'src' in (c[k] as object) ? (c[k] as ImageValue) : undefined)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-10-24" → "24 Oct 2026" (or "24 October 2026"). Other text is kept as typed. */
export function fmtDate(value: string, long = false) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return value
  return `${Number(m[3])} ${(long ? LONG_MONTHS : MONTHS)[Number(m[2]) - 1]} ${m[1]}`
}

// ---------------------------------------------------------------------------
// Elements

export function bgRect(ctx: RenderCtx, fill: string): El {
  return { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: ctx.W + 2 * ctx.bleed, h: ctx.H + 2 * ctx.bleed, fill }
}

export function photo(c: Content, key: string, x: number, y: number, w: number, h: number, shape: 'rect' | 'rounded' | 'circle', kind: 'person' | 'logo' | 'photo' | 'signature' = 'person', r?: number): El {
  return { t: 'image', x, y, w, h, shape, r, image: img(c, key), placeholder: kind, fit: kind === 'logo' || kind === 'signature' ? 'contain' : 'cover', field: key }
}

/** Logo if uploaded, otherwise a monogram badge from the organization's initials. */
export function logoOrMonogram(c: Content, logoKey: string, nameKey: string, x: number, y: number, s: number, bg: string, shape: 'circle' | 'rounded' = 'rounded', font: FontFamily = 'sans'): El[] {
  const logo = img(c, logoKey)
  if (logo) return [{ t: 'image', x, y, w: s, h: s, shape: 'rect', image: logo, fit: 'contain', field: logoKey }]
  const initials =
    str(c, nameKey)
      .split(/\s+/)
      .filter((w) => /^[A-Za-z0-9]/.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '•'
  return [
    shape === 'circle' ? { t: 'circle', cx: x + s / 2, cy: y + s / 2, r: s / 2, fill: bg } : { t: 'rect', x, y, w: s, h: s, r: s * 0.22, fill: bg },
    T({ x: x + s / 2, y: y + s * 0.64, text: initials, size: s * 0.42, bold: true, font, color: onColor(bg), align: 'center' }),
  ]
}

/** A small uppercase label above a value. Returns elements and the next y. */
export function labelValue(o: {
  x: number
  y: number
  label: string
  value: string
  w: number
  size: number
  labelColor: string
  color: string
  font?: FontFamily
  align?: 'left' | 'center' | 'right'
  bold?: boolean
  /** Shrink the value to one line instead of wrapping (for grids of short values). */
  fit?: boolean
}): { els: El[]; next: number } {
  if (!o.value.trim()) return { els: [], next: o.y }
  const ls = o.size * 0.08
  const label = T({ x: o.x, y: o.y + o.size * 0.75, text: o.label, size: o.size * 0.68, upper: true, ls, color: o.labelColor, align: o.align, font: 'sans', bold: true })
  const value = T({ x: o.x, y: o.y + o.size * 0.75 + o.size * 1.2, text: o.value, size: o.size, color: o.color, w: o.w, maxLines: 2, fit: o.fit, minSize: o.fit ? o.size * 0.7 : undefined, align: o.align, font: o.font, bold: o.bold })
  const lines = value.t === 'text' ? value.lines.length : 1
  return { els: [label, value], next: o.y + o.size * 0.75 + o.size * 1.2 + (lines - 1) * o.size * 1.25 + o.size * 0.75 }
}

/** Rounded pill with centred text. */
export function pill(x: number, y: number, text: string, size: number, fill: string, color: string, align: 'left' | 'center' = 'left', font: FontFamily = 'sans'): El[] {
  if (!text.trim()) return []
  const ls = size * 0.08
  const tw = measure(text.toUpperCase(), size, font, true, false, ls)
  const w = tw + size * 1.6
  const h = size * 1.9
  const x0 = align === 'center' ? x - w / 2 : x
  return [
    { t: 'rect', x: x0, y, w, h, r: h / 2, fill },
    T({ x: x0 + w / 2, y: y + h * 0.66, text, size, bold: true, upper: true, ls, color, align: 'center', font }),
  ]
}

export function qr(c: Content, x: number, y: number, size: number, color: string, bg?: string): El[] {
  if (!bool(c, 'showQr')) return []
  const data = str(c, 'qrData').trim()
  if (!data) return []
  // Scanners need dark modules on a light, clear background, whatever the design's colours.
  const ink = luminance(color) < 0.2 ? color : '#111827'
  const paper = bg && luminance(bg) > 0.6 ? bg : '#FFFFFF'
  return [{ t: 'qr', x, y, size, data, color: ink, bg: paper }]
}

export function page(els: El[], label?: string): DesignPage {
  return { els, label }
}

export function design(W: number, H: number, pages: DesignPage[], bleed = 0, safe?: number): Design {
  return { width: W, height: H, bleed, safe, pages }
}

/**
 * Mirrors a layout horizontally. Shapes and decorations flip. Text stays
 * readable and keeps its column alignment: a column of left-aligned text moves
 * to the other side as a block that is still left-aligned, right-aligned text
 * becomes left-aligned at the mirrored edge, and list bullets stay beside
 * their text.
 */
export function mirrorEls(els: El[], W: number): El[] {
  // Left-aligned text columns (texts sharing an x position). Columns that share
  // a row (same baseline) form one block, such as a grid of details, and move
  // together so their order and spacing are kept.
  const key = (x: number) => Math.round(x * 10)
  const right = new Map<number, number>()
  const parent = new Map<number, number>()
  const find = (k: number): number => (parent.get(k) === k ? k : find(parent.get(k)!))
  const rows = new Map<number, number[]>()
  for (const el of els)
    if (el.t === 'text' && el.align === 'left') {
      const k = key(el.x)
      const w = Math.max(0, ...el.lines.map((l) => measure(l, el.size, el.font, el.bold, el.italic, el.ls ?? 0)))
      right.set(k, Math.max(right.get(k) ?? -Infinity, el.x + w))
      if (!parent.has(k)) parent.set(k, k)
      const row = Math.round(el.y)
      rows.set(row, [...(rows.get(row) ?? []), k])
    }
  for (const ks of rows.values()) for (const k of ks.slice(1)) parent.set(find(k), find(ks[0]))
  const blocks = new Map<number, { min: number; max: number }>()
  for (const k of parent.keys()) {
    const r = find(k)
    const b = blocks.get(r) ?? { min: Infinity, max: -Infinity }
    blocks.set(r, { min: Math.min(b.min, k / 10), max: Math.max(b.max, right.get(k)!) })
  }
  const colWidth = parent
  /** New left edge of the column that started at x: its block is mirrored as a whole. */
  const leftCol = (x: number) => {
    const b = blocks.get(find(key(x)))!
    return x + (W - b.max - b.min)
  }
  return els.map((el): El => {
    switch (el.t) {
      case 'rect':
        if (el.bulletFor !== undefined && colWidth.has(key(el.x + el.bulletFor))) return { ...el, x: leftCol(el.x + el.bulletFor) - el.bulletFor }
        return { ...el, x: W - el.x - el.w }
      case 'circle':
        return { ...el, cx: W - el.cx }
      case 'line': {
        // A horizontal rule starting at a text column moves with that column.
        const x0 = Math.min(el.x1, el.x2)
        if (el.y1 === el.y2 && colWidth.has(key(x0))) {
          const dx = leftCol(x0) - x0
          return { ...el, x1: el.x1 + dx, x2: el.x2 + dx }
        }
        return { ...el, x1: W - el.x1, x2: W - el.x2 }
      }
      case 'path':
        return { t: 'group', cx: 0, cy: 0, rot: 0, mirror: W / 2, children: [el] }
      case 'text':
        if (el.align === 'left') return { ...el, x: leftCol(el.x) }
        if (el.align === 'right') return { ...el, x: W - el.x, align: 'left' }
        return { ...el, x: W - el.x }
      case 'image':
        return { ...el, x: W - el.x - el.w }
      case 'qr':
        return { ...el, x: W - el.x - el.size }
      case 'group':
        return el.mirror !== undefined ? { ...el, mirror: W - el.mirror } : { ...el, cx: W - el.cx, rot: -el.rot, children: mirrorEls(el.children, W) }
    }
  })
}

export { MM }
