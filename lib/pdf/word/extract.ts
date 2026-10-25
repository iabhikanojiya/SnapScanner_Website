// Reads positioned text (with bold, italic, size and font) and placed images
// from a PDF page with pdf.js, for PDF to Word. The pdf.js module is passed in
// so the same code runs in the browser and in unit tests.
import type { PDFPageProxy } from 'pdfjs-dist'
import type { TextItem as PdfjsTextItem } from 'pdfjs-dist/types/src/display/api'
import type { Family, PageImage, PageInput, TextItem } from './analyze'

type PdfJs = Pick<typeof import('pdfjs-dist'), 'OPS' | 'Util'>

/** Decoded image data as pdf.js hands it over (an ImageBitmap or raw pixels). */
export interface PdfjsImage {
  width: number
  height: number
  kind?: number
  data?: Uint8Array | Uint8ClampedArray
  bitmap?: ImageBitmap
}

/** Encodes a decoded image for the Word file, or returns null to leave it out. */
export type ImageEncoder = (img: PdfjsImage) => Promise<{ data: Uint8Array; type: 'png' | 'jpg' } | null>

export interface ExtractedPage {
  input: PageInput
  /** Non-whitespace characters in the text layer. */
  textChars: number
  /** Share of the page covered by images (0–1). */
  imageCoverage: number
  rotatedItems: number
  /** Images that couldn't be read or were too small to matter. */
  skippedImages: number
}

/** Fonts Word users are likely to have; other names fall back to a generic family. */
const KNOWN_FONTS = [
  'Arial Narrow', 'Arial Black', 'Arial', 'Times New Roman', 'Calibri Light', 'Calibri', 'Cambria', 'Georgia', 'Verdana', 'Tahoma',
  'Garamond', 'Courier New', 'Segoe UI', 'Trebuchet MS', 'Book Antiqua', 'Palatino Linotype', 'Century Gothic', 'Century', 'Candara', 'Consolas',
  'Constantia', 'Corbel', 'Franklin Gothic', 'Gill Sans', 'Lucida Sans', 'Open Sans', 'Roboto', 'Lato', 'Montserrat', 'Noto Sans', 'Noto Serif', 'Source Sans Pro', 'Aptos',
]

/** PDF's standard fonts, which Windows doesn't have, under the names Word uses. */
const ALIASES: Record<string, string> = { helvetica: 'Arial', times: 'Times New Roman', 'times roman': 'Times New Roman', courier: 'Courier New' }

/** Turns a PostScript font name ("ABCDEF+TimesNewRomanPS-BoldMT") into a Word font name. */
export function wordFontName(psName: string | undefined): string | undefined {
  if (!psName) return undefined
  const base = psName
    .replace(/^[A-Z]{6}\+/, '')
    .split(/[-,]/)[0]
    .replace(/(PSMT|PS|MT)$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  const lower = base.toLowerCase()
  if (ALIASES[lower]) return ALIASES[lower]
  return KNOWN_FONTS.find((f) => lower === f.toLowerCase() || lower.startsWith(`${f.toLowerCase()} `))
}

function familyOf(fallback: string | undefined, name: string): Family {
  if (/courier|mono|consol/i.test(name) || fallback === 'monospace') return 'mono'
  if (/sans/i.test(name)) return 'sans'
  if (/times|georgia|garamond|cambria|serif|roman|book|palatino|century(?! gothic)|minion|constantia/i.test(name) || fallback === 'serif') return 'serif'
  return 'sans'
}

interface FontLike {
  name?: string
  bold?: boolean
  italic?: boolean
}

function fontOf(page: PDFPageProxy, id: string): FontLike | null {
  try {
    return page.commonObjs.has(id) ? (page.commonObjs.get(id) as FontLike) : null
  } catch {
    return null
  }
}

function objectOf(page: PDFPageProxy, id: string): Promise<PdfjsImage | null> {
  const store = id.startsWith('g_') ? page.commonObjs : page.objs
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000)
    try {
      store.get(id, (obj: unknown) => {
        clearTimeout(timer)
        resolve((obj as PdfjsImage) ?? null)
      })
    } catch {
      clearTimeout(timer)
      resolve(null)
    }
  })
}

type Matrix = number[]

export async function extractPage(lib: PdfJs, page: PDFPageProxy, opts: { images: boolean; encode: ImageEncoder; maxImages: number }): Promise<ExtractedPage> {
  const viewport = page.getViewport({ scale: 1 })
  const vt = viewport.transform
  // The operator list loads the page's fonts (for bold/italic and names) and images.
  const ops = await page.getOperatorList()
  const tc = await page.getTextContent()

  const items: TextItem[] = []
  const rotated: TextItem[] = []
  for (const raw of tc.items) {
    if (!('str' in raw)) continue
    const it = raw as PdfjsTextItem
    if (!it.str || !it.str.trim()) continue
    const m = lib.Util.transform(vt, it.transform)
    const size = Math.hypot(m[2], m[3])
    if (!(size > 0.5)) continue
    const font = fontOf(page, it.fontName)
    const name = font?.name ?? ''
    const ti: TextItem = {
      text: it.str,
      x: m[4],
      y: m[5],
      w: Math.abs(it.width) * (Math.hypot(m[0], m[1]) / Math.max(1e-6, Math.hypot(it.transform[0], it.transform[1]))) || it.str.length * size * 0.5,
      size,
      bold: !!font?.bold || /bold|black|heavy|semibold|demi/i.test(name),
      italic: !!font?.italic || /italic|oblique/i.test(name),
      family: familyOf(tc.styles[it.fontName]?.fontFamily, name),
      font: wordFontName(name),
    }
    if (Math.abs(Math.atan2(m[1], m[0])) > 0.05) rotated.push(ti)
    else items.push(ti)
  }
  // Rotated or vertical text keeps its words but goes after the page's other text.
  if (rotated.length) {
    let y = Math.max(0, ...items.map((i) => i.y)) + 24
    const x = items.length ? Math.min(...items.map((i) => i.x)) : 72
    for (const r of rotated) {
      items.push({ ...r, x, y, w: r.text.length * r.size * 0.5 })
      y += r.size * 1.3
    }
  }

  const images: PageImage[] = []
  let coverage = 0
  let skipped = 0
  const pageArea = viewport.width * viewport.height
  const placements: { obj: Promise<PdfjsImage | null>; m: Matrix }[] = []
  let ctm: Matrix = [1, 0, 0, 1, 0, 0]
  const stack: Matrix[] = []
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i]
    const args = ops.argsArray[i]
    switch (fn) {
      case lib.OPS.save:
      case lib.OPS.beginGroup:
        stack.push(ctm)
        break
      case lib.OPS.restore:
      case lib.OPS.endGroup:
      case lib.OPS.paintFormXObjectEnd:
        ctm = stack.pop() ?? ctm
        break
      case lib.OPS.transform:
        ctm = lib.Util.transform(ctm, args as Matrix)
        break
      case lib.OPS.paintFormXObjectBegin:
        stack.push(ctm)
        if (Array.isArray(args[0])) ctm = lib.Util.transform(ctm, args[0] as Matrix)
        break
      case lib.OPS.paintImageXObject:
        placements.push({ obj: objectOf(page, args[0] as string), m: lib.Util.transform(vt, ctm) })
        break
      case lib.OPS.paintInlineImageXObject:
        placements.push({ obj: Promise.resolve(args[0] as PdfjsImage), m: lib.Util.transform(vt, ctm) })
        break
    }
  }
  for (const { obj, m } of placements) {
    // The image fills the unit square under the current transform.
    const xs = [m[4], m[0] + m[4], m[2] + m[4], m[0] + m[2] + m[4]]
    const ys = [m[5], m[1] + m[5], m[3] + m[5], m[1] + m[3] + m[5]]
    const x = Math.max(0, Math.min(...xs))
    const y = Math.max(0, Math.min(...ys))
    const w = Math.min(viewport.width, Math.max(...xs)) - x
    const h = Math.min(viewport.height, Math.max(...ys)) - y
    if (w < 8 || h < 8) {
      skipped++
      continue
    }
    coverage += (w * h) / pageArea
    if (!opts.images || images.length >= opts.maxImages) {
      skipped++
      continue
    }
    const img = await obj
    const encoded = img ? await opts.encode(img).catch(() => null) : null
    if (!encoded) {
      skipped++
      continue
    }
    images.push({ x, y, w, h, ...encoded })
  }

  return {
    input: { width: viewport.width, height: viewport.height, items, images },
    textChars: items.reduce((n, it) => n + it.text.replace(/\s/g, '').length, 0),
    imageCoverage: Math.min(1, coverage),
    rotatedItems: rotated.length,
    skippedImages: skipped,
  }
}

/** Builds text items from OCR words (positions normalised to 0–1), grouping words into lines. */
export function ocrItems(words: { text: string; x0: number; y0: number; x1: number; y1: number }[], width: number, height: number): TextItem[] {
  const boxes = words
    .filter((w) => w.text.trim())
    .map((w) => ({ text: w.text, x: w.x0 * width, top: w.y0 * height, bottom: w.y1 * height, w: (w.x1 - w.x0) * width }))
    .sort((a, b) => a.top - b.top || a.x - b.x)
  const lines: (typeof boxes)[] = []
  for (const b of boxes) {
    const mid = (b.top + b.bottom) / 2
    const line = lines.find((l) => {
      const top = Math.min(...l.map((x) => x.top))
      const bottom = Math.max(...l.map((x) => x.bottom))
      return mid > top && mid < bottom
    })
    if (line) line.push(b)
    else lines.push([b])
  }
  return lines.flatMap((l) => {
    const heights = l.map((b) => b.bottom - b.top).sort((a, b) => a - b)
    const size = Math.max(4, heights[Math.floor(heights.length * 0.75)] * 0.95)
    const bottoms = l.map((b) => b.bottom).sort((a, b) => a - b)
    const baseline = bottoms[Math.floor(bottoms.length / 2)] - size * 0.08
    return l.map((b) => ({ text: b.text, x: b.x, y: baseline, w: b.w, size, bold: false, italic: false, family: 'sans' as Family }))
  })
}
