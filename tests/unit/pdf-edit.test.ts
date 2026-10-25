import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts, degrees } from '@cantoo/pdf-lib'
import {
  addPageNumbers,
  addWatermark,
  cropPages,
  fillForm,
  formatPageNumber,
  readForm,
  readMetadata,
  removePages,
  reorganizePdf,
  repairPdf,
  rotatePages,
  writeMetadata,
} from '@/lib/pdf/edit'
import { addOcrTextLayer } from '@/lib/pdf/ocr-layer'
import { compareText, diffPixels } from '@/lib/pdf/compare'
import { exportText } from '@/lib/pdf/text-export'
import { makePdf, makePng, openWithPdfjs, pageTexts } from './helpers'

const named = (bytes: Uint8Array, name = 'doc.pdf') => ({ name, bytes })

async function rotations(bytes: Uint8Array) {
  return (await PDFDocument.load(bytes)).getPages().map((p) => p.getRotation().angle)
}

describe('organize, rotate, remove', () => {
  it('reorders, duplicates and rotates pages', async () => {
    const src = await makePdf(3)
    const out = await reorganizePdf(named(src), [
      { source: 2, rotate: 90 },
      { source: 0, rotate: 0 },
      { source: 0, rotate: 180 },
    ])
    expect(await pageTexts(out)).toEqual(['Doc Page 3', 'Doc Page 1', 'Doc Page 1'])
    expect(await rotations(out)).toEqual([90, 0, 180])
    await expect(reorganizePdf(named(src), [])).rejects.toThrow(/no pages/)
  })

  it('removes pages and refuses to remove all of them', async () => {
    const src = await makePdf(4)
    expect(await pageTexts(await removePages(named(src), [1, 3]))).toEqual(['Doc Page 1', 'Doc Page 3'])
    await expect(removePages(named(src), [0, 1, 2, 3])).rejects.toThrow(/every page/)
    await expect(removePages(named(src), [])).rejects.toThrow(/at least one page/)
  })

  it('rotates selected pages, adding to existing rotation', async () => {
    const src = await makePdf(2, { rotate: 90 })
    expect(await rotations(await rotatePages(named(src), { 0: 90, 1: 270 }))).toEqual([180, 0])
    await expect(rotatePages(named(src), { 0: 360 })).rejects.toThrow(/Rotate at least one/)
  })
})

describe('page numbers and watermarks', () => {
  it('formats numbers', () => {
    expect(formatPageNumber('Page {n} of {total}', 3, 9)).toBe('Page 3 of 9')
  })

  it('adds numbers at the chosen position', async () => {
    const src = await makePdf(3)
    const out = await addPageNumbers(named(src), { position: 'bottom-center', start: 1, format: 'Page {n} of {total}', fontSize: 11, margin: 30, color: [0, 0, 0] })
    const texts = await pageTexts(out)
    expect(texts[0]).toContain('Page 1 of 3')
    expect(texts[2]).toContain('Page 3 of 3')
    const doc = await openWithPdfjs(out)
    const items = (await (await doc.getPage(2)).getTextContent()).items.filter((i) => 'str' in i && i.str.startsWith('Page 2')) as { transform: number[] }[]
    expect(items[0].transform[5]).toBeCloseTo(30, 0)
    expect(Math.abs(items[0].transform[4] - 297.5)).toBeLessThan(40)
  })

  it('numbers a subset starting from another number, and on rotated pages', async () => {
    const out = await addPageNumbers(named(await makePdf(3, { rotate: 90 })), { position: 'top-right', start: 5, format: '{n}', fontSize: 10, margin: 20, color: [0, 0, 0], pages: [1, 2] })
    const texts = await pageTexts(out)
    expect(texts[0]).toBe('Doc Page 1')
    expect(texts[1]).toContain('5')
    expect(texts[2]).toContain('6')
    await expect(addPageNumbers(named(await makePdf(1)), { position: 'top-left', start: 1, format: 'Page', fontSize: 10, margin: 20, color: [0, 0, 0] })).rejects.toThrow(/\{n\}/)
  })

  it('adds text and image watermarks', async () => {
    const src = await makePdf(2)
    const text = await addWatermark(named(src), { kind: 'text', text: 'CONFIDENTIAL', position: 'center', scale: 0.1, opacity: 0.3, rotation: 45, color: [0.9, 0.2, 0.2], pages: [1] })
    const t = await pageTexts(text)
    expect(t[0]).not.toContain('CONFIDENTIAL')
    expect(t[1]).toContain('CONFIDENTIAL')
    const png = makePng(50, 20, () => [200, 0, 0])
    const image = await addWatermark(named(src), { kind: 'image', image: { bytes: png, type: 'png' }, position: 'bottom-right', scale: 0.2, opacity: 0.5, rotation: 0, color: [0, 0, 0] })
    expect(new TextDecoder('latin1').decode(image)).toMatch(/\/Subtype\s*\/Image/)
    await expect(addWatermark(named(src), { kind: 'text', text: ' ', position: 'center', scale: 0.1, opacity: 1, rotation: 0, color: [0, 0, 0] })).rejects.toThrow(/text/)
  })
})

describe('crop', () => {
  it('sets the visible page area', async () => {
    const out = await cropPages(named(await makePdf(2, { size: [600, 800] })), { x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, [0])
    const doc = await openWithPdfjs(out)
    expect((await doc.getPage(1)).view).toEqual([60, 320, 360, 720])
    expect((await doc.getPage(2)).view).toEqual([0, 0, 600, 800])
    await expect(cropPages(named(await makePdf(1)), { x: 0, y: 0, w: 0.01, h: 1 })).rejects.toThrow(/too small/)
  })
})

describe('forms', () => {
  async function formPdf() {
    const doc = await PDFDocument.create()
    const page = doc.addPage([600, 800])
    const form = doc.getForm()
    form.createTextField('name').addToPage(page, { x: 50, y: 700, width: 200, height: 24 })
    form.createCheckBox('agree').addToPage(page, { x: 50, y: 650, width: 16, height: 16 })
    const dd = form.createDropdown('country')
    dd.addOptions(['India', 'Spain'])
    dd.addToPage(page, { x: 50, y: 600, width: 150, height: 24 })
    const rg = form.createRadioGroup('size')
    rg.addOptionToPage('S', page, { x: 50, y: 550, width: 14, height: 14 })
    rg.addOptionToPage('L', page, { x: 80, y: 550, width: 14, height: 14 })
    return doc.save()
  }

  it('reads fields and fills them', async () => {
    const src = await formPdf()
    const info = await readForm(named(src))
    expect(info.fields.map((f) => [f.kind, f.name])).toEqual([
      ['text', 'name'],
      ['checkbox', 'agree'],
      ['dropdown', 'country'],
      ['radio', 'size'],
    ])
    const filled = await fillForm(named(src), { name: 'Asha Rao', agree: true, country: 'Spain', size: 'L' }, false)
    const back = await readForm(named(filled))
    expect(back.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'name', value: 'Asha Rao' }),
        expect.objectContaining({ name: 'agree', checked: true }),
        expect.objectContaining({ name: 'country', selected: ['Spain'] }),
        expect.objectContaining({ name: 'size', selected: 'L' }),
      ])
    )
  })

  it('flattens filled values into page content', async () => {
    const flat = await fillForm(named(await formPdf()), { name: 'Asha Rao' }, true)
    expect((await readForm(named(flat))).fields).toHaveLength(0)
    expect((await pageTexts(flat))[0]).toContain('Asha Rao')
  })
})

describe('metadata', () => {
  it('reads, edits and removes metadata', async () => {
    const doc = await PDFDocument.create()
    doc.addPage()
    doc.setTitle('Secret plan')
    doc.setAuthor('A. Person')
    const src = await doc.save()
    const meta = await readMetadata(named(src))
    expect(meta).toMatchObject({ title: 'Secret plan', author: 'A. Person', pageCount: 1, formFields: 0, hasJavaScript: false })
    const edited = await writeMetadata(named(src), { title: 'Plan', author: '', subject: 'S', keywords: 'a, b', removeAll: false })
    expect(await readMetadata(named(edited))).toMatchObject({ title: 'Plan', subject: 'S', keywords: 'a b' })
    const stripped = await writeMetadata(named(src), { title: '', author: '', subject: '', keywords: '', removeAll: true })
    const raw = new TextDecoder('latin1').decode(stripped)
    expect(raw).not.toContain('Secret plan')
    expect(raw).not.toContain('A. Person')
    expect((await readMetadata(named(stripped))).title).toBeUndefined()
  })
})

describe('repair', () => {
  it('rebuilds a PDF with a broken cross-reference table', async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    for (let i = 1; i <= 3; i++) doc.addPage().drawText(`Recovered ${i}`, { x: 50, y: 700, font, size: 20 })
    const good = await doc.save({ useObjectStreams: false })
    // Corrupt the xref offsets and the startxref pointer.
    let s = new TextDecoder('latin1').decode(good)
    s = s.replace(/\d{10} 00000 n/g, '9999999999 00000 n').replace(/startxref\s+\d+/, 'startxref\n123')
    const broken = Uint8Array.from(s, (c) => c.charCodeAt(0))
    const fixed = await repairPdf(named(broken, 'broken.pdf'))
    expect(fixed.pageCount).toBe(3)
    expect(await pageTexts(fixed.bytes)).toEqual(['Recovered 1', 'Recovered 2', 'Recovered 3'])
    await expect(repairPdf(named(new TextEncoder().encode('%PDF-1.4 nothing here'), 'x.pdf'))).rejects.toThrow()
  })
})

describe('text export', () => {
  it('builds Markdown headings, bullets and paragraphs from real text', async () => {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.addPage([600, 800])
    page.drawText('Quarterly Report', { x: 50, y: 740, size: 26, font })
    page.drawText('Revenue grew in every region this quarter and', { x: 50, y: 700, size: 12, font })
    page.drawText('costs stayed flat.', { x: 50, y: 685, size: 12, font })
    page.drawText('• North up 12%', { x: 50, y: 650, size: 12, font })
    page.drawText('• South up 8%', { x: 50, y: 635, size: 12, font })
    doc.addPage()
    const pdf = await openWithPdfjs(await doc.save())
    const pages: never[][] = []
    for (let i = 1; i <= pdf.numPages; i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items.filter((it) => 'str' in it) as never)
    const out = exportText(pages)
    expect(out.markdown).toContain('# Quarterly Report')
    expect(out.markdown).toContain('Revenue grew in every region this quarter and costs stayed flat.')
    expect(out.markdown).toContain('- North up 12%')
    expect(out.text).toContain('• South up 8%')
    expect(out.emptyPages).toEqual([1])
  })
})

describe('compare', () => {
  it('reports added, removed and changed words', () => {
    const r = compareText('The fee is 100 dollars per month.', 'The fee is 120 dollars per month, payable now.')
    expect(r.identical).toBe(false)
    expect(r.changed).toBeGreaterThanOrEqual(1)
    expect(r.changes.some((c) => c.kind === 'added' && c.text.includes('payable'))).toBe(true)
    expect(compareText('same   text\nhere', 'same text here').identical).toBe(true)
  })

  it('diffs pixels', () => {
    const a = new Uint8ClampedArray(4 * 4).fill(255)
    const b = new Uint8ClampedArray(a)
    b[0] = b[1] = b[2] = 0
    const d = diffPixels(a, b, 2, 2)
    expect(d.differing).toBe(1)
    expect(d.ratio).toBe(0.25)
  })
})

describe('OCR text layer', () => {
  it('adds invisible, extractable words at their positions', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([600, 800])
    page.setRotation(degrees(0))
    const src = await doc.save()
    const result = await addOcrTextLayer(named(src), [
      {
        words: [
          { text: 'INVOICE', x0: 0.1, y0: 0.1, x1: 0.4, y1: 0.15 },
          { text: '2026', x0: 0.45, y0: 0.1, x1: 0.6, y1: 0.15 },
          { text: 'नमस्ते', x0: 0.1, y0: 0.2, x1: 0.3, y1: 0.25 },
        ],
      },
    ])
    expect(result.wordsAdded).toBe(2)
    expect(result.wordsSkipped).toBe(1)
    const pdf = await openWithPdfjs(result.bytes)
    const items = (await (await pdf.getPage(1)).getTextContent()).items.filter((i) => 'str' in i && i.str.trim()) as { str: string; transform: number[]; width: number }[]
    expect(items.map((i) => i.str)).toEqual(['INVOICE', '2026'])
    // Left edge at 10% of the width; width stretched to the box (30% of 600 = 180 pt).
    expect(items[0].transform[4]).toBeCloseTo(60, 0)
    expect(items[0].width).toBeCloseTo(180, -1)
  })
})

describe('redaction', () => {
  it('replaces redacted pages so their text is gone, keeping other pages', async () => {
    const { buildRedactedPdf, marksToPixels } = await import('@/lib/pdf/redact')
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    doc.addPage([600, 800]).drawText('Public page', { x: 50, y: 700, font, size: 20 })
    doc.addPage([600, 800]).drawText('SSN 123-45-6789', { x: 50, y: 700, font, size: 20 })
    doc.setTitle('Account 123-45-6789')
    const src = await doc.save()
    const png = makePng(60, 80, () => [255, 255, 255])
    const out = await buildRedactedPdf(named(src), [{ page: 1, image: png, type: 'png', width: 600, height: 800 }])
    expect(await pageTexts(out)).toEqual(['Public page', ''])
    expect(new TextDecoder('latin1').decode(out)).not.toContain('123-45-6789')
    expect(marksToPixels([{ page: 0, rect: { x: 0.5, y: 0.5, w: 0.1, h: 0.1 } }], 0, 100, 100, 0)).toEqual([{ x: 50, y: 50, w: 10, h: 10 }])
  })
})
