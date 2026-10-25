// Delivering results to the user: downloads, the Web Share API and ZIP files.
import { zipSync } from 'fflate'

/** Downloads a Blob with the given file name. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function pdfBlob(bytes: Uint8Array) {
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}

/** True if the browser can share this file through the system share sheet. */
export function canShareFile(file: File): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

/**
 * Opens the system share sheet. Resolves false if the user cancelled or the
 * browser can't share files; the file then goes only where the user chooses.
 */
export async function shareFile(file: File, title?: string): Promise<boolean> {
  if (!canShareFile(file)) return false
  try {
    await navigator.share({ files: [file], title: title ?? file.name })
    return true
  } catch {
    return false
  }
}

/** Packs files into a ZIP (stored without recompression; PDFs are already compressed). */
export function zipFiles(files: { name: string; bytes: Uint8Array }[]): Blob {
  const used = new Set<string>()
  const entries: Record<string, Uint8Array> = {}
  for (const f of files) {
    let name = f.name
    for (let i = 2; used.has(name.toLowerCase()); i++) name = f.name.replace(/(\.[^.]+)?$/, ` (${i})$1`)
    used.add(name.toLowerCase())
    entries[name] = f.bytes
  }
  const zipped = zipSync(entries, { level: 0 })
  return new Blob([zipped as BlobPart], { type: 'application/zip' })
}
