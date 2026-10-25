// Lays out a parsed Word document into pages of positioned text, lines,
// rectangles and images. Line breaking, tab stops, list labels, tables,
// headers and footers and pagination (with keep-with-next, widow and orphan
// control and repeated table headers) follow Word's rules closely enough
// that pages usually break where Word breaks them, though not always.
// Coordinates are in points with the origin at the top-left of the page.
import type { FaceKey, FontBook } from './fonts'
import { styleFace } from './fonts'
import type { Block, Cell, DocModel, HeaderFooterSet, Inline, Paragraph, RunStyle, Section, Table } from './model'

export type Draw =
  | { t: 'text'; x: number; y: number; w: number; text: string; face: FaceKey; size: number; color: string }
  | { t: 'field'; field: 'page' | 'pages'; x: number; y: number; face: FaceKey; size: number; color: string }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; color: string }
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill: string }
  | { t: 'image'; id: string; x: number; y: number; w: number; h: number }
  | { t: 'placeholder'; label: string; x: number; y: number; w: number; h: number }
  | { t: 'link'; href: string; x: number; y: number; w: number; h: number }

export interface LaidPage {
  width: number
  height: number
  draws: Draw[]
}

export interface Layout {
  pages: LaidPage[]
  warnings: string[]
}

/** A unit that pagination places on a page. Draws are relative to its top-left corner. */
interface Item {
  h: number
  draws: Draw[]
  spaceBefore: number
  spaceAfter: number
  breakBefore?: boolean
  keepWithNext?: boolean
  /** Splits the item to fit `avail` points, or returns null if nothing fits. */
  split?: (avail: number) => [Item, Item] | null
  /** Table header rows to repeat when this item starts a new page. */
  repeat?: Item[]
}

interface Env {
  book: FontBook
  /** Height available for body text, used to keep oversized content on one page. */
  bodyHeight: number
  warnings: Set<string>
  /** Page number and count for headers and footers, laid out once both are known. */
  fields?: { page: number; pages: number }
}

const DEFAULT_TAB = 36
const EPS = 0.01

// ---------------------------------------------------------------------------
// Inline tokens

interface Seg {
  text: string
  face: FaceKey
  size: number
  color: string
  style: RunStyle
  w: number
  asc: number
  desc: number
  lh: number
  /** Baseline shift: negative raises (superscript). */
  rise: number
  href?: string
  field?: 'page' | 'pages'
}

type Token =
  | { k: 'word'; segs: Seg[]; w: number }
  | { k: 'space'; segs: Seg[]; w: number }
  | { k: 'tab'; seg: Seg; label?: boolean }
  | { k: 'break'; kind: 'line' | 'page' }
  | { k: 'image'; id?: string; label?: string; w: number; h: number; style: RunStyle; href?: string }

const BREAKING_SPACE = /([ \t\n\r\f\v  -  　]+)/
const CJK = /[⺀-⿿぀-ヿ㄀-ㇿ㐀-䶿一-鿿가-힯豈-﫿＀-￯]/
const BREAK_AFTER = /[-‐‒–—/]/
const ALNUM = /[\p{L}\p{N}]/u

function segsFor(book: FontBook, text: string, style: RunStyle, href?: string): Seg[] {
  if (style.caps) text = text.toUpperCase()
  const small = style.vertAlign ? style.size * 0.65 : style.size
  const rise = style.vertAlign === 'super' ? -style.size * 0.35 : style.vertAlign === 'sub' ? style.size * 0.14 : 0
  return book.segments(styleFace(style), text).map(({ face, text }) => {
    const m = book.metrics(face, small)
    return { text, face, size: small, color: style.color, style, w: book.width(face, text, small), asc: m.ascent - rise, desc: m.descent + rise, lh: m.lineHeight, rise, href }
  })
}

/** Splits a word into chunks after hyphens and slashes between letters, and around CJK characters. */
export function breakChunks(word: string): string[] {
  const chars = [...word]
  const out: string[] = []
  let cur = ''
  chars.forEach((ch, i) => {
    if (CJK.test(ch)) {
      if (cur) out.push(cur)
      out.push(ch)
      cur = ''
      return
    }
    cur += ch
    if (BREAK_AFTER.test(ch) && i > 0 && ALNUM.test(chars[i - 1]) && i < chars.length - 1 && ALNUM.test(chars[i + 1])) {
      out.push(cur)
      cur = ''
    }
  })
  if (cur) out.push(cur)
  return out
}

function tokenize(p: Paragraph, env: Env, maxImage: { w: number; h: number }): Token[] {
  const { book } = env
  const tokens: Token[] = []
  let word: Seg[] = []
  const flush = () => {
    if (word.length) tokens.push({ k: 'word', segs: word, w: word.reduce((n, s) => n + s.w, 0) })
    word = []
  }
  if (p.label) {
    word.push(...segsFor(book, p.label.text, p.label.style))
    flush()
    tokens.push({ k: 'tab', seg: segsFor(book, ' ', p.label.style)[0], label: true })
  }
  const addImage = (inl: Extract<Inline, { t: 'image' | 'placeholder' }>, href?: string) => {
    flush()
    // Scale down anything larger than the text area, so nothing is cropped.
    const scale = Math.min(1, maxImage.w / inl.width, maxImage.h / inl.height)
    tokens.push({ k: 'image', id: inl.t === 'image' ? inl.id : undefined, label: inl.t === 'placeholder' ? inl.label : undefined, w: inl.width * scale, h: inl.height * scale, style: inl.style, href })
  }
  for (const inl of p.inlines) {
    switch (inl.t) {
      case 'text':
        for (const part of inl.text.split(BREAKING_SPACE)) {
          if (!part) continue
          if (BREAKING_SPACE.test(part)) {
            flush()
            const segs = segsFor(book, part.replace(/[\t\n\r\f\v]/g, ' '), inl.style, inl.href)
            tokens.push({ k: 'space', segs, w: segs.reduce((n, s) => n + s.w, 0) })
            continue
          }
          const chunks = breakChunks(part)
          chunks.forEach((chunk, i) => {
            word.push(...segsFor(book, chunk, inl.style, inl.href))
            if (i < chunks.length - 1) flush()
          })
          if (CJK.test([...part].pop() ?? '')) flush()
        }
        break
      case 'tab':
        flush()
        tokens.push({ k: 'tab', seg: segsFor(book, ' ', inl.style)[0] })
        break
      case 'break':
        flush()
        tokens.push({ k: 'break', kind: inl.kind === 'line' ? 'line' : 'page' })
        break
      case 'image':
      case 'placeholder':
        addImage(inl)
        break
      case 'field': {
        if (env.fields) {
          word.push(...segsFor(book, String(inl.field === 'page' ? env.fields.page : env.fields.pages), inl.style))
          break
        }
        // In body text, leave room for a two-digit number; the value is filled in per page.
        const seg = segsFor(book, '99', inl.style)
        word.push(...seg.map((s) => ({ ...s, field: inl.field })))
        break
      }
    }
  }
  flush()
  return tokens
}

/** Breaks a word that is wider than a whole line into pieces that fit. */
function splitWord(book: FontBook, tok: Extract<Token, { k: 'word' }>, first: number, rest: number): Extract<Token, { k: 'word' }>[] {
  const out: Extract<Token, { k: 'word' }>[] = []
  let cur: Seg[] = []
  let w = 0
  let limit = Math.max(first, 1)
  for (const seg of tok.segs) {
    for (const ch of seg.text) {
      const cw = book.width(seg.face, ch, seg.size)
      if (w + cw > limit + EPS && w > 0) {
        out.push({ k: 'word', segs: cur, w })
        cur = []
        w = 0
        limit = Math.max(rest, 1)
      }
      const last = cur[cur.length - 1]
      if (last && last.face === seg.face && last.style === seg.style) {
        last.text += ch
        last.w += cw
      } else cur.push({ ...seg, text: ch, w: cw })
      w += cw
    }
  }
  if (cur.length) out.push({ k: 'word', segs: cur, w })
  return out
}

// ---------------------------------------------------------------------------
// Paragraphs

interface Placed {
  tok: Token
  x: number
  w: number
  leader?: 'dot' | 'hyphen' | 'underscore'
}

interface Line {
  toks: Placed[]
  end: 'wrap' | 'break' | 'page' | 'end'
  start: number
}

const isContent = (p: Placed) => p.tok.k === 'word' || p.tok.k === 'image' || p.tok.k === 'tab'

function widthUntilTab(tokens: Token[], from: number) {
  let w = 0
  for (let i = from; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.k === 'tab' || t.k === 'break') break
    if (t.k === 'word' || t.k === 'space' || t.k === 'image') w += t.w
  }
  return w
}

function breakLines(p: Paragraph, tokens: Token[], width: number, env: Env): Line[] {
  const s = p.style
  const right = width - s.indentRight
  const lines: Line[] = []
  let start = s.indentLeft + s.firstLine
  let x = start
  let cur: Placed[] = []
  const newLine = (end: Line['end']) => {
    while (cur.length && cur[cur.length - 1].tok.k === 'space') cur.pop()
    lines.push({ toks: cur, end, start })
    cur = []
    start = x = s.indentLeft
  }
  const queue = [...tokens]
  for (let i = 0; i < queue.length; i++) {
    const tok = queue[i]
    switch (tok.k) {
      case 'space':
        cur.push({ tok, x, w: tok.w })
        x += tok.w
        break
      case 'word':
      case 'image': {
        const hasContent = cur.some(isContent)
        if (x + tok.w > right + EPS && hasContent) {
          newLine('wrap')
          i--
          break
        }
        if (tok.k === 'word' && x + tok.w > right + EPS) {
          // Wider than the whole line: break it between characters.
          const pieces = splitWord(env.book, tok, right - x, right - s.indentLeft)
          queue.splice(i, 1, ...pieces)
          i--
          break
        }
        cur.push({ tok, x, w: tok.w })
        x += tok.w
        break
      }
      case 'tab': {
        const stops = s.tabs.filter((t) => t.pos > x + EPS)
        // A hanging indent acts as a tab stop after a list label.
        const hang = s.firstLine < 0 && x < s.indentLeft - EPS ? s.indentLeft : Infinity
        const custom = stops[0]
        let pos: number
        let align: 'left' | 'center' | 'right' | 'decimal' = 'left'
        let leader: Placed['leader']
        if (custom && custom.pos <= hang) {
          pos = custom.pos
          align = custom.align
          leader = custom.leader
        } else if (hang !== Infinity) pos = hang
        else pos = Math.floor(x / DEFAULT_TAB + 1 + EPS) * DEFAULT_TAB
        let w: number
        if (align === 'left') w = pos - x
        else {
          const follow = widthUntilTab(queue, i + 1)
          w = Math.max(0, (align === 'center' ? pos - follow / 2 : Math.min(pos, right) - follow) - x)
        }
        if (x + w > right + EPS && align === 'left') {
          // No stop left on this line: Word moves on to the next line.
          if (cur.some(isContent)) {
            newLine('wrap')
            i--
            break
          }
          w = Math.max(0, right - x)
        }
        cur.push({ tok, x, w, leader })
        x += w
        break
      }
      case 'break':
        newLine(tok.kind === 'page' ? 'page' : 'break')
        break
    }
  }
  newLine('end')
  return lines
}

interface LineBox {
  h: number
  baseline: number
  draws: Draw[]
}

function lineBox(p: Paragraph, line: Line, width: number, env: Env, isLast: boolean): LineBox {
  const { book } = env
  const s = p.style
  const right = width - s.indentRight
  // Vertical metrics: text sets ascent/descent; images sit on the baseline.
  let asc = 0
  let desc = 0
  let natural = 0
  let imgH = 0
  for (const pl of line.toks) {
    if (pl.tok.k === 'word' || pl.tok.k === 'space') {
      for (const seg of pl.tok.segs) {
        // Word puts the font's line gap above the text.
        asc = Math.max(asc, seg.lh - seg.desc)
        desc = Math.max(desc, seg.desc)
        natural = Math.max(natural, seg.lh)
      }
    } else if (pl.tok.k === 'tab') {
      asc = Math.max(asc, pl.tok.seg.lh - pl.tok.seg.desc)
      desc = Math.max(desc, pl.tok.seg.desc)
      natural = Math.max(natural, pl.tok.seg.lh)
    } else if (pl.tok.k === 'image') imgH = Math.max(imgH, pl.tok.h)
  }
  if (natural === 0) {
    const face = styleFace(p.markStyle)
    const m = book.metrics(face, p.markStyle.size)
    asc = m.lineHeight - m.descent
    desc = m.descent
    natural = m.lineHeight
  }
  const ascPart = Math.max(asc, imgH)
  const full = ascPart + desc
  let h: number
  let baseline: number
  const { rule, value } = s.line
  if (rule === 'exact') {
    h = imgH > 0 ? Math.max(value, full) : value
    baseline = h - desc
  } else if (rule === 'atLeast') {
    h = Math.max(value, full)
    baseline = h - desc
  } else if (value >= 1) {
    h = full + (value - 1) * natural
    baseline = ascPart
  } else {
    h = full * value
    baseline = ascPart * value
  }

  // Horizontal alignment and justification.
  const content = line.toks.filter(isContent)
  const end = content.length ? Math.max(...line.toks.map((t) => t.x + t.w)) : line.start
  const extra = Math.max(0, right - end)
  let shift = 0
  let perSpace = 0
  const lastTab = line.toks.map((t) => t.tok.k).lastIndexOf('tab')
  if (s.align === 'center') shift = extra / 2
  else if (s.align === 'right') shift = extra
  else if (s.align === 'justify' && line.end === 'wrap' && !isLast) {
    const gaps = line.toks.filter((t, i) => t.tok.k === 'space' && i > lastTab).length
    if (gaps) perSpace = extra / gaps
  }

  const draws: Draw[] = []
  let added = 0
  line.toks.forEach((pl, i) => {
    const x = pl.x + shift + added
    if (pl.tok.k === 'space' && perSpace && i > lastTab) {
      added += perSpace
    }
    switch (pl.tok.k) {
      case 'word':
      case 'space': {
        let sx = x
        const { segs, k } = pl.tok
        const extraW = k === 'space' && perSpace && i > lastTab ? perSpace : 0
        segs.forEach((seg, si) => {
          const segW = seg.w + (si === segs.length - 1 ? extraW : 0)
          drawSeg(draws, seg, sx, baseline, segW, k === 'space' && perSpace > 0)
          sx += segW
        })
        break
      }
      case 'tab': {
        const seg = pl.tok.seg
        if (pl.leader && pl.w > 0) {
          const ch = pl.leader === 'dot' ? '.' : pl.leader === 'hyphen' ? '-' : '_'
          const cw = book.width(seg.face, ch, seg.size)
          const n = Math.floor((pl.w - cw) / cw)
          if (n > 0) draws.push({ t: 'text', x: x + pl.w - n * cw - cw / 2, y: baseline, w: n * cw, text: ch.repeat(n), face: seg.face, size: seg.size, color: seg.color })
        }
        if (seg.style.underline && !pl.tok.label) draws.push({ t: 'line', x1: x, x2: x + pl.w, y1: baseline + seg.size * 0.12, y2: baseline + seg.size * 0.12, width: Math.max(0.5, seg.size * 0.06), color: seg.color })
        break
      }
      case 'image': {
        const tok = pl.tok
        const y = baseline - tok.h
        if (tok.id) draws.push({ t: 'image', id: tok.id, x, y, w: tok.w, h: tok.h })
        else draws.push({ t: 'placeholder', label: tok.label ?? 'Object', x, y, w: tok.w, h: tok.h })
        break
      }
    }
  })
  return { h, baseline, draws: mergeText(draws) }
}

function drawSeg(draws: Draw[], seg: Seg, x: number, baseline: number, w: number, isGap: boolean) {
  const st = seg.style
  const y = baseline + seg.rise
  if (st.background) draws.push({ t: 'rect', x, y: y - seg.asc - seg.rise, w, h: seg.asc + seg.desc, fill: st.background })
  if (seg.field) draws.push({ t: 'field', field: seg.field, x, y, face: seg.face, size: seg.size, color: seg.color })
  // Spaces are drawn too (merged into neighbouring text) so copied text keeps them,
  // except widened spaces in justified lines, which are left as gaps.
  else if (!isGap) draws.push({ t: 'text', x, y, w: seg.w, text: seg.text, face: seg.face, size: seg.size, color: seg.color })
  const lw = Math.max(0.5, seg.size * 0.06)
  if (st.underline) draws.push({ t: 'line', x1: x, x2: x + w, y1: y + seg.size * 0.12, y2: y + seg.size * 0.12, width: lw, color: seg.color })
  if (st.strike) draws.push({ t: 'line', x1: x, x2: x + w, y1: y - seg.size * 0.28, y2: y - seg.size * 0.28, width: lw, color: seg.color })
  if (seg.href) draws.push({ t: 'link', href: seg.href, x, y: y - seg.asc, w, h: seg.asc + seg.desc })
}

/** Joins adjacent text runs with the same font and colour, so copied text keeps its spaces. */
function mergeText(draws: Draw[]): Draw[] {
  const out: Draw[] = []
  for (const d of draws) {
    const prev = out[out.length - 1]
    if (d.t === 'text' && prev?.t === 'text' && prev.face === d.face && prev.size === d.size && prev.color === d.color && prev.y === d.y && Math.abs(prev.x + prev.w - d.x) < 0.05) {
      prev.text += d.text
      prev.w += d.w
    } else if (d.t === 'link' && prev?.t === 'link' && prev.href === d.href && Math.abs(prev.x + prev.w - d.x) < 0.05 && prev.y === d.y) {
      prev.w += d.w
    } else out.push(d.t === 'text' ? { ...d } : d)
  }
  // Drop runs that are only spaces; they carry no ink.
  return out.filter((d) => d.t !== 'text' || d.text.trim() !== '')
}

function layoutParagraph(p: Paragraph, width: number, env: Env): Item[] {
  const s = p.style
  const tokens = tokenize(p, env, { w: Math.max(36, width - s.indentLeft - s.indentRight), h: env.bodyHeight * 0.98 })
  const lines = breakLines(p, tokens, width, env)
  const top = s.borders.top
  const bottom = s.borders.bottom
  const items: Item[] = lines.map((line, i) => {
    const box = lineBox(p, line, width, env, i === lines.length - 1)
    const padTop = i === 0 && top ? top.width + (top.space ?? 1) : 0
    const padBottom = i === lines.length - 1 && bottom ? bottom.width + (bottom.space ?? 1) : 0
    const h = box.h + padTop + padBottom
    const draws: Draw[] = []
    const left = s.indentLeft - (s.borders.left ? (s.borders.left.space ?? 4) : 0)
    const rightEdge = width - s.indentRight + (s.borders.right ? (s.borders.right.space ?? 4) : 0)
    if (s.shading) draws.push({ t: 'rect', x: Math.min(left, s.indentLeft + Math.min(0, s.firstLine)), y: 0, w: rightEdge - left, h, fill: s.shading })
    for (const d of box.draws) draws.push(offset(d, 0, padTop))
    if (padTop && top) draws.push({ t: 'line', x1: left, x2: rightEdge, y1: top.width / 2, y2: top.width / 2, width: top.width, color: top.color })
    if (padBottom && bottom) draws.push({ t: 'line', x1: left, x2: rightEdge, y1: h - bottom.width / 2, y2: h - bottom.width / 2, width: bottom.width, color: bottom.color })
    if (s.borders.left) draws.push({ t: 'line', x1: left, x2: left, y1: 0, y2: h, width: s.borders.left.width, color: s.borders.left.color })
    if (s.borders.right) draws.push({ t: 'line', x1: rightEdge, x2: rightEdge, y1: 0, y2: h, width: s.borders.right.width, color: s.borders.right.color })
    return {
      h,
      draws,
      spaceBefore: i === 0 ? s.spaceBefore : 0,
      spaceAfter: i === lines.length - 1 ? s.spaceAfter : 0,
      breakBefore: (i === 0 && s.pageBreakBefore) || (i > 0 && lines[i - 1].end === 'page'),
    }
  })
  // Keep lines together, and keep two lines at the top and bottom of a page.
  const n = items.length
  items.forEach((it, i) => {
    if (s.keepLines && i < n - 1) it.keepWithNext = true
    if (n <= 3 && i < n - 1) it.keepWithNext = true
    if (n >= 4 && (i === 0 || i === n - 2)) it.keepWithNext = true
    if (i === n - 1 && s.keepNext) it.keepWithNext = true
    // A forced page break must not drag earlier lines with it.
    if (items[i + 1]?.breakBefore) it.keepWithNext = false
  })
  return items
}

function offset(d: Draw, dx: number, dy: number): Draw {
  if (d.t === 'line') return { ...d, x1: d.x1 + dx, x2: d.x2 + dx, y1: d.y1 + dy, y2: d.y2 + dy }
  return { ...d, x: d.x + dx, y: d.y + dy }
}

// ---------------------------------------------------------------------------
// Tables

interface Stack {
  placed: { item: Item; y: number }[]
  h: number
}

/** Stacks items vertically (inside a table cell), applying paragraph spacing. */
function stack(items: Item[]): Stack {
  let y = 0
  let pendingAfter = 0
  const placed: Stack['placed'] = []
  items.forEach((item, i) => {
    y += (i === 0 ? 0 : pendingAfter) + item.spaceBefore
    placed.push({ item, y })
    y += item.h
    pendingAfter = item.spaceAfter
  })
  // Word keeps the last paragraph's space after inside a cell.
  return { placed, h: y + pendingAfter }
}

interface CellBox {
  cell: Cell
  x: number
  w: number
  rowSpan: number
}

function layoutTable(t: Table, width: number, env: Env): Item[] {
  let cols = t.columns.slice()
  const known = cols.filter((c) => c > 0)
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : width / Math.max(1, cols.length)
  cols = cols.map((c) => (c > 0 ? c : avg))
  let total = cols.reduce((a, b) => a + b, 0)
  if (total > width - Math.max(0, t.indent) + EPS) {
    const scale = (width - Math.max(0, t.indent)) / total
    cols = cols.map((c) => c * scale)
    total = width - Math.max(0, t.indent)
    env.warnings.add('Some tables were wider than the page and were scaled to fit.')
  }
  const left = t.align === 'center' ? (width - total) / 2 : t.align === 'right' ? width - total : t.indent
  const colX = cols.reduce<number[]>((acc, c, i) => (acc.push(i === 0 ? left : acc[i - 1] + cols[i - 1]), acc), [])

  // Grid positions of every cell.
  const grid: (CellBox & { col: number })[][] = t.rows.map((row) => {
    let col = 0
    return row.cells.map((cell) => {
      const span = Math.min(cell.span, Math.max(1, cols.length - col))
      const box = { cell, col, x: colX[col] ?? left + total, w: cols.slice(col, col + span).reduce((a, b) => a + b, 0) || 36, rowSpan: 1 }
      col += span
      return box
    })
  })
  for (let r = 0; r < grid.length; r++) {
    for (const box of grid[r]) {
      if (box.cell.vMerge !== 'restart') continue
      let span = 1
      while (r + span < grid.length && grid[r + span].some((b) => b.col === box.col && b.cell.vMerge === 'continue')) span++
      box.rowSpan = span
    }
  }
  const contentFor = (box: CellBox) => stack(layoutBlocks(box.cell.blocks, Math.max(4, box.w - box.cell.margins.left - box.cell.margins.right), env))
  const contents = grid.map((row) => row.map((box) => (box.cell.vMerge === 'continue' ? null : contentFor(box))))

  const heights = t.rows.map((row, r) => {
    let h = 0
    grid[r].forEach((box, i) => {
      const c = contents[r][i]
      if (c && box.rowSpan === 1) h = Math.max(h, box.cell.margins.top + c.h + box.cell.margins.bottom)
    })
    // Exact heights are treated as minimums, so cell text is never cut off.
    if (row.height) h = Math.max(h, row.height.value)
    return Math.max(h, 2)
  })
  // Vertically merged cells: grow the group's last row if the content needs it,
  // and keep the group's rows together; groups taller than a page are unmerged.
  const keepRows = new Set<number>()
  for (let r = 0; r < grid.length; r++) {
    grid[r].forEach((box, i) => {
      if (box.rowSpan < 2) return
      const c = contents[r][i]!
      const need = box.cell.margins.top + c.h + box.cell.margins.bottom
      const have = heights.slice(r, r + box.rowSpan).reduce((a, b) => a + b, 0)
      if (need > have) heights[r + box.rowSpan - 1] += need - have
      const groupH = heights.slice(r, r + box.rowSpan).reduce((a, b) => a + b, 0)
      if (groupH > env.bodyHeight * 0.9) {
        box.rowSpan = 1
        heights[r] = Math.max(heights[r], need)
        env.warnings.add('Merged table cells taller than a page were split into separate rows.')
      } else for (let k = r; k < r + box.rowSpan - 1; k++) keepRows.add(k)
    })
  }

  const rowItem = (r: number, cellContents: (Stack | null)[], h: number): Item => {
    const draws: Draw[] = []
    const lines: Draw[] = []
    grid[r].forEach((box, i) => {
      const c = cellContents[i]
      if (box.cell.vMerge === 'continue' && (!c || c.placed.length === 0)) {
        // Part of a merged cell drawn by the row that starts it, unless unmerged.
        const owner = grid.slice(0, r).reverse().flatMap((row) => row.filter((b) => b.col === box.col && b.cell.vMerge === 'restart'))[0]
        if (owner && owner.rowSpan > 1) return
      }
      const cellH = box.rowSpan > 1 ? heights.slice(r, r + box.rowSpan).reduce((a, b) => a + b, 0) : h
      const cell = box.cell
      if (cell.shading && cell.shading !== 'FFFFFF') draws.push({ t: 'rect', x: box.x, y: 0, w: box.w, h: cellH, fill: cell.shading })
      if (c) {
        const free = cellH - cell.margins.top - cell.margins.bottom - c.h
        const dy = cell.margins.top + (cell.vAlign === 'center' ? Math.max(0, free / 2) : cell.vAlign === 'bottom' ? Math.max(0, free) : 0)
        for (const { item, y } of c.placed) for (const d of item.draws) draws.push(offset(d, box.x + cell.margins.left, dy + y))
      }
      const b = cell.borders
      if (b.top) lines.push({ t: 'line', x1: box.x, x2: box.x + box.w, y1: 0, y2: 0, width: b.top.width, color: b.top.color })
      if (b.bottom) lines.push({ t: 'line', x1: box.x, x2: box.x + box.w, y1: cellH, y2: cellH, width: b.bottom.width, color: b.bottom.color })
      if (b.left) lines.push({ t: 'line', x1: box.x, x2: box.x, y1: 0, y2: cellH, width: b.left.width, color: b.left.color })
      if (b.right) lines.push({ t: 'line', x1: box.x + box.w, x2: box.x + box.w, y1: 0, y2: cellH, width: b.right.width, color: b.right.color })
    })
    const merged = grid[r].some((b) => b.rowSpan > 1) || keepRows.has(r)
    const item: Item = { h, draws: [...draws, ...lines], spaceBefore: 0, spaceAfter: 0, keepWithNext: keepRows.has(r) }
    if (!merged) item.split = (avail) => splitRow(r, cellContents, avail)
    return item
  }

  const splitRow = (r: number, cellContents: (Stack | null)[], avail: number): [Item, Item] | null => {
    const firsts: (Stack | null)[] = []
    const rests: (Stack | null)[] = []
    let any = false
    let anyRest = false
    grid[r].forEach((box, i) => {
      const c = cellContents[i]
      if (!c) {
        firsts.push(null)
        rests.push(null)
        return
      }
      const room = avail - box.cell.margins.top - box.cell.margins.bottom
      const fit = c.placed.filter((p) => p.y + p.item.h <= room + EPS)
      // Content must be taken in order: stop at the first item that doesn't fit.
      let k = 0
      while (k < c.placed.length && fit.includes(c.placed[k])) k++
      const head = c.placed.slice(0, k)
      const tail = c.placed.slice(k)
      if (head.length) any = true
      if (tail.length) anyRest = true
      firsts.push({ placed: head, h: head.length ? head[head.length - 1].y + head[head.length - 1].item.h : 0 })
      const base = tail[0]?.y ?? 0
      rests.push({ placed: tail.map((p, j) => ({ item: p.item, y: p.y - base - (j === 0 ? p.item.spaceBefore : 0) })), h: tail.length ? c.h - base - tail[0].item.spaceBefore : 0 })
    })
    if (!any || !anyRest) return null
    const h2 = Math.max(2, ...grid[r].map((box, i) => (rests[i] ? box.cell.margins.top + rests[i]!.h + box.cell.margins.bottom : 0)))
    return [rowItem(r, firsts, avail), rowItem(r, rests, h2)]
  }

  const items = t.rows.map((_, r) => rowItem(r, contents[r], heights[r]))
  // Header rows repeat at the top of each page the table continues on.
  let headerCount = 0
  while (headerCount < t.rows.length && t.rows[headerCount].header) headerCount++
  if (headerCount && headerCount < items.length) {
    const headers = items.slice(0, headerCount).map((it) => ({ ...it, split: undefined, keepWithNext: true }))
    for (let i = headerCount; i < items.length; i++) items[i].repeat = headers
    items[headerCount - 1].keepWithNext = true
  }
  return items
}

// ---------------------------------------------------------------------------
// Blocks and pages

function layoutBlocks(blocks: Block[], width: number, env: Env): Item[] {
  const items: Item[] = []
  let prev: { p: Paragraph; last: Item } | null = null
  for (const b of blocks) {
    if (b.t === 'table') {
      const rows = layoutTable(b, width, env)
      items.push(...rows)
      prev = null
      continue
    }
    const its = layoutParagraph(b, width, env)
    if (prev && prev.p.style.styleId === b.style.styleId) {
      if (b.style.contextualSpacing) its[0].spaceBefore = 0
      if (prev.p.style.contextualSpacing) prev.last.spaceAfter = 0
    }
    items.push(...its)
    prev = { p: b, last: its[its.length - 1] }
  }
  return items
}

/** The characters each face must draw, so fonts can be loaded before layout. */
export function collectFontUses(doc: DocModel): Map<FaceKey, Set<string>> {
  const uses = new Map<FaceKey, Set<string>>()
  const add = (style: RunStyle, text: string) => {
    const key = styleFace(style)
    let set = uses.get(key)
    if (!set) uses.set(key, (set = new Set()))
    for (const ch of style.caps ? text.toUpperCase() : text) set.add(ch)
  }
  const visit = (blocks: Block[]) => {
    for (const b of blocks) {
      if (b.t === 'table') {
        for (const r of b.rows) for (const c of r.cells) visit(c.blocks)
        continue
      }
      add(b.markStyle, ' ')
      if (b.label) add(b.label.style, `${b.label.text} `)
      for (const i of b.inlines) {
        if (i.t === 'text') add(i.style, i.text)
        else if (i.t === 'field') add(i.style, '0123456789')
        else if (i.t === 'tab') add(i.style, ' .-_')
        else add(i.style, ' ')
      }
    }
  }
  for (const s of doc.sections) {
    visit(s.blocks)
    for (const set of [s.headers, s.footers]) for (const k of ['default', 'first', 'even'] as const) if (set[k]) visit(set[k]!)
  }
  // Placeholder labels.
  const ph = uses.get('arimo-r') ?? new Set<string>()
  for (const ch of 'ChartSmartArtEMFWMFTIFUNKNOWimageObject ') ph.add(ch)
  uses.set('arimo-r', ph)
  return uses
}

function pickHeaderFooter(set: HeaderFooterSet, firstOfSection: boolean, titlePage: boolean, pageNumber: number, evenOdd: boolean) {
  if (titlePage && firstOfSection) return set.first
  if (evenOdd && pageNumber % 2 === 0) return set.even
  return set.default
}

/** Lays out the whole document. Fonts used by the document must already be prepared in `book`. */
export function layoutDocument(doc: DocModel, book: FontBook): Layout {
  const warnings = new Set<string>()
  const pages: (LaidPage & { section: Section; firstOfSection: boolean })[] = []
  const hfCache = new Map<string, { items: Item[]; h: number }>()
  const hfIds = new Map<Block[], number>()
  /** Lays out a header or footer, with page numbers once they're known (estimated as 99 before). */
  const hfLayout = (blocks: Block[] | undefined, section: Section, fields = { page: 99, pages: 99 }) => {
    if (!blocks) return { items: [], h: 0 }
    if (!hfIds.has(blocks)) hfIds.set(blocks, hfIds.size)
    const key = `${hfIds.get(blocks)}:${fields.page}:${fields.pages}`
    let c = hfCache.get(key)
    if (!c) {
      const env: Env = { book, bodyHeight: section.height / 3, warnings, fields }
      const items = layoutBlocks(blocks, section.width - section.margin.left - section.margin.right, env)
      c = { items, h: stack(items).h }
      hfCache.set(key, c)
    }
    return c
  }

  let page: (typeof pages)[number] | null = null
  let y = 0
  let bodyTop = 0
  let bottom = 0
  let atTop = true
  let pendingAfter = 0
  let section: Section = doc.sections[0]

  const newPage = (firstOfSection: boolean) => {
    const n = pages.length + 1
    const header = hfLayout(pickHeaderFooter(section.headers, firstOfSection, section.titlePage, n, doc.evenAndOddHeaders), section)
    const footer = hfLayout(pickHeaderFooter(section.footers, firstOfSection, section.titlePage, n, doc.evenAndOddHeaders), section)
    page = { width: section.width, height: section.height, draws: [], section, firstOfSection }
    pages.push(page)
    y = bodyTop = Math.max(section.margin.top, section.margin.header + header.h)
    bottom = section.height - Math.max(section.margin.bottom, section.margin.footer + footer.h)
    if (bottom - y < 72) bottom = Math.min(section.height - 18, y + 72)
    atTop = true
    pendingAfter = 0
  }

  /** Starts a new page mid-section, repeating table header rows if a table continues. */
  const breakPage = (next: Item) => {
    newPage(false)
    if (next.repeat) for (const h of next.repeat) place(h)
  }

  const place = (item: Item) => {
    for (const d of item.draws) page!.draws.push(offset(d, section.margin.left, y))
    y += item.h
    atTop = false
    pendingAfter = item.spaceAfter
  }

  for (let si = 0; si < doc.sections.length; si++) {
    section = doc.sections[si]
    if (section.blocks.length === 0 && si > 0) continue
    const width = section.width - section.margin.left - section.margin.right
    // A continuous section carries on down the current page.
    if (!page || section.newPage) newPage(true)
    const env: Env = { book, bodyHeight: Math.max(72, bottom - bodyTop), warnings }
    const items = layoutBlocks(section.blocks, Math.max(36, width), env)

    for (let i = 0; i < items.length; i++) {
      let item = items[i]
      if (item.breakBefore && !atTop) breakPage(item)
      const prevKeeps = i > 0 && items[i - 1].keepWithNext
      if (item.keepWithNext && !prevKeeps && !atTop) {
        // Keep a chain of items together if it fits on a fresh page.
        let chainH = item.spaceBefore + item.h
        let j = i
        while (items[j]?.keepWithNext && j + 1 < items.length && !items[j + 1].breakBefore) {
          j++
          chainH += items[j - 1].spaceAfter + items[j].spaceBefore + items[j].h
        }
        if (y + pendingAfter + chainH > bottom + EPS && chainH <= bottom - bodyTop) breakPage(item)
      }
      for (;;) {
        const gap = atTop ? 0 : pendingAfter + item.spaceBefore
        if (y + gap + item.h <= bottom + EPS) {
          y += gap
          place(item)
          break
        }
        const avail = bottom - y - gap
        const parts = avail > 12 ? item.split?.(avail) : null
        if (parts) {
          y += gap
          place(parts[0])
          item = { ...parts[1], repeat: item.repeat }
          breakPage(item)
          continue
        }
        if (atTop) {
          // Taller than a whole page and can't be split: place it anyway.
          place(item)
          break
        }
        breakPage(item)
      }
    }
  }
  if (!page) newPage(true)

  // Headers, footers and page-number fields, now that the page count is known.
  const total = pages.length
  pages.forEach((pg, idx) => {
    const n = idx + 1
    const s = pg.section
    const fields = { page: n, pages: total }
    const header = hfLayout(pickHeaderFooter(s.headers, pg.firstOfSection, s.titlePage, n, doc.evenAndOddHeaders), s, fields)
    const footer = hfLayout(pickHeaderFooter(s.footers, pg.firstOfSection, s.titlePage, n, doc.evenAndOddHeaders), s, fields)
    const extra: Draw[] = []
    for (const { item, y: iy } of stack(header.items).placed) for (const d of item.draws) extra.push(offset(d, s.margin.left, s.margin.header + iy))
    const footTop = s.height - s.margin.footer - footer.h
    for (const { item, y: iy } of stack(footer.items).placed) for (const d of item.draws) extra.push(offset(d, s.margin.left, footTop + iy))
    pg.draws = [...extra, ...pg.draws].map((d) =>
      d.t === 'field' ? { t: 'text', x: d.x, y: d.y, w: book.width(d.face, String(d.field === 'page' ? n : total), d.size), text: String(d.field === 'page' ? n : total), face: d.face, size: d.size, color: d.color } : d
    )
  })
  return { pages: pages.map(({ width, height, draws }) => ({ width, height, draws })), warnings: [...warnings] }
}
