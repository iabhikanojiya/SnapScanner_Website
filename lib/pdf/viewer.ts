// pdf.js loading and rendering for previews, thumbnails, the reader and the
// annotator. pdf.js and its worker, fonts, CMaps and decoders are served from
// this site (public/pdfjs, copied by scripts/copy-pdfjs.mjs).
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

type PdfJs = typeof import('pdfjs-dist')

let pdfjsPromise: Promise<PdfJs> | null = null

export function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= import('pdfjs-dist').then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
    return lib
  })
  return pdfjsPromise
}

export class ViewerPasswordError extends Error {
  constructor(readonly incorrect: boolean) {
    super(incorrect ? 'That password is incorrect.' : 'This PDF needs a password to open.')
    this.name = 'ViewerPasswordError'
  }
}

export class ViewerLoadError extends Error {
  constructor() {
    super('This PDF couldn’t be opened. It may be damaged or not a PDF.')
    this.name = 'ViewerLoadError'
  }
}

export interface OpenedPdf {
  doc: PDFDocumentProxy
  task: PDFDocumentLoadingTask
}

/**
 * Opens a PDF for rendering. The bytes are copied, so the caller's array stays usable.
 * `fontExtraProperties` keeps font names available (PDF to Word uses them).
 */
export async function openForView(bytes: Uint8Array, password?: string, { fontExtraProperties = false } = {}): Promise<OpenedPdf> {
  const lib = await loadPdfJs()
  const task = lib.getDocument({
    fontExtraProperties,
    data: bytes.slice(),
    password: password || undefined,
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    wasmUrl: '/pdfjs/wasm/',
    iccUrl: '/pdfjs/iccs/',
    enableXfa: false,
    verbosity: 0,
  })
  try {
    return { doc: await task.promise, task }
  } catch (e) {
    void task.destroy()
    if (e && typeof e === 'object' && 'name' in e && e.name === 'PasswordException') {
      const code = (e as { code?: number }).code
      throw new ViewerPasswordError(code === lib.PasswordResponses.INCORRECT_PASSWORD)
    }
    throw new ViewerLoadError()
  }
}

/**
 * Renders a page into a canvas at the given CSS width (rendered at device pixel
 * ratio for sharpness). `rotation` is added to the page's own /Rotate.
 */
export async function renderPage(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  cssWidth: number,
  rotation = 0,
  maxPixels = 16_000_000
) {
  const base = page.getViewport({ scale: 1, rotation: page.rotate + rotation })
  let scale = (cssWidth / base.width) * Math.min(window.devicePixelRatio || 1, 2)
  // Keep huge pages within canvas memory limits (notably on iOS).
  const pixels = base.width * base.height * scale * scale
  if (pixels > maxPixels) scale *= Math.sqrt(maxPixels / pixels)
  const viewport = page.getViewport({ scale, rotation: page.rotate + rotation })
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${(cssWidth * viewport.height) / viewport.width}px`
  const task = page.render({ canvas, viewport })
  await task.promise
  return { width: cssWidth, height: (cssWidth * viewport.height) / viewport.width }
}

/** Renders a page thumbnail and returns it as a JPEG object URL (caller revokes it). */
export async function renderThumbnail(doc: PDFDocumentProxy, pageNumber: number, cssWidth: number): Promise<string> {
  const page = await doc.getPage(pageNumber)
  const canvas = document.createElement('canvas')
  try {
    await renderPage(page, canvas, cssWidth)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8))
    if (!blob) throw new Error('Thumbnail failed')
    return URL.createObjectURL(blob)
  } finally {
    canvas.width = canvas.height = 0
    page.cleanup()
  }
}
