// Generates real test documents for the end-to-end suite.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, StandardFonts, degrees } from '@cantoo/pdf-lib'
import { makePng } from '../unit/helpers'
import { FIXTURES, LOCKED_PASSWORD } from './fixtures'

async function textPdf(pages: number, label: string, rotate = 0) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([595, 842])
    page.drawText(`${label} Page ${i}`, { x: 72, y: 760, size: 28, font })
    page.drawText('The quick brown fox jumps over the lazy dog.', { x: 72, y: 700, size: 14, font })
    page.drawText(`Invoice number ${1000 + i} for ${label}`, { x: 72, y: 670, size: 14, font })
    if (rotate) page.setRotation(degrees(rotate))
  }
  doc.setTitle(label)
  return doc.save()
}

/** A PDF whose single page is a large lossless image, so recompression can shrink it. */
async function imagePdf() {
  const png = makePng(1600, 1600, (x, y) => {
    const v = Math.round(128 + 100 * Math.sin(x / 37) * Math.cos(y / 53))
    return [v, (v + ((x * y) % 41)) % 256, 255 - v]
  })
  const doc = await PDFDocument.create()
  const img = await doc.embedPng(png)
  const page = doc.addPage([595, 842])
  page.drawImage(img, { x: 20, y: 200, width: 555, height: 555 })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  page.drawText('Photo report', { x: 20, y: 800, size: 24, font })
  return doc.save()
}

export default async function globalSetup() {
  mkdirSync(FIXTURES.dir, { recursive: true })
  const write = (name: string, bytes: Uint8Array) => writeFileSync(join(FIXTURES.dir, name), bytes)

  write('alpha.pdf', await textPdf(2, 'Alpha'))
  write('bravo.pdf', await textPdf(3, 'Bravo'))
  write('ten.pdf', await textPdf(10, 'Ten'))
  write('rotated.pdf', await textPdf(1, 'Rotated', 90))
  write('photo-report.pdf', await imagePdf())
  write('corrupt.pdf', new TextEncoder().encode('%PDF-1.7\nthis is not really a pdf\n%%EOF'))
  write('not-a-pdf.pdf', new TextEncoder().encode('hello, I am text pretending to be a PDF'))

  const locked = await PDFDocument.load(await textPdf(2, 'Secret'))
  locked.encrypt({ userPassword: LOCKED_PASSWORD, ownerPassword: LOCKED_PASSWORD })
  write('locked.pdf', await locked.save())

  // A fillable form.
  const form = await PDFDocument.create()
  const fp = form.addPage([595, 842])
  const helv = await form.embedFont(StandardFonts.Helvetica)
  fp.drawText('Application form', { x: 50, y: 780, size: 20, font: helv })
  const f = form.getForm()
  f.createTextField('Full name').addToPage(fp, { x: 50, y: 700, width: 250, height: 24 })
  f.createCheckBox('Agree to terms').addToPage(fp, { x: 50, y: 650, width: 16, height: 16 })
  const dd = f.createDropdown('Country')
  dd.addOptions(['India', 'Spain', 'Brazil'])
  dd.addToPage(fp, { x: 50, y: 600, width: 150, height: 24 })
  write('form.pdf', await form.save())

  // Metadata, two versions for comparison and a document with sensitive data.
  const meta = await PDFDocument.load(await textPdf(1, 'Meta'))
  meta.setAuthor('Jane Example')
  meta.setTitle('Quarterly secrets')
  write('meta.pdf', await meta.save())
  const version = async (fee: string, extra: string) => {
    const d = await PDFDocument.create()
    const font = await d.embedFont(StandardFonts.Helvetica)
    const p = d.addPage([595, 842])
    p.drawText(`The monthly fee is ${fee} dollars.`, { x: 72, y: 760, size: 16, font })
    p.drawText(extra, { x: 72, y: 730, size: 16, font })
    return d.save()
  }
  write('contract-v1.pdf', await version('100', 'Payment is due on the first day.'))
  write('contract-v2.pdf', await version('120', 'Payment is due on the fifth day, by transfer.'))
  const secret = await PDFDocument.create()
  const sf = await secret.embedFont(StandardFonts.Helvetica)
  secret.addPage([595, 842]).drawText('Customer: Ravi Kumar, SSN 123-45-6789', { x: 72, y: 760, size: 16, font: sf })
  secret.addPage([595, 842]).drawText('Nothing sensitive here.', { x: 72, y: 760, size: 16, font: sf })
  write('sensitive.pdf', await secret.save())

  // A PDF with corrupted cross-reference offsets.
  const good = await PDFDocument.create()
  const gf = await good.embedFont(StandardFonts.Helvetica)
  good.addPage().drawText('Recover me', { x: 50, y: 700, size: 20, font: gf })
  const raw = new TextDecoder('latin1').decode(await good.save({ useObjectStreams: false }))
  const broken = raw.replace(/\d{10} 00000 n/g, '9999999999 00000 n').replace(/startxref\s+\d+/, 'startxref\n123')
  write('broken.pdf', Uint8Array.from(broken, (c) => c.charCodeAt(0)))

  write(
    'gradient.png',
    makePng(800, 600, (x, y) => [Math.round((x / 800) * 255), Math.round((y / 600) * 255), 140])
  )
  // A light "page" on a dark desk, for edge detection.
  write(
    'desk-scan.png',
    makePng(900, 1200, (x, y) => {
      const inside = x > 150 + y * 0.05 && x < 760 - y * 0.03 && y > 120 && y < 1080
      if (!inside) return [40, 44, 52]
      return y % 60 < 6 && x > 220 && x < 680 ? [60, 60, 60] : [236, 233, 226]
    })
  )
}
