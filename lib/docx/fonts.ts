// Fonts for Word to PDF. Office fonts can't be shipped, so each is replaced by
// an open-licensed font with the same character widths where one exists
// (Carlito for Calibri, Caladea for Cambria, Arimo for Arial, Tinos for Times
// New Roman, Cousine for Courier New), which keeps line breaks and page
// breaks close to Word's. The files are served from this site (public/word-fonts,
// copied by scripts/copy-assets.mjs) and only the faces a document uses are loaded.
import * as fontkit from '@cantoo/fontkit'
import type { Font } from '@cantoo/fontkit'
import type { RunStyle } from './model'

export type FamilyId = 'carlito' | 'caladea' | 'arimo' | 'tinos' | 'cousine' | 'devanagari'
type Variant = 'r' | 'b' | 'i' | 'bi'
export type FaceKey = `${FamilyId}-${Variant}`

/** Font file names (in public/word-fonts) for every face. */
export const FACE_FILES: Record<FaceKey, string> = {
  'carlito-r': 'Carlito-Regular.ttf',
  'carlito-b': 'Carlito-Bold.ttf',
  'carlito-i': 'Carlito-Italic.ttf',
  'carlito-bi': 'Carlito-BoldItalic.ttf',
  'caladea-r': 'Caladea-Regular.ttf',
  'caladea-b': 'Caladea-Bold.ttf',
  'caladea-i': 'Caladea-Italic.ttf',
  'caladea-bi': 'Caladea-BoldItalic.ttf',
  'arimo-r': 'Arimo-Regular.ttf',
  'arimo-b': 'Arimo-Bold.ttf',
  'arimo-i': 'Arimo-Italic.ttf',
  'arimo-bi': 'Arimo-BoldItalic.ttf',
  'tinos-r': 'Tinos-Regular.ttf',
  'tinos-b': 'Tinos-Bold.ttf',
  'tinos-i': 'Tinos-Italic.ttf',
  'tinos-bi': 'Tinos-BoldItalic.ttf',
  'cousine-r': 'Cousine-Regular.ttf',
  'cousine-b': 'Cousine-Bold.ttf',
  'cousine-i': 'Cousine-Italic.ttf',
  'cousine-bi': 'Cousine-BoldItalic.ttf',
  // Noto Sans Devanagari has no italics; italic text uses the upright faces.
  'devanagari-r': 'NotoSansDevanagari-Regular.ttf',
  'devanagari-b': 'NotoSansDevanagari-Bold.ttf',
  'devanagari-i': 'NotoSansDevanagari-Regular.ttf',
  'devanagari-bi': 'NotoSansDevanagari-Bold.ttf',
}

const SERIF = /times|cambria|georgia|garamond|book antiqua|palatino|bookman|century|constantia|minion|baskerville|didot|bodoni|caslon|serif|tinos|liberation serif|caladea|perpetua|rockwell|lora|merriweather|playfair/i
const MONO = /courier|consolas|mono|lucida console|menlo|monaco|cousine|source code|fira code|inconsolata/i
const DEVANAGARI = /mangal|nirmala|kokila|aparajita|utsaah|devanagari|kruti|sanskrit|lohit/i

/** Picks the bundled family that best stands in for a Word font. */
export function familyFor(name: string): FamilyId {
  const n = name.trim().toLowerCase()
  if (DEVANAGARI.test(n)) return 'devanagari'
  if (MONO.test(n)) return 'cousine'
  if (/^cambria/.test(n) || n === 'caladea') return 'caladea'
  if (SERIF.test(n) && !/sans/.test(n)) return 'tinos'
  // Calibri and fonts of similar width (Aptos, Segoe UI, Candara, Corbel).
  if (/calibri|carlito|aptos|segoe|candara|corbel|gill sans|trebuchet/.test(n)) return 'carlito'
  return 'arimo'
}

export function faceKey(family: FamilyId, bold: boolean, italic: boolean): FaceKey {
  return `${family}-${bold && italic ? 'bi' : bold ? 'b' : italic ? 'i' : 'r'}`
}

export const styleFace = (s: Pick<RunStyle, 'font' | 'bold' | 'italic'>) => faceKey(familyFor(s.font), s.bold, s.italic)

/** Families tried, in order, for characters the requested font doesn't have. */
const FALLBACKS: FamilyId[] = ['arimo', 'tinos', 'devanagari']

export interface LoadedFace {
  key: FaceKey
  bytes: Uint8Array
  font: Font
}

export type FontLoader = (file: string) => Promise<Uint8Array>

const isMark = (ch: string) => /\p{M}/u.test(ch)
const isSpace = (ch: string) => /\s/.test(ch)

/**
 * The loaded faces, with glyph fallback and cached text measurement. Faces
 * are loaded up front for the characters a document uses (`prepare`), so
 * layout itself is synchronous.
 */
export class FontBook {
  readonly faces = new Map<FaceKey, LoadedFace>()
  /** Characters no bundled font can draw. */
  readonly missing = new Set<string>()
  private widths = new Map<string, number>()
  private loading = new Map<string, Promise<Uint8Array>>()

  constructor(private load: FontLoader) {}

  private async ensure(key: FaceKey): Promise<LoadedFace> {
    const have = this.faces.get(key)
    if (have) return have
    const file = FACE_FILES[key]
    if (!this.loading.has(file)) this.loading.set(file, this.load(file))
    const bytes = await this.loading.get(file)!
    const font = fontkit.create(bytes) as Font
    const face = { key, bytes, font }
    this.faces.set(key, face)
    return face
  }

  /** Loads every face needed to draw `uses`: a map of face → characters set in it. */
  async prepare(uses: Map<FaceKey, Set<string>>) {
    for (const [key, chars] of uses) {
      const face = await this.ensure(key)
      let pending = [...chars].filter((c) => !isSpace(c) && !isMark(c) && !face.font.hasGlyphForCodePoint(c.codePointAt(0)!))
      const variant = key.slice(key.indexOf('-') + 1) as Variant
      for (const fam of FALLBACKS) {
        if (!pending.length) break
        const fk = `${fam}-${variant}` as FaceKey
        if (fk === key) continue
        const fb = await this.ensure(fk)
        pending = pending.filter((c) => !fb.font.hasGlyphForCodePoint(c.codePointAt(0)!))
      }
      for (const c of pending) this.missing.add(c)
    }
  }

  /** The face that draws a character, falling back through other loaded families. */
  faceFor(primary: FaceKey, ch: string): FaceKey {
    const face = this.faces.get(primary)
    const cp = ch.codePointAt(0)!
    if (!face || isSpace(ch) || face.font.hasGlyphForCodePoint(cp)) return primary
    const variant = primary.slice(primary.indexOf('-') + 1)
    for (const fam of FALLBACKS) {
      const fk = `${fam}-${variant}` as FaceKey
      const fb = this.faces.get(fk)
      if (fb?.font.hasGlyphForCodePoint(cp)) return fk
    }
    return primary
  }

  /** Splits text into runs that each use a single face. */
  segments(primary: FaceKey, text: string): { face: FaceKey; text: string }[] {
    const out: { face: FaceKey; text: string }[] = []
    for (const ch of text) {
      const last = out[out.length - 1]
      // Combining marks stay with the character they modify.
      const face = last && (isMark(ch) || ch === '‍' || ch === '‌') ? last.face : this.faceFor(primary, ch)
      if (last && last.face === face) last.text += ch
      else out.push({ face, text: ch })
    }
    return out
  }

  /** Advance width of single-face text, in points. */
  width(face: FaceKey, text: string, size: number): number {
    const k = `${face}\u0000${text}`
    let w = this.widths.get(k)
    if (w === undefined) {
      const f = this.faces.get(face)!.font
      w = f.layout(text).advanceWidth / f.unitsPerEm
      this.widths.set(k, w)
    }
    return w * size
  }

  /** Vertical metrics at a size: ascent and descent (positive), and Word's single line height. */
  metrics(face: FaceKey, size: number) {
    const f = this.faces.get(face)!.font
    const upm = f.unitsPerEm
    const ascent = (f.ascent / upm) * size
    const descent = (Math.abs(f.descent) / upm) * size
    return { ascent, descent, lineHeight: ascent + descent + (Math.max(0, f.lineGap) / upm) * size }
  }
}
