import { writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib'
import { AlignmentType, Document, Footer, HeadingLevel, ImageRun, PageBreak, PageNumber, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx'
import { strFromU8, unzipSync } from 'fflate'
import { makePng } from '../unit/helpers'
import { parseDocx } from '../../lib/docx/parse'
import { FIXTURES, LOCKED_PASSWORD, alertBox, downloadBytes, pdfTexts, watchErrors } from './fixtures'

/** Records every request that leaves the site, and every upload-shaped request. */
function watchNetwork(page: Page, origin: string) {
  const offsite: string[] = []
  const uploads: string[] = []
  page.on('request', (r) => {
    const url = r.url()
    if (!url.startsWith(origin) && !url.startsWith('blob:') && !url.startsWith('data:')) offsite.push(url)
    if (r.method() !== 'GET' && r.method() !== 'HEAD') uploads.push(`${r.method()} ${url}`)
  })
  return { offsite, uploads }
}

async function sampleDocx() {
  const cell = (t: string) => new TableCell({ children: [new Paragraph(t)] })
  const doc = new Document({
    sections: [
      {
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES] })] })] }) },
        children: [
          new Paragraph({ text: 'Field Report', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun('Inspection completed on site. '), new TextRun({ text: 'All checks passed.', bold: true })] }),
          new Table({ rows: [new TableRow({ children: [cell('Zone'), cell('Result')] }), new TableRow({ children: [cell('North'), cell('Clear')] })] }),
          new Paragraph({ children: [new ImageRun({ type: 'png', data: makePng(80, 40, (x) => [x * 3, 90, 160]), transformation: { width: 160, height: 80 } })] }),
          new Paragraph({ text: 'Café — Привет — नमस्ते', bullet: { level: 0 } }),
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph('Appendix on the second page'),
        ],
      },
    ],
  })
  return new Uint8Array(await Packer.toBuffer(doc))
}

test.describe('Word to PDF', () => {
  test('converts a .docx with tables, images, lists and page numbers, without uploading it', async ({ page, baseURL }) => {
    const errors = watchErrors(page)
    const net = watchNetwork(page, baseURL!)
    const path = FIXTURES.path('field-report.docx')
    writeFileSync(path, await sampleDocx())
    await page.goto('/tools/word-to-pdf')
    await page.locator('input[type=file]').first().setInputFiles(path)
    await expect(page.getByTestId('file-name')).toHaveText('field-report.docx')
    await page.getByTestId('convert').click()
    await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible()
    await expect(page.getByText('2 pages, with selectable text')).toBeVisible()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PDF' }).click()])
    expect(download.suggestedFilename()).toBe('field-report.pdf')
    const texts = (await pdfTexts(await downloadBytes(download))).map((t) => t.replace(/\s+/g, ''))
    expect(texts).toHaveLength(2)
    expect(texts[0]).toContain('FieldReport')
    expect(texts[0]).toContain('Allcheckspassed.')
    expect(texts[0]).toContain('ZoneResultNorthClear')
    expect(texts[0]).toContain('Page1of2')
    expect(texts[1]).toContain('Appendixonthesecondpage')
    expect(net.offsite).toEqual([])
    expect(net.uploads).toEqual([])
    expect(errors).toEqual([])
  })

  test('rejects files that are not Word documents', async ({ page }) => {
    await page.goto('/tools/word-to-pdf')
    const input = page.locator('input[type=file]').first()
    await input.setInputFiles({ name: 'old.doc', mimeType: 'application/msword', buffer: Buffer.from('legacy') })
    await expect(alertBox(page)).toContainText('older Word (.doc) file')
    await input.setInputFiles({ name: 'fake.docx', mimeType: 'application/octet-stream', buffer: Buffer.from('%PDF-1.7 not a word file') })
    await expect(alertBox(page)).toContainText('isn’t a valid Word document')
    // A ZIP that isn't a Word document passes the quick check but fails conversion with a clear message.
    const truncated = (await sampleDocx()).slice(0, 400)
    await input.setInputFiles({ name: 'broken.docx', mimeType: 'application/octet-stream', buffer: Buffer.from(truncated) })
    await page.getByTestId('convert').click()
    await expect(alertBox(page)).toContainText(/isn’t a valid Word document|damaged/)
  })
})

async function scannedPdf(page: Page) {
  // Draw known text into an image in the browser, so the PDF has no text layer.
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 1240
    c.height = 1754
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.fillStyle = '#000'
    ctx.font = 'bold 72px Arial'
    ctx.fillText('INVOICE 2026', 120, 260)
    ctx.font = '44px Arial'
    ctx.fillText('Total amount due: 450 dollars', 120, 400)
    return c.toDataURL('image/png').split(',')[1]
  })
  const doc = await PDFDocument.create()
  const img = await doc.embedPng(Buffer.from(png, 'base64'))
  doc.addPage([595, 842]).drawImage(img, { x: 0, y: 0, width: 595, height: 842 })
  const path = FIXTURES.path('scanned-for-word.pdf')
  writeFileSync(path, await doc.save())
  return path
}

const docxText = (bytes: Uint8Array) => strFromU8(unzipSync(bytes)['word/document.xml']).replace(/<[^>]+>/g, '')

test.describe('PDF to Word', () => {
  test('converts a multi-page PDF into an editable .docx, without uploading it', async ({ page, baseURL }) => {
    const errors = watchErrors(page)
    const net = watchNetwork(page, baseURL!)
    await page.goto('/tools/pdf-to-word')
    await page.locator('input[type=file]').first().setInputFiles(FIXTURES.path('bravo.pdf'))
    await expect(page.getByText('All 3 pages have selectable text')).toBeVisible()
    await page.getByTestId('convert').click()
    await expect(page.getByRole('heading', { name: 'Your Word document is ready' })).toBeVisible()
    await expect(page.getByTestId('result-file-name')).toHaveText('bravo.docx')
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download Word Document' }).click()])
    expect(download.suggestedFilename()).toBe('bravo.docx')
    const bytes = await downloadBytes(download)
    const text = docxText(bytes)
    for (const s of ['Bravo Page 1', 'Bravo Page 3', 'The quick brown fox jumps over the lazy dog.', 'Invoice number 1002 for Bravo']) expect(text).toContain(s)
    expect(parseDocx(bytes).sections).toHaveLength(3)
    expect(net.offsite).toEqual([])
    expect(net.uploads).toEqual([])
    expect(errors).toEqual([])
  })

  test('opens password-protected PDFs and reports damaged ones', async ({ page }) => {
    await page.goto('/tools/pdf-to-word')
    const input = page.locator('input[type=file]').first()
    await input.setInputFiles(FIXTURES.path('corrupt.pdf'))
    await expect(alertBox(page)).toContainText(/isn’t a valid PDF|couldn’t be opened/)
    await input.setInputFiles(FIXTURES.path('locked.pdf'))
    await page.getByLabel('Password', { exact: true }).fill(LOCKED_PASSWORD)
    await page.getByRole('button', { name: 'Open PDF' }).click()
    await page.getByTestId('convert').click()
    await expect(page.getByRole('heading', { name: 'Your Word document is ready' })).toBeVisible()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download Word Document' }).click()])
    expect(docxText(await downloadBytes(download))).toContain('Secret Page 2')
  })

  test('offers OCR for scanned PDFs and keeps pages as pictures without it', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto('/tools/pdf-to-word')
    const path = await scannedPdf(page)
    await page.locator('input[type=file]').first().setInputFiles(path)
    await expect(page.getByText('This PDF looks scanned')).toBeVisible()
    const ocr = page.getByLabel('Recognize text with OCR')
    await expect(ocr).toBeChecked()

    await ocr.uncheck()
    await page.getByTestId('convert').click()
    await expect(page.getByText('Some pages are pictures')).toBeVisible()
    const [pictures] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download Word Document' }).click()])
    const files = Object.keys(unzipSync(await downloadBytes(pictures)))
    expect(files.some((f) => f.startsWith('word/media/'))).toBe(true)

    await page.getByRole('button', { name: 'Change options' }).click()
    await page.getByLabel('Recognize text with OCR').check()
    await page.getByTestId('convert').click()
    await expect(page.getByRole('heading', { name: 'Your Word document is ready' })).toBeVisible({ timeout: 150_000 })
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download Word Document' }).click()])
    const text = docxText(await downloadBytes(download))
    expect(text).toContain('INVOICE 2026')
    expect(text).toMatch(/Total amount due/)
  })

  test('can cancel a conversion', async ({ page }) => {
    await page.goto('/tools/pdf-to-word')
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    for (let i = 0; i < 300; i++) doc.addPage([595, 842]).drawText(`Long document page ${i + 1}`, { x: 72, y: 760, size: 14, font })
    const path = FIXTURES.path('long-for-word.pdf')
    writeFileSync(path, await doc.save())
    await page.locator('input[type=file]').first().setInputFiles(path)
    await expect(page.getByText('All 300 pages have selectable text')).toBeVisible()
    await page.getByTestId('convert').click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(alertBox(page)).toContainText('Conversion cancelled')
    await expect(page.getByTestId('convert')).toBeEnabled()
  })
})
