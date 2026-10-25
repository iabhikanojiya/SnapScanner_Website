// QR Code Generator: builds QR content for each type (URL, text, email, phone,
// Wi-Fi), validates it, and renders the code as SVG. Everything runs locally
// with qrcode-generator (MIT); nothing is sent to a QR service.
import qrcode from 'qrcode-generator'

export type QrType = 'url' | 'text' | 'email' | 'phone' | 'wifi'
export type QrLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrFields {
  url: string
  text: string
  email: string
  subject: string
  body: string
  phone: string
  ssid: string
  password: string
  security: 'WPA' | 'WEP' | 'nopass'
  hidden: boolean
}

export const EMPTY_FIELDS: QrFields = { url: '', text: '', email: '', subject: '', body: '', phone: '', ssid: '', password: '', security: 'WPA', hidden: false }

export type Payload = { ok: true; data: string } | { ok: false; error: string; empty?: boolean }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Escapes the characters that are special in the Wi-Fi QR format. */
export function escapeWifi(s: string) {
  return s.replace(/([\\;,:"])/g, '\\$1')
}

/** The text a QR code of this type encodes, or why it can't be made. */
export function buildPayload(type: QrType, f: QrFields): Payload {
  switch (type) {
    case 'url': {
      const raw = f.url.trim()
      if (!raw) return { ok: false, error: 'Enter a website address.', empty: true }
      const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
      let u: URL
      try {
        u = new URL(withScheme)
      } catch {
        return { ok: false, error: 'That doesn’t look like a website address.' }
      }
      if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') || /\s/.test(raw)) return { ok: false, error: 'Enter a web address such as example.com or https://example.com/page.' }
      return { ok: true, data: withScheme }
    }
    case 'text':
      return f.text.trim() ? { ok: true, data: f.text } : { ok: false, error: 'Enter some text.', empty: true }
    case 'email': {
      const to = f.email.trim()
      if (!to) return { ok: false, error: 'Enter an email address.', empty: true }
      if (!EMAIL.test(to)) return { ok: false, error: 'Enter a valid email address, like name@example.com.' }
      const params = [f.subject.trim() && `subject=${encodeURIComponent(f.subject.trim())}`, f.body.trim() && `body=${encodeURIComponent(f.body.trim())}`].filter(Boolean)
      return { ok: true, data: `mailto:${to}${params.length ? `?${params.join('&')}` : ''}` }
    }
    case 'phone': {
      const raw = f.phone.trim()
      if (!raw) return { ok: false, error: 'Enter a phone number.', empty: true }
      const cleaned = raw.replace(/[\s().-]/g, '')
      if (!/^\+?\d{3,15}$/.test(cleaned)) return { ok: false, error: 'Enter a phone number using digits, optionally starting with + and a country code.' }
      return { ok: true, data: `tel:${cleaned}` }
    }
    case 'wifi': {
      if (!f.ssid.trim()) return { ok: false, error: 'Enter the network name (SSID).', empty: true }
      if (f.security !== 'nopass' && !f.password) return { ok: false, error: 'Enter the Wi-Fi password, or choose “No password”.' }
      if (f.security === 'WPA' && f.password.length < 8) return { ok: false, error: 'WPA passwords are at least 8 characters.' }
      const parts = [`T:${f.security}`, `S:${escapeWifi(f.ssid)}`, f.security !== 'nopass' ? `P:${escapeWifi(f.password)}` : '', f.hidden ? 'H:true' : ''].filter(Boolean)
      return { ok: true, data: `WIFI:${parts.join(';')};;` }
    }
  }
}

/** UTF-8 bytes as a "binary" string, which qrcode-generator's default byte mode encodes byte-for-byte. */
export function utf8Binary(s: string) {
  let out = ''
  for (const b of new TextEncoder().encode(s)) out += String.fromCharCode(b)
  return out
}

export class QrTooLongError extends Error {
  constructor() {
    super('That’s too much content for a QR code. Shorten it, or choose a lower error-correction level.')
    this.name = 'QrTooLongError'
  }
}

/** Dark/light modules of the QR code for `data` (without the quiet zone). */
export function qrMatrix(data: string, level: QrLevel): boolean[][] {
  const qr = qrcode(0, level)
  qr.addData(utf8Binary(data), 'Byte')
  try {
    qr.make()
  } catch {
    throw new QrTooLongError()
  }
  const n = qr.getModuleCount()
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)))
}

/** One path covering all dark modules, offset by the quiet zone, in module units. */
export function qrPathData(matrix: boolean[][], margin: number) {
  let d = ''
  matrix.forEach((row, r) => {
    // Merge horizontal runs to keep the path short.
    let c = 0
    while (c < row.length) {
      if (!row[c]) {
        c++
        continue
      }
      let end = c
      while (end < row.length && row[end]) end++
      d += `M${c + margin} ${r + margin}h${end - c}v1h-${end - c}z`
      c = end
    }
  })
  return d
}

/** Standalone SVG document. */
export function qrSvg(matrix: boolean[][], opts: { margin: number; fg: string; bg: string; size: number }) {
  const total = matrix.length + opts.margin * 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.size}" height="${opts.size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${opts.bg}"/><path d="${qrPathData(matrix, opts.margin)}" fill="${opts.fg}"/></svg>`
}

/** Pixel size per module and the resulting image size for a requested size (whole pixels keep edges sharp). */
export function pngGeometry(modules: number, margin: number, requested: number) {
  const total = modules + margin * 2
  const cell = Math.max(1, Math.floor(requested / total))
  return { cell, size: cell * total }
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two hex colours. */
export function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Readability problems with the chosen colours, if any. */
export function colourWarning(fg: string, bg: string): string | null {
  if (luminance(fg) > luminance(bg)) return 'Light codes on a dark background (inverted) can’t be read by many scanner apps. Use a darker foreground than background.'
  if (contrast(fg, bg) < 4) return 'The colours are too similar for reliable scanning. Increase the contrast.'
  return null
}
