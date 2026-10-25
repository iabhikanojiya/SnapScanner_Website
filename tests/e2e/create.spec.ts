import { expect, test, type Page } from '@playwright/test'
import { PDFDocument, PDFName } from '@cantoo/pdf-lib'
import { FIXTURES, downloadBytes, pdfTexts, watchErrors } from './fixtures'

/** Width and height from a PNG's IHDR chunk. */
function pngSize(bytes: Uint8Array) {
  expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  const v = new DataView(bytes.buffer, bytes.byteOffset)
  return { width: v.getUint32(16), height: v.getUint32(20) }
}

async function download(page: Page, button: RegExp | string) {
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('dialog').getByRole('button', { name: button }).first().click()])
  return { name: d.suggestedFilename(), bytes: await downloadBytes(d) }
}

async function openExport(page: Page) {
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Download' })).toBeVisible()
}

const preview = (page: Page) => page.getByTestId('design-preview')
const saved = (page: Page) => expect(page.getByTestId('save-state')).toHaveText(/Saved in this browser/)

test.describe('Create Studio', () => {
  test('landing page lists six tools with real previews and recent projects', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/create')
    await expect(page.getByRole('heading', { level: 1, name: 'Create something great.' })).toBeVisible()
    for (const name of ['Resume Builder', 'ID Card Maker', 'Invoice Maker', 'Business Card Maker', 'Certificate Maker', 'Photo Collage Maker', 'Letterhead Maker', 'Festival Greeting Maker', 'QR Code Generator']) await expect(page.getByRole('heading', { level: 3, name })).toBeVisible()
    // Card previews render real designs (SVG) once visible.
    await expect(page.getByTestId('create-card-invoices').locator('svg text').first()).toBeAttached()
    await expect(page.getByTestId('create-card-certificates')).toContainText('26 templates')
    await page.getByRole('button', { name: 'Start creating with Certificate Maker' }).click()
    await expect(page).toHaveURL(/\/create\/certificates\/edit\?project=/)
    await expect(preview(page)).toContainText('Maya Fernandes')
    await page.goto('/create')
    await expect(page.getByTestId('recent-projects')).toContainText('Untitled certificate')
    expect(errors).toEqual([])
  })

  test('ID card: edit, photo crop, QR, undo/redo, autosave and PDF/PNG export', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/create/id-cards')
    await expect(page.getByTestId('template-grid').locator('li')).toHaveCount(40)
    // Search and filter.
    await page.getByLabel('Search templates').fill('student')
    const count = await page.getByTestId('template-grid').locator('li').count()
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(40)
    await page.getByLabel('Search templates').fill('')
    await page.getByRole('button', { name: 'Use the Corporate Sidebar template' }).click()
    await expect(page).toHaveURL(/\/create\/id-cards\/edit\?project=/)

    await page.getByLabel('Full name').fill('Riya Kapoor')
    await expect(preview(page)).toContainText('Riya Kapoor')
    await page.getByLabel('Choose Photo', { exact: true }).setInputFiles(FIXTURES.photo)
    await expect(preview(page).locator('image').first()).toBeAttached()
    await page.getByRole('group', { name: 'Crop Photo' }).getByRole('slider', { name: 'Zoom' }).fill('2')

    // Undo/redo of a non-text change.
    await page.getByRole('tab', { name: 'Design' }).click()
    await page.getByRole('combobox', { name: 'Size', exact: true }).selectOption('cr80-p')
    await expect(page.getByTestId('design-size')).toContainText('portrait')
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByTestId('design-size')).toContainText('landscape')
    await page.getByRole('button', { name: 'Redo' }).click()
    await expect(page.getByTestId('design-size')).toContainText('portrait')
    await page.getByRole('button', { name: 'Undo' }).click()

    await saved(page)
    await page.reload()
    await expect(preview(page)).toContainText('Riya Kapoor')
    await expect(preview(page).locator('image').first()).toBeAttached()

    await openExport(page)
    const pdf = await download(page, 'Download PDF')
    expect(pdf.name).toBe('Untitled ID card.pdf')
    const texts = await pdfTexts(pdf.bytes)
    expect(texts).toHaveLength(2)
    expect(texts[0]).toContain('Riya Kapoor')
    const doc = await PDFDocument.load(pdf.bytes)
    const { width, height } = doc.getPage(0).getSize()
    expect(width).toBeCloseTo((85.6 * 72) / 25.4, 0)
    expect(height).toBeCloseTo((54 * 72) / 25.4, 0)
    expect(doc.getPage(0).node.Resources()?.lookup(PDFName.of('XObject'))).toBeTruthy()

    const png = await download(page, /^PNG/)
    expect(png.name).toBe('Untitled ID card - Front.png')
    expect(pngSize(png.bytes)).toEqual({ width: 1011, height: 638 })
    expect(errors).toEqual([])
  })

  test('invoice: line items, discount, taxes, currency and multi-page PDF', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/create/invoices')
    await page.getByRole('button', { name: 'Use the Clean Split template' }).click()
    await expect(page.getByTestId('invoice-total')).toHaveText('$6,136.77')

    await page.getByLabel('Item 1 description').fill('Consulting call')
    await page.getByLabel('Qty').first().fill('2')
    await expect(page.getByTestId('line-amount-0')).toHaveText('$2,400.00')
    await page.getByRole('button', { name: 'Add item' }).click()
    await page.getByLabel('Item 5 description').fill('Hosting')
    await page.getByLabel('Unit price').nth(4).fill('0.10')
    await page.getByLabel('Qty').nth(4).fill('3')
    await expect(page.getByTestId('line-amount-4')).toHaveText('$0.30')
    await page.getByLabel('Discount', { exact: true }).selectOption('fixed')
    await page.getByLabel('Discount (USD)').fill('100')
    await page.getByLabel('Tax name').first().fill('VAT')
    await page.getByLabel('Rate %').first().fill('20')
    // 2400 + 3400 + 1187.50 + 179.94 + 0.30 = 7167.74; -100 = 7067.74; VAT 20% = 1413.55
    await expect(page.getByTestId('invoice-total')).toHaveText('$8,481.29')
    await expect(preview(page)).toContainText('$8,481.29')

    await page.getByRole('tab', { name: 'Details' }).click()
    await page.getByLabel('Currency').selectOption('EUR')
    await page.getByRole('tab', { name: 'Items & totals' }).click()
    await expect(page.getByTestId('invoice-total')).toHaveText('€8,481.29')
    // Invalid input is reported, not silently used.
    await page.getByLabel('Qty').first().fill('two')
    await expect(page.getByTestId('warnings')).toContainText('Line 1')
    await page.getByLabel('Qty').first().fill('2')

    for (let i = 0; i < 25; i++) await page.getByRole('button', { name: 'Add item' }).click()
    await expect(page.getByTestId('design-size')).toContainText('2 pages')
    await openExport(page)
    const pdf = await download(page, 'Download PDF')
    const texts = await pdfTexts(pdf.bytes)
    expect(texts).toHaveLength(2)
    expect(texts.join(' ')).toContain('Consulting call')
    expect(texts[1]).toContain('€8,481.29')
    expect(errors).toEqual([])
  })

  test('business card: print bleed PDF and 300 dpi PNG of each side', async ({ page }) => {
    await page.goto('/create/business-cards')
    await page.getByRole('button', { name: 'Use the Corporate Split template' }).click()
    await page.getByLabel('Full name').fill('Arjun Rao')
    await expect(preview(page).locator('[data-guides]').first()).toBeAttached()
    await openExport(page)
    const pdf = await download(page, 'Download PDF')
    const doc = await PDFDocument.load(pdf.bytes)
    expect(doc.getPageCount()).toBe(2)
    const p = doc.getPage(0)
    expect(p.getSize()).toEqual({ width: 252 + 18, height: 144 + 18 })
    const trim = p.getTrimBox()
    expect([trim.x, trim.y, trim.width, trim.height]).toEqual([9, 9, 252, 144])
    expect((await pdfTexts(pdf.bytes))[0]).toContain('Arjun Rao')
    await page.getByLabel('Page').selectOption('1')
    const back = await download(page, /^PNG/)
    expect(back.name).toBe('Untitled business card - Back.png')
    expect(pngSize(back.bytes)).toEqual({ width: 1050, height: 600 })
    const zip = await download(page, 'All pages as PNG (ZIP)')
    expect(Array.from(zip.bytes.slice(0, 2))).toEqual([0x50, 0x4b])

    // Without print guides, the PDF is the trim size.
    await page.keyboard.press('Escape')
    await page.getByRole('tab', { name: 'Design' }).click()
    await page.getByLabel(/Print guides and bleed/).uncheck()
    await openExport(page)
    const trimmed = await PDFDocument.load((await download(page, 'Download PDF')).bytes)
    expect(trimmed.getPage(0).getSize()).toEqual({ width: 252, height: 144 })
  })

  test('certificate: switch templates keeps content, colors, JPG export', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/create/certificates')
    await page.getByRole('button', { name: 'Use the Classic Gold template' }).click()
    await page.getByLabel('Recipient name').fill('Sam Okafor')
    await page.getByRole('tab', { name: 'Design' }).click()
    await page.getByLabel('Main color').fill('#123456')
    await expect(preview(page).locator('[fill="#123456"]').first()).toBeAttached()
    await page.getByRole('button', { name: 'Change template' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Switch to the Art Deco Emerald template' }).click()
    await expect(page.getByText(/Switched to Art Deco Emerald and its portrait size/)).toBeVisible()
    await expect(preview(page)).toContainText('Sam Okafor')
    await expect(page.getByTestId('design-size')).toContainText('portrait')
    await openExport(page)
    const jpg = await download(page, /^JPG/)
    expect(Array.from(jpg.bytes.slice(0, 3))).toEqual([0xff, 0xd8, 0xff])
    const pdf = await download(page, 'Download PDF')
    expect((await pdfTexts(pdf.bytes))[0]).toContain('Sam Okafor')
    expect(errors).toEqual([])
  })

  test('festival greeting: template wording, switching festivals, exact-pixel PNG and PDF', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/create/festival-greetings')
    await page.getByRole('button', { name: 'Use the Diwali Diya Wordmark template' }).click()
    // Styles may set the festival name in capitals or over two lines, so compare loosely.
    const loose = async () => ((await preview(page).textContent()) ?? '').replace(/\s+/g, '').toLowerCase()
    await expect.poll(loose).toContain('happydiwali')
    await page.getByLabel('Sign-off').fill('From the Rao family')
    // A blank greeting follows the template, so switching festivals changes the wording.
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Switch to the Eid Lantern Night template' }).click()
    await expect.poll(loose).toContain('eidmubarak')
    await expect(preview(page)).toContainText('From the Rao family')
    await page.getByLabel('Greeting', { exact: true }).fill('Eid Mubarak, Ayesha!')
    await expect.poll(loose).toContain('eidmubarak,ayesha!')
    await openExport(page)
    const png = await download(page, /^PNG/)
    expect(pngSize(png.bytes)).toEqual({ width: 1080, height: 1080 })
    const pdf = await download(page, 'Download PDF')
    const text = (await pdfTexts(pdf.bytes))[0]
    expect(text.replace(/\s+/g, '').toLowerCase()).toContain('eidmubarak,ayesha!')
    expect(text).toContain('From the Rao family')
    expect(errors).toEqual([])
  })

  test('photo collage: add photos, drag to swap, layout switch warning, PNG/JPG/PDF', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/create/photo-collages')
    await page.getByRole('button', { name: 'Use the Classic Grid template' }).click()
    const slots = page.getByTestId('collage-slots')
    await expect(slots.getByRole('button')).toHaveCount(4)
    await page.getByLabel('Add photos').setInputFiles([FIXTURES.photo, FIXTURES.photo, FIXTURES.photo])
    await expect(slots.getByRole('button', { name: 'Frame 4, empty' })).toBeVisible()
    await expect(preview(page).locator('image')).toHaveCount(3)
    // Drag the photo from frame 1 to the empty frame 4.
    await slots.getByRole('button', { name: 'Frame 1', exact: true }).dragTo(slots.getByRole('button', { name: 'Frame 4, empty' }))
    await expect(slots.getByRole('button', { name: 'Frame 1, empty' })).toBeVisible()
    await expect(slots.getByRole('button', { name: 'Frame 4', exact: true })).toBeVisible()
    // Crop the selected photo.
    await page.getByRole('slider', { name: 'Zoom' }).fill('1.5')
    await saved(page)

    // A layout with fewer frames warns before removing photos.
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Switch to the Side by Side template' }).click()
    await expect(page.getByRole('dialog', { name: /Switch to Side by Side/ })).toContainText('Photo 3, Photo 4')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.keyboard.press('Escape')
    await expect(slots.getByRole('button')).toHaveCount(4)

    await openExport(page)
    const png = await download(page, /^PNG/)
    expect(pngSize(png.bytes)).toEqual({ width: 1080, height: 1080 })
    const jpg = await download(page, /^JPG/)
    expect(Array.from(jpg.bytes.slice(0, 3))).toEqual([0xff, 0xd8, 0xff])
    const pdf = await PDFDocument.load((await download(page, 'Download PDF')).bytes)
    expect(pdf.getPage(0).getSize()).toEqual({ width: 1080, height: 1080 })
    expect(errors).toEqual([])
  })

  test('projects can be renamed, duplicated and deleted, and reopen with their content', async ({ page }) => {
    await page.goto('/create/business-cards')
    await page.getByRole('button', { name: 'New business card' }).click()
    await page.getByLabel('Project name').fill('Team cards')
    await page.getByLabel('Full name').fill('Lee Wong')
    await saved(page)
    await page.getByRole('tab', { name: 'Design' }).click()
    await page.getByRole('button', { name: 'Duplicate project' }).click()
    await expect(page.getByLabel('Project name')).toHaveValue('Team cards (copy)')
    await expect(preview(page)).toContainText('Lee Wong')
    await page.goto('/create/business-cards')
    const list = page.getByTestId('project-list')
    await expect(list).toContainText('Team cards (copy)')
    await list.getByRole('button', { name: 'Rename Team cards (copy)' }).click()
    await page.getByLabel('Name', { exact: true }).fill('Backup cards')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(list).toContainText('Backup cards')
    await list.getByRole('button', { name: 'Delete Backup cards' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(list).not.toContainText('Backup cards')
    await list.getByRole('button', { name: 'Team cards', exact: true }).click()
    await expect(preview(page)).toContainText('Lee Wong')
  })

  test('letterhead: long letters continue onto a second page, and blank letterheads export', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/create/letterheads')
    await expect(page.getByTestId('template-grid').locator('li')).toHaveCount(27)
    await page.getByRole('button', { name: 'Use the Indigo Band template' }).click()
    await page.getByLabel('Company or organization').fill('Lakeview Studio')
    const para = 'We are pleased to confirm the next phase of the project and the schedule we agreed together. '
    await page.getByLabel('Letter', { exact: true }).fill(Array.from({ length: 9 }, (_, i) => `Paragraph ${i + 1}. ${para.repeat(3)}`).join('\n\n'))
    await expect(page.getByTestId('design-size')).toContainText('2 pages')
    await openExport(page)
    const pdf = await download(page, 'Download PDF')
    const texts = await pdfTexts(pdf.bytes)
    expect(texts).toHaveLength(2)
    expect(texts[0]).toContain('Lakeview Studio')
    expect(texts.join(' ')).toContain('Paragraph 9.')
    expect(texts[1]).toContain('Daniel Okafor')
    await page.keyboard.press('Escape')

    await page.getByLabel(/Include the letter/).uncheck()
    await expect(page.getByTestId('design-size')).not.toContainText('pages')
    await openExport(page)
    const blank = await pdfTexts((await download(page, 'Download PDF')).bytes)
    expect(blank).toHaveLength(1)
    expect(blank[0]).toContain('Lakeview Studio')
    expect(blank[0]).not.toContain('Paragraph')
    expect(errors).toEqual([])
  })

  test('a missing project explains that projects stay in one browser', async ({ page }) => {
    await page.goto('/create/invoices/edit?project=does-not-exist')
    await expect(page.getByText('Project not found')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to Invoice Maker' })).toHaveAttribute('href', '/create/invoices')
  })

  test('the Create menu lists the makers with descriptions', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop menus')
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main' })
    const create = nav.getByRole('button', { name: 'Create', exact: true })
    await create.focus()
    await page.keyboard.press('Enter')
    const panel = page.locator(`#${(await create.getAttribute('aria-controls'))!.replace(/:/g, '\\:')}`)
    for (const name of ['Resume Builder', 'ID Card Maker', 'Invoice Maker', 'Business Card Maker', 'Certificate Maker', 'Photo Collage Maker', 'Letterhead Maker', 'Festival Greeting Maker', 'QR Code Generator']) await expect(panel.getByRole('link', { name: new RegExp(name) })).toBeVisible()
    await expect(panel).toContainText('Invoices with exact totals and taxes')
    // Resume Builder is no longer a separate top-level link.
    await expect(nav.locator('> div a', { hasText: /^Resume Builder$/ })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(create).toBeFocused()
    await create.click()
    await panel.getByRole('link', { name: /Invoice Maker/ }).click()
    await expect(page).toHaveURL(/\/create\/invoices$/)
    await expect(create).toHaveAttribute('aria-expanded', 'false')
  })
})
