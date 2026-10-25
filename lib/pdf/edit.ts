// Page-level editing: organize, rotate, remove, page numbers, watermarks,
// cropping, forms, metadata and repair. Pure byte-in/byte-out functions that
// run in the browser and in Node tests.
import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
  degrees,
  type PDFFont,
} from '@cantoo/pdf-lib'
import { displayRectToUser, displayToUser, drawDisplayText, normalizeRotation, pageGeometry, removeUnreachableObjects, savePdf, type Bytes, type NormRect } from './document'
import { PdfJobError, type NamedPdf, type RGB } from './operations'
import { openPdf, PdfInvalidError, PdfPasswordError } from './document'

async function open(input: NamedPdf) {
  try {
    return await openPdf(input.bytes, input.password)
  } catch (e) {
    if (e instanceof PdfPasswordError)
      throw new PdfJobError(
        e.reason === 'required' ? `“${input.name}” is password-protected. Enter its password or unlock it first.` : `The password for “${input.name}” is incorrect.`,
        input.name
      )
    if (e instanceof PdfInvalidError) throw new PdfJobError(`“${input.name}”: ${e.message} Try Repair PDF.`, input.name)
    throw e
  }
}

// ---------------------------------------------------------------------------
// Organize: reorder, rotate, delete and duplicate pages

export interface PagePlanItem {
  /** 0-based index of the source page. The same page may appear more than once. */
  source: number
  /** Extra clockwise rotation to add, in degrees (multiple of 90). */
  rotate: number
}

/** Builds a new PDF from a page plan (order, rotation, duplicates). */
export async function reorganizePdf(input: NamedPdf, plan: PagePlanItem[]): Promise<Bytes> {
  if (plan.length === 0) throw new PdfJobError('The result would have no pages. Keep at least one page.')
  const src = await open(input)
  const count = src.getPageCount()
  for (const p of plan) if (p.source < 0 || p.source >= count) throw new PdfJobError(`Page ${p.source + 1} doesn’t exist.`)
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, plan.map((p) => p.source))
  copied.forEach((page, i) => {
    const extra = plan[i].rotate
    if (extra % 360) page.setRotation(degrees(normalizeRotation(page.getRotation().angle + extra)))
    out.addPage(page)
  })
  const title = src.getTitle()
  if (title) out.setTitle(title)
  return savePdf(out)
}

/** Removes the given 0-based pages. */
export async function removePages(input: NamedPdf, remove: number[]): Promise<Bytes> {
  const src = await open(input)
  const drop = new Set(remove)
  const keep = src.getPageIndices().filter((i) => !drop.has(i))
  if (keep.length === 0) throw new PdfJobError('You can’t remove every page. Keep at least one.')
  if (keep.length === src.getPageCount()) throw new PdfJobError('Select at least one page to remove.')
  return reorganizePdf(input, keep.map((source) => ({ source, rotate: 0 })))
}

/** Rotates pages in place (keeps everything else in the document). */
export async function rotatePages(input: NamedPdf, rotations: Record<number, number>): Promise<Bytes> {
  const doc = await open(input)
  const pages = doc.getPages()
  let changed = 0
  for (const [i, extra] of Object.entries(rotations)) {
    const page = pages[Number(i)]
    if (!page) throw new PdfJobError(`Page ${Number(i) + 1} doesn’t exist.`)
    if (extra % 360 === 0) continue
    page.setRotation(degrees(normalizeRotation(page.getRotation().angle + extra)))
    changed++
  }
  if (!changed) throw new PdfJobError('Rotate at least one page first.')
  return savePdf(doc)
}

// ---------------------------------------------------------------------------
// Page numbers

export type NumberPosition = 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'

export interface PageNumberOptions {
  position: NumberPosition
  start: number
  /** {n} = page number, {total} = number of numbered pages. */
  format: string
  fontSize: number
  /** Distance from the page edge in points. */
  margin: number
  color: RGB
  /** 0-based pages to number; undefined = all. */
  pages?: number[]
}

export function formatPageNumber(format: string, n: number, total: number) {
  return format.replace(/\{n\}/g, String(n)).replace(/\{total\}/g, String(total))
}

export async function addPageNumbers(input: NamedPdf, opts: PageNumberOptions): Promise<Bytes> {
  if (!/\{n\}/.test(opts.format)) throw new PdfJobError('The format must include {n} for the page number.')
  if (!Number.isFinite(opts.start)) throw new PdfJobError('Enter a starting number.')
  const doc = await open(input)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const targets = opts.pages ?? pages.map((_, i) => i)
  if (targets.length === 0) throw new PdfJobError('Choose at least one page to number.')
  const [vert, horiz] = opts.position.split('-') as ['top' | 'bottom', 'left' | 'center' | 'right']
  targets.forEach((pi, k) => {
    const page = pages[pi]
    if (!page) throw new PdfJobError(`Page ${pi + 1} doesn’t exist.`)
    const g = pageGeometry(page)
    const text = formatPageNumber(opts.format, opts.start + k, targets.length + opts.start - 1)
    const mx = opts.margin / g.displayWidth
    const my = opts.margin / g.displayHeight
    drawDisplayText(page, font, text, {
      nx: horiz === 'left' ? mx : horiz === 'right' ? 1 - mx : 0.5,
      ny: vert === 'top' ? my : 1 - my,
      align: horiz,
      valign: vert === 'top' ? 'top' : 'baseline',
      size: opts.fontSize,
      color: opts.color,
    })
  })
  return savePdf(doc)
}

// ---------------------------------------------------------------------------
// Watermark

export type WatermarkPosition = 'center' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface WatermarkOptions {
  kind: 'text' | 'image'
  text?: string
  /** PNG or JPEG bytes for image watermarks. */
  image?: { bytes: Bytes; type: 'png' | 'jpeg' }
  position: WatermarkPosition
  /** Text: font size relative to page width (0.02–0.3). Image: width relative to page width. */
  scale: number
  opacity: number
  /** Counter-clockwise rotation in degrees, as seen on screen. */
  rotation: number
  color: RGB
  pages?: number[]
}

function anchorFor(pos: WatermarkPosition, margin = 0.06) {
  const [v, h] = pos === 'center' ? ['middle', 'center'] : (pos.split('-') as [string, string])
  return {
    nx: h === 'left' ? margin : h === 'right' ? 1 - margin : 0.5,
    ny: v === 'top' ? margin : v === 'bottom' ? 1 - margin : 0.5,
    align: (h === 'center' ? 'center' : h) as 'left' | 'center' | 'right',
    valign: (v === 'top' ? 'top' : v === 'bottom' ? 'baseline' : 'middle') as 'top' | 'middle' | 'baseline',
  }
}

export async function addWatermark(input: NamedPdf, opts: WatermarkOptions): Promise<Bytes> {
  if (opts.kind === 'text' && !opts.text?.trim()) throw new PdfJobError('Enter the watermark text.')
  if (opts.kind === 'image' && !opts.image) throw new PdfJobError('Choose a watermark image.')
  const doc = await open(input)
  const pages = doc.getPages()
  const targets = opts.pages ?? pages.map((_, i) => i)
  if (!targets.length) throw new PdfJobError('Choose at least one page.')
  const font = opts.kind === 'text' ? await doc.embedFont(StandardFonts.HelveticaBold) : null
  const img = opts.image ? (opts.image.type === 'png' ? await doc.embedPng(opts.image.bytes) : await doc.embedJpg(opts.image.bytes)) : null
  const text = opts.kind === 'text' ? sanitizeWinAnsi(opts.text!.trim(), font!) : ''

  for (const pi of targets) {
    const page = pages[pi]
    if (!page) throw new PdfJobError(`Page ${pi + 1} doesn’t exist.`)
    const g = pageGeometry(page)
    const a = anchorFor(opts.position)
    if (font) {
      const size = Math.max(6, opts.scale * g.displayWidth)
      drawDisplayText(page, font, text, { ...a, size, color: opts.color, opacity: opts.opacity, rotate: opts.rotation })
    } else if (img) {
      const w = opts.scale * g.displayWidth
      const h = (w * img.height) / img.width
      // Anchor the image box in display space, then rotate about the box centre.
      const cx = a.nx * g.displayWidth + (a.align === 'left' ? w / 2 : a.align === 'right' ? -w / 2 : 0)
      const cy = a.ny * g.displayHeight + (a.valign === 'top' ? h / 2 : a.valign === 'baseline' ? -h / 2 : 0)
      const centre = displayToUser(g, cx / g.displayWidth, cy / g.displayHeight)
      const angle = g.rotate + opts.rotation
      const t = (angle * Math.PI) / 180
      const x = centre.x - (w / 2) * Math.cos(t) + (h / 2) * Math.sin(t)
      const y = centre.y - (w / 2) * Math.sin(t) - (h / 2) * Math.cos(t)
      page.drawImage(img, { x, y, width: w, height: h, opacity: opts.opacity, rotate: degrees(angle) })
    }
  }
  return savePdf(doc)
}

/** Replaces characters the standard fonts can't encode. */
export function sanitizeWinAnsi(text: string, font: PDFFont) {
  const charset = new Set(font.getCharacterSet())
  return Array.from(text)
    .map((ch) => {
      if (charset.has(ch.codePointAt(0)!)) return ch
      const plain = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '')
      return plain && Array.from(plain).every((c) => charset.has(c.codePointAt(0)!)) ? plain : '?'
    })
    .join('')
}

// ---------------------------------------------------------------------------
// Crop

/**
 * Sets the visible area (CropBox) of pages. `rect` is the area to keep, in
 * normalized display coordinates. Content outside isn't deleted: it is hidden
 * and can be restored by resetting the crop box in another editor.
 */
export async function cropPages(input: NamedPdf, rect: NormRect, pages?: number[]): Promise<Bytes> {
  if (rect.w < 0.05 || rect.h < 0.05) throw new PdfJobError('The crop area is too small.')
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > 1.0001 || rect.y + rect.h > 1.0001) throw new PdfJobError('The crop area must be inside the page.')
  const doc = await open(input)
  const all = doc.getPages()
  for (const pi of pages ?? all.map((_, i) => i)) {
    const page = all[pi]
    if (!page) throw new PdfJobError(`Page ${pi + 1} doesn’t exist.`)
    const r = displayRectToUser(pageGeometry(page), rect)
    page.setCropBox(r.x, r.y, r.width, r.height)
    // Keep the trim and art boxes inside the new visible area.
    page.setTrimBox(r.x, r.y, r.width, r.height)
  }
  return savePdf(doc)
}

// ---------------------------------------------------------------------------
// Forms

export type FormField =
  | { kind: 'text'; name: string; value: string; multiline: boolean; readOnly: boolean; maxLength?: number }
  | { kind: 'checkbox'; name: string; checked: boolean; readOnly: boolean }
  | { kind: 'dropdown' | 'list'; name: string; options: string[]; selected: string[]; multiple: boolean; readOnly: boolean }
  | { kind: 'radio'; name: string; options: string[]; selected: string | null; readOnly: boolean }
  | { kind: 'unsupported'; name: string; type: string }

export interface FormInfo {
  fields: FormField[]
  xfa: boolean
}

export async function readForm(input: NamedPdf): Promise<FormInfo> {
  const doc = await open(input)
  const form = doc.getForm()
  const acro = doc.catalog.lookup(PDFName.of('AcroForm'))
  const xfa = !!(acro && 'has' in acro && (acro as { has: (k: PDFName) => boolean }).has(PDFName.of('XFA')))
  const fields: FormField[] = form.getFields().map((f) => {
    const name = f.getName()
    const readOnly = f.isReadOnly()
    if (f instanceof PDFTextField)
      return { kind: 'text', name, value: f.getText() ?? '', multiline: f.isMultiline(), readOnly, maxLength: f.getMaxLength() }
    if (f instanceof PDFCheckBox) return { kind: 'checkbox', name, checked: f.isChecked(), readOnly }
    if (f instanceof PDFDropdown) return { kind: 'dropdown', name, options: f.getOptions(), selected: f.getSelected(), multiple: f.isMultiselect(), readOnly }
    if (f instanceof PDFOptionList) return { kind: 'list', name, options: f.getOptions(), selected: f.getSelected(), multiple: f.isMultiselect(), readOnly }
    if (f instanceof PDFRadioGroup) return { kind: 'radio', name, options: f.getOptions(), selected: f.getSelected() ?? null, readOnly }
    return { kind: 'unsupported', name, type: f.constructor.name.replace(/^PDF/, '') }
  })
  return { fields, xfa }
}

export type FormValues = Record<string, string | boolean | string[]>

export async function fillForm(input: NamedPdf, values: FormValues, flatten: boolean): Promise<Bytes> {
  const doc = await open(input)
  const form = doc.getForm()
  for (const [name, value] of Object.entries(values)) {
    const f = form.getFieldMaybe(name)
    if (!f || f.isReadOnly()) continue
    if (f instanceof PDFTextField) {
      const text = String(value)
      const max = f.getMaxLength()
      f.setText(max !== undefined ? text.slice(0, max) : text)
    } else if (f instanceof PDFCheckBox) {
      if (value) f.check()
      else f.uncheck()
    } else if (f instanceof PDFDropdown || f instanceof PDFOptionList) {
      const list = Array.isArray(value) ? value : [String(value)]
      if (list.length && list[0] !== '') f.select(list.length === 1 ? list[0] : list)
      else f.clear()
    } else if (f instanceof PDFRadioGroup) {
      if (value) f.select(String(value))
      else f.clear()
    }
  }
  const font = await doc.embedFont(StandardFonts.Helvetica)
  try {
    form.updateFieldAppearances(font)
    if (flatten) form.flatten()
  } catch (e) {
    if (e instanceof Error && /encode/i.test(e.message))
      throw new PdfJobError('Some characters can’t be written with the standard PDF font. Use Latin letters, digits and common punctuation.')
    throw e
  }
  return savePdf(doc)
}

// ---------------------------------------------------------------------------
// Metadata

export interface PdfMetadata {
  version: string
  pageCount: number
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  producer?: string
  created?: string
  modified?: string
  pageSizes: string[]
  formFields: number
  attachments: number
  hasXmp: boolean
  hasJavaScript: boolean
}

function nameTreeHas(doc: PDFDocument, key: string) {
  const names = doc.catalog.lookup(PDFName.of('Names'))
  return !!(names && 'has' in names && (names as { has: (k: PDFName) => boolean }).has(PDFName.of(key)))
}

export async function readMetadata(input: NamedPdf): Promise<PdfMetadata> {
  const doc = await open(input)
  const header = new TextDecoder('latin1').decode(input.bytes.subarray(0, 16)).match(/%PDF-(\d\.\d)/)?.[1] ?? 'unknown'
  const sizes = new Map<string, number>()
  for (const p of doc.getPages()) {
    const g = pageGeometry(p)
    const key = `${Math.round(g.displayWidth)} × ${Math.round(g.displayHeight)} pt`
    sizes.set(key, (sizes.get(key) ?? 0) + 1)
  }
  let attachments = 0
  const names = doc.catalog.lookup(PDFName.of('Names'))
  if (names && 'lookup' in names) {
    const ef = (names as { lookup: (k: PDFName) => unknown }).lookup(PDFName.of('EmbeddedFiles'))
    const arr = ef && typeof ef === 'object' && 'lookup' in ef ? (ef as { lookup: (k: PDFName) => unknown }).lookup(PDFName.of('Names')) : null
    if (arr && typeof arr === 'object' && 'size' in arr) attachments = Math.floor((arr as { size: () => number }).size() / 2)
  }
  const openAction = doc.catalog.lookup(PDFName.of('OpenAction'))
  const date = (d?: Date) => (d && !Number.isNaN(d.getTime()) ? d.toISOString() : undefined)
  return {
    version: header,
    pageCount: doc.getPageCount(),
    title: doc.getTitle() || undefined,
    author: doc.getAuthor() || undefined,
    subject: doc.getSubject() || undefined,
    keywords: doc.getKeywords() || undefined,
    creator: doc.getCreator() || undefined,
    producer: doc.getProducer() || undefined,
    created: date(doc.getCreationDate()),
    modified: date(doc.getModificationDate()),
    pageSizes: [...sizes].map(([k, n]) => (sizes.size > 1 ? `${k} (${n} page${n === 1 ? '' : 's'})` : k)),
    formFields: doc.getForm().getFields().length,
    attachments,
    hasXmp: !!doc.catalog.lookup(PDFName.of('Metadata')),
    hasJavaScript: nameTreeHas(doc, 'JavaScript') || (!!openAction && /JavaScript/.test(String(openAction))),
  }
}

export interface MetadataEdits {
  title: string
  author: string
  subject: string
  keywords: string
  /** Remove every metadata field and the XMP stream. */
  removeAll: boolean
}

export async function writeMetadata(input: NamedPdf, edits: MetadataEdits): Promise<Bytes> {
  const doc = await open(input)
  if (edits.removeAll) {
    // Drop the Info dictionary and the XMP metadata stream entirely.
    doc.context.trailerInfo.Info = undefined
    doc.catalog.delete(PDFName.of('Metadata'))
    removeUnreachableObjects(doc.context)
    return doc.save({ useObjectStreams: true })
  }
  doc.setTitle(edits.title)
  doc.setAuthor(edits.author)
  doc.setSubject(edits.subject)
  doc.setKeywords(edits.keywords.split(',').map((k) => k.trim()).filter(Boolean))
  return savePdf(doc)
}

// ---------------------------------------------------------------------------
// Repair (best effort)

export interface RepairResult {
  bytes: Bytes
  pageCount: number
  /** "rebuilt": structure rewritten, content kept. */
  method: 'rebuilt'
}

/**
 * Rebuilds a PDF's structure. pdf-lib's parser scans objects directly rather
 * than trusting the cross-reference table, so files with broken offsets,
 * damaged trailers or junk around the objects can often be recovered. The
 * pages are copied into a fresh document with a new cross-reference table.
 */
export async function repairPdf(input: NamedPdf): Promise<RepairResult> {
  let src: PDFDocument
  try {
    src = await PDFDocument.load(input.bytes, {
      ignoreEncryption: false,
      throwOnInvalidObject: false,
      updateMetadata: false,
      password: input.password,
    })
  } catch (e) {
    if (e instanceof Error && /encrypted/i.test(e.message)) throw new PdfJobError('This PDF is password-protected. Unlock it first.')
    throw new PdfJobError('The file is too damaged to rebuild its structure.')
  }
  let indices: number[]
  try {
    indices = src.getPageIndices()
  } catch {
    throw new PdfJobError('No pages could be found in this file.')
  }
  if (!indices.length) throw new PdfJobError('No pages could be found in this file.')
  const out = await PDFDocument.create()
  const kept: number[] = []
  for (const i of indices) {
    try {
      const [page] = await out.copyPages(src, [i])
      out.addPage(page)
      kept.push(i)
    } catch {
      // Skip a page that can't be copied; report it below.
    }
  }
  if (!kept.length) throw new PdfJobError('None of the pages could be recovered.')
  return { bytes: await savePdf(out), pageCount: kept.length, method: 'rebuilt' }
}
