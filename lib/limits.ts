// Input limits for the browser tools. Everything runs in the visitor's tab, so
// these keep memory use reasonable on phones and low-end laptops. Change them
// here; every tool and the file library read from this module.

const MB = 1024 * 1024

export const LIMITS = {
  /** Largest PDF a tool will open. */
  pdfBytes: 150 * MB,
  /** Largest image a tool will open. */
  imageBytes: 40 * MB,
  /** Images are scaled down to at most this many pixels on the long side when decoded for editing. */
  imageMaxSide: 4000,
  /** PDFs with more pages are rejected by tools that render every page. */
  pdfPages: 1000,
  /** Maximum files in one merge, image-to-PDF or scan session. */
  filesPerJob: 60,
  /** Largest single file stored in the library. */
  libraryFileBytes: 200 * MB,
} as const

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}
