'use client'

// Images added to Create Studio projects: validated, decoded on this device,
// downscaled and stored inside the project as data URLs. Nothing is uploaded.
import { checkFile } from '@/lib/files/validate'
import { decodeImage, encodePixels } from '@/lib/image/browser'
import type { ImageValue } from './engine'

export type ImageKind = 'person' | 'logo' | 'photo' | 'signature'

/** Longest side kept for each kind of image, in pixels. */
export const MAX_SIDE: Record<ImageKind, number> = { person: 1200, logo: 1000, signature: 1000, photo: 2400 }

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((ok, fail) => {
    const r = new FileReader()
    r.onload = () => ok(r.result as string)
    r.onerror = () => fail(new Error('The image couldn’t be read.'))
    r.readAsDataURL(blob)
  })
}

/** Makes near-white pixels transparent, so a scanned signature sits on any background. */
function clearWhite(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    if (l > 215) data[i + 3] = 0
    else if (l > 170) data[i + 3] = Math.round(data[i + 3] * ((215 - l) / 45))
  }
}

export async function imageFromFile(file: File, kind: ImageKind): Promise<ImageValue> {
  await checkFile(file, 'image')
  const px = await decodeImage(file, file.name, MAX_SIDE[kind])
  if (kind === 'signature') clearWhite(px.data)
  // Logos and signatures keep transparency; photos use JPEG to stay small.
  const blob = await encodePixels(px, kind === 'logo' || kind === 'signature' ? 'image/png' : 'image/jpeg', 0.88)
  return { src: await toDataUrl(blob), width: px.width, height: px.height, zoom: 1, ox: 0, oy: 0 }
}

/** Rotates an image a quarter turn (clockwise when dir = 1). Crop settings are reset. */
export async function rotateImage(value: ImageValue, dir: 1 | -1): Promise<ImageValue> {
  const img = new Image()
  img.src = value.src
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = value.height
  canvas.height = value.width
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas isn’t available in this browser.')
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((dir * Math.PI) / 2)
  ctx.drawImage(img, -value.width / 2, -value.height / 2, value.width, value.height)
  const png = value.src.startsWith('data:image/png')
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, png ? 'image/png' : 'image/jpeg', 0.9))
  canvas.width = canvas.height = 0
  if (!blob) throw new Error('The image couldn’t be rotated.')
  return { src: await toDataUrl(blob), width: value.height, height: value.width, zoom: 1, ox: 0, oy: 0 }
}

/** Approximate stored size of an image in bytes. */
export function imageBytes(value: ImageValue) {
  return Math.round((value.src.length - value.src.indexOf(',') - 1) * 0.75)
}
