import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { PDFDocument } from '@cantoo/pdf-lib'
import { FIXTURES, alertBox, clickDownload, downloadBytes, pdfTexts, watchErrors } from './fixtures'

const upload = (page: import('@playwright/test').Page, name: string) => page.locator('input[type=file]').first().setInputFiles(FIXTURES.path(name))
const pageNo = (t: string) => t.match(/Page (\d+)/)?.[1]

test.describe('Organize PDF tools', () => {
  test('organize: reorder, rotate, duplicate and delete pages', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/tools/organize-pdf')
    await upload(page, 'bravo.pdf')
    await expect(page.getByTestId('page-tile')).toHaveCount(3)
    await page.getByRole('button', { name: 'Move page 3 earlier' }).click()
    await page.getByRole('button', { name: 'Rotate page 1 right' }).click()
    await page.getByRole('button', { name: 'Duplicate page 1' }).click()
    await expect(page.getByTestId('page-tile')).toHaveCount(4)
    await page.getByRole('button', { name: 'Delete page 4' }).click()
    await page.getByRole('button', { name: 'Save PDF' }).click()
    await expect(page.getByTestId('result-preview')).toBeVisible()
    const { bytes } = await clickDownload(page)
    expect((await pdfTexts(bytes)).map(pageNo)).toEqual(['1', '1', '3'])
    expect((await PDFDocument.load(bytes)).getPages().map((p) => p.getRotation().angle)).toEqual([90, 90, 0])
    expect(errors).toEqual([])
  })

  test('rotate: rotates all pages', async ({ page }) => {
    await page.goto('/tools/rotate-pdf')
    await upload(page, 'alpha.pdf')
    await page.getByRole('button', { name: '180°' }).click()
    await page.getByRole('button', { name: 'Rotate page 2 right' }).click()
    await page.getByRole('button', { name: 'Save rotation' }).click()
    const { bytes } = await clickDownload(page)
    expect((await PDFDocument.load(bytes)).getPages().map((p) => p.getRotation().angle)).toEqual([180, 270])
  })

  test('remove pages, and refuse to remove all of them', async ({ page }) => {
    await page.goto('/tools/remove-pages')
    await upload(page, 'ten.pdf')
    await page.getByRole('button', { name: 'Remove page 2' }).click()
    await page.getByRole('button', { name: 'Remove page 5' }).click()
    await expect(page.getByText('Removing 2, 5. 8 pages will remain.')).toBeVisible()
    await page.getByRole('button', { name: /Remove 2 pages/ }).click()
    const { bytes } = await clickDownload(page)
    const texts = (await pdfTexts(bytes)).map(pageNo)
    expect(texts).toEqual(['1', '3', '4', '6', '7', '8', '9', '10'])
  })

  test('extract pages from a URL range', async ({ page }) => {
    await page.goto('/tools/extract-pages?pages=2-5')
    await upload(page, 'ten.pdf')
    await expect(page.getByLabel('Page ranges', { exact: true })).toHaveValue('2-5')
    await page.getByRole('button', { name: 'Extract pages' }).click()
    const { bytes } = await clickDownload(page)
    expect((await pdfTexts(bytes)).map(pageNo)).toEqual(['2', '3', '4', '5'])
  })
})

test.describe('Convert from PDF', () => {
  test('PDF to JPG renders pages and zips them', async ({ page }) => {
    await page.goto('/tools/pdf-to-jpg')
    await upload(page, 'alpha.pdf')
    await page.locator('label', { hasText: '72 dpi' }).click()
    await page.getByRole('button', { name: 'Convert to JPG' }).click()
    await expect(page.getByRole('heading', { name: '2 images created' })).toBeVisible()
    const [img] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download').first().click()])
    const jpg = await downloadBytes(img)
    expect([jpg[0], jpg[1], jpg[2]]).toEqual([0xff, 0xd8, 0xff])
    const sof = jpg.findIndex((b, i) => b === 0xff && (jpg[i + 1] === 0xc0 || jpg[i + 1] === 0xc2))
    // A4 at 72 dpi is 595 × 842.
    expect((jpg[sof + 7] << 8) | jpg[sof + 8]).toBe(595)
    const [zip] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all as ZIP' }).click()])
    const z = await downloadBytes(zip)
    expect(String.fromCharCode(z[0], z[1])).toBe('PK')
  })

  test('PDF to PNG produces PNG files', async ({ page }) => {
    await page.goto('/tools/pdf-to-png')
    await upload(page, 'alpha.pdf')
    await page.getByLabel('Pages (optional)').fill('2')
    await page.getByRole('button', { name: 'Convert to PNG' }).click()
    await expect(page.getByRole('heading', { name: '1 image created' })).toBeVisible()
    const [d] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download').click()])
    expect(d.suggestedFilename()).toBe('alpha_page_2.png')
    const png = await downloadBytes(d)
    expect(String.fromCharCode(png[1], png[2], png[3])).toBe('PNG')
  })

  test('PDF to text and Markdown, and explains scanned PDFs', async ({ page }) => {
    await page.goto('/tools/pdf-to-markdown')
    await upload(page, 'alpha.pdf')
    await page.getByRole('button', { name: 'Convert to Markdown' }).click()
    await expect(page.getByTestId('text-output')).toHaveValue(/Alpha Page 1/)
    await expect(page.getByTestId('text-output')).toHaveValue(/<!-- Page 2 -->/)
    const [d] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download').click()])
    expect(d.suggestedFilename()).toBe('alpha.md')
    await page.goto('/tools/pdf-to-text')
    await upload(page, 'photo-report.pdf')
    await page.getByRole('button', { name: 'Convert to text' }).click()
    await expect(page.getByTestId('text-output')).toHaveValue(/Photo report/)
  })
})

test.describe('Edit PDF tools', () => {
  test('adds page numbers', async ({ page }) => {
    await page.goto('/tools/add-page-numbers')
    await upload(page, 'bravo.pdf')
    await page.getByRole('button', { name: 'Add page numbers' }).click()
    await expect(page.getByTestId('result-preview')).toBeVisible()
    const { bytes } = await clickDownload(page)
    const t = await pdfTexts(bytes)
    expect(t[0]).toContain('Page 1 of 3')
    expect(t[2]).toContain('Page 3 of 3')
  })

  test('adds a text watermark to selected pages', async ({ page }) => {
    await page.goto('/tools/add-watermark')
    await upload(page, 'bravo.pdf')
    await page.getByLabel('Text', { exact: true }).fill('DRAFT COPY')
    await page.getByLabel('Pages (optional)').fill('2-3')
    await page.getByRole('button', { name: 'Add watermark' }).click()
    const { bytes } = await clickDownload(page)
    const t = await pdfTexts(bytes)
    expect(t[0]).not.toContain('DRAFT COPY')
    expect(t[1]).toContain('DRAFT COPY')
  })

  test('crops pages by changing the visible area', async ({ page }) => {
    await page.goto('/tools/crop-pdf')
    await upload(page, 'alpha.pdf')
    await page.getByLabel('Top (%)').fill('10')
    await page.getByLabel('Left (%)').fill('20')
    await page.getByRole('button', { name: 'Crop PDF' }).click()
    const { bytes } = await clickDownload(page)
    const doc = await PDFDocument.load(bytes)
    const box = doc.getPage(0).getCropBox()
    expect(Math.round(box.x)).toBe(Math.round(595 * 0.2))
    expect(Math.round(box.width)).toBe(Math.round(595 * 0.75))
    expect(Math.round(box.height)).toBe(Math.round(842 * 0.85))
  })

  test('fills and flattens a form', async ({ page }) => {
    await page.goto('/tools/fill-pdf-form')
    await upload(page, 'form.pdf')
    await page.getByLabel('Full name').fill('Meera Iyer')
    await page.getByLabel('Agree to terms').check()
    await page.getByLabel('Country').selectOption('Brazil')
    await page.getByLabel(/Flatten the form/).check()
    await page.getByRole('button', { name: 'Save filled PDF' }).click()
    const { bytes } = await clickDownload(page)
    expect((await pdfTexts(bytes))[0]).toContain('Meera Iyer')
    expect((await PDFDocument.load(bytes)).getForm().getFields()).toHaveLength(0)
  })

  test('explains when a PDF has no form fields', async ({ page }) => {
    await page.goto('/tools/fill-pdf-form')
    await upload(page, 'alpha.pdf')
    await expect(page.getByText('No fillable fields found')).toBeVisible()
  })

  test('compares two versions', async ({ page }) => {
    await page.goto('/tools/compare-pdf')
    await page.locator('input[type=file]').nth(0).setInputFiles(FIXTURES.path('contract-v1.pdf'))
    await expect(page.getByTestId('compare-file-0')).toBeVisible()
    await page.locator('input[type=file]').nth(0).setInputFiles(FIXTURES.path('contract-v2.pdf'))
    await page.getByRole('button', { name: 'Compare', exact: true }).click()
    await expect(page.getByTestId('diff-summary')).toBeVisible()
    await expect(page.getByTestId('diff-text').locator('ins')).toContainText(['120'])
    await expect(page.getByTestId('diff-text').locator('del').first()).toContainText('100')
    await expect(page.getByTestId('visual-status')).toContainText('% of this page looks different')
  })

  test('annotates with a text box and an image', async ({ page }) => {
    await page.goto('/tools/annotate-pdf')
    await upload(page, 'alpha.pdf')
    await page.getByRole('button', { name: 'Text box' }).click()
    await page.getByTestId('note-layer-1').click({ position: { x: 80, y: 150 } })
    await page.getByTestId('text-box-input').fill('Checked by QA')
    await page.getByRole('button', { name: 'Image', exact: true }).click()
    await page.getByTestId('overlay-image-input').setInputFiles(FIXTURES.path('gradient.png'))
    await expect(page.getByTestId('placed-image')).toBeVisible()
    await page.getByRole('button', { name: 'Save annotated PDF' }).click()
    const { bytes } = await clickDownload(page)
    expect((await pdfTexts(bytes))[0]).toContain('Checked by QA')
    expect(new TextDecoder('latin1').decode(bytes)).toMatch(/\/Subtype\s*\/Image/)
  })
})

test.describe('Security and optimize', () => {
  test('redacts searched text permanently and verifies it', async ({ page }) => {
    await page.goto('/tools/redact-pdf')
    await upload(page, 'sensitive.pdf')
    await page.getByLabel('Find and mark text').fill('123-45-6789')
    await page.getByRole('button', { name: 'Mark all matches' }).click()
    await expect(page.getByTestId('mark-count')).toContainText('1 area marked on page 1')
    // And a hand-drawn box over the name.
    const layer = page.getByTestId('redact-layer-1')
    const b = (await layer.boundingBox())!
    await page.mouse.move(b.x + b.width * 0.1, b.y + b.height * 0.06)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width * 0.4, b.y + b.height * 0.11, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByTestId('mark-count')).toContainText('2 areas')
    await page.getByRole('button', { name: 'Apply redactions' }).click()
    await expect(page.getByTestId('redaction-check')).toContainText('Verified')
    const { bytes } = await clickDownload(page)
    const t = await pdfTexts(bytes)
    expect(t[0].trim()).toBe('')
    expect(t[1]).toContain('Nothing sensitive here.')
    const raw = new TextDecoder('latin1').decode(bytes)
    expect(raw).not.toContain('123-45-6789')
    expect(raw).not.toContain('Ravi Kumar')
  })

  test('shows and removes metadata', async ({ page }) => {
    await page.goto('/tools/pdf-metadata')
    await upload(page, 'meta.pdf')
    await expect(page.getByTestId('metadata')).toContainText('1')
    await expect(page.getByLabel('Author')).toHaveValue('Jane Example')
    await page.getByRole('button', { name: 'Remove all metadata' }).click()
    const { bytes } = await clickDownload(page)
    const raw = new TextDecoder('latin1').decode(bytes)
    expect(raw).not.toContain('Jane Example')
    expect(raw).not.toContain('Quarterly secrets')
    expect((await pdfTexts(bytes))[0]).toContain('Meta Page 1')
  })

  test('repairs a PDF with a broken cross-reference table', async ({ page }) => {
    await page.goto('/tools/repair-pdf')
    await upload(page, 'broken.pdf')
    await page.getByRole('button', { name: 'Repair PDF' }).click()
    await expect(page.getByRole('heading', { name: 'Your PDF is repaired' })).toBeVisible()
    const { bytes } = await clickDownload(page)
    expect((await pdfTexts(bytes))[0]).toContain('Recover me')
  })

  test('explains when a file is too damaged', async ({ page }) => {
    await page.goto('/tools/repair-pdf')
    await upload(page, 'corrupt.pdf')
    await page.getByRole('button', { name: 'Repair PDF' }).click()
    await expect(page.getByText('Couldn’t rebuild the PDF')).toBeVisible()
    await page.getByRole('button', { name: 'Try recovering pages as images' }).click()
    await expect(page.getByText(/Recovery failed/)).toBeVisible()
  })
})

test.describe('Convert to PDF', () => {
  test('JPG to PDF accepts only JPGs', async ({ page }) => {
    await page.goto('/tools/jpg-to-pdf')
    await page.locator('input[type=file]').first().setInputFiles([FIXTURES.photo, FIXTURES.path('gradient.png')])
    await expect(alertBox(page)).toContainText('isn’t a JPG image')
    await expect(page.getByTestId('image-page')).toHaveCount(1)
    await page.getByRole('button', { name: 'Convert to PDF' }).click()
    const { bytes } = await clickDownload(page)
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1)
  })

  test('HTML to PDF previews sanitized HTML and prints it', async ({ page }) => {
    await page.goto('/tools/html-to-pdf')
    await page.getByLabel('HTML', { exact: true }).fill('<h1>Hello print</h1><script>document.title="pwned"</script><img src=x onerror="alert(1)"><p>Body text</p>')
    const frame = page.frameLocator('[data-testid=html-preview]')
    await expect(frame.locator('h1')).toHaveText('Hello print')
    await expect(frame.locator('script')).toHaveCount(0)
    expect(await frame.locator('img').getAttribute('onerror')).toBeNull()
    // Stub the print dialog and confirm it's opened on the preview.
    const handle = await page.locator('[data-testid=html-preview]').elementHandle()
    const win = await (await handle!.contentFrame())!.evaluateHandle(() => {
      ;(window as unknown as { printed: boolean }).printed = false
      window.print = () => ((window as unknown as { printed: boolean }).printed = true)
      return window
    })
    await page.getByRole('button', { name: 'Save as PDF' }).click()
    expect(await win.evaluate((w) => (w as unknown as { printed: boolean }).printed)).toBe(true)
  })
})

test.describe('Image tools', () => {
  test('rotates, flips, filters and converts an image', async ({ page }) => {
    await page.goto('/tools/rotate-image')
    await upload(page, 'gradient.png')
    await page.getByRole('button', { name: 'Rotate right' }).click()
    await page.getByRole('button', { name: 'Flip', exact: true }).click()
    await expect(page.getByTestId('rotation-status')).toHaveText('Rotation 90° · flipped')
    await page.getByRole('combobox', { name: 'Filter' }).selectOption('grayscale')
    await page.locator('label', { hasText: 'PNG' }).click()
    await page.getByRole('button', { name: 'Save image' }).click()
    await expect(page.getByText('600 × 800 px')).toBeVisible()
    const { download, bytes } = await clickDownload(page)
    expect(download.suggestedFilename()).toBe('gradient_edited.png')
    expect(String.fromCharCode(bytes[1], bytes[2], bytes[3])).toBe('PNG')
  })

  test('converts JPG to WebP', async ({ page }) => {
    await page.goto('/tools/convert-image')
    await page.locator('input[type=file]').first().setInputFiles(FIXTURES.photo)
    await page.locator('label', { hasText: 'WebP' }).click()
    await page.getByRole('button', { name: 'Save image' }).click()
    const { bytes } = await clickDownload(page)
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe('WEBP')
    expect(readFileSync(FIXTURES.photo).length).toBeGreaterThan(0)
  })
})
