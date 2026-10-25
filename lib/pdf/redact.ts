// Permanent redaction. Drawing a black box over text leaves the text in the
// file, so instead every page with a redaction is replaced by a flattened
// image of that page with the boxes burned in: its original text, fonts,
// vector content, links and annotations are removed. Pages without
// redactions are copied unchanged. The new document starts empty, so the
// original's metadata, bookmarks, attachments and scripts are not carried over.
import { PDFDocument } from '@cantoo/pdf-lib'
import { savePdf, type Bytes, type NormRect } from './document'
import { PdfJobError, type NamedPdf } from './operations'
import { openPdf } from './document'

export interface RasterPage {
  /** 0-based page index. */
  page: number
  image: Bytes
  type: 'png' | 'jpeg'
  /** Displayed page size in points (after /Rotate). */
  width: number
  height: number
}

export interface RedactionMark {
  page: number
  rect: NormRect
}

export async function buildRedactedPdf(input: NamedPdf, rasters: RasterPage[]): Promise<Bytes> {
  if (!rasters.length) throw new PdfJobError('Mark at least one area to redact.')
  let src: PDFDocument
  try {
    src = await openPdf(input.bytes, input.password)
  } catch {
    throw new PdfJobError(`“${input.name}” couldn’t be opened.`)
  }
  const byPage = new Map(rasters.map((r) => [r.page, r]))
  const out = await PDFDocument.create()
  for (let i = 0; i < src.getPageCount(); i++) {
    const r = byPage.get(i)
    if (!r) {
      const [copy] = await out.copyPages(src, [i])
      out.addPage(copy)
      continue
    }
    const img = r.type === 'png' ? await out.embedPng(r.image) : await out.embedJpg(r.image)
    const page = out.addPage([r.width, r.height])
    page.drawImage(img, { x: 0, y: 0, width: r.width, height: r.height })
  }
  out.setTitle('')
  return savePdf(out)
}

/** Pixel rectangles to paint for a page rendered at `width` × `height`, padded by `pad` px. */
export function marksToPixels(marks: RedactionMark[], page: number, width: number, height: number, pad = 2) {
  return marks
    .filter((m) => m.page === page)
    .map((m) => ({
      x: Math.max(0, Math.floor(m.rect.x * width) - pad),
      y: Math.max(0, Math.floor(m.rect.y * height) - pad),
      w: Math.min(width, Math.ceil((m.rect.x + m.rect.w) * width) + pad) - Math.max(0, Math.floor(m.rect.x * width) - pad),
      h: Math.min(height, Math.ceil((m.rect.y + m.rect.h) * height) + pad) - Math.max(0, Math.floor(m.rect.y * height) - pad),
    }))
}
