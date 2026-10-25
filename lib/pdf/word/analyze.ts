// Reconstructs document structure from positioned PDF text for PDF to Word:
// lines, paragraphs (with alignment, indents and spacing), headings, bullet
// lists, two-column layouts and simple tables, plus images in reading order.
// Pure functions over plain data, so they are unit-tested without a browser.
// Coordinates are in points, origin top-left, y increasing downwards.

export type Family = 'sans' | 'serif' | 'mono'

export interface TextItem {
  text: string
  /** Left end of the baseline. */
  x: number
  y: number
  w: number
  size: number
  bold: boolean
  italic: boolean
  family: Family
  /** A well-known font name ("Calibri"), when the PDF names one. */
  font?: string
}

export interface PageImage {
  x: number
  y: number
  w: number
  h: number
  data: Uint8Array
  type: 'png' | 'jpg'
}

export interface PageInput {
  width: number
  height: number
  items: TextItem[]
  images: PageImage[]
}

export interface Run {
  text: string
  bold: boolean
  italic: boolean
  size: number
  family: Family
  font?: string
}

export type Align = 'left' | 'center' | 'right' | 'justify'

export type OutBlock =
  | {
      t: 'para'
      runs: Run[]
      align: Align
      indent: number
      firstLine: number
      spaceBefore: number
      lineHeight: number
      heading?: 1 | 2
      bullet?: boolean
    }
  | { t: 'table'; rows: Run[][][]; widths: number[]; indent: number; spaceBefore: number }
  | { t: 'image'; image: PageImage; indent: number; spaceBefore: number }

export type OutRegion = { columns: 1; blocks: OutBlock[] } | { columns: 2; left: OutBlock[]; right: OutBlock[]; gap: number; leftWidth: number }

export interface OutPage {
  width: number
  height: number
  margins: { top: number; right: number; bottom: number; left: number }
  regions: OutRegion[]
}

// ---------------------------------------------------------------------------
// Lines and segments

export interface Line {
  items: TextItem[]
  y: number
  x0: number
  x1: number
  size: number
}

const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

function makeLine(items: TextItem[]): Line {
  const sorted = [...items].sort((a, b) => a.x - b.x)
  return {
    items: sorted,
    y: median(sorted.map((i) => i.y)),
    x0: Math.min(...sorted.map((i) => i.x)),
    x1: Math.max(...sorted.map((i) => i.x + i.w)),
    size: Math.max(...sorted.map((i) => i.size)),
  }
}

/** Groups text items into lines by baseline, top to bottom. */
export function groupLines(items: TextItem[]): Line[] {
  const sorted = items.filter((i) => i.text.trim() && i.size > 0).sort((a, b) => a.y - b.y || a.x - b.x)
  const groups: { y: number; size: number; items: TextItem[] }[] = []
  for (const it of sorted) {
    // Search recent lines only: items are sorted by baseline.
    let found: (typeof groups)[number] | undefined
    for (let k = groups.length - 1; k >= 0 && k >= groups.length - 4; k--) {
      const g = groups[k]
      if (Math.abs(g.y - it.y) <= Math.max(1.5, Math.min(g.size, it.size) * 0.35)) {
        found = g
        break
      }
    }
    if (found) {
      found.items.push(it)
      found.size = Math.max(found.size, it.size)
    } else groups.push({ y: it.y, size: it.size, items: [it] })
  }
  return groups.map((g) => makeLine(g.items)).sort((a, b) => a.y - b.y)
}

/** Splits a line where the horizontal gap between items is wide (table cells, columns). */
export function segments(line: Line): Line[] {
  const out: TextItem[][] = []
  let cur: TextItem[] = []
  let end = -Infinity
  for (const it of line.items) {
    const gap = it.x - end
    if (cur.length && gap > Math.max(6, line.size * 1.1)) {
      out.push(cur)
      cur = []
    }
    cur.push(it)
    end = Math.max(end, it.x + it.w)
  }
  if (cur.length) out.push(cur)
  return out.map(makeLine)
}

const isCjk = (ch: string) => /[぀-ヿ㐀-鿿가-힯]/.test(ch)

/** Text runs of a line, with spaces added where items are visibly apart. */
export function lineRuns(items: TextItem[]): Run[] {
  const runs: Run[] = []
  let prev: TextItem | null = null
  for (const it of items) {
    let text = it.text.replace(/\s+/g, ' ')
    if (prev) {
      const gap = it.x - (prev.x + prev.w)
      const prevText = runs.length ? runs[runs.length - 1].text : ''
      if (gap > Math.min(prev.size, it.size) * 0.15 && !prevText.endsWith(' ') && !text.startsWith(' ') && !(isCjk(prevText.slice(-1)) && isCjk(text[0]))) text = ` ${text}`
    }
    const last = runs[runs.length - 1]
    if (last && sameStyle(last, it)) last.text += text
    else runs.push({ text, bold: it.bold, italic: it.italic, size: it.size, family: it.family, font: it.font })
    prev = it
  }
  if (runs.length) {
    runs[0].text = runs[0].text.replace(/^\s+/, '')
    runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\s+$/, '')
  }
  return runs.filter((r) => r.text)
}

const runsText = (runs: Run[]) => runs.map((r) => r.text).join('')

const sameStyle = (a: Run | TextItem, b: Run | TextItem) => a.bold === b.bold && a.italic === b.italic && Math.abs(a.size - b.size) < 0.6 && a.family === b.family && a.font === b.font

// ---------------------------------------------------------------------------
// Columns

interface Gutter {
  x0: number
  x1: number
}

/**
 * Finds a vertical gap that splits most lines of a page into two columns of
 * running text. Tables are excluded by requiring both sides to be mostly
 * filled lines rather than short cells.
 */
export function findGutter(lines: Line[]): Gutter | null {
  const segs = lines.flatMap(segments)
  if (segs.length < 12) return null
  const left = Math.min(...segs.map((s) => s.x0))
  const right = Math.max(...segs.map((s) => s.x1))
  const width = right - left
  if (width < 200) return null
  const bins = Math.ceil(width)
  const cover = new Array<number>(bins).fill(0)
  for (const s of segs) for (let x = Math.max(0, Math.floor(s.x0 - left)); x < Math.min(bins, Math.ceil(s.x1 - left)); x++) cover[x]++
  const limit = Math.max(1, lines.length * 0.08)
  let best: Gutter | null = null
  let start = -1
  for (let x = Math.floor(width * 0.25); x <= Math.ceil(width * 0.75); x++) {
    const empty = x < bins && cover[x] <= limit
    if (empty && start < 0) start = x
    if ((!empty || x === Math.ceil(width * 0.75)) && start >= 0) {
      const g = { x0: left + start, x1: left + x }
      if (g.x1 - g.x0 >= 8 && (!best || g.x1 - g.x0 > best.x1 - best.x0)) best = g
      start = -1
    }
  }
  if (!best) return null
  const g = best
  const leftSegs = segs.filter((s) => s.x1 <= g.x0 + 1)
  const rightSegs = segs.filter((s) => s.x0 >= g.x1 - 1)
  if (leftSegs.length < 5 || rightSegs.length < 5) return null
  // Running text fills its column; table cells usually don't.
  const fill = (ss: Line[], w: number) => median(ss.map((s) => (s.x1 - s.x0) / w))
  if (fill(leftSegs, g.x0 - left) < 0.6 || fill(rightSegs, right - g.x1) < 0.6) return null
  return g
}

// ---------------------------------------------------------------------------
// Tables

type Interval = [number, number]

function gapsOf(line: Line): Interval[] {
  const segs = segments(line)
  const out: Interval[] = []
  for (let i = 1; i < segs.length; i++) out.push([segs[i - 1].x1, segs[i].x0])
  return out
}

function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = []
  for (const [a0, a1] of a)
    for (const [b0, b1] of b) {
      const lo = Math.max(a0, b0)
      const hi = Math.min(a1, b1)
      if (hi - lo >= 2) out.push([lo, hi])
    }
  return out
}

interface TableFound {
  end: number
  rows: Run[][][]
  separators: number[]
  x0: number
  x1: number
}

/** Detects a table starting at line `i`: rows of cells aligned on shared vertical gaps. */
function detectTable(lines: Line[], i: number): TableFound | null {
  let seps = gapsOf(lines[i])
  if (!seps.length) return null
  const rows: { line: Line; cont: boolean }[] = [{ line: lines[i], cont: false }]
  let j = i + 1
  let pitch = 0
  while (j < lines.length) {
    const L = lines[j]
    const prev = rows[rows.length - 1].line
    const dy = L.y - prev.y
    if (dy > Math.max(prev.size, L.size) * 2.6) break
    const g = gapsOf(L)
    if (g.length) {
      const next = intersect(seps, g)
      if (!next.length) break
      seps = next
      rows.push({ line: L, cont: false })
      pitch = pitch ? Math.min(pitch, dy) : dy
    } else {
      // A wrapped cell: a single segment that stays within one column.
      if (dy > Math.max(L.size * 1.5, pitch * 1.05 || 0)) break
      if (seps.some(([a, b]) => L.x0 < b && L.x1 > a)) break
      rows.push({ line: L, cont: true })
    }
    j++
  }
  // Drop trailing continuation lines; they are more likely the next paragraph.
  while (rows.length && rows[rows.length - 1].cont) rows.pop()
  const real = rows.filter((r) => !r.cont)
  if (real.length < 2) return null
  const separators = seps.map(([a, b]) => (a + b) / 2)
  if (separators.length > 11) return null
  const colOf = (x: number) => separators.filter((s) => x > s).length
  const out: Run[][][] = []
  for (const { line, cont } of rows) {
    const cells: TextItem[][] = separators.map(() => []).concat([[]])
    for (const it of line.items) cells[colOf(it.x + Math.min(it.w, it.size) / 2)].push(it)
    const runs = cells.map((c) => lineRuns(c))
    if (cont && out.length) {
      const prevRow = out[out.length - 1]
      runs.forEach((r, k) => {
        if (!r.length) return
        if (prevRow[k].length) prevRow[k][prevRow[k].length - 1].text += ' '
        prevRow[k].push(...r)
      })
    } else out.push(runs)
  }
  const x0 = Math.min(...rows.map((r) => r.line.x0))
  const x1 = Math.max(...rows.map((r) => r.line.x1))
  return { end: i + rows.length, rows: out, separators, x0, x1 }
}

// ---------------------------------------------------------------------------
// Paragraphs

const BULLET = /^([•◦▪▫●○■□‣∙·◆◇►▸➢✓✔*–-])\s+/

interface FlowBlock {
  block: OutBlock
  top: number
  bottom: number
}

/** Turns the lines of one column into paragraphs and tables. */
function flowBlocks(lines: Line[], bodySize: number): FlowBlock[] {
  if (!lines.length) return []
  const L = Math.min(...lines.map((l) => l.x0))
  const R = Math.max(...lines.map((l) => l.x1))
  const W = Math.max(1, R - L)
  const pitches = lines.slice(1).map((l, i) => l.y - lines[i].y).filter((d, i) => d > 0 && d < Math.max(lines[i].size, lines[i + 1].size) * 2)
  const typicalPitch = median(pitches)
  const out: FlowBlock[] = []
  let para: Line[] = []
  let bulletText: number | null = null

  const flush = () => {
    if (!para.length) return
    const first = para[0]
    const runs: Run[] = []
    para.forEach((line, k) => {
      const lr = lineRuns(line.items)
      if (k > 0 && lr.length && runs.length) {
        const last = runs[runs.length - 1]
        // Rejoin words hyphenated at line ends; otherwise lines join with a space.
        if (/[\p{L}]-$/u.test(last.text) && /^\p{Ll}/u.test(lr[0].text)) last.text = last.text.slice(0, -1)
        else if (!(isCjk(last.text.slice(-1)) && isCjk(lr[0].text[0]))) last.text += ' '
      }
      for (const r of lr) {
        const prev = runs[runs.length - 1]
        if (prev && sameStyle(prev, r)) prev.text += r.text
        else runs.push({ ...r })
      }
    })
    let bullet = false
    if (runs.length && BULLET.test(runs[0].text)) {
      bullet = true
      runs[0].text = runs[0].text.replace(BULLET, '')
      if (!runs[0].text) runs.shift()
    }
    const mid = (L + R) / 2
    const tol = Math.max(3, W * 0.03)
    let align: Align = 'left'
    if (para.every((l) => Math.abs((l.x0 + l.x1) / 2 - mid) < tol) && para.some((l) => l.x0 - L > W * 0.05)) align = 'center'
    else if (para.every((l) => Math.abs(l.x1 - R) < 3) && first.x0 - L > W * 0.15) align = 'right'
    else if (para.length >= 2 && para.slice(0, -1).every((l) => Math.abs(l.x1 - R) < Math.max(2, l.size * 0.3)) && para[para.length - 1].x1 < R - first.size) align = 'justify'
    const rest = para.slice(1)
    const left = align === 'center' || align === 'right' ? 0 : (rest.length ? Math.min(...rest.map((l) => l.x0)) : first.x0) - L
    const firstLine = align === 'center' || align === 'right' ? 0 : first.x0 - L - left
    const size = median(para.map((l) => l.size))
    const text = runsText(runs)
    const heading = size >= bodySize * 1.45 && text.length < 160 ? 1 : size >= bodySize * 1.18 && text.length < 160 ? 2 : undefined
    const pp = para.slice(1).map((l, k) => l.y - para[k].y)
    out.push({
      block: { t: 'para', runs, align, indent: Math.max(0, left), firstLine, spaceBefore: 0, lineHeight: pp.length ? median(pp) : size * 1.15, heading, bullet },
      top: first.y - first.size * 0.9,
      bottom: para[para.length - 1].y + para[para.length - 1].size * 0.25,
    })
    para = []
    bulletText = null
  }

  for (let i = 0; i < lines.length; i++) {
    const table = detectTable(lines, i)
    if (table) {
      flush()
      const bounds = [table.x0, ...table.separators, table.x1]
      out.push({
        block: { t: 'table', rows: table.rows, widths: bounds.slice(1).map((b, k) => Math.max(18, b - bounds[k])), indent: Math.max(0, table.x0 - L), spaceBefore: 0 },
        top: lines[i].y - lines[i].size * 0.9,
        bottom: lines[table.end - 1].y + lines[table.end - 1].size * 0.25,
      })
      i = table.end - 1
      continue
    }
    const line = lines[i]
    const prev = para[para.length - 1]
    const text = runsText(lineRuns(line.items))
    const startsBullet = BULLET.test(text) || /^(\d{1,3}|[a-z]|[ivx]{1,4})[.)]\s/i.test(text)
    if (prev) {
      const gap = line.y - prev.y
      const expected = Math.max(typicalPitch || 0, Math.max(prev.size, line.size) * 1.05)
      const firstWord = line.items[0] ? Math.min(line.items[0].w, ((line.items[0].text.split(/\s/)[0]?.length || 1) / Math.max(1, line.items[0].text.length)) * line.items[0].w) : 0
      const endedEarly = prev.x1 + firstWord + prev.size * 0.6 < R - prev.size * 0.5
      const sizeChange = Math.abs(line.size - prev.size) > Math.max(line.size, prev.size) * 0.15
      const weightChange = prev.items.every((it) => it.bold) !== line.items.every((it) => it.bold) && (prev.items.every((it) => it.bold) ? endedEarly : false)
      const continuesBullet = bulletText !== null && Math.abs(line.x0 - bulletText) < line.size
      const indented = !continuesBullet && para.length >= 2 && line.x0 > Math.min(...para.slice(1).map((l) => l.x0)) + line.size
      const firstIndent = !continuesBullet && para.length === 1 && line.x0 > prev.x0 + line.size && !(BULLET.test(runsText(lineRuns(prev.items))))
      if (gap > expected * 1.45 || gap < 0 || sizeChange || weightChange || startsBullet || endedEarly || indented || firstIndent) flush()
    }
    if (!para.length && startsBullet) {
      // Continuation lines of a list item line up with the text after the label.
      const items = line.items
      const after = items.length > 1 ? items[1].x : items[0].x + Math.min(items[0].w, line.size * 1.5)
      bulletText = after
    }
    para.push(line)
  }
  flush()
  return out
}

// ---------------------------------------------------------------------------
// Pages

/** The most common text size, weighted by characters. */
export function bodySize(pages: PageInput[]): number {
  const w = new Map<number, number>()
  for (const p of pages) for (const it of p.items) w.set(Math.round(it.size), (w.get(Math.round(it.size)) ?? 0) + it.text.length)
  let best = 11
  let bestW = -1
  for (const [s, n] of w) if (n > bestW) [best, bestW] = [s, n]
  return best
}

function placeImages(blocks: FlowBlock[], images: PageImage[], L: number): FlowBlock[] {
  const all = [...blocks, ...images.map((image) => ({ block: { t: 'image', image, indent: Math.max(0, image.x - L), spaceBefore: 0 } as OutBlock, top: image.y, bottom: image.y + image.h }))]
  return all.sort((a, b) => a.top - b.top)
}

function withSpacing(blocks: FlowBlock[], start: number): OutBlock[] {
  let prevBottom = start
  return blocks.map((fb) => {
    const space = Math.max(0, fb.top - prevBottom)
    prevBottom = Math.max(prevBottom, fb.bottom)
    return { ...fb.block, spaceBefore: Math.round(space * 10) / 10 } as OutBlock
  })
}

export function analyzePage(page: PageInput, body: number): OutPage {
  const lines = groupLines(page.items)
  const imgs = page.images.filter((im) => im.w > 4 && im.h > 4)
  const textLeft = lines.length ? Math.min(...lines.map((l) => l.x0)) : page.width
  const textRight = lines.length ? Math.max(...lines.map((l) => l.x1)) : 0
  const left = Math.min(textLeft, ...imgs.map((i) => i.x))
  const right = Math.max(textRight, ...imgs.map((i) => i.x + i.w))
  const tops = [...lines.map((l) => l.y - l.size * 0.9), ...imgs.map((i) => i.y)]
  const bottoms = [...lines.map((l) => l.y + l.size * 0.25), ...imgs.map((i) => i.y + i.h)]
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const margins = {
    left: clamp(Number.isFinite(left) ? left : 72, 18, 144),
    right: clamp(Number.isFinite(right) && right > 0 ? page.width - right : 72, 18, 144),
    top: clamp(tops.length ? Math.min(...tops) : 72, 18, 72),
    bottom: clamp(bottoms.length ? page.height - Math.max(...bottoms) : 72, 18, 72),
  }
  if (!lines.length && !imgs.length) return { width: page.width, height: page.height, margins, regions: [{ columns: 1, blocks: [] }] }

  const regions: OutRegion[] = []
  const gutter = findGutter(lines)
  if (!gutter) {
    const fb = placeImages(flowBlocks(lines, body), imgs, margins.left)
    regions.push({ columns: 1, blocks: withSpacing(fb, margins.top) })
  } else {
    // Lines crossing the gutter (titles, full-width figures captions) stay full width.
    const crosses = (l: Line) => segments(l).some((s) => s.x0 < gutter.x1 - 1 && s.x1 > gutter.x0 + 1)
    type Band = { kind: 'full' | 'cols'; lines: Line[] }
    const bands: Band[] = []
    for (const l of lines) {
      const kind = crosses(l) ? 'full' : 'cols'
      const last = bands[bands.length - 1]
      if (last?.kind === kind) last.lines.push(l)
      else bands.push({ kind, lines: [l] })
    }
    let cursor = margins.top
    const mid = (gutter.x0 + gutter.x1) / 2
    bands.forEach((band, bi) => {
      const top = band.lines[0].y - band.lines[0].size * 0.9
      const bottom = bi + 1 < bands.length ? bands[bi + 1].lines[0].y - bands[bi + 1].lines[0].size * 0.9 : Infinity
      const bandImgs = imgs.filter((im) => im.y + im.h / 2 >= (bi === 0 ? -Infinity : top) && im.y + im.h / 2 < bottom)
      if (band.kind === 'full' || band.lines.length < 4) {
        const fb = placeImages(flowBlocks(band.lines, body), bandImgs, margins.left)
        const blocks = withSpacing(fb, cursor)
        const last = regions[regions.length - 1]
        if (last?.columns === 1) last.blocks.push(...blocks)
        else regions.push({ columns: 1, blocks })
      } else {
        const split = (side: 'left' | 'right') =>
          band.lines
            .map((l) => {
              const its = l.items.filter((it) => (side === 'left' ? it.x + it.w / 2 < mid : it.x + it.w / 2 >= mid))
              return its.length ? makeLine(its) : null
            })
            .filter((l): l is Line => !!l)
        const leftImgs = bandImgs.filter((im) => im.x + im.w / 2 < mid)
        const rightImgs = bandImgs.filter((im) => im.x + im.w / 2 >= mid)
        const lb = withSpacing(placeImages(flowBlocks(split('left'), body), leftImgs, margins.left), cursor)
        const rb = withSpacing(placeImages(flowBlocks(split('right'), body), rightImgs, gutter.x1), cursor)
        regions.push({ columns: 2, left: lb, right: rb, gap: gutter.x1 - gutter.x0, leftWidth: gutter.x0 - margins.left })
      }
      cursor = Math.max(...band.lines.map((l) => l.y + l.size * 0.25), ...bandImgs.map((i) => i.y + i.h))
    })
  }
  return { width: page.width, height: page.height, margins, regions }
}

/** Characters of real text on a page, ignoring whitespace. */
export const textCharCount = (page: PageInput) => page.items.reduce((n, it) => n + it.text.replace(/\s/g, '').length, 0)
