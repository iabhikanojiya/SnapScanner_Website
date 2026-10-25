// Fixture builders for unit tests: real PDFs and PNGs created in memory, and
// pdf.js (the same renderer the website uses) to verify results independently.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import { PDFDocument, StandardFonts, degrees } from '@cantoo/pdf-lib'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

// Tests run from the repository root (vitest and Playwright both use it as cwd).
const FONTS = join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/')

/** A PDF whose page N contains the text "Page N" (and an optional label). */
export async function makePdf(pageCount: number, opts: { label?: string; rotate?: number; size?: [number, number] } = {}) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage(opts.size ?? [595, 842])
    page.drawText(`${opts.label ?? 'Doc'} Page ${i}`, { x: 72, y: 700, size: 24, font })
    if (opts.rotate) page.setRotation(degrees(opts.rotate))
  }
  return doc.save()
}

/** Text of each page, extracted by pdf.js. */
export async function pageTexts(bytes: Uint8Array, password?: string): Promise<string[]> {
  const task = pdfjs.getDocument({ data: bytes.slice(), password, standardFontDataUrl: FONTS, verbosity: 0 })
  const doc = await task.promise
  const out: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent()
    out.push(tc.items.map((it) => ('str' in it ? it.str : '')).join(''))
  }
  await task.destroy()
  return out
}

export async function openWithPdfjs(bytes: Uint8Array, password?: string) {
  return pdfjs.getDocument({ data: bytes.slice(), password, standardFontDataUrl: FONTS, verbosity: 0 }).promise
}

function crc32(buf: Uint8Array) {
  let c: number
  let crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'latin1')
  Buffer.from(data).copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

/** An RGB PNG filled by `pixel(x, y) → [r, g, b]`. */
export function makePng(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]) {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y)
      const o = y * (width * 3 + 1) + 1 + x * 3
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', new Uint8Array()),
    ])
  )
}

export const photoJpeg = () => new Uint8Array(readFileSync(join(process.cwd(), 'tests/fixtures/photo.jpg')))
/** Dimensions of tests/fixtures/photo.jpg. */
export const PHOTO_SIZE = { width: 574, height: 1280 }
