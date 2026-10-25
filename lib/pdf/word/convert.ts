'use client'

// PDF to Word in the browser: reads each page's text and images with pdf.js,
// optionally recognizes scanned pages with the on-device OCR engine, rebuilds
// paragraphs, columns and tables and writes a .docx. Nothing leaves the tab.
import { createOcrEngine, type OcrEngine, type OcrLanguage } from '@/lib/ocr'
import { loadPdfJs, openForView } from '@/lib/pdf/viewer'
import { analyzePage, bodySize, type OutPage, type PageInput } from './analyze'
import { buildDocx } from './build-docx'
import { extractPage, ocrItems, type PdfjsImage } from './extract'

export interface PdfToWordOptions {
  bytes: Uint8Array
  password?: string
  title?: string
  /** 0-based pages to recognize with OCR, and the language to use. */
  ocr: { language: OcrLanguage; pages: number[] } | null
  onProgress: (label: string, done: number, total: number) => void
  signal: AbortSignal
}

export interface PdfToWordResult {
  blob: Blob
  pageCount: number
  /** 0-based pages without text that were included as pictures. */
  imagePages: number[]
  /** 0-based pages whose text came from OCR. */
  ocrPages: number[]
  /** 0-based pages with neither text nor images. */
  emptyPages: number[]
  warnings: string[]
}

/** A page counts as scanned when it has almost no text but is mostly covered by images. */
export const SCANNED_TEXT_CHARS = 10

const MAX_SIDE = 2000
const MAX_IMAGES = 400
const OCR_SCALE = 200 / 72
const PICTURE_SCALE = 150 / 72
const MAX_PIXELS = 25_000_000

const abortError = () => new DOMException('Cancelled', 'AbortError')

function canvasFor(width: number, height: number) {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  return canvas
}

async function canvasBytes(canvas: HTMLCanvasElement, type: 'png' | 'jpg') {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type === 'png' ? 'image/png' : 'image/jpeg', 0.9))
  canvas.width = canvas.height = 0
  if (!blob) return null
  return { data: new Uint8Array(await blob.arrayBuffer()), type }
}

/** Encodes an image decoded by pdf.js as JPEG (opaque) or PNG (with transparency). */
async function encodeImage(img: PdfjsImage) {
  const { width, height } = img
  if (!width || !height) return null
  const full = document.createElement('canvas')
  full.width = width
  full.height = height
  const ctx = full.getContext('2d')
  if (!ctx) return null
  if (img.bitmap) ctx.drawImage(img.bitmap, 0, 0)
  else if (img.data) {
    const out = ctx.createImageData(width, height)
    const d = out.data
    const src = img.data
    if (img.kind === 1) {
      const rowBytes = (width + 7) >> 3
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const v = src[y * rowBytes + (x >> 3)] & (128 >> (x & 7)) ? 255 : 0
          const o = (y * width + x) * 4
          d[o] = d[o + 1] = d[o + 2] = v
          d[o + 3] = 255
        }
    } else if (img.kind === 2) {
      for (let i = 0, j = 0; i < width * height; i++, j += 3) {
        d[i * 4] = src[j]
        d[i * 4 + 1] = src[j + 1]
        d[i * 4 + 2] = src[j + 2]
        d[i * 4 + 3] = 255
      }
    } else d.set(src.subarray(0, d.length))
    ctx.putImageData(out, 0, 0)
  } else return null
  let opaque = img.kind === 1 || img.kind === 2
  if (!opaque) {
    const px = ctx.getImageData(0, 0, width, height).data
    opaque = true
    for (let i = 3; i < px.length; i += 4)
      if (px[i] < 255) {
        opaque = false
        break
      }
  }
  const out = canvasFor(width, height)
  out.getContext('2d')!.drawImage(full, 0, 0, out.width, out.height)
  full.width = full.height = 0
  return canvasBytes(out, opaque ? 'jpg' : 'png')
}

export function friendlyError(e: unknown): string {
  if (e instanceof DOMException && e.name === 'AbortError') return 'Conversion cancelled.'
  if (e instanceof RangeError || (e instanceof Error && /memory|allocation|too large/i.test(e.message)))
    return 'Your browser ran out of memory converting this PDF. Try a smaller file or fewer pages, or close other tabs and try again.'
  return 'The PDF couldn’t be converted. It may be damaged or use features this converter doesn’t support.'
}

export async function convertPdfToWord(opts: PdfToWordOptions): Promise<PdfToWordResult> {
  const { signal } = opts
  const lib = await loadPdfJs()
  const opened = await openForView(opts.bytes, opts.password, { fontExtraProperties: true })
  const doc = opened.doc
  let engine: OcrEngine | null = null
  const ocrSet = new Set(opts.ocr?.pages ?? [])
  const total = doc.numPages
  const inputs: PageInput[] = []
  const imagePages: number[] = []
  const ocrPages: number[] = []
  const emptyPages: number[] = []
  const warnings = new Set<string>()
  let imageCount = 0
  // Stop OCR mid-page when cancelled, rather than after the page finishes.
  const stopOcr = () => void engine?.terminate()
  signal.addEventListener('abort', stopOcr)
  try {
    for (let i = 0; i < total; i++) {
      if (signal.aborted) throw abortError()
      const page = await doc.getPage(i + 1)
      try {
        if (ocrSet.has(i)) {
          opts.onProgress(engine ? `Recognizing text on page ${i + 1}` : 'Loading the OCR language model', i, total)
          engine ??= await createOcrEngine(opts.ocr!.language, OCR_SCALE * 72)
          if (signal.aborted) throw abortError()
          opts.onProgress(`Recognizing text on page ${i + 1}`, i, total)
          const base = page.getViewport({ scale: 1 })
          let scale = OCR_SCALE
          if (base.width * base.height * scale * scale > MAX_PIXELS) scale = Math.sqrt(MAX_PIXELS / (base.width * base.height))
          const viewport = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          await page.render({ canvas, viewport, background: 'rgb(255,255,255)' }).promise
          const r = await engine.recognize(canvas)
          canvas.width = canvas.height = 0
          inputs.push({ width: base.width, height: base.height, items: ocrItems(r.page.words, base.width, base.height), images: [] })
          ocrPages.push(i)
          continue
        }
        opts.onProgress(`Reading page ${i + 1}`, i, total)
        const ex = await extractPage(lib, page, { images: true, encode: encodeImage, maxImages: Math.max(0, MAX_IMAGES - imageCount) })
        imageCount += ex.input.images.length
        if (ex.rotatedItems) warnings.add('Rotated or vertical text was moved to the end of its page.')
        if (ex.textChars < SCANNED_TEXT_CHARS && ex.imageCoverage > 0.3) {
          // A scanned page without OCR: keep it as a picture of the whole page.
          const viewport = page.getViewport({ scale: PICTURE_SCALE })
          const canvas = canvasFor(viewport.width, viewport.height)
          const fit = page.getViewport({ scale: PICTURE_SCALE * (canvas.width / viewport.width) })
          await page.render({ canvas, viewport: fit, background: 'rgb(255,255,255)' }).promise
          const pic = await canvasBytes(canvas, 'jpg')
          const base = page.getViewport({ scale: 1 })
          inputs.push({ width: base.width, height: base.height, items: ex.input.items, images: pic ? [{ x: 0, y: 0, w: base.width, h: base.height, ...pic }] : [] })
          imagePages.push(i)
          continue
        }
        // Full-page backgrounds behind text (letterheads, watermarks) would push text down.
        const pageArea = ex.input.width * ex.input.height
        const kept = ex.input.images.filter((im) => !(ex.textChars >= SCANNED_TEXT_CHARS && (im.w * im.h) / pageArea > 0.6))
        if (kept.length < ex.input.images.length) warnings.add('Full-page background images behind text were left out.')
        if (ex.skippedImages && imageCount >= MAX_IMAGES) warnings.add(`Only the first ${MAX_IMAGES} images were included.`)
        if (!ex.textChars && !kept.length) emptyPages.push(i)
        inputs.push({ ...ex.input, images: kept })
      } finally {
        page.cleanup()
      }
    }
    if (signal.aborted) throw abortError()
    opts.onProgress('Creating the Word document', total, total)
    const body = bodySize(inputs)
    const pages: OutPage[] = inputs.map((p) => analyzePage(p, body))
    // Pages that are pictures fill the page: no margins.
    for (const i of imagePages) {
      const p = pages[i]
      p.margins = { top: 18, right: 18, bottom: 18, left: 18 }
      const im = inputs[i].images[0]
      // Slightly smaller than the page, so Word doesn't push it onto a new page.
      const s = Math.min((p.width - 36) / im?.w, (p.height - 40) / im?.h)
      if (im) p.regions = [{ columns: 1, blocks: [{ t: 'image', image: { ...im, w: im.w * s, h: im.h * s }, indent: 0, spaceBefore: 0 }] }]
    }
    const blob = await buildDocx(pages, { title: opts.title })
    return { blob, pageCount: total, imagePages, ocrPages, emptyPages, warnings: [...warnings] }
  } finally {
    signal.removeEventListener('abort', stopOcr)
    await engine?.terminate().catch(() => undefined)
    void opened.task.destroy()
  }
}
