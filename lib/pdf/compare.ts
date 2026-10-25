// Comparing two documents: a word-level text diff and a pixel diff of
// rendered pages. Pure functions; rendering happens in the UI.
import { diffWords } from 'diff'

export interface TextChange {
  kind: 'added' | 'removed' | 'same'
  text: string
}

export interface TextComparison {
  changes: TextChange[]
  added: number
  removed: number
  /** Words that were replaced (a removal directly followed by an addition). */
  changed: number
  identical: boolean
}

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Word-level diff of two texts. Whitespace and line breaks are ignored. */
export function compareText(a: string, b: string): TextComparison {
  const parts = diffWords(normalize(a), normalize(b))
  const changes: TextChange[] = parts.map((p) => ({ kind: p.added ? 'added' : p.removed ? 'removed' : 'same', text: p.value }))
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length
  let added = 0
  let removed = 0
  let changed = 0
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i]
    if (c.kind === 'removed' && changes[i + 1]?.kind === 'added') {
      changed += Math.max(words(c.text), words(changes[i + 1].text))
      i++
    } else if (c.kind === 'added') added += words(c.text)
    else if (c.kind === 'removed') removed += words(c.text)
  }
  return { changes, added, removed, changed, identical: added + removed + changed === 0 }
}

export interface PixelDiff {
  /** RGBA highlight image: unchanged pixels faded, differing pixels red. */
  overlay: Uint8ClampedArray
  differing: number
  /** Fraction of pixels that differ. */
  ratio: number
}

/** Compares two same-size RGBA images. `threshold` is the per-channel tolerance (0–255). */
export function diffPixels(a: Uint8ClampedArray, b: Uint8ClampedArray, width: number, height: number, threshold = 40): PixelDiff {
  if (a.length !== width * height * 4 || b.length !== a.length) throw new Error('Images must be the same size.')
  const overlay = new Uint8ClampedArray(a.length)
  let differing = 0
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]))
    if (d > threshold) {
      differing++
      overlay[i] = 229
      overlay[i + 1] = 57
      overlay[i + 2] = 53
      overlay[i + 3] = 255
    } else {
      // A light grey version of the first document for context.
      const l = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]
      const v = 255 - (255 - l) * 0.25
      overlay[i] = overlay[i + 1] = overlay[i + 2] = v
      overlay[i + 3] = 255
    }
  }
  return { overlay, differing, ratio: differing / (width * height) }
}
