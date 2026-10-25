// Edit PDF: the edit model, text layout and export. An edit is a box on a page
// that can cover what's underneath with a solid colour ("cover") and/or hold
// new text. Covering is visual: the original content stays in the file under
// the cover. Boxes are stored in normalized display coordinates (0..1 from the
// top-left of the page as shown, after its /Rotate), so zooming never changes
// where they land in the PDF.
//
// Text is laid out with the metrics of the PDF standard fonts (Helvetica,
// Times, Courier), the same fonts the export embeds, so line breaks in the
// preview and in the saved PDF are identical.
import { rgb, type PDFFont } from '@cantoo/pdf-lib'
import { hasUnsupportedChars, hexToRgb, measure, standardFontFor, wrap, type FontFamily } from '@/lib/create/engine'
import { displayRectToUser, drawDisplayText, pageGeometry, savePdf, type Bytes, type NormRect } from './document'
import { PdfJobError, openNamed, type NamedPdf } from './operations'

export interface TextStyle {
  font: FontFamily
  /** Font size in points. */
  size: number
  bold: boolean
  italic: boolean
  /** #RRGGBB */
  color: string
  align: 'left' | 'center' | 'right'
  /** Line height as a multiple of the font size. */
  lineHeight: number
}

export interface EditBox {
  id: string
  /** 0-based page index. */
  page: number
  rect: NormRect
  /** Cover colour (#RRGGBB) painted under the text, or null for no cover. */
  fill: string | null
  text: string
  style: TextStyle
}

export const DEFAULT_STYLE: TextStyle = { font: 'sans', size: 12, bold: false, italic: false, color: '#111827', align: 'left', lineHeight: 1.25 }

/** Inner padding between the box edge and the text, in points. */
export const TEXT_PAD = 2
/** Baseline of the first line below the top padding, as a multiple of the size. */
const ASCENT = 0.8
const DESCENT = 0.22

export interface LaidOutLine {
  text: string
  /** From the box's left edge, in points. */
  x: number
  /** Baseline from the box's top edge, in points. */
  baseline: number
}

export interface TextLayout {
  lines: LaidOutLine[]
  /** The text is taller than the box. */
  overflow: boolean
  /** Some characters can't be drawn with the standard fonts. */
  unsupported: boolean
}

/** Lays out a box's text for a page displayed `pageW` × `pageH` points. */
export function layoutText(box: Pick<EditBox, 'rect' | 'text' | 'style'>, pageW: number, pageH: number): TextLayout {
  const s = box.style
  const boxW = box.rect.w * pageW
  const boxH = box.rect.h * pageH
  const maxW = Math.max(1, boxW - TEXT_PAD * 2)
  const raw = box.text.replace(/\r\n?/g, '\n')
  const wrapped = raw.trim() ? wrap(raw, maxW, s.size, s.font, s.bold, s.italic) : []
  const lh = s.size * s.lineHeight
  const lines = wrapped.map((text, i) => {
    const w = measure(text, s.size, s.font, s.bold, s.italic)
    const x = s.align === 'left' ? TEXT_PAD : s.align === 'center' ? (boxW - w) / 2 : boxW - TEXT_PAD - w
    return { text, x, baseline: TEXT_PAD + s.size * ASCENT + i * lh }
  })
  const bottom = lines.length ? lines[lines.length - 1].baseline + s.size * DESCENT + TEXT_PAD : 0
  return { lines, overflow: bottom > boxH + 0.5, unsupported: hasUnsupportedChars(raw) }
}

/** Box height (as a fraction of the page) that fits the text exactly. */
export function fittedHeight(box: Pick<EditBox, 'rect' | 'text' | 'style'>, pageW: number, pageH: number) {
  const n = Math.max(1, layoutText(box, pageW, pageH).lines.length)
  const s = box.style
  return (TEXT_PAD * 2 + s.size * ASCENT + (n - 1) * s.size * s.lineHeight + s.size * DESCENT) / pageH
}

const colour = (hex: string) => {
  const [r, g, b] = hexToRgb(hex)
  return rgb(r / 255, g / 255, b / 255)
}

/**
 * Writes the edits into a copy of the PDF: each box's cover rectangle, then its
 * text, on the right page. Original pages, their order, sizes and rotation are
 * kept, and everything else in the file is left as it was.
 */
export async function applyTextEdits(input: NamedPdf, boxes: EditBox[]): Promise<Bytes> {
  const active = boxes.filter((b) => b.fill || b.text.trim())
  if (!active.length) throw new PdfJobError('There’s nothing to save yet. Add text or cover an area first.')
  const doc = await openNamed(input)
  const pages = doc.getPages()
  const fonts = new Map<string, PDFFont>()
  const font = async (s: TextStyle) => {
    const key = `${s.font}-${s.bold}-${s.italic}`
    if (!fonts.has(key)) fonts.set(key, await doc.embedFont(standardFontFor(s.font, s.bold, s.italic)))
    return fonts.get(key)!
  }
  for (const box of active) {
    const page = pages[box.page]
    if (!page) throw new PdfJobError(`Page ${box.page + 1} doesn’t exist in this PDF.`)
    const g = pageGeometry(page)
    if (box.fill) page.drawRectangle({ ...displayRectToUser(g, box.rect), color: colour(box.fill) })
    if (!box.text.trim()) continue
    const f = await font(box.style)
    const layout = layoutText(box, g.displayWidth, g.displayHeight)
    for (const line of layout.lines) {
      if (!line.text.trim()) continue
      drawDisplayText(page, f, line.text, {
        nx: box.rect.x + line.x / g.displayWidth,
        ny: box.rect.y + line.baseline / g.displayHeight,
        align: 'left',
        valign: 'baseline',
        size: box.style.size,
        color: hexToRgb(box.style.color).map((v) => v / 255) as [number, number, number],
      })
    }
  }
  return savePdf(doc)
}

/** A run of text found on a page, for "click to replace". */
export interface DetectedText {
  str: string
  rect: NormRect
  /** Approximate font size in points. */
  size: number
  font: FontFamily
}

/** Maps pdf.js's generic font family names to the standard fonts. */
export function familyFor(fontFamily: string | undefined, fontName = ''): FontFamily {
  const s = `${fontFamily ?? ''} ${fontName}`.toLowerCase()
  if (/mono|courier|consol/.test(s)) return 'mono'
  if (/serif|times|georgia|garamond|minion|cambria/.test(s) && !/sans/.test(s)) return 'serif'
  return 'sans'
}
