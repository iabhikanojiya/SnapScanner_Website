// Identifies files by their leading bytes rather than trusting the extension or
// the browser-reported MIME type, which come from the file name.
import { LIMITS, formatBytes } from '@/lib/limits'

export type SniffedKind = 'pdf' | 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp' | 'heic' | 'unknown'

export const IMAGE_MIME: Record<Exclude<SniffedKind, 'pdf' | 'unknown'>, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  heic: 'image/heic',
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length))
}

/** Detects the file type from its first bytes (at least 16; 1024 for PDFs with a preamble). */
export function sniff(bytes: Uint8Array): SniffedKind {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG' && bytes[4] === 0x0d && bytes[5] === 0x0a)
    return 'png'
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp'
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a')) return 'gif'
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return 'bmp'
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp' && /^(heic|heix|hevc|mif1|msf1|heim|heis)$/.test(ascii(bytes, 8, 4)))
    return 'heic'
  // The PDF header must appear within the first 1024 bytes (ISO 32000-1, 7.5.2 notes).
  const head = ascii(bytes, 0, Math.min(bytes.length, 1024))
  if (head.includes('%PDF-')) return 'pdf'
  return 'unknown'
}

export class FileRejectedError extends Error {
  constructor(
    message: string,
    readonly fileName: string
  ) {
    super(message)
    this.name = 'FileRejectedError'
  }
}

export type Accept = 'pdf' | 'image' | 'pdf-or-image'

/** Image types browsers can decode everywhere. HEIC is only decodable in Safari. */
const PORTABLE_IMAGES: SniffedKind[] = ['jpeg', 'png', 'webp', 'gif', 'bmp']

export interface CheckedFile {
  file: File
  kind: SniffedKind
}

/**
 * Validates a user-selected file. Throws FileRejectedError with a message that
 * can be shown as-is.
 */
export async function checkFile(file: File, accept: Accept): Promise<CheckedFile> {
  if (file.size === 0) throw new FileRejectedError(`“${file.name}” is empty.`, file.name)
  const kind = sniff(new Uint8Array(await file.slice(0, 1024).arrayBuffer()))
  const wantPdf = accept === 'pdf' || accept === 'pdf-or-image'
  const wantImage = accept === 'image' || accept === 'pdf-or-image'

  if (kind === 'pdf' && wantPdf) {
    if (file.size > LIMITS.pdfBytes)
      throw new FileRejectedError(
        `“${file.name}” is ${formatBytes(file.size)}. PDFs up to ${formatBytes(LIMITS.pdfBytes)} are supported.`,
        file.name
      )
    return { file, kind }
  }
  if (PORTABLE_IMAGES.includes(kind) && wantImage) {
    if (file.size > LIMITS.imageBytes)
      throw new FileRejectedError(
        `“${file.name}” is ${formatBytes(file.size)}. Images up to ${formatBytes(LIMITS.imageBytes)} are supported.`,
        file.name
      )
    return { file, kind }
  }
  if (kind === 'heic' && wantImage) {
    throw new FileRejectedError(
      `“${file.name}” is a HEIC photo, which most browsers can’t decode. Convert it to JPG first (on iPhone: Settings → Camera → Formats → Most Compatible).`,
      file.name
    )
  }
  const expected = accept === 'pdf' ? 'a PDF' : accept === 'image' ? 'a JPG, PNG, WebP, GIF or BMP image' : 'a PDF or image'
  const actual = kind === 'unknown' ? 'not a recognized file type' : kind === 'pdf' ? 'a PDF' : 'an image'
  throw new FileRejectedError(`“${file.name}” is ${actual}. Choose ${expected}.`, file.name)
}

/** Validates several files, separating accepted files from rejection messages. */
export async function checkFiles(files: Iterable<File>, accept: Accept) {
  const accepted: CheckedFile[] = []
  const errors: string[] = []
  for (const file of files) {
    try {
      accepted.push(await checkFile(file, accept))
    } catch (e) {
      errors.push(e instanceof FileRejectedError ? e.message : `“${file.name}” couldn’t be read.`)
    }
  }
  return { accepted, errors }
}

/** Ensures a download name is safe and ends with the extension. */
export function safeFileName(name: string, ext: string): string {
  const base = name
    .normalize('NFC')
    .replace(/\.[a-z0-9]{1,5}$/i, '')
    // Path separators, control characters and characters Windows forbids.
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  return `${base || 'document'}.${ext}`
}

export function baseName(name: string) {
  return name.replace(/\.[a-z0-9]{1,5}$/i, '')
}
