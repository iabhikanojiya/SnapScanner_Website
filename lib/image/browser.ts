// Browser-side image helpers: decoding files to pixels, encoding pixels to
// JPEG/PNG, running the pipeline in a worker, and the canvas-based recoder
// used by Compress PDF.
import { LIMITS } from '@/lib/limits'
import type { ImageRecoder } from '@/lib/pdf/compress'
import type { Pixels } from './filters'
import { detectDocument, type Detection } from './geometry'
import { processPixels, type PageEdits } from './pipeline'

export class ImageDecodeError extends Error {
  constructor(name: string) {
    super(`“${name}” couldn’t be decoded as an image. It may be damaged or in a format this browser doesn’t support.`)
    this.name = 'ImageDecodeError'
  }
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas isn’t available in this browser.')
  return { canvas, ctx }
}

/** Decodes an image file, honouring EXIF orientation, scaled so the long side ≤ maxSide. */
export async function decodeImage(blob: Blob, name = 'image', maxSide: number = LIMITS.imageMaxSide): Promise<Pixels> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageDecodeError(name)
  }
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const { ctx } = makeCanvas(w, h)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, w, h)
    const img = ctx.getImageData(0, 0, w, h)
    return { data: img.data, width: w, height: h }
  } finally {
    bitmap.close()
  }
}

/** Natural dimensions of an image file (after EXIF orientation). */
export async function imageSize(blob: Blob, name = 'image') {
  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    throw new ImageDecodeError(name)
  }
}

export type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp'

export function pixelsToCanvas(p: Pixels): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(p.width, p.height)
  ctx.putImageData(new ImageData(p.data as ImageDataArray, p.width, p.height), 0, 0)
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: OutputFormat, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding the image failed.'))), type, quality)
  )
}

export async function encodePixels(p: Pixels, type: OutputFormat, quality = 0.9): Promise<Blob> {
  const canvas = pixelsToCanvas(p)
  try {
    const blob = await canvasToBlob(canvas, type, quality)
    // Browsers that can't encode WebP silently return PNG.
    if (blob.type !== type) throw new Error(`This browser can’t save ${type.replace('image/', '').toUpperCase()} images.`)
    return blob
  } finally {
    canvas.width = canvas.height = 0
  }
}

// ---------------------------------------------------------------------------
// Worker client. Falls back to the main thread if workers are unavailable.

let worker: Worker | null | undefined
let nextId = 1
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

function getWorker(): Worker | null {
  if (worker !== undefined) return worker
  try {
    worker = new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent) => {
      const p = pending.get(e.data.id)
      if (!p) return
      pending.delete(e.data.id)
      if (e.data.ok) p.resolve(e.data)
      else p.reject(new Error(e.data.error))
    }
    worker.onerror = () => {
      for (const p of pending.values()) p.reject(new Error('Image processing failed.'))
      pending.clear()
      worker?.terminate()
      worker = null
    }
  } catch {
    worker = null
  }
  return worker
}

function call<T>(msg: Record<string, unknown>, transfer: Transferable[]): Promise<T> | null {
  const w = getWorker()
  if (!w) return null
  const id = nextId++
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
    w.postMessage({ ...msg, id }, transfer)
  })
}

/** Crops, rotates and filters a page. The source pixels are copied, not consumed. */
export async function processImage(src: Pixels, edits: PageEdits, maxSide: number): Promise<Pixels> {
  const data = new Uint8ClampedArray(src.data)
  const viaWorker = call<{ data: Uint8ClampedArray; width: number; height: number }>(
    { op: 'process', data, width: src.width, height: src.height, edits, maxSide },
    [data.buffer]
  )
  if (viaWorker) {
    try {
      return await viaWorker
    } catch {
      // Fall through to the main thread.
    }
  }
  return processPixels(src, edits, maxSide)
}

export async function detectEdges(src: Pixels): Promise<Detection | null> {
  const data = new Uint8ClampedArray(src.data)
  const viaWorker = call<{ detection: Detection | null }>({ op: 'detect', data, width: src.width, height: src.height }, [data.buffer])
  if (viaWorker) {
    try {
      return (await viaWorker).detection
    } catch {
      // Fall through.
    }
  }
  return detectDocument(src)
}

// ---------------------------------------------------------------------------
// Compress PDF image recoder

export const canvasRecoder: ImageRecoder = {
  async recompress(input, { maxSide, quality }) {
    let source: CanvasImageSource
    let w = input.width
    let h = input.height
    let bitmap: ImageBitmap | null = null
    if (input.kind === 'jpeg') {
      try {
        bitmap = await createImageBitmap(new Blob([input.bytes as BlobPart], { type: 'image/jpeg' }))
      } catch {
        return null
      }
      source = bitmap
      w = bitmap.width
      h = bitmap.height
    } else {
      const rgba = new Uint8ClampedArray(w * h * 4)
      const px = input.pixels
      for (let i = 0, j = 0; i < w * h; i++, j += input.components) {
        const o = i * 4
        if (input.components === 3) {
          rgba[o] = px[j]
          rgba[o + 1] = px[j + 1]
          rgba[o + 2] = px[j + 2]
        } else {
          rgba[o] = rgba[o + 1] = rgba[o + 2] = px[j]
        }
        rgba[o + 3] = 255
      }
      source = pixelsToCanvas({ data: rgba, width: w, height: h })
    }
    try {
      const scale = Math.min(1, maxSide / Math.max(w, h))
      const tw = Math.max(1, Math.round(w * scale))
      const th = Math.max(1, Math.round(h * scale))
      const { canvas, ctx } = makeCanvas(tw, th)
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, tw, th)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(source, 0, 0, tw, th)
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
      canvas.width = canvas.height = 0
      return { bytes: new Uint8Array(await blob.arrayBuffer()), width: tw, height: th, gray: false }
    } finally {
      bitmap?.close()
      if (source instanceof HTMLCanvasElement) source.width = source.height = 0
    }
  },
}

// ---------------------------------------------------------------------------
// Resize Image

export const MAX_RESIZE_SIDE = 8000

/** Width and height that keep the aspect ratio when one side changes. */
export function lockedSize(natural: { width: number; height: number }, changed: 'width' | 'height', value: number) {
  const ratio = natural.width / natural.height
  return changed === 'width'
    ? { width: value, height: Math.max(1, Math.round(value / ratio)) }
    : { width: Math.max(1, Math.round(value * ratio)), height: value }
}

/**
 * Resizes an image with good quality: large reductions are done in halving
 * steps, which avoids the aliasing of a single big downscale.
 */
export async function resizeImage(blob: Blob, name: string, width: number, height: number, type: OutputFormat, quality: number): Promise<Blob> {
  if (width < 1 || height < 1 || width > MAX_RESIZE_SIDE || height > MAX_RESIZE_SIDE)
    throw new Error(`Width and height must be between 1 and ${MAX_RESIZE_SIDE} pixels.`)
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageDecodeError(name)
  }
  let source: CanvasImageSource = bitmap
  let sw = bitmap.width
  let sh = bitmap.height
  const temps: HTMLCanvasElement[] = []
  try {
    while (sw / 2 >= width && sh / 2 >= height) {
      const step = makeCanvas(Math.round(sw / 2), Math.round(sh / 2))
      step.ctx.imageSmoothingQuality = 'high'
      step.ctx.drawImage(source, 0, 0, step.canvas.width, step.canvas.height)
      temps.push(step.canvas)
      source = step.canvas
      sw = step.canvas.width
      sh = step.canvas.height
    }
    const { canvas, ctx } = makeCanvas(width, height)
    temps.push(canvas)
    if (type === 'image/jpeg') {
      // JPEG has no transparency: flatten onto white rather than black.
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, width, height)
    const out = await canvasToBlob(canvas, type, quality)
    if (out.type !== type) throw new Error(`This browser can’t save ${type.replace('image/', '').toUpperCase()} images. Choose another format.`)
    return out
  } finally {
    bitmap.close()
    temps.forEach((c) => (c.width = c.height = 0))
  }
}
