// Web Worker for Word to PDF, so laying out long documents doesn't freeze the
// page. Fonts are fetched from this site; the document itself never leaves the
// browser.
import { convertDocxToPdf } from './convert'
import { DocxError } from './parse'
import type { DocImage } from './model'

type Request = { bytes: Uint8Array }

const MIME: Record<string, string> = { gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml', png: 'image/png', jpeg: 'image/jpeg' }

async function loadFont(file: string) {
  const res = await fetch(`/word-fonts/${file}`)
  if (!res.ok) throw new Error('A font needed for the conversion couldn’t be loaded. Check your connection and try again.')
  return new Uint8Array(await res.arrayBuffer())
}

/** Re-encodes images pdf-lib can't embed as PNG, where the browser can decode them in a worker. */
async function convertImage(img: DocImage): Promise<Uint8Array | null> {
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined' || !MIME[img.format]) return null
  try {
    const bitmap = await createImageBitmap(new Blob([img.bytes as BlobPart], { type: MIME[img.format] }))
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
    bitmap.close()
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    return new Uint8Array(await blob.arrayBuffer())
  } catch {
    return null
  }
}

const post = (msg: unknown, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer)

self.onmessage = async (event: MessageEvent<Request>) => {
  try {
    const result = await convertDocxToPdf(event.data.bytes, {
      loadFont,
      convertImage,
      onProgress: (stage, done, total) => post({ type: 'progress', stage, done, total }),
    })
    post({ type: 'done', ...result }, [result.bytes.buffer])
  } catch (e) {
    const known = e instanceof DocxError
    const memory = e instanceof RangeError || (e instanceof Error && /memory|allocation/i.test(e.message))
    post({
      type: 'error',
      message: known
        ? e.message
        : memory
          ? 'The browser ran out of memory converting this document. Try a smaller document, or close other tabs and try again.'
          : e instanceof Error && e.message.startsWith('A font')
            ? e.message
            : 'The document couldn’t be converted. It may be damaged or use features this converter doesn’t support.',
    })
  }
}
