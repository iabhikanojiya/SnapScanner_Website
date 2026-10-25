import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, LevelFormat, PageBreak, PageNumber, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import { strToU8, zipSync } from 'fflate'
import { convertDocxToPdf } from '@/lib/docx/convert'
import { familyFor } from '@/lib/docx/fonts'
import { DocxError, formatNumber, parseDocx } from '@/lib/docx/parse'
import { parseXml, textOf } from '@/lib/docx/xml'
import { makePng, openWithPdfjs, pageTexts } from './helpers'

const loadFont = async (file: string) => new Uint8Array(readFileSync(join(process.cwd(), 'public/word-fonts', file)))
const convert = (bytes: Uint8Array) => convertDocxToPdf(bytes, { loadFont, convertImage: async () => null })

async function docx(sections: ConstructorParameters<typeof Document>[0]['sections'], extra: Partial<ConstructorParameters<typeof Document>[0]> = {}) {
  return new Uint8Array(await Packer.toBuffer(new Document({ sections, ...extra })))
}

const squash = (s: string) => s.replace(/\s+/g, '')

describe('XML parser', () => {
  it('parses elements, attributes, entities and CDATA', () => {
    const el = parseXml('<?xml version="1.0"?><w:doc a="1 &amp; 2"><!-- c --><w:t xml:space="preserve"> Tom &lt;&#x41;&#66;&gt; </w:t><x/><![CDATA[<raw>]]></w:doc>')
    expect(el.name).toBe('w:doc')
    expect(el.attrs.a).toBe('1 & 2')
    expect(textOf(el)).toBe(' Tom <AB> <raw>')
  })

  it('rejects malformed XML', () => {
    expect(() => parseXml('<a><b></a>')).toThrow()
    expect(() => parseXml('<a>')).toThrow()
  })
})

describe('Word document parsing', () => {
  it('rejects files that are not .docx documents', async () => {
    expect(() => parseDocx(new TextEncoder().encode('hello'))).toThrow(DocxError)
    const ole = new Uint8Array(512)
    ole.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    expect(() => parseDocx(ole)).toThrow(/older Word \(\.doc\)|password-protected/)
    const xlsx = zipSync({ '[Content_Types].xml': strToU8('<Types/>'), 'xl/workbook.xml': strToU8('<workbook/>') })
    expect(() => parseDocx(xlsx)).toThrow(/Excel/)
    const truncated = (await docx([{ children: [new Paragraph('Hello')] }])).slice(0, 200)
    expect(() => parseDocx(truncated)).toThrow(DocxError)
  })

  it('formats list numbers and maps Office fonts to metric-compatible families', () => {
    expect(formatNumber(4, 'lowerRoman')).toBe('iv')
    expect(formatNumber(28, 'upperLetter')).toBe('BB')
    expect(formatNumber(2, 'ordinal')).toBe('2nd')
    expect(familyFor('Calibri')).toBe('carlito')
    expect(familyFor('Cambria')).toBe('caladea')
    expect(familyFor('Times New Roman')).toBe('tinos')
    expect(familyFor('Arial')).toBe('arimo')
    expect(familyFor('Courier New')).toBe('cousine')
    expect(familyFor('Mangal')).toBe('devanagari')
  })
})

describe('Word to PDF', () => {
  it('converts headings, styled paragraphs and alignment into selectable text', async () => {
    const bytes = await docx([
      {
        children: [
          new Paragraph({ text: 'Quarterly Report', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun('Plain, '), new TextRun({ text: 'bold, ', bold: true }), new TextRun({ text: 'italic ', italics: true }), new TextRun({ text: 'and red.', color: 'FF0000', underline: {} })] }),
          new Paragraph({ text: 'Centered line', alignment: AlignmentType.CENTER }),
        ],
      },
    ])
    const out = await convert(bytes)
    expect(out.pageCount).toBe(1)
    const [text] = await pageTexts(out.bytes)
    expect(squash(text)).toContain('QuarterlyReport')
    expect(squash(text)).toContain('Plain,bold,italicandred.')
    expect(squash(text)).toContain('Centeredline')
  })

  it('flows long documents across pages without dropping text', async () => {
    const paras = Array.from({ length: 120 }, (_, i) => new Paragraph(`Paragraph ${i + 1}: the quick brown fox jumps over the lazy dog, again and again, until the line wraps onto a second line of text in the document body.`))
    const out = await convert(await docx([{ children: paras }]))
    expect(out.pageCount).toBeGreaterThanOrEqual(3)
    const all = squash((await pageTexts(out.bytes)).join(' '))
    let at = -1
    for (let i = 1; i <= 120; i++) {
      const next = all.indexOf(`Paragraph${i}:`, at + 1)
      expect(next, `paragraph ${i} present and in order`).toBeGreaterThan(at)
      at = next
    }
  })

  it('honours page breaks and fills in page numbers in footers', async () => {
    const bytes = await docx([
      {
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES] })] })] }) },
        children: [new Paragraph('First page'), new Paragraph({ children: [new PageBreak()] }), new Paragraph('Second page')],
      },
    ])
    const out = await convert(bytes)
    expect(out.pageCount).toBe(2)
    const pages = (await pageTexts(out.bytes)).map(squash)
    expect(pages[0]).toContain('Firstpage')
    expect(pages[0]).toContain('Page1of2')
    expect(pages[1]).toContain('Secondpage')
    expect(pages[1]).toContain('Page2of2')
  })

  it('draws tables, images and numbered and bulleted lists', async () => {
    const png = makePng(40, 20, (x) => [x * 6, 100, 200])
    const cell = (t: string) => new TableCell({ children: [new Paragraph(t)], width: { size: 3000, type: WidthType.DXA } })
    const bytes = await docx(
      [
        {
          children: [
            new Table({
              rows: [new TableRow({ children: [cell('Item'), cell('Qty')] }), new TableRow({ children: [cell('Apples'), cell('12')] })],
              borders: { top: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, left: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' } },
            }),
            new Paragraph({ children: [new ImageRun({ type: 'png', data: png, transformation: { width: 120, height: 60 } })] }),
            new Paragraph({ text: 'First step', numbering: { reference: 'steps', level: 0 } }),
            new Paragraph({ text: 'Second step', numbering: { reference: 'steps', level: 0 } }),
            new Paragraph({ text: 'A bullet', bullet: { level: 0 } }),
          ],
        },
      ],
      { numbering: { config: [{ reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] } }
    )
    const out = await convert(bytes)
    const [text] = (await pageTexts(out.bytes)).map(squash)
    expect(text).toContain('ItemQty')
    expect(text).toContain('Apples12')
    expect(text).toContain('1.Firststep')
    expect(text).toContain('2.Secondstep')
    expect(text).toMatch(/[•●]Abullet/)
    const doc = await openWithPdfjs(out.bytes)
    const ops = await (await doc.getPage(1)).getOperatorList()
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    expect(ops.fnArray).toContain(pdfjs.OPS.paintImageXObject)
    expect(ops.fnArray.filter((f) => f === pdfjs.OPS.constructPath).length).toBeGreaterThan(4)
    await doc.loadingTask.destroy()
  })

  it('embeds fonts for Greek, Cyrillic and Devanagari text', async () => {
    const out = await convert(await docx([{ children: [new Paragraph('Ελληνικά Русский नमस्ते café')] }]))
    expect(out.warnings.join(' ')).not.toMatch(/aren’t covered/)
    const [text] = await pageTexts(out.bytes)
    expect(text).toContain('Ελληνικά')
    expect(text).toContain('Русский')
    expect(text).toContain('café')
  })

  it('reports characters no bundled font covers', async () => {
    const out = await convert(await docx([{ children: [new Paragraph('Chinese 中文')] }]))
    expect(out.warnings.join(' ')).toMatch(/aren’t covered/)
  })
})
