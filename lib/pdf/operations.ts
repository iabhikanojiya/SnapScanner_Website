// The PDF tools' processing. Every function takes and returns bytes and runs
// entirely in the browser (or Node, for tests). Nothing is uploaded.
import {
  BlendMode,
  StandardFonts,
  type PDFFont,
  LineCapStyle,
  LineJoinStyle,
  PDFDocument,
  PDFName,
  PDFNumber,
  degrees,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setGraphicsState,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingRgbColor,
  stroke,
} from '@cantoo/pdf-lib'
import {
  PdfInvalidError,
  PdfPasswordError,
  displayRectToUser,
  displayToUser,
  drawDisplayText,
  openPdf,
  pageGeometry,
  removeUnreachableObjects,
  savePdf,
  uprightImagePlacement,
  type Bytes,
  type NormRect,
} from './document'

export type Progress = (done: number, total: number) => void

export interface NamedPdf {
  name: string
  bytes: Bytes
  password?: string
}

export class PdfJobError extends Error {
  constructor(
    message: string,
    readonly fileName?: string
  ) {
    super(message)
    this.name = 'PdfJobError'
  }
}

/** Opens a PDF and rewrites password/parse errors to name the file. */
export async function openNamed(input: NamedPdf) {
  try {
    return await openPdf(input.bytes, input.password)
  } catch (e) {
    if (e instanceof PdfPasswordError)
      throw new PdfJobError(
        e.reason === 'required'
          ? `“${input.name}” is password-protected. Unlock it first, then try again.`
          : `The password for “${input.name}” is incorrect.`,
        input.name
      )
    if (e instanceof PdfInvalidError) throw new PdfJobError(`“${input.name}”: ${e.message}`, input.name)
    throw e
  }
}

// ---------------------------------------------------------------------------
// Merge

export async function mergePdfs(inputs: NamedPdf[], onProgress?: Progress): Promise<Bytes> {
  if (inputs.length < 2) throw new PdfJobError('Add at least two PDFs to merge.')
  const out = await PDFDocument.create()
  for (let i = 0; i < inputs.length; i++) {
    const src = await openNamed(inputs[i])
    const pages = await out.copyPages(src, src.getPageIndices())
    for (const page of pages) out.addPage(page)
    onProgress?.(i + 1, inputs.length)
  }
  out.setTitle(inputs[0].name.replace(/\.pdf$/i, ''))
  return savePdf(out)
}

// ---------------------------------------------------------------------------
// Split / extract

/** Creates one PDF per group of 0-based page indexes. */
export async function splitPdf(input: NamedPdf, groups: number[][], onProgress?: Progress): Promise<Bytes[]> {
  if (groups.length === 0) throw new PdfJobError('Choose at least one page.')
  const src = await openNamed(input)
  const count = src.getPageCount()
  const results: Bytes[] = []
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    if (group.length === 0) throw new PdfJobError('A range has no pages.')
    for (const p of group) if (p < 0 || p >= count) throw new PdfJobError(`Page ${p + 1} doesn’t exist.`)
    const out = await PDFDocument.create()
    const pages = await out.copyPages(src, group)
    for (const page of pages) out.addPage(page)
    results.push(await savePdf(out))
    onProgress?.(i + 1, groups.length)
  }
  return results
}

// ---------------------------------------------------------------------------
// Lock / unlock

export const MIN_PASSWORD_LENGTH = 4

/** Encrypts with AES-256 (PDF 2.0 standard security handler, /V 5 /R 6). */
export async function lockPdf(input: NamedPdf, password: string): Promise<Bytes> {
  if (password.length < MIN_PASSWORD_LENGTH)
    throw new PdfJobError(`Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`)
  const doc = await openNamed(input)
  // Owner and user password are the same: anyone with the password gets full
  // access, and nobody can open the file without it.
  doc.encrypt({
    userPassword: password,
    ownerPassword: password,
    algorithm: 'AES-256',
    permissions: {
      printing: 'highResolution',
      modifying: true,
      copying: true,
      annotating: true,
      fillingForms: true,
      contentAccessibility: true,
      documentAssembly: true,
    },
  })
  return savePdf(doc)
}

/** Returns true if the PDF has an /Encrypt dictionary. */
export async function isEncrypted(bytes: Bytes): Promise<boolean> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
    return doc.isEncrypted
  } catch {
    return false
  }
}

/**
 * Decrypts with the supplied password and saves an unencrypted copy. Throws
 * PdfJobError if the password is wrong or the file isn't encrypted.
 */
export async function unlockPdf(input: NamedPdf): Promise<Bytes> {
  if (!(await isEncrypted(input.bytes))) throw new PdfJobError(`“${input.name}” isn’t password-protected.`)
  if (!input.password) throw new PdfJobError('Enter the PDF’s password.')
  const doc = await openNamed(input)
  // Drop the old /Encrypt dictionary and the superseded cross-reference data
  // that still points at it.
  removeUnreachableObjects(doc.context)
  return savePdf(doc)
}

// ---------------------------------------------------------------------------
// Images to PDF

export type PageSizeOption = 'a4' | 'letter' | 'fit'
export type OrientationOption = 'auto' | 'portrait' | 'landscape'

export const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
} as const

export const MARGINS = { none: 0, small: 18, large: 36 } as const
export type MarginOption = keyof typeof MARGINS

export interface PdfImage {
  bytes: Bytes
  type: 'jpeg' | 'png'
  width: number
  height: number
}

export interface ImagesToPdfOptions {
  pageSize: PageSizeOption
  orientation: OrientationOption
  margin: MarginOption
  title?: string
}

/** Points per CSS pixel: images are placed at 96 dpi on "fit" pages. */
const PX_TO_PT = 0.75
/** PDF viewers' maximum page dimension (200 in). */
const MAX_PAGE_PT = 14400

export function pageBoxFor(img: { width: number; height: number }, opts: ImagesToPdfOptions) {
  const margin = MARGINS[opts.margin]
  if (opts.pageSize === 'fit') {
    let w = img.width * PX_TO_PT
    let h = img.height * PX_TO_PT
    const scale = Math.min(1, (MAX_PAGE_PT - 2 * margin) / Math.max(w, h))
    w *= scale
    h *= scale
    return { pageWidth: w + 2 * margin, pageHeight: h + 2 * margin, x: margin, y: margin, width: w, height: h }
  }
  let [pw, ph]: number[] = [...PAGE_SIZES[opts.pageSize]]
  const landscape = opts.orientation === 'landscape' || (opts.orientation === 'auto' && img.width > img.height)
  if (landscape) [pw, ph] = [ph, pw]
  const boxW = pw - 2 * margin
  const boxH = ph - 2 * margin
  const scale = Math.min(boxW / img.width, boxH / img.height)
  const width = img.width * scale
  const height = img.height * scale
  return { pageWidth: pw, pageHeight: ph, x: (pw - width) / 2, y: (ph - height) / 2, width, height }
}

export async function imagesToPdf(images: PdfImage[], opts: ImagesToPdfOptions, onProgress?: Progress): Promise<Bytes> {
  if (images.length === 0) throw new PdfJobError('Add at least one image.')
  const doc = await PDFDocument.create()
  if (opts.title) doc.setTitle(opts.title)
  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    const embedded = img.type === 'jpeg' ? await doc.embedJpg(img.bytes) : await doc.embedPng(img.bytes)
    const box = pageBoxFor(img, opts)
    const page = doc.addPage([box.pageWidth, box.pageHeight])
    page.drawImage(embedded, { x: box.x, y: box.y, width: box.width, height: box.height })
    onProgress?.(i + 1, images.length)
  }
  return savePdf(doc)
}

// ---------------------------------------------------------------------------
// Overlays: signatures, highlights and freehand ink

export type RGB = [number, number, number]

export type Overlay =
  | { kind: 'image'; page: number; rect: NormRect; png: Bytes }
  | { kind: 'highlight'; page: number; rects: NormRect[]; color: RGB; opacity?: number }
  | {
      kind: 'text'
      page: number
      /** Top-left of the text box, normalized to the displayed page. */
      x: number
      y: number
      text: string
      /** Font size as a fraction of the displayed page width. */
      size: number
      color: RGB
    }
  | {
      kind: 'ink'
      page: number
      points: { x: number; y: number }[]
      color: RGB
      /** Stroke width as a fraction of the displayed page width. */
      width: number
      opacity?: number
    }

/**
 * Draws overlays onto a copy of the PDF. Coordinates are normalized display
 * coordinates (see lib/pdf/document.ts); content is flattened into the page.
 */
export async function applyOverlays(input: NamedPdf, overlays: Overlay[]): Promise<Bytes> {
  if (overlays.length === 0) throw new PdfJobError('There’s nothing to save yet.')
  const doc = await openNamed(input)
  const pages = doc.getPages()
  let gsCount = 0
  let textFont: PDFFont | undefined

  for (const ov of overlays) {
    const page = pages[ov.page]
    if (!page) throw new PdfJobError(`Page ${ov.page + 1} doesn’t exist.`)
    const g = pageGeometry(page)

    if (ov.kind === 'image') {
      const img = await doc.embedPng(ov.png)
      const p = uprightImagePlacement(g, ov.rect)
      page.drawImage(img, { x: p.x, y: p.y, width: p.width, height: p.height, rotate: degrees(p.rotate) })
    } else if (ov.kind === 'highlight') {
      for (const r of ov.rects) {
        const u = displayRectToUser(g, r)
        page.drawRectangle({
          ...u,
          color: rgb(...ov.color),
          opacity: ov.opacity ?? 0.4,
          blendMode: BlendMode.Multiply,
        })
      }
    } else if (ov.kind === 'text') {
      textFont ??= await doc.embedFont(StandardFonts.Helvetica)
      const size = ov.size * g.displayWidth
      ov.text.split('\n').forEach((line, i) => {
        if (!line.trim()) return
        drawDisplayText(page, textFont!, sanitizeText(line, textFont!), {
          nx: ov.x,
          ny: ov.y + (i * size * 1.2) / g.displayHeight,
          align: 'left',
          valign: 'top',
          size,
          color: ov.color,
        })
      })
    } else if (ov.points.length > 0) {
      const gs = doc.context.obj({
        Type: 'ExtGState',
        CA: PDFNumber.of(ov.opacity ?? 1),
        ca: PDFNumber.of(ov.opacity ?? 1),
        BM: PDFName.of(ov.opacity !== undefined && ov.opacity < 1 ? 'Multiply' : 'Normal'),
      })
      const gsName = page.node.newExtGState(`SnapInk${gsCount++}`, doc.context.register(gs))
      const pts = ov.points.map((pt) => displayToUser(g, pt.x, pt.y))
      // A single tap becomes a dot: a zero-length segment with round caps.
      if (pts.length === 1) pts.push({ x: pts[0].x + 0.01, y: pts[0].y })
      page.pushOperators(
        pushGraphicsState(),
        setGraphicsState(gsName),
        setStrokingRgbColor(...ov.color),
        setLineWidth(ov.width * g.displayWidth),
        setLineCap(LineCapStyle.Round),
        setLineJoin(LineJoinStyle.Round),
        moveTo(pts[0].x, pts[0].y),
        ...pts.slice(1).map((pt) => lineTo(pt.x, pt.y)),
        stroke(),
        popGraphicsState()
      )
    }
  }
  return savePdf(doc)
}

/** Replaces characters the standard font can't encode with close equivalents or "?". */
function sanitizeText(text: string, font: PDFFont) {
  const charset = new Set(font.getCharacterSet())
  return Array.from(text)
    .map((ch) => {
      if (charset.has(ch.codePointAt(0)!)) return ch
      const plain = ch.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      return plain && Array.from(plain).every((c) => charset.has(c.codePointAt(0)!)) ? plain : '?'
    })
    .join('')
}

// ---------------------------------------------------------------------------
// Info

export interface PdfInfo {
  pageCount: number
  encrypted: boolean
  title?: string
}

/** Reads page count and encryption state without decrypting. */
export async function pdfInfo(bytes: Bytes): Promise<PdfInfo> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false })
    return { pageCount: doc.getPageCount(), encrypted: doc.isEncrypted, title: doc.isEncrypted ? undefined : doc.getTitle() }
  } catch {
    throw new PdfInvalidError()
  }
}
