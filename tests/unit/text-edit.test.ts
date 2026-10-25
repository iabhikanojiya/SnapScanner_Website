import { describe, expect, it } from 'vitest'
import { PDFDocument } from '@cantoo/pdf-lib'
import { DEFAULT_STYLE, applyTextEdits, familyFor, fittedHeight, layoutText, type EditBox } from '@/lib/pdf/text-edit'
import { makePdf, openWithPdfjs, pageTexts } from './helpers'

const box = (patch: Partial<EditBox>): EditBox => ({ id: 'b', page: 0, rect: { x: 0.1, y: 0.1, w: 0.5, h: 0.05 }, fill: null, text: 'Hello', style: { ...DEFAULT_STYLE }, ...patch })

/** Display-space position (normalized) of the first text item containing `needle`. */
async function textPosition(bytes: Uint8Array, pageIndex: number, needle: string) {
  const doc = await openWithPdfjs(bytes)
  const page = await doc.getPage(pageIndex + 1)
  const vp = page.getViewport({ scale: 1 })
  const tc = await page.getTextContent()
  const item = tc.items.find((it) => 'str' in it && it.str.includes(needle)) as { transform: number[] } | undefined
  if (!item) throw new Error(`"${needle}" not found`)
  const [x, y] = vp.convertToViewportPoint(item.transform[4], item.transform[5])
  await doc.loadingTask.destroy()
  return { x: x / vp.width, y: y / vp.height }
}

describe('text layout', () => {
  it('wraps to the box width and reports overflow', () => {
    const l = layoutText(box({ text: 'The quick brown fox jumps over the lazy dog again and again', rect: { x: 0, y: 0, w: 0.2, h: 0.02 } }), 595, 842)
    expect(l.lines.length).toBeGreaterThan(2)
    expect(l.overflow).toBe(true)
    const fit = fittedHeight(box({ text: 'One\nTwo\nThree' }), 595, 842)
    const laid = layoutText(box({ text: 'One\nTwo\nThree', rect: { x: 0, y: 0, w: 0.5, h: fit } }), 595, 842)
    expect(laid.lines.map((x) => x.text)).toEqual(['One', 'Two', 'Three'])
    expect(laid.overflow).toBe(false)
  })

  it('aligns lines left, centre and right inside the box', () => {
    const w = 0.5 * 595
    const left = layoutText(box({ style: { ...DEFAULT_STYLE, align: 'left' } }), 595, 842).lines[0]
    const center = layoutText(box({ style: { ...DEFAULT_STYLE, align: 'center' } }), 595, 842).lines[0]
    const right = layoutText(box({ style: { ...DEFAULT_STYLE, align: 'right' } }), 595, 842).lines[0]
    expect(left.x).toBe(2)
    expect(center.x).toBeGreaterThan(w * 0.3)
    expect(right.x).toBeGreaterThan(center.x)
  })

  it('flags characters the standard fonts cannot draw', () => {
    expect(layoutText(box({ text: 'Café' }), 595, 842).unsupported).toBe(false)
    expect(layoutText(box({ text: 'नमस्ते' }), 595, 842).unsupported).toBe(true)
  })

  it('maps pdf.js font families to standard fonts', () => {
    expect(familyFor('serif')).toBe('serif')
    expect(familyFor('sans-serif')).toBe('sans')
    expect(familyFor('monospace')).toBe('mono')
    expect(familyFor(undefined, 'TimesNewRomanPSMT')).toBe('serif')
  })
})

describe('applyTextEdits', () => {
  it('keeps every page and its size, and adds the new text', async () => {
    const src = await makePdf(3, { label: 'Doc' })
    const out = await applyTextEdits({ name: 'doc.pdf', bytes: src }, [
      box({ page: 1, text: 'Replacement line', fill: '#ffffff', rect: { x: 0.1, y: 0.1, w: 0.6, h: 0.05 } }),
      box({ id: 'c', page: 2, text: '', fill: '#000000' }),
    ])
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(3)
    expect(doc.getPages().map((p) => [p.getWidth(), p.getHeight()])).toEqual([
      [595, 842],
      [595, 842],
      [595, 842],
    ])
    const texts = await pageTexts(out)
    expect(texts[0]).toContain('Doc Page 1')
    expect(texts[1]).toContain('Replacement line')
  })

  it('places text where the preview shows it, including on rotated pages', async () => {
    for (const rotate of [0, 90, 180, 270]) {
      const src = await makePdf(1, { rotate })
      const rect = { x: 0.2, y: 0.3, w: 0.5, h: 0.06 }
      const b = box({ text: 'Placed here', rect })
      const out = await applyTextEdits({ name: 'r.pdf', bytes: src }, [b])
      const pos = await textPosition(out, 0, 'Placed here')
      const swap = rotate === 90 || rotate === 270
      const [W, H] = swap ? [842, 595] : [595, 842]
      const line = layoutText(b, W, H).lines[0]
      expect(pos.x, `rotate ${rotate}`).toBeCloseTo(rect.x + line.x / W, 2)
      expect(pos.y, `rotate ${rotate}`).toBeCloseTo(rect.y + line.baseline / H, 2)
    }
  })

  it('writes long text on several lines, exactly as laid out', async () => {
    const src = await makePdf(1)
    const b = box({ text: 'First paragraph that is long enough to wrap onto another line.\nSecond line', rect: { x: 0.1, y: 0.2, w: 0.3, h: 0.2 } })
    const out = await applyTextEdits({ name: 'w.pdf', bytes: src }, [b])
    const expected = layoutText(b, 595, 842).lines.map((l) => l.text)
    expect(expected.length).toBeGreaterThanOrEqual(3)
    const doc = await openWithPdfjs(out)
    const tc = await (await doc.getPage(1)).getTextContent()
    const strs = tc.items.map((it) => ('str' in it ? it.str : '')).filter((s) => s.trim())
    for (const line of expected) expect(strs).toContain(line)
    await doc.loadingTask.destroy()
  })

  it('covers visually but leaves the original text in the file', async () => {
    const src = await makePdf(1, { label: 'Secret' })
    const out = await applyTextEdits({ name: 's.pdf', bytes: src }, [box({ text: 'New', fill: '#ffffff', rect: { x: 0, y: 0, w: 1, h: 0.3 } })])
    // This is a visual edit, not redaction: the old text can still be extracted.
    expect((await pageTexts(out))[0]).toContain('Secret Page 1')
  })

  it('refuses to save without any edits, and reports missing pages', async () => {
    const src = await makePdf(1)
    await expect(applyTextEdits({ name: 'e.pdf', bytes: src }, [box({ text: '  ', fill: null })])).rejects.toThrow(/nothing to save/)
    await expect(applyTextEdits({ name: 'e.pdf', bytes: src }, [box({ page: 4 })])).rejects.toThrow(/Page 5/)
  })
})
