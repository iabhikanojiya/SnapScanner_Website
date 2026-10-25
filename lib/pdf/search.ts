// Text search over pdf.js text content. Pure: works on the plain items pdf.js
// returns, so it can be unit-tested without a browser.

export interface TextItemLite {
  str: string
  /** [a, b, c, d, e, f] text-space to PDF user-space matrix. */
  transform: number[]
  /** Advance width in user-space units. */
  width: number
  hasEOL?: boolean
}

export interface PageTextIndex {
  text: string
  lower: string
  items: TextItemLite[]
  starts: number[]
}

export function buildIndex(items: TextItemLite[]): PageTextIndex {
  let text = ''
  const starts: number[] = []
  for (const item of items) {
    starts.push(text.length)
    text += item.str
    if (item.hasEOL) text += ' '
  }
  return { text, lower: text.toLowerCase(), items, starts }
}

export interface Match {
  page: number
  start: number
  end: number
}

/** Case-insensitive matches of `query` in a page's text. */
export function findInPage(index: PageTextIndex, query: string, page: number): Match[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: Match[] = []
  for (let i = index.lower.indexOf(q); i !== -1; i = index.lower.indexOf(q, i + q.length)) out.push({ page, start: i, end: i + q.length })
  return out
}

/** PDF user-space rectangles [x1, y1, x2, y2] covering a match, one per text item it spans. */
export function matchRects(index: PageTextIndex, match: Match): number[][] {
  const rects: number[][] = []
  for (let i = 0; i < index.items.length; i++) {
    const item = index.items[i]
    const itemStart = index.starts[i]
    const itemEnd = itemStart + item.str.length
    if (itemEnd <= match.start || itemStart >= match.end || item.str.length === 0) continue
    const a = Math.max(match.start, itemStart) - itemStart
    const b = Math.min(match.end, itemEnd) - itemStart
    const [ta, tb, tc, td, e, f] = item.transform
    const size = Math.hypot(tc, td) || Math.hypot(ta, tb)
    const len = item.str.length
    // Unit vector along the baseline, so rotated text is handled too.
    const scaleX = Math.hypot(ta, tb) || 1
    const ux = ta / scaleX
    const uy = tb / scaleX
    const x0 = e + ux * (item.width * a) / len
    const y0 = f + uy * (item.width * a) / len
    const x1 = e + ux * (item.width * b) / len
    const y1 = f + uy * (item.width * b) / len
    // Perpendicular offsets for descent (below) and ascent (above).
    const px = -uy
    const py = ux
    const xs = [x0 - px * size * 0.22, x1 - px * size * 0.22, x0 + px * size * 0.9, x1 + px * size * 0.9]
    const ys = [y0 - py * size * 0.22, y1 - py * size * 0.22, y0 + py * size * 0.9, y1 + py * size * 0.9]
    rects.push([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)])
  }
  return rects
}
