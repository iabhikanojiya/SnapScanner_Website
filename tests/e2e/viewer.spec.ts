import { expect, test } from '@playwright/test'
import { PDFDocument } from '@cantoo/pdf-lib'
import { FIXTURES, clickDownload, pdfTexts, watchErrors } from './fixtures'

test.describe('PDF Reader', () => {
  test('renders pages, navigates, zooms and searches text', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/tools/pdf-reader')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('ten.pdf'))
    await expect(page.getByTestId('page-count')).toHaveText('/ 10')
    // The first page canvas is rendered with real pixels.
    const canvas = page.locator('[data-page="1"] canvas').last()
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(100)

    const zoom = page.getByTestId('zoom-level')
    const before = await zoom.textContent()
    await page.getByRole('button', { name: 'Zoom in' }).click()
    await expect(zoom).not.toHaveText(before!)
    await page.getByRole('button', { name: 'Fit width' }).click()
    await expect(zoom).toHaveText(before!)

    await page.getByLabel('Search text').fill('invoice number 1007')
    await page.getByLabel('Search text').press('Enter')
    await expect(page.getByTestId('search-status')).toHaveText('1 of 1')
    await expect(page.getByLabel('Page number')).toHaveValue('7')

    await page.getByLabel('Page number').fill('3')
    await page.getByLabel('Page number').press('Enter')
    await expect(page.getByLabel('Page number')).toHaveValue('3')
    await page.getByRole('button', { name: 'Rotate view' }).click()
    expect(errors).toEqual([])
  })

  test('opens a password-protected PDF after the password is entered', async ({ page }) => {
    await page.goto('/tools/pdf-reader')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('locked.pdf'))
    await page.getByLabel('Password', { exact: true }).fill('open-sesame')
    await page.getByRole('button', { name: 'Open PDF' }).click()
    await expect(page.getByTestId('page-count')).toHaveText('/ 2')
  })

  test('hands the open document to another tool', async ({ page }) => {
    await page.goto('/tools/pdf-reader')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('alpha.pdf'))
    await page.getByRole('button', { name: 'Compress PDF' }).click()
    await expect(page).toHaveURL(/\/tools\/compress-pdf$/)
    await expect(page.getByTestId('file-name')).toHaveText('alpha.pdf')
  })
})

test.describe('Annotate PDF', () => {
  test('highlights selected text and draws ink, then saves a new PDF', async ({ page }) => {
    await page.goto('/tools/annotate-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('alpha.pdf'))
    const span = page.locator('[data-page="1"] .textLayer span', { hasText: 'quick brown fox' })
    await expect(span).toBeVisible()
    await span.scrollIntoViewIfNeeded()
    // Select the span's text and release the pointer, as a user would.
    const box = (await span.boundingBox())!
    await page.mouse.move(box.x + 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2, { steps: 5 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled()

    await page.getByRole('button', { name: 'Marker' }).click()
    const layer = page.getByTestId('draw-layer-1')
    await layer.scrollIntoViewIfNeeded()
    const lb = (await layer.boundingBox())!
    await page.mouse.move(lb.x + 50, lb.y + 300)
    await page.mouse.down()
    await page.mouse.move(lb.x + 250, lb.y + 320, { steps: 10 })
    await page.mouse.up()

    await page.getByRole('button', { name: 'Save annotated PDF' }).click()
    await expect(page.getByRole('heading', { name: 'Your annotated PDF is ready' })).toBeVisible()
    const { bytes } = await clickDownload(page)
    const original = await PDFDocument.load(await (await import('node:fs/promises')).readFile(FIXTURES.path('alpha.pdf')))
    const annotated = await PDFDocument.load(bytes)
    expect(annotated.getPageCount()).toBe(original.getPageCount())
    expect(bytes.length).toBeGreaterThan(1000)
    // Text is still there.
    expect((await pdfTexts(bytes))[0]).toContain('quick brown fox')
    const content = new TextDecoder('latin1').decode(bytes)
    expect(content).toMatch(/SnapInk0|\/ExtGState/)
  })
})

test.describe('Sign PDF', () => {
  test('draws a signature, places, moves and resizes it, and saves', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/tools/sign-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('bravo.pdf'))
    await page.getByRole('button', { name: 'Create signature' }).click()
    const pad = page.getByTestId('signature-pad')
    const pb = (await pad.boundingBox())!
    await page.mouse.move(pb.x + 30, pb.y + 120)
    await page.mouse.down()
    for (let i = 0; i < 20; i++) await page.mouse.move(pb.x + 30 + i * 15, pb.y + 120 - Math.sin(i / 2) * 40)
    await page.mouse.up()
    await page.getByRole('button', { name: 'Use signature' }).click()

    const placed = page.getByTestId('placed-signature')
    await expect(placed).toHaveCount(1)
    const before = (await placed.boundingBox())!
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
    await page.mouse.down()
    await page.mouse.move(before.x + before.width / 2 - 120, before.y + before.height / 2 - 80, { steps: 5 })
    await page.mouse.up()
    const moved = (await placed.boundingBox())!
    expect(moved.x).toBeLessThan(before.x - 100)
    await placed.focus()
    await page.keyboard.press('+')
    await page.keyboard.press('+')
    expect((await placed.boundingBox())!.width).toBeGreaterThan(moved.width)

    await page.getByRole('button', { name: 'Save signed PDF' }).click()
    await expect(page.getByRole('heading', { name: 'Your PDF is signed' })).toBeVisible()
    const { bytes } = await clickDownload(page)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(3)
    // The page now draws an image XObject.
    expect(new TextDecoder('latin1').decode(bytes)).toMatch(/\/Subtype\s*\/Image/)
    expect(errors).toEqual([])
  })

  test('creates a typed signature', async ({ page }) => {
    await page.goto('/tools/sign-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('alpha.pdf'))
    await page.getByRole('button', { name: 'Create signature' }).click()
    await page.getByRole('tab', { name: 'type' }).click()
    await page.getByRole('textbox', { name: 'Your name' }).fill('Asha Rao')
    await page.getByRole('button', { name: 'Use signature' }).click()
    await expect(page.getByTestId('placed-signature')).toHaveCount(1)
  })
})

test('Sign PDF pages can be zoomed out, in and fitted', async ({ page }) => {
  await page.goto('/tools/sign-pdf')
  await page.locator('input[type=file]').setInputFiles(FIXTURES.path('ten.pdf'))
  const pageBox = page.locator('[data-page="1"]')
  await expect(pageBox).toBeVisible()
  // Fit page (the default) shows a whole page inside the panel.
  const panel = (await page.locator('[data-page="1"]').locator('..').locator('..').boundingBox())!
  expect((await pageBox.boundingBox())!.height).toBeLessThanOrEqual(panel.height)
  await page.getByTestId('zoom-select').selectOption('0.8')
  await expect.poll(async () => Math.round((await pageBox.boundingBox())!.width)).toBe(Math.round(595 * (4 / 3) * 0.8))
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await expect(page.getByTestId('zoom-select')).toHaveValue('0.7')
  await page.getByRole('button', { name: 'Fit width' }).click()
  await expect(page.getByRole('button', { name: 'Fit width' })).toHaveAttribute('aria-pressed', 'true')
})
