// Adds OCR results to a PDF as an invisible, selectable text layer
// (text rendering mode 3), aligned to each recognized word's position.
import {
  PDFDocument,
  StandardFonts,
  TextRenderingMode,
  beginText,
  endText,
  popGraphicsState,
  pushGraphicsState,
  setCharacterSqueeze,
  setFontAndSize,
  setTextMatrix,
  setTextRenderingMode,
  showText,
} from '@cantoo/pdf-lib'
import { pageGeometry, displayToUser, savePdf, type Bytes } from './document'
import { PdfJobError, type NamedPdf } from './operations'
import { openPdf } from './document'

export interface OcrWord {
  text: string
  /** Bounding box normalized to the displayed page (0..1 from top-left). */
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface OcrPage {
  words: OcrWord[]
}

export interface OcrLayerResult {
  bytes: Bytes
  wordsAdded: number
  /** Words left out because the PDF's standard font can't encode them (e.g. non-Latin scripts). */
  wordsSkipped: number
}

export async function addOcrTextLayer(input: NamedPdf, pages: OcrPage[]): Promise<OcrLayerResult> {
  let doc: PDFDocument
  try {
    doc = await openPdf(input.bytes, input.password)
  } catch {
    throw new PdfJobError(`“${input.name}” couldn’t be opened to add the text layer.`)
  }
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const charset = new Set(font.getCharacterSet())
  const pdfPages = doc.getPages()
  let added = 0
  let skipped = 0
  pages.forEach((ocr, pi) => {
    const page = pdfPages[pi]
    if (!page || !ocr.words.length) return
    const g = pageGeometry(page)
    const fontName = page.node.newFontDictionary('SnapOcr', font.ref)
    const ops = [pushGraphicsState(), beginText(), setTextRenderingMode(TextRenderingMode.Invisible)]
    for (const w of ocr.words) {
      const text = w.text.trim()
      if (!text) continue
      if (!Array.from(text).every((c) => charset.has(c.codePointAt(0)!))) {
        skipped++
        continue
      }
      const heightPt = (w.y1 - w.y0) * g.displayHeight
      const widthPt = (w.x1 - w.x0) * g.displayWidth
      if (heightPt <= 0 || widthPt <= 0) continue
      const size = heightPt * 0.9
      const natural = font.widthOfTextAtSize(text, size)
      // Bottom-left of the word box (baseline approximation) in user space.
      const origin = displayToUser(g, w.x0, w.y1 - (w.y1 - w.y0) * 0.15)
      const t = (g.rotate * Math.PI) / 180
      const cos = Math.cos(t)
      const sin = Math.sin(t)
      ops.push(
        setFontAndSize(fontName, size),
        // Horizontal scaling stretches the word to the recognized width.
        setCharacterSqueeze(natural > 0 ? (widthPt / natural) * 100 : 100),
        setTextMatrix(cos, sin, -sin, cos, origin.x, origin.y),
        showText(font.encodeText(text))
      )
      added++
    }
    ops.push(endText(), popGraphicsState())
    page.pushOperators(...ops)
  })
  return { bytes: await savePdf(doc), wordsAdded: added, wordsSkipped: skipped }
}
