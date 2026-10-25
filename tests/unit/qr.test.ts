import { describe, expect, it } from 'vitest'
import { EMPTY_FIELDS, QrTooLongError, buildPayload, colourWarning, escapeWifi, pngGeometry, qrMatrix, qrSvg, utf8Binary, type QrFields } from '@/lib/qr'

const f = (patch: Partial<QrFields>): QrFields => ({ ...EMPTY_FIELDS, ...patch })

describe('QR content', () => {
  it('builds website addresses and rejects invalid ones', () => {
    expect(buildPayload('url', f({ url: 'example.com/page' }))).toEqual({ ok: true, data: 'https://example.com/page' })
    expect(buildPayload('url', f({ url: 'http://example.com' }))).toEqual({ ok: true, data: 'http://example.com' })
    expect(buildPayload('url', f({ url: '' }))).toMatchObject({ ok: false, empty: true })
    expect(buildPayload('url', f({ url: 'not a url' })).ok).toBe(false)
    expect(buildPayload('url', f({ url: 'javascript:alert(1)' })).ok).toBe(false)
    expect(buildPayload('url', f({ url: 'localhost' })).ok).toBe(false)
  })

  it('builds email links with an encoded subject and body', () => {
    expect(buildPayload('email', f({ email: 'a@b.co', subject: 'Hi there', body: 'Line & more' }))).toEqual({ ok: true, data: 'mailto:a@b.co?subject=Hi%20there&body=Line%20%26%20more' })
    expect(buildPayload('email', f({ email: 'a@b.co' }))).toEqual({ ok: true, data: 'mailto:a@b.co' })
    expect(buildPayload('email', f({ email: 'nope' })).ok).toBe(false)
  })

  it('builds phone links from formatted numbers', () => {
    expect(buildPayload('phone', f({ phone: '+1 (555) 010-0123' }))).toEqual({ ok: true, data: 'tel:+15550100123' })
    expect(buildPayload('phone', f({ phone: 'call me' })).ok).toBe(false)
  })

  it('builds Wi-Fi codes with escaped special characters', () => {
    expect(escapeWifi('a;b,c:d"e\\f')).toBe('a\\;b\\,c\\:d\\"e\\\\f')
    expect(buildPayload('wifi', f({ ssid: 'Home;Net', password: 'pass:word1', security: 'WPA', hidden: true }))).toEqual({ ok: true, data: 'WIFI:T:WPA;S:Home\\;Net;P:pass\\:word1;H:true;;' })
    expect(buildPayload('wifi', f({ ssid: 'Cafe', security: 'nopass' }))).toEqual({ ok: true, data: 'WIFI:T:nopass;S:Cafe;;' })
    expect(buildPayload('wifi', f({ ssid: 'Cafe', password: 'short', security: 'WPA' })).ok).toBe(false)
    expect(buildPayload('wifi', f({ ssid: '' }))).toMatchObject({ ok: false, empty: true })
  })

  it('keeps plain text as typed', () => {
    expect(buildPayload('text', f({ text: '  Hello\nworld ' }))).toEqual({ ok: true, data: '  Hello\nworld ' })
    expect(buildPayload('text', f({ text: '   ' })).ok).toBe(false)
  })
})

describe('QR rendering', () => {
  it('encodes non-Latin text as UTF-8 bytes', () => {
    expect(utf8Binary('é✓')).toBe('\xc3\xa9\xe2\x9c\x93')
    // A UTF-8 code is larger than one that dropped the high bytes would be.
    expect(qrMatrix('Grüße 你好 ✓', 'M').length).toBeGreaterThanOrEqual(21)
  })

  it('uses denser codes for higher error correction, and reports content that is too long', () => {
    const data = 'https://example.com/a/fairly/long/path?with=query&and=more'
    expect(qrMatrix(data, 'H').length).toBeGreaterThan(qrMatrix(data, 'L').length)
    expect(() => qrMatrix('x'.repeat(3000), 'H')).toThrow(QrTooLongError)
  })

  it('has finder patterns in three corners', () => {
    const m = qrMatrix('https://snapscanner.vercel.app', 'M')
    const n = m.length
    for (const [r, c] of [
      [0, 0],
      [0, n - 7],
      [n - 7, 0],
    ]) {
      for (let i = 0; i < 7; i++) expect(m[r][c + i] && m[r + 6][c + i] && m[r + i][c] && m[r + i][c + 6]).toBe(true)
      expect(m[r + 1][c + 1]).toBe(false)
      expect(m[r + 3][c + 3]).toBe(true)
    }
  })

  it('writes SVG with the chosen colours, margin and size', () => {
    const m = qrMatrix('hello', 'L')
    const svg = qrSvg(m, { margin: 4, fg: '#123456', bg: '#fafafa', size: 512 })
    const total = m.length + 8
    expect(svg).toContain(`viewBox="0 0 ${total} ${total}"`)
    expect(svg).toContain('width="512" height="512"')
    expect(svg).toContain('fill="#123456"')
    expect(svg).toContain('fill="#fafafa"')
    // Dark modules start after the quiet zone.
    expect(svg).toMatch(/d="M4 4h7/)
  })

  it('sizes PNGs with whole-pixel modules', () => {
    expect(pngGeometry(25, 4, 1024)).toEqual({ cell: 31, size: 1023 })
    expect(pngGeometry(25, 0, 10)).toEqual({ cell: 1, size: 25 })
  })

  it('warns about inverted or low-contrast colours', () => {
    expect(colourWarning('#111827', '#ffffff')).toBeNull()
    expect(colourWarning('#ffffff', '#000000')).toMatch(/inverted/)
    expect(colourWarning('#888888', '#999999')).toBeTruthy()
  })
})

describe('QR design templates', () => {
  it('has distinct templates that render well-formed SVG', async () => {
    const { QR_TEMPLATES, styledQrSvg, modulesPath, inEye } = await import('@/lib/qr-style')
    expect(QR_TEMPLATES.length).toBeGreaterThanOrEqual(10)
    expect(new Set(QR_TEMPLATES.map((t) => t.id)).size).toBe(QR_TEMPLATES.length)
    // No two templates share the same combination of shapes, frame and colours.
    expect(new Set(QR_TEMPLATES.map((t) => JSON.stringify([t.style, t.fg, t.bg]))).size).toBe(QR_TEMPLATES.length)
    const m = qrMatrix('https://snapscanner.vercel.app/tools', 'M')
    for (const t of QR_TEMPLATES) {
      const out = styledQrSvg(m, { fg: t.fg, bg: t.bg, margin: 4, style: t.style, label: 'SCAN <ME>', size: 400 })
      expect(out.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="400"'), t.id).toBe(true)
      for (const tag of out.svg.matchAll(/<([a-zA-Z]+)((?:\s+[^\s=>/]+="[^"]*")*)\s*\/?>/g)) {
        const names = [...tag[2].matchAll(/\s([^\s=]+)=/g)].map((x) => x[1])
        expect(new Set(names).size, `${t.id} <${tag[1]}>`).toBe(names.length)
      }
      if (t.style.frame === 'none') expect(out.height).toBe(out.width)
      else {
        expect(out.svg).toContain('SCAN &lt;ME&gt;')
        if (t.style.frame !== 'banner') expect(out.height).toBeGreaterThan(out.width)
      }
    }
    // Eye modules are drawn separately, never as data modules.
    expect(inEye(0, 0, 25) && inEye(6, 24, 25) && inEye(24, 6, 25) && !inEye(24, 24, 25)).toBe(true)
    const onlyEyes = m.map((row, r) => row.map((d, c) => d && inEye(r, c, m.length)))
    for (const shape of ['square', 'rounded', 'dots', 'tiny', 'bars'] as const) expect(modulesPath(onlyEyes, shape, 4)).toBe('')
  })
})
