// The Create Studio design engine. Templates produce a list of simple
// elements (rectangles, text, images, QR codes…) in points, with the origin at
// the top-left. The same elements are drawn by the SVG renderer (preview, PNG
// and print) and the pdf-lib exporter (vector PDF), so every output matches.
//
// Text is measured with the metrics of the PDF standard fonts, and the preview
// uses metric-compatible system fonts (Arial/Helvetica, Times, Courier), so
// line breaks are identical in the editor, the PNG and the PDF.
import { StandardFontEmbedder, StandardFonts } from '@cantoo/pdf-lib'
import qrcode from 'qrcode-generator'

export type FontFamily = 'sans' | 'serif' | 'mono'

export interface ImageValue {
  /** JPEG or PNG data URL, downscaled when uploaded. */
  src: string
  width: number
  height: number
  /** 1 = cover the frame; larger zooms in. */
  zoom: number
  /** Pan within the frame, -1..1 on each axis. */
  ox: number
  oy: number
}

interface Base {
  opacity?: number
  /** For a list bullet: the text it belongs to starts this far to its right (kept beside it when mirrored). */
  bulletFor?: number
}

export type El =
  | (Base & { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; r?: number; dash?: number[] })
  | (Base & { t: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number })
  | (Base & { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; sw: number; dash?: number[] })
  | (Base & { t: 'path'; d: string; fill?: string; stroke?: string; sw?: number })
  | (Base & {
      t: 'text'
      /** Anchor x (left, centre or right edge depending on align). */
      x: number
      /** Baseline of the first line. */
      y: number
      lines: string[]
      size: number
      font: FontFamily
      bold?: boolean
      italic?: boolean
      color: string
      align: 'left' | 'center' | 'right'
      /** Line height in points. */
      lh: number
      /** Letter spacing in points. */
      ls?: number
      /** Field this text comes from, for accessible names and tests. */
      field?: string
    })
  | (Base & {
      t: 'image'
      x: number
      y: number
      w: number
      h: number
      image?: ImageValue
      shape: 'rect' | 'rounded' | 'circle'
      r?: number
      /** Editor-only placeholder when no image is set. */
      placeholder?: 'person' | 'logo' | 'photo' | 'signature'
      fit?: 'cover' | 'contain'
      field?: string
    })
  | (Base & { t: 'qr'; x: number; y: number; size: number; data: string; color: string; bg?: string })
  /** Rotated (clockwise, degrees) or mirrored (about x = mirror) children. */
  | { t: 'group'; cx: number; cy: number; rot: number; mirror?: number; children: El[] }

export interface DesignPage {
  els: El[]
  label?: string
}

export interface Design {
  /** Trim size in points. */
  width: number
  height: number
  /** Print bleed in points around the trim edge (0 for screen designs). */
  bleed: number
  /** Inset of the safe area from the trim edge, shown as a guide. */
  safe?: number
  pages: DesignPage[]
}

// ---------------------------------------------------------------------------
// Fonts and text

const FONT_FILES: Record<string, StandardFonts> = {
  'sans-0-0': StandardFonts.Helvetica,
  'sans-1-0': StandardFonts.HelveticaBold,
  'sans-0-1': StandardFonts.HelveticaOblique,
  'sans-1-1': StandardFonts.HelveticaBoldOblique,
  'serif-0-0': StandardFonts.TimesRoman,
  'serif-1-0': StandardFonts.TimesRomanBold,
  'serif-0-1': StandardFonts.TimesRomanItalic,
  'serif-1-1': StandardFonts.TimesRomanBoldItalic,
  'mono-0-0': StandardFonts.Courier,
  'mono-1-0': StandardFonts.CourierBold,
  'mono-0-1': StandardFonts.CourierOblique,
  'mono-1-1': StandardFonts.CourierBoldOblique,
}

export function fontKey(font: FontFamily, bold?: boolean, italic?: boolean) {
  return `${font}-${bold ? 1 : 0}-${italic ? 1 : 0}`
}

export function standardFontFor(font: FontFamily, bold?: boolean, italic?: boolean): StandardFonts {
  return FONT_FILES[fontKey(font, bold, italic)]
}

const embedders = new Map<string, StandardFontEmbedder>()
function embedder(font: FontFamily, bold?: boolean, italic?: boolean) {
  const key = fontKey(font, bold, italic)
  let e = embedders.get(key)
  if (!e) {
    e = StandardFontEmbedder.for(FONT_FILES[key] as unknown as Parameters<typeof StandardFontEmbedder.for>[0])
    embedders.set(key, e)
  }
  return e
}

export const CSS_FONTS: Record<FontFamily, string> = {
  sans: 'Arial, Helvetica, "Liberation Sans", Arimo, sans-serif',
  serif: '"Times New Roman", Times, "Liberation Serif", Tinos, serif',
  mono: '"Courier New", Courier, "Liberation Mono", Cousine, monospace',
}

const encodableCache = new Map<string, boolean>()
/** Replaces characters the PDF standard fonts can't encode, so every output shows the same text. */
export function toWinAnsi(text: string): string {
  const e = embedder('sans')
  return Array.from(text.replace(/[   \t]/g, ' '))
    .map((ch) => {
      if (ch === '\n') return ch
      let ok = encodableCache.get(ch)
      if (ok === undefined) {
        // The encoder silently turns unknown characters into "?", so ask the encoding directly.
        ok = e.encoding.canEncodeUnicodeCodePoint(ch.codePointAt(0)!)
        encodableCache.set(ch, ok)
      }
      if (ok) return ch
      const plain = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '')
      return plain && plain !== ch && Array.from(plain).every((c) => toWinAnsi(c) === c) ? plain : '?'
    })
    .join('')
}

/** True if the text contains characters that will be replaced in the design. */
export function hasUnsupportedChars(text: string) {
  return toWinAnsi(text) !== text.replace(/[   ]/g, ' ')
}

export function measure(text: string, size: number, font: FontFamily = 'sans', bold?: boolean, italic?: boolean, ls = 0) {
  const t = toWinAnsi(text)
  return embedder(font, bold, italic).widthOfTextAtSize(t, size) + ls * Math.max(0, t.length - 1)
}

/** Greedy word wrap. Long words are broken by character. */
export function wrap(text: string, maxW: number, size: number, font: FontFamily, bold?: boolean, italic?: boolean, ls = 0): string[] {
  const out: string[] = []
  for (const para of toWinAnsi(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    if (!words.length) {
      out.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate, size, font, bold, italic, ls) <= maxW || !line) {
        if (!line && measure(word, size, font, bold, italic, ls) > maxW) {
          // Break a single overlong word.
          let chunk = ''
          for (const ch of word) {
            if (measure(chunk + ch, size, font, bold, italic, ls) > maxW && chunk) {
              out.push(chunk)
              chunk = ch
            } else chunk += ch
          }
          line = chunk
        } else line = candidate
      } else {
        out.push(line)
        line = word
      }
    }
    out.push(line)
  }
  return out
}

export interface TextOpts {
  x: number
  y: number
  text: string
  size: number
  font?: FontFamily
  bold?: boolean
  italic?: boolean
  color: string
  align?: 'left' | 'center' | 'right'
  /** Wrap width; omit for a single line. */
  w?: number
  /** Line height as a multiple of size. */
  leading?: number
  ls?: number
  upper?: boolean
  maxLines?: number
  /** Shrink the size (down to minSize) until the text fits on one line of width w. */
  fit?: boolean
  minSize?: number
  opacity?: number
  field?: string
}

/** Builds a text element with wrapping, fitting and truncation applied. */
export function T(o: TextOpts): El {
  const font = o.font ?? 'sans'
  const text = o.upper ? o.text.toUpperCase() : o.text
  let size = o.size
  if (o.fit && o.w) {
    const min = o.minSize ?? size * 0.55
    while (size > min && measure(text, size, font, o.bold, o.italic, o.ls) > o.w) size -= 0.5
  }
  let lines = o.w && !o.fit ? wrap(text, o.w, size, font, o.bold, o.italic, o.ls) : [toWinAnsi(text)]
  if (o.maxLines && lines.length > o.maxLines) {
    lines = lines.slice(0, o.maxLines)
    let last = lines[o.maxLines - 1]
    while (last && o.w && measure(`${last}…`, size, font, o.bold, o.italic, o.ls) > o.w) last = last.slice(0, -1)
    lines[o.maxLines - 1] = `${last.trimEnd()}…`
  }
  return {
    t: 'text',
    x: o.x,
    y: o.y,
    lines,
    size,
    font,
    bold: o.bold,
    italic: o.italic,
    color: o.color,
    align: o.align ?? 'left',
    lh: size * (o.leading ?? 1.25),
    ls: o.ls,
    opacity: o.opacity,
    field: o.field,
  }
}

/** Height a text element occupies below its first baseline (for stacking). */
export function textHeight(el: El) {
  return el.t === 'text' ? (el.lines.length - 1) * el.lh + el.size * 0.3 : 0
}

// ---------------------------------------------------------------------------
// QR codes (generated locally)

export function qrModules(data: string): boolean[][] {
  const qr = qrcode(0, 'M')
  qr.addData(toWinAnsi(data).slice(0, 600))
  qr.make()
  const n = qr.getModuleCount()
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)))
}

/** One SVG path covering the dark modules, in a size×size box at (x, y). */
export function qrPath(data: string, x: number, y: number, size: number) {
  const m = qrModules(data)
  const n = m.length + 2 // one-module quiet zone each side
  const s = size / n
  let d = ''
  m.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (dark) d += `M${(x + (c + 1) * s).toFixed(2)} ${(y + (r + 1) * s).toFixed(2)}h${s.toFixed(2)}v${s.toFixed(2)}h-${s.toFixed(2)}Z`
    })
  )
  return d
}

// ---------------------------------------------------------------------------
// Colour helpers

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6)
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`
}

/** Relative luminance (WCAG). */
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Dark or white text, whichever reads better on the background. */
export function onColor(bg: string, dark = '#111827') {
  return luminance(bg) > 0.4 ? dark : '#FFFFFF'
}

export const MM = 72 / 25.4
