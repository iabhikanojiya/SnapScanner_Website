// Compress PDF: recompresses and downsamples the raster images inside a PDF,
// removes unreachable objects and saves with object streams. Text, fonts and
// vector graphics are copied unchanged.
import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  decodePDFRawStream,
  type PDFDocument,
} from '@cantoo/pdf-lib'
import { removeUnreachableObjects, savePdf, type Bytes } from './document'
import { PdfJobError, type NamedPdf, type Progress } from './operations'
import { openPdf, PdfPasswordError, PdfInvalidError } from './document'

export type CompressionLevel = 'high' | 'medium' | 'low'

/** High = smallest file. Long-side pixel caps and JPEG quality per level. */
export const COMPRESSION_SETTINGS: Record<CompressionLevel, { maxSide: number; quality: number; label: string }> = {
  high: { maxSide: 1200, quality: 0.5, label: 'Smallest file, lower image quality' },
  medium: { maxSide: 1800, quality: 0.68, label: 'Good balance of size and quality' },
  low: { maxSide: 2600, quality: 0.82, label: 'Best image quality, smaller savings' },
}

export type ImageInput =
  | { kind: 'jpeg'; bytes: Bytes; width: number; height: number }
  | { kind: 'raw'; pixels: Bytes; width: number; height: number; components: 1 | 3 }

export interface RecompressedImage {
  bytes: Bytes
  width: number
  height: number
  /** True if the JPEG is single-channel. Browsers' encoders always produce RGB. */
  gray: boolean
}

/** Decodes and re-encodes an image as JPEG. The browser implementation uses canvas. */
export interface ImageRecoder {
  recompress(input: ImageInput, opts: { maxSide: number; quality: number }): Promise<RecompressedImage | null>
}

export interface CompressResult {
  bytes: Bytes
  originalSize: number
  size: number
  imagesFound: number
  imagesRecompressed: number
  /** False when no smaller file could be produced; `bytes` is then the original. */
  reduced: boolean
}

/** Images smaller than this aren't worth re-encoding. */
const MIN_IMAGE_BYTES = 8 * 1024
/** A recompressed image must be at least this much smaller to replace the original. */
const MIN_GAIN = 0.9

function name(dict: PDFDict, key: string): string | undefined {
  const v = dict.lookup(PDFName.of(key))
  return v instanceof PDFName ? v.decodeText() : undefined
}

function num(dict: PDFDict, key: string): number | undefined {
  const v = dict.lookup(PDFName.of(key))
  return v instanceof PDFNumber ? v.asNumber() : undefined
}

/** Number of colour components for colour spaces we can safely re-encode, else null. */
function componentsOf(dict: PDFDict): 1 | 3 | null {
  const cs = dict.lookup(PDFName.of('ColorSpace'))
  if (cs instanceof PDFName) {
    const n = cs.decodeText()
    if (n === 'DeviceRGB' || n === 'CalRGB') return 3
    if (n === 'DeviceGray' || n === 'CalGray') return 1
    return null
  }
  if (cs instanceof PDFArray && cs.size() >= 2) {
    const family = cs.lookup(0)
    if (!(family instanceof PDFName)) return null
    const f = family.decodeText()
    if (f === 'CalRGB') return 3
    if (f === 'CalGray') return 1
    if (f === 'ICCBased') {
      const profile = cs.lookup(1)
      const n = profile instanceof PDFRawStream ? num(profile.dict, 'N') : undefined
      return n === 3 ? 3 : n === 1 ? 1 : null
    }
  }
  return null
}

/** Collects images that must not be altered: soft masks and stencil masks. */
function maskRefs(doc: PDFDocument): Set<string> {
  const refs = new Set<string>()
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue
    for (const key of ['SMask', 'Mask']) {
      const v = obj.dict.get(PDFName.of(key))
      if (v instanceof PDFRef) refs.add(v.toString())
    }
  }
  return refs
}

function filtersOf(dict: PDFDict): string[] {
  const f = dict.lookup(PDFName.of('Filter'))
  if (f instanceof PDFName) return [f.decodeText()]
  if (f instanceof PDFArray) return f.asArray().map((x) => (x instanceof PDFName ? x.decodeText() : '?'))
  return []
}

interface Candidate {
  ref: PDFRef
  stream: PDFRawStream
  input: ImageInput
}

/** Finds images that can be re-encoded without changing how they render. */
function findCandidates(doc: PDFDocument): { candidates: Candidate[]; imagesFound: number } {
  const masks = maskRefs(doc)
  const candidates: Candidate[] = []
  let imagesFound = 0
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue
    const d = obj.dict
    if (name(d, 'Subtype') !== 'Image') continue
    imagesFound++
    if (masks.has(ref.toString())) continue
    if (d.lookup(PDFName.of('ImageMask'))?.toString() === 'true') continue
    // Colour-key masks and /Decode arrays change how pixel values map to colour.
    if (d.lookup(PDFName.of('Mask')) instanceof PDFArray || d.has(PDFName.of('Decode'))) continue
    if (num(d, 'BitsPerComponent') !== 8) continue
    const width = num(d, 'Width')
    const height = num(d, 'Height')
    if (!width || !height || width * height > 40_000_000) continue
    const components = componentsOf(d)
    if (!components) continue
    if (obj.contents.length < MIN_IMAGE_BYTES) continue

    const filters = filtersOf(d)
    if (filters.length === 1 && filters[0] === 'DCTDecode') {
      candidates.push({ ref, stream: obj, input: { kind: 'jpeg', bytes: obj.contents, width, height } })
    } else if (filters.every((f) => f === 'FlateDecode' || f === 'LZWDecode' || f === 'RunLengthDecode')) {
      // Predictors are handled by pdf-lib's decoder only for some cases; skip them.
      if (d.has(PDFName.of('DecodeParms'))) continue
      try {
        const pixels = decodePDFRawStream(obj).decode()
        if (pixels.length < width * height * components) continue
        candidates.push({ ref, stream: obj, input: { kind: 'raw', pixels, width, height, components } })
      } catch {
        // Undecodable stream: leave it as it is.
      }
    }
  }
  return { candidates, imagesFound }
}

export async function compressPdf(
  input: NamedPdf,
  level: CompressionLevel,
  recoder: ImageRecoder,
  onProgress?: Progress
): Promise<CompressResult> {
  let doc: PDFDocument
  try {
    doc = await openPdf(input.bytes, input.password)
  } catch (e) {
    if (e instanceof PdfPasswordError)
      throw new PdfJobError(`“${input.name}” is password-protected. Unlock it first, then compress it.`, input.name)
    if (e instanceof PdfInvalidError) throw new PdfJobError(`“${input.name}”: ${e.message}`, input.name)
    throw e
  }
  if (doc.isEncrypted) throw new PdfJobError(`“${input.name}” is encrypted. Unlock it first, then compress it.`)

  const settings = COMPRESSION_SETTINGS[level]
  const { candidates, imagesFound } = findCandidates(doc)
  let recompressed = 0

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    const result = await recoder.recompress(c.input, settings).catch(() => null)
    if (result && result.bytes.length < c.stream.contents.length * MIN_GAIN) {
      const old = c.stream.dict
      const dict = doc.context.obj({
        Type: 'XObject',
        Subtype: 'Image',
        Width: result.width,
        Height: result.height,
        BitsPerComponent: 8,
        ColorSpace: result.gray ? 'DeviceGray' : 'DeviceRGB',
        Filter: 'DCTDecode',
        Length: result.bytes.length,
      })
      // Keep transparency and rendering hints. Soft masks may differ in size
      // from the image they apply to, so downsampling the image is safe.
      for (const key of ['SMask', 'Mask', 'Intent', 'Interpolate', 'SMaskInData']) {
        const v = old.get(PDFName.of(key))
        if (v !== undefined) dict.set(PDFName.of(key), v)
      }
      doc.context.assign(c.ref, PDFRawStream.of(dict, result.bytes))
      recompressed++
    }
    onProgress?.(i + 1, candidates.length)
  }

  removeUnreachableObjects(doc.context)
  const bytes = await savePdf(doc)
  const originalSize = input.bytes.length
  if (bytes.length >= originalSize) {
    return { bytes: input.bytes, originalSize, size: originalSize, imagesFound, imagesRecompressed: 0, reduced: false }
  }
  return { bytes, originalSize, size: bytes.length, imagesFound, imagesRecompressed: recompressed, reduced: true }
}
