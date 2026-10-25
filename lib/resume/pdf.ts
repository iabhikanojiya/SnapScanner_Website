// Exports the rendered resume sheet to a PDF with real, selectable text.
// Positions come from the browser's layout of the preview, so the PDF matches
// what's on screen. Text uses the PDF standard fonts, which the preview's font
// stacks are metric-compatible with (Arial/Helvetica, Times, Courier).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from '@cantoo/pdf-lib'
import { SITE_DOMAIN } from '@/lib/site'

const PAGE_W_PT = 595.28
const PAGE_H_PT = 841.89

export interface ResumePdfResult {
  bytes: Uint8Array
  pages: number
  /** Characters the standard fonts can't encode, replaced in the PDF. */
  replaced: string[]
}

type FontKey = 'sans' | 'sans-b' | 'sans-i' | 'sans-bi' | 'serif' | 'serif-b' | 'serif-i' | 'serif-bi' | 'mono' | 'mono-b'

const FONT_FILES: Record<FontKey, StandardFonts> = {
  sans: StandardFonts.Helvetica,
  'sans-b': StandardFonts.HelveticaBold,
  'sans-i': StandardFonts.HelveticaOblique,
  'sans-bi': StandardFonts.HelveticaBoldOblique,
  serif: StandardFonts.TimesRoman,
  'serif-b': StandardFonts.TimesRomanBold,
  'serif-i': StandardFonts.TimesRomanItalic,
  'serif-bi': StandardFonts.TimesRomanBoldItalic,
  mono: StandardFonts.Courier,
  'mono-b': StandardFonts.CourierBold,
}

/** Ascent as a fraction of the font size, for placing the baseline in a text box. */
const ASCENT = { sans: 0.905, serif: 0.891, mono: 0.833 }

function parseColor(css: string): { r: number; g: number; b: number; a: number } | null {
  const m = css.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
  const [r, g, b] = parts
  const a = parts.length > 3 ? parts[3] : 1
  if (a === 0 || Number.isNaN(r)) return null
  return { r: r / 255, g: g / 255, b: b / 255, a }
}

function family(css: string): 'sans' | 'serif' | 'mono' {
  const f = css.toLowerCase()
  if (/courier|mono|cousine/.test(f.split(',')[0]) || /^"?courier/.test(f)) return 'mono'
  if (/times|georgia|serif|tinos/.test(f.split(',')[0])) return 'serif'
  return 'sans'
}

export async function exportResumePdf(sheet: HTMLElement, opts: { title: string; author: string }): Promise<ResumePdfResult> {
  const doc = await PDFDocument.create()
  doc.setTitle(opts.title)
  if (opts.author) doc.setAuthor(opts.author)
  doc.setCreator('Snap Scanner Resume Builder')
  doc.setProducer(`Snap Scanner (${SITE_DOMAIN})`)

  const fonts = new Map<FontKey, PDFFont>()
  const font = async (key: FontKey) => {
    if (!fonts.has(key)) fonts.set(key, await doc.embedFont(FONT_FILES[key]))
    return fonts.get(key)!
  }

  const box = sheet.getBoundingClientRect()
  const scale = PAGE_W_PT / box.width
  // The preview may be CSS-scaled; computed lengths (font size, borders) are not.
  const k = box.width / sheet.offsetWidth
  const len = (v: string) => (parseFloat(v) || 0) * k
  const pageHpx = PAGE_H_PT / scale
  const pageCount = Math.max(1, Math.round(box.height / pageHpx))
  const pages: PDFPage[] = Array.from({ length: pageCount }, () => doc.addPage([PAGE_W_PT, PAGE_H_PT]))
  const replaced = new Set<string>()

  /** Draws a rectangle in sheet px, split across pages as needed. */
  const rect = (x: number, y: number, w: number, h: number, color: { r: number; g: number; b: number; a: number }, radius = 0) => {
    for (let p = Math.floor(y / pageHpx); p < pageCount && p * pageHpx < y + h; p++) {
      if (p < 0) continue
      const top = Math.max(y, p * pageHpx)
      const bottom = Math.min(y + h, (p + 1) * pageHpx)
      if (bottom - top < 0.3) continue
      const page = pages[p]
      const px = x * scale
      const pw = w * scale
      const ph = (bottom - top) * scale
      const py = PAGE_H_PT - (top - p * pageHpx) * scale - ph
      const r = Math.min(radius * scale, pw / 2, ph / 2)
      if (r > 0.5) {
        // Rounded rectangle as an SVG path; drawSvgPath's y axis points down from (x, y).
        const path = `M ${r} 0 H ${pw - r} A ${r} ${r} 0 0 1 ${pw} ${r} V ${ph - r} A ${r} ${r} 0 0 1 ${pw - r} ${ph} H ${r} A ${r} ${r} 0 0 1 0 ${ph - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`
        page.drawSvgPath(path, { x: px, y: py + ph, color: rgb(color.r, color.g, color.b), opacity: color.a, borderWidth: 0 })
      } else {
        page.drawRectangle({ x: px, y: py, width: pw, height: ph, color: rgb(color.r, color.g, color.b), opacity: color.a })
      }
    }
  }

  // 1. Backgrounds and borders, in document order (parents before children).
  const elements = [sheet, ...Array.from(sheet.querySelectorAll<HTMLElement>('*'))]
  for (const el of elements) {
    if (el.closest('[data-export-ignore]')) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const x = r.left - box.left
    const y = r.top - box.top
    const bg = parseColor(cs.backgroundColor)
    const radius = len(cs.borderTopLeftRadius)
    if (bg && el !== sheet) rect(x, y, r.width, r.height, bg, cs.borderTopLeftRadius.endsWith('%') ? Math.min(r.width, r.height) / 2 : radius)
    const sides: [string, number, number, number, number][] = [
      ['Top', x, y, r.width, len(cs.borderTopWidth)],
      ['Bottom', x, y + r.height - len(cs.borderBottomWidth), r.width, len(cs.borderBottomWidth)],
      ['Left', x, y, len(cs.borderLeftWidth), r.height],
      ['Right', x + r.width - len(cs.borderRightWidth), y, len(cs.borderRightWidth), r.height],
    ]
    for (const [side, sx, sy, sw, sh] of sides) {
      const width = side === 'Top' || side === 'Bottom' ? sh : sw
      if (!width || cs.getPropertyValue(`border-${side.toLowerCase()}-style`) === 'none') continue
      const c = parseColor(cs.getPropertyValue(`border-${side.toLowerCase()}-color`))
      if (c) rect(sx, sy, side === 'Top' || side === 'Bottom' ? sw : width, side === 'Top' || side === 'Bottom' ? width : sh, c)
    }
  }

  // 2. Images (the profile photo), rendered through a canvas so rounding is kept.
  for (const img of Array.from(sheet.querySelectorAll('img'))) {
    const r = img.getBoundingClientRect()
    if (!img.complete || r.width === 0) continue
    const round = img.dataset.photo === 'round'
    const res = 3
    const c = document.createElement('canvas')
    c.width = Math.round(r.width * res)
    c.height = Math.round(r.height * res)
    const ctx = c.getContext('2d')!
    const radius = round ? c.width / 2 : 8 * k * res
    ctx.beginPath()
    ctx.roundRect(0, 0, c.width, c.height, radius)
    ctx.clip()
    // object-fit: cover
    const s = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight)
    const dw = img.naturalWidth * s
    const dh = img.naturalHeight * s
    ctx.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh)
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/png'))
    if (!blob) continue
    const png = await doc.embedPng(new Uint8Array(await blob.arrayBuffer()))
    const x = r.left - box.left
    const y = r.top - box.top
    const p = Math.min(pageCount - 1, Math.floor(y / pageHpx))
    pages[p].drawImage(png, { x: x * scale, y: PAGE_H_PT - (y - p * pageHpx + r.height) * scale, width: r.width * scale, height: r.height * scale })
  }

  // 3. Text, one run per line of each text node.
  const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement
    if (!parent || !node.data.trim()) continue
    const cs = getComputedStyle(parent)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    const color = parseColor(cs.color) ?? { r: 0, g: 0, b: 0, a: 1 }
    const fam = family(cs.fontFamily)
    const bold = parseInt(cs.fontWeight) >= 600
    const italic = cs.fontStyle === 'italic'
    const key = (fam === 'mono' ? (bold ? 'mono-b' : 'mono') : `${fam}${bold && italic ? '-bi' : bold ? '-b' : italic ? '-i' : ''}`) as FontKey
    const f = await font(key)
    const sizePx = len(cs.fontSize)
    const spacing = len(cs.letterSpacing)
    const upper = cs.textTransform === 'uppercase'
    const charset = new Set(f.getCharacterSet())

    const encodable = (text: string) =>
      Array.from(text)
        .map((ch) => {
          if (charset.has(ch.codePointAt(0)!)) return ch
          const plain = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '')
          if (plain && Array.from(plain).every((c) => charset.has(c.codePointAt(0)!))) return plain
          replaced.add(ch)
          return '?'
        })
        .join('')

    // Measure each word; group words sharing a line into runs.
    const words: { text: string; left: number; right: number; top: number; bottom: number }[] = []
    const re = /\S+/g
    for (let m = re.exec(node.data); m; m = re.exec(node.data)) {
      range.setStart(node, m.index)
      range.setEnd(node, m.index + m[0].length)
      const rects = range.getClientRects()
      if (!rects.length) continue
      const first = rects[0]
      const last = rects[rects.length - 1]
      words.push({ text: m[0], left: first.left - box.left, right: last.right - box.left, top: first.top - box.top, bottom: first.bottom - box.top })
    }
    const lines: (typeof words)[] = []
    for (const w of words) {
      const line = lines[lines.length - 1]
      if (line && Math.abs(line[0].top - w.top) < sizePx * 0.5) line.push(w)
      else lines.push([w])
    }

    for (const line of lines) {
      let text = line.map((w) => w.text).join(' ')
      if (upper) text = text.toUpperCase()
      text = encodable(text)
      const top = line[0].top
      const p = Math.min(pageCount - 1, Math.max(0, Math.floor(top / pageHpx)))
      const page = pages[p]
      const measured = (line[line.length - 1].right - line[0].left) * scale
      let size = sizePx * scale
      const x = line[0].left * scale
      const lineHeightPx = line[0].bottom - line[0].top
      // Centre the font's ascent+descent box within the measured text box.
      const contentPx = sizePx * (ASCENT[fam] + (fam === 'mono' ? 0.3 : 0.215))
      const baselinePx = top + (lineHeightPx - contentPx) / 2 + sizePx * ASCENT[fam]
      const y = PAGE_H_PT - (baselinePx - p * pageHpx) * scale
      const opts = { font: f, color: rgb(color.r, color.g, color.b), opacity: color.a }

      if (spacing > 0.2) {
        // Letter-spaced text: place each character.
        let cx = x
        for (const ch of Array.from(text)) {
          page.drawText(ch, { ...opts, x: cx, y, size })
          cx += f.widthOfTextAtSize(ch, size) + spacing * scale
        }
        continue
      }
      const natural = f.widthOfTextAtSize(text, size)
      // Never let a run overflow its on-screen width (fallback fonts can be wider).
      if (natural > measured * 1.01 && measured > 0) size *= measured / natural
      page.drawText(text, { ...opts, x, y, size })
    }
  }

  const bytes = await doc.save({ useObjectStreams: true })
  return { bytes, pages: pageCount, replaced: [...replaced] }
}
