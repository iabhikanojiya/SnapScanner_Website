// Loading, saving and geometry helpers shared by the PDF operations. Runs in
// the browser and in Node (unit tests); nothing here touches the DOM.
import {
  EncryptedPDFError,
  degrees,
  rgb,
  type PDFFont,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFRef,
  PDFStream,
  type PDFContext,
  type PDFPage,
  type PDFObject,
} from '@cantoo/pdf-lib'
import { SITE_DOMAIN } from '@/lib/site'

export class PdfPasswordError extends Error {
  constructor(readonly reason: 'required' | 'incorrect') {
    super(reason === 'required' ? 'This PDF is password-protected.' : 'That password is incorrect.')
    this.name = 'PdfPasswordError'
  }
}

export class PdfInvalidError extends Error {
  constructor(message = 'This file isn’t a valid PDF or is damaged.') {
    super(message)
    this.name = 'PdfInvalidError'
  }
}

export type Bytes = Uint8Array

/**
 * Opens a PDF for editing. Throws PdfPasswordError if it's encrypted and no (or
 * a wrong) password is given, and PdfInvalidError if it can't be parsed.
 */
export async function openPdf(bytes: Bytes, password?: string): Promise<PDFDocument> {
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(bytes, {
      password: password || undefined,
      updateMetadata: false,
      throwOnInvalidObject: false,
    })
  } catch (e) {
    if (e instanceof EncryptedPDFError) throw new PdfPasswordError('required')
    if (e instanceof Error && /password/i.test(e.message)) throw new PdfPasswordError(password ? 'incorrect' : 'required')
    throw new PdfInvalidError()
  }
  let pageCount: number
  try {
    // A file with a PDF header but no usable catalog parses, then fails here.
    pageCount = doc.getPageCount()
  } catch {
    throw new PdfInvalidError()
  }
  if (pageCount === 0) throw new PdfInvalidError('This PDF has no pages.')
  return doc
}

/** Saves with object streams (smaller files) and a fresh Producer entry. */
export async function savePdf(doc: PDFDocument): Promise<Bytes> {
  doc.setProducer(`Snap Scanner (${SITE_DOMAIN})`)
  doc.setModificationDate(new Date())
  return doc.save({ useObjectStreams: true })
}

/**
 * Deletes indirect objects not reachable from the trailer, such as superseded
 * revisions left by incremental updates or a removed /Encrypt dictionary.
 */
export function removeUnreachableObjects(context: PDFContext, keepEncrypt = false): number {
  const reachable = new Set<string>()
  const queue: PDFObject[] = []
  const info = context.trailerInfo
  for (const root of [info.Root, info.Info, keepEncrypt ? info.Encrypt : undefined]) if (root) queue.push(root)

  while (queue.length) {
    const obj = queue.pop()!
    if (obj instanceof PDFRef) {
      const key = obj.toString()
      if (reachable.has(key)) continue
      reachable.add(key)
      const target = context.lookup(obj)
      if (target) queue.push(target)
    } else if (obj instanceof PDFDict) {
      for (const [, value] of obj.entries()) queue.push(value)
    } else if (obj instanceof PDFStream) {
      queue.push(obj.dict)
    } else if (obj instanceof PDFArray) {
      for (let i = 0; i < obj.size(); i++) queue.push(obj.get(i))
    }
  }

  let removed = 0
  for (const [ref] of context.enumerateIndirectObjects()) {
    if (!reachable.has(ref.toString())) {
      context.delete(ref)
      removed++
    }
  }
  return removed
}

// ---------------------------------------------------------------------------
// Geometry. The UI works in "display" coordinates normalized to 0..1 from the
// top-left of the page as a viewer shows it (after the page's /Rotate). PDF
// drawing uses user space: points from the bottom-left of the unrotated page.

export interface NormRect {
  x: number
  y: number
  w: number
  h: number
}

export interface PageGeometry {
  /** Crop box origin and size in user space. */
  x0: number
  y0: number
  width: number
  height: number
  /** The page's /Rotate, normalized to 0, 90, 180 or 270. */
  rotate: 0 | 90 | 180 | 270
  /** Size as displayed (width and height swap for 90 and 270). */
  displayWidth: number
  displayHeight: number
}

export function normalizeRotation(angle: number): 0 | 90 | 180 | 270 {
  const r = ((Math.round(angle / 90) * 90) % 360 + 360) % 360
  return r as 0 | 90 | 180 | 270
}

export function pageGeometry(page: PDFPage): PageGeometry {
  const box = page.getCropBox()
  const rotate = normalizeRotation(page.getRotation().angle)
  const swap = rotate === 90 || rotate === 270
  return {
    x0: box.x,
    y0: box.y,
    width: box.width,
    height: box.height,
    rotate,
    displayWidth: swap ? box.height : box.width,
    displayHeight: swap ? box.width : box.height,
  }
}

/** Converts a normalized display point to PDF user space. */
export function displayToUser(g: PageGeometry, nx: number, ny: number): { x: number; y: number } {
  const u = nx * g.displayWidth
  const v = ny * g.displayHeight
  switch (g.rotate) {
    case 0:
      return { x: g.x0 + u, y: g.y0 + g.height - v }
    case 90:
      return { x: g.x0 + v, y: g.y0 + u }
    case 180:
      return { x: g.x0 + g.width - u, y: g.y0 + v }
    case 270:
      return { x: g.x0 + g.width - v, y: g.y0 + g.height - u }
  }
}

/** Converts a normalized display rectangle to an axis-aligned user-space rectangle. */
export function displayRectToUser(g: PageGeometry, r: NormRect) {
  const a = displayToUser(g, r.x, r.y)
  const b = displayToUser(g, r.x + r.w, r.y + r.h)
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  }
}

/**
 * Where to anchor an image (its bottom-left corner) and how to rotate it so it
 * appears upright in the given display rectangle.
 */
export function uprightImagePlacement(g: PageGeometry, r: NormRect) {
  const anchor = displayToUser(g, r.x, r.y + r.h)
  return {
    x: anchor.x,
    y: anchor.y,
    width: r.w * g.displayWidth,
    height: r.h * g.displayHeight,
    rotate: g.rotate,
  }
}

/**
 * Maps a point normalized to a view rotated clockwise by `viewRotation`
 * (in addition to the page's own rotation) back to the page's display space.
 */
export function unrotateView(nx: number, ny: number, viewRotation: number): { x: number; y: number } {
  switch (normalizeRotation(viewRotation)) {
    case 0:
      return { x: nx, y: ny }
    case 90:
      return { x: ny, y: 1 - nx }
    case 180:
      return { x: 1 - nx, y: 1 - ny }
    case 270:
      return { x: 1 - ny, y: nx }
  }
}

/**
 * Draws `text` so that, as displayed (after the page's /Rotate), it reads
 * horizontally and its box is anchored at the given display point.
 */
export function drawDisplayText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  opts: { nx: number; ny: number; align: 'left' | 'center' | 'right'; valign: 'top' | 'middle' | 'baseline'; size: number; color: [number, number, number]; opacity?: number; rotate?: number }
) {
  const g = pageGeometry(page)
  const width = font.widthOfTextAtSize(text, opts.size)
  const ascent = font.heightAtSize(opts.size, { descender: false })
  // Offset from the anchor to the baseline origin, in the text's own frame.
  const dx = opts.align === 'left' ? 0 : opts.align === 'center' ? -width / 2 : -width
  const dy = opts.valign === 'top' ? -ascent : opts.valign === 'middle' ? -ascent / 2 : 0
  // Total angle in user space: the page's rotation plus the requested one (both make it read correctly on screen).
  const angle = ((g.rotate + (opts.rotate ?? 0)) * Math.PI) / 180
  const anchor = displayToUser(g, opts.nx, opts.ny)
  const x = anchor.x + dx * Math.cos(angle) - dy * Math.sin(angle)
  const y = anchor.y + dx * Math.sin(angle) + dy * Math.cos(angle)
  page.drawText(text, { x, y, size: opts.size, font, color: rgb(...opts.color), opacity: opts.opacity ?? 1, rotate: degrees(g.rotate + (opts.rotate ?? 0)) })
}

