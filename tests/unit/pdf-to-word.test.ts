import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib'
import * as fontkit from '@cantoo/fontkit'
import { strFromU8, unzipSync } from 'fflate'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { analyzePage, bodySize, groupLines, type OutPage, type TextItem } from '@/lib/pdf/word/analyze'
import { buildDocx } from '@/lib/pdf/word/build-docx'
import { extractPage, ocrItems, wordFontName } from '@/lib/pdf/word/extract'
import { parseDocx } from '@/lib/docx/parse'
import { findAll, parseXml, textOf } from '@/lib/docx/xml'
import { makePng } from './helpers'

const FONTS = join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/')
const LOREM = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ')

/** Writes words into lines no wider than `width`, like a word processor would. */
function wrap(text: string[], width: number, measure: (s: string) => number) {
  const lines: string[] = []
  let cur = ''
  for (const w of text) {
    const next = cur ? `${cur} ${w}` : w
    if (measure(next) > width && cur) {
      lines.push(cur)
      cur = w
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

async function convert(bytes: Uint8Array, encodeImages = false): Promise<{ pages: OutPage[]; xml: string; docx: Uint8Array }> {
  const task = pdfjs.getDocument({ data: bytes.slice(), standardFontDataUrl: FONTS, fontExtraProperties: true, verbosity: 0 })
  const doc = await task.promise
  const inputs = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const ex = await extractPage(pdfjs, page, { images: encodeImages, encode: async () => ({ data: makePng(4, 4, () => [200, 0, 0]), type: 'png' }), maxImages: 50 })
    inputs.push(ex.input)
  }
  await task.destroy()
  const body = bodySize(inputs)
  const pages = inputs.map((p) => analyzePage(p, body))
  const blob = await buildDocx(pages, { title: 'Test' })
  const docx = new Uint8Array(await blob.arrayBuffer())
  const xml = strFromU8(unzipSync(docx)['word/document.xml'])
  return { pages, xml, docx }
}

const paragraphs = (xml: string) => findAll(parseXml(xml), 'w:p').map((p) => findAll(p, 'w:t').map(textOf).join(''))

describe('PDF to Word', () => {
  it('maps PostScript font names to Word fonts', () => {
    expect(wordFontName('ABCDEF+TimesNewRomanPS-BoldMT')).toBe('Times New Roman')
    expect(wordFontName('ArialMT')).toBe('Arial')
    expect(wordFontName('Calibri-Italic')).toBe('Calibri')
    expect(wordFontName('Helvetica-Bold')).toBe('Arial')
    expect(wordFontName('LMRoman10-Regular')).toBeUndefined()
  })

  it('rebuilds headings, wrapped paragraphs and bold, italic and sized text', async () => {
    const pdf = await PDFDocument.create()
    const page = pdf.addPage([595, 842])
    const reg = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const ital = await pdf.embedFont(StandardFonts.TimesRomanItalic)
    page.drawText('Annual Summary', { x: 72, y: 760, size: 24, font: bold })
    let y = 720
    for (let p = 0; p < 2; p++) {
      const lines = wrap([...LOREM, ...LOREM, `end${p}.`], 451, (s) => reg.widthOfTextAtSize(s, 11))
      for (const l of lines) {
        page.drawText(l, { x: 72, y, size: 11, font: reg })
        y -= 14
      }
      y -= 14
    }
    page.drawText('An italic note', { x: 72, y, size: 11, font: ital })
    const { xml, docx } = await convert(await pdf.save())
    const paras = paragraphs(xml).filter(Boolean)
    expect(paras[0]).toBe('Annual Summary')
    expect(paras).toHaveLength(4)
    expect(paras[1]).toMatch(/^Lorem ipsum .* end0\.$/)
    expect(paras[2]).toMatch(/end1\.$/)
    expect(paras[3]).toBe('An italic note')
    expect(xml).toContain('<w:pStyle w:val="Heading1"/>')
    expect(xml).toMatch(/<w:b\/>.*Annual Summary/)
    expect(xml).toMatch(/<w:i\/>.*An italic note/)
    expect(xml).toContain('<w:sz w:val="48"/>')
    expect(xml).toContain('w:ascii="Times New Roman"')
    // The file is a valid package that a Word parser can read back.
    const model = parseDocx(docx)
    expect(model.sections[0].width).toBeCloseTo(595, 0)
  })

  it('makes one section per page and keeps page sizes', async () => {
    const pdf = await PDFDocument.create()
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    pdf.addPage([595, 842]).drawText('Portrait page', { x: 72, y: 700, size: 12, font })
    pdf.addPage([842, 595]).drawText('Landscape page', { x: 72, y: 500, size: 12, font })
    const { xml, docx } = await convert(await pdf.save())
    expect(paragraphs(xml).filter(Boolean)).toEqual(['Portrait page', 'Landscape page'])
    const model = parseDocx(docx)
    expect(model.sections).toHaveLength(2)
    expect(model.sections[1].width).toBeCloseTo(842, 0)
    expect(model.sections[1].height).toBeCloseTo(595, 0)
  })

  it('detects tables and two-column layouts', async () => {
    const pdf = await PDFDocument.create()
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const p1 = pdf.addPage([595, 842])
    const rows = [['Item', 'Quantity', 'Price'], ['Apples', '12', '3.40'], ['Pears', '7', '2.10'], ['Plums', '30', '9.99']]
    rows.forEach((r, i) => r.forEach((c, k) => p1.drawText(c, { x: [72, 260, 420][k], y: 760 - i * 18, size: 11, font })))
    const p2 = pdf.addPage([595, 842])
    p2.drawText('Two Column Article', { x: 160, y: 780, size: 20, font })
    for (const [x, label] of [[50, 'L'], [320, 'R']] as const) {
      const lines = wrap(Array.from({ length: 12 }, () => LOREM).flat(), 225, (s) => font.widthOfTextAtSize(s, 10))
      lines.slice(0, 30).forEach((l, i) => p2.drawText(i === 0 ? `${label}start ${l}` : l, { x, y: 740 - i * 13, size: 10, font }))
    }
    const { xml, pages } = await convert(await pdf.save())
    const tables = findAll(parseXml(xml), 'w:tbl')
    expect(tables).toHaveLength(1)
    const cells = findAll(tables[0], 'w:tc').map((c) => findAll(c, 'w:t').map(textOf).join(''))
    expect(cells).toEqual(rows.flat())
    expect(pages[1].regions.map((r) => r.columns)).toEqual([1, 2])
    expect(xml).toContain('w:num="2"')
    const text = paragraphs(xml).join('\n')
    expect(text.indexOf('Lstart')).toBeLessThan(text.indexOf('Rstart'))
    expect(xml).toContain('<w:br w:type="column"/>')
  })

  it('places images in reading order and keeps Unicode text', async () => {
    const pdf = await PDFDocument.create()
    pdf.registerFontkit(fontkit as unknown as Parameters<PDFDocument['registerFontkit']>[0])
    const font = await pdf.embedFont(readFileSync(join(process.cwd(), 'public/word-fonts/Arimo-Regular.ttf')), { subset: true })
    const page = pdf.addPage([595, 842])
    page.drawText('Привет мир — Ελληνικά — café', { x: 72, y: 760, size: 14, font })
    const img = await pdf.embedPng(makePng(60, 30, () => [0, 120, 200]))
    page.drawImage(img, { x: 72, y: 500, width: 240, height: 120 })
    page.drawText('Caption below the image', { x: 72, y: 480, size: 11, font })
    page.drawRectangle({ x: 0, y: 0, width: 1, height: 1, color: rgb(1, 1, 1) })
    const { xml, docx } = await convert(await pdf.save(), true)
    const paras = paragraphs(xml)
    expect(paras[0]).toBe('Привет мир — Ελληνικά — café')
    const imgIndex = findAll(parseXml(xml), 'w:p').findIndex((p) => findAll(p, 'w:drawing').length > 0)
    expect(imgIndex).toBe(1)
    expect(paras[2]).toBe('Caption below the image')
    expect(Object.keys(unzipSync(docx)).some((f) => f.startsWith('word/media/'))).toBe(true)
  })

  it('groups OCR words into lines and paragraphs', () => {
    const words = ['Scanned', 'invoice', 'number', '42'].map((t, i) => ({ text: t, x0: 0.1 + i * 0.15, y0: 0.1, x1: 0.22 + i * 0.15, y1: 0.12 }))
    const items: TextItem[] = ocrItems(words, 600, 800)
    const lines = groupLines(items)
    expect(lines).toHaveLength(1)
    const page = analyzePage({ width: 600, height: 800, items, images: [] }, 12)
    const block = page.regions[0].columns === 1 ? page.regions[0].blocks[0] : null
    expect(block?.t === 'para' && block.runs.map((r) => r.text).join('')).toBe('Scanned invoice number 42')
  })
})
