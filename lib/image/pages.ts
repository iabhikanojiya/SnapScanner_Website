// Image pages for Scan to PDF and Image to PDF. Each page keeps its original
// file and a set of edits; pixels are decoded on demand so dozens of photos
// don't have to sit decoded in memory.
import { checkFiles } from '@/lib/files/validate'
import { LIMITS } from '@/lib/limits'
import type { PdfImage } from '@/lib/pdf/operations'
import { newId } from '@/lib/storage/db'
import type { Pixels } from './filters'
import { decodeImage, detectEdges, encodePixels, imageSize, processImage } from './browser'
import { FULL_QUAD } from './geometry'
import { DEFAULT_EDITS, type PageEdits } from './pipeline'

export interface ImagePage {
  id: string
  name: string
  source: Blob
  width: number
  height: number
  edits: PageEdits
  /** Object URL of the edited preview; revoke with `disposePage`. */
  previewUrl: string | null
  /** Result of automatic boundary detection, if it ran. */
  detected?: boolean
}

export const PREVIEW_SIZE = 480

/** Validates image files and creates pages. Returns readable errors for rejects. */
export async function createPages(files: File[], current: number) {
  const room = Math.max(0, LIMITS.filesPerJob - current)
  const { accepted, errors } = await checkFiles(files.slice(0, room), 'image')
  if (files.length > room) errors.push(`Up to ${LIMITS.filesPerJob} pages can be added at once.`)
  const pages: ImagePage[] = []
  for (const { file } of accepted) {
    try {
      const size = await imageSize(file, file.name)
      pages.push({ id: newId(), name: file.name, source: file, ...size, edits: DEFAULT_EDITS, previewUrl: null })
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `“${file.name}” couldn’t be read.`)
    }
  }
  return { pages, errors }
}

/** Runs edge detection and returns the page with its crop set (or unchanged). */
export async function autoDetect(page: ImagePage): Promise<ImagePage> {
  const small = await decodeImage(page.source, page.name, 720)
  const found = await detectEdges(small)
  return { ...page, detected: !!found, edits: { ...page.edits, quad: found ? found.quad : FULL_QUAD } }
}

export async function renderPreview(page: ImagePage, size = PREVIEW_SIZE): Promise<string> {
  // Decode a bit larger than the preview so cropping keeps detail.
  const src = await decodeImage(page.source, page.name, size * 2)
  const out = await processImage(src, page.edits, size)
  return URL.createObjectURL(await encodePixels(out, 'image/jpeg', 0.82))
}

export function disposePage(page: ImagePage) {
  if (page.previewUrl) URL.revokeObjectURL(page.previewUrl)
}

export type ExportQuality = 'standard' | 'high'
export const EXPORT_MAX_SIDE: Record<ExportQuality, number> = { standard: 1754, high: 3508 }

/** Produces the final JPEG (or PNG for B&W) for each page, one at a time. */
export async function exportPages(
  pages: ImagePage[],
  quality: ExportQuality,
  onProgress?: (done: number, total: number) => void
): Promise<PdfImage[]> {
  const out: PdfImage[] = []
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const src: Pixels = await decodeImage(page.source, page.name)
    const processed = await processImage(src, page.edits, EXPORT_MAX_SIDE[quality])
    // Black-and-white pages compress far better (and stay crisper) as PNG.
    const type = page.edits.filter === 'bw' ? 'png' : 'jpeg'
    const blob = await encodePixels(processed, type === 'png' ? 'image/png' : 'image/jpeg', quality === 'high' ? 0.9 : 0.82)
    out.push({ bytes: new Uint8Array(await blob.arrayBuffer()), type, width: processed.width, height: processed.height })
    onProgress?.(i + 1, pages.length)
  }
  return out
}
