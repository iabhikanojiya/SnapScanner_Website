import { expect, test, type Page } from '@playwright/test'
import { PDFDocument } from '@cantoo/pdf-lib'
import { FIXTURES, LOCKED_PASSWORD, alertBox, downloadBytes, pdfTexts, watchErrors } from './fixtures'

/** Drags across a page overlay between two normalized points. */
async function dragOnPage(page: Page, pageNumber: number, from: [number, number], to: [number, number]) {
  const layer = page.locator(`[data-page="${pageNumber}"] [data-testid=page-layer]`)
  // Scroll so the middle of the drag is on screen (pages can be taller than the window).
  await layer.evaluate((el, y) => {
    const scroller = el.closest('.overflow-auto') as HTMLElement
    scroller.scrollIntoView({ block: 'start' })
    const r = el.getBoundingClientRect()
    const s = scroller.getBoundingClientRect()
    scroller.scrollTop += r.top + r.height * y - (s.top + Math.min(s.height, window.innerHeight - s.top) / 2)
  }, (from[1] + to[1]) / 2)
  const box = (await layer.boundingBox())!
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 6 })
  await page.mouse.up()
}

async function exportPdf(page: Page) {
  await page.getByTestId('edit-pdf').getByRole('button', { name: 'Download PDF' }).click()
  await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible()
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByTestId('result').getByRole('button', { name: 'Download PDF' }).click()])
  return { name: d.suggestedFilename(), bytes: await downloadBytes(d) }
}

test.describe('Edit PDF', () => {
  test('replaces text, adds text, covers an area, undoes and exports', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/tools/edit-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('bravo.pdf'))
    await expect(page.getByTestId('page-status')).toHaveText('Page 1 of 3')
    await expect(page.getByTestId('edit-pdf').getByText('bravo.pdf')).toBeVisible()
    // Nothing to save yet.
    await expect(page.getByTestId('edit-pdf').getByRole('button', { name: 'Download PDF' })).toBeDisabled()

    // Replace: click the detected text run on page 1.
    await page.getByRole('radio', { name: 'Replace text' }).click()
    const run = page.locator('[data-page="1"] [data-run]').first()
    await expect(run).toBeVisible()
    await run.click()
    const editor = page.getByRole('textbox', { name: 'Edit text in place' })
    await expect(editor).toBeFocused()
    await expect(editor).toHaveValue('Bravo Page 1')
    await editor.fill('Updated heading')
    await editor.press('Escape')
    const props = page.getByTestId('properties')
    await expect(props.getByLabel('Text', { exact: true })).toHaveValue('Updated heading')
    await expect(props.getByLabel('Hide what’s underneath with a solid colour')).toBeChecked()
    await expect(props.getByLabel('Size (pt)')).toHaveValue('28')
    await props.getByRole('button', { name: 'Bold' }).click()
    await props.getByLabel('Text colour').fill('#1d4ed8')

    // Add text on page 2 by dragging a box.
    await page.getByRole('radio', { name: 'Add text' }).click()
    await page.locator('[data-page="2"]').scrollIntoViewIfNeeded()
    await dragOnPage(page, 2, [0.15, 0.5], [0.7, 0.58])
    await page.getByRole('textbox', { name: 'Edit text in place' }).fill('A brand new note\nwith two lines')
    await page.getByRole('textbox', { name: 'Edit text in place' }).press('Escape')
    await expect(page.getByTestId('edit-box')).toHaveCount(2)

    // Cover an area on page 3, then undo and redo it.
    await page.getByRole('radio', { name: 'Cover area' }).click()
    await page.locator('[data-page="3"]').scrollIntoViewIfNeeded()
    await dragOnPage(page, 3, [0.1, 0.05], [0.6, 0.15])
    await expect(page.getByTestId('edit-box')).toHaveCount(3)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByTestId('edit-box')).toHaveCount(2)
    await page.getByRole('button', { name: 'Redo' }).click()
    await expect(page.getByTestId('edit-box')).toHaveCount(3)

    // Move the selected cover with the keyboard and delete it with the Delete key, then undo.
    const cover = page.getByTestId('edit-box').nth(2)
    await cover.focus()
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Delete')
    await expect(page.getByTestId('edit-box')).toHaveCount(2)
    await page.keyboard.press('Control+z')
    await expect(page.getByTestId('edit-box')).toHaveCount(3)

    const { name, bytes } = await exportPdf(page)
    expect(name).toBe('bravo_edited.pdf')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(3)
    const texts = await pdfTexts(bytes)
    expect(texts[0]).toContain('Updated heading')
    expect(texts[1]).toContain('A brand new note')
    expect(texts[1]).toContain('with two lines')
    expect(texts[1]).toContain('Bravo Page 2')
    // Covered text is hidden, not removed (this is stated in the UI).
    expect(texts[0]).toContain('Bravo Page 1')
    await expect(page.getByTestId('result')).toContainText('Covered text is hidden, not deleted')
    expect(errors).toEqual([])
  })

  test('moves and resizes a box with the mouse, and keeps position when zooming', async ({ page }) => {
    await page.goto('/tools/edit-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('alpha.pdf'))
    await page.getByRole('radio', { name: 'Add text' }).click()
    await dragOnPage(page, 1, [0.2, 0.4], [0.5, 0.45])
    await page.getByRole('textbox', { name: 'Edit text in place' }).fill('Movable')
    await page.getByRole('textbox', { name: 'Edit text in place' }).press('Escape')
    const props = page.getByTestId('properties')
    const x0 = Number(await props.getByLabel('X', { exact: true }).inputValue())
    const w0 = Number(await props.getByLabel('W', { exact: true }).inputValue())

    const boxEl = page.getByTestId('edit-box').first()
    await expect(boxEl).toBeVisible()
    const b = (await boxEl.boundingBox())!
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 30, { steps: 5 })
    await page.mouse.up()
    await expect.poll(async () => Number(await props.getByLabel('X', { exact: true }).inputValue())).toBeGreaterThan(x0 + 10)

    const handle = boxEl.locator('[data-handle=se]')
    const h = (await handle.boundingBox())!
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
    await page.mouse.down()
    await page.mouse.move(h.x + 80, h.y + 40, { steps: 5 })
    await page.mouse.up()
    await expect.poll(async () => Number(await props.getByLabel('W', { exact: true }).inputValue())).toBeGreaterThan(w0 + 20)

    // Zoom changes the screen size, not the position on the page.
    const before = [await props.getByLabel('X', { exact: true }).inputValue(), await props.getByLabel('Y', { exact: true }).inputValue()]
    await page.getByRole('button', { name: 'Zoom in' }).click()
    await page.getByRole('button', { name: 'Zoom in' }).click()
    expect([await props.getByLabel('X', { exact: true }).inputValue(), await props.getByLabel('Y', { exact: true }).inputValue()]).toEqual(before)
    // Undo the resize, then the move.
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect.poll(async () => Math.round(Number(await props.getByLabel('W', { exact: true }).inputValue()))).toBe(Math.round(w0))
  })

  test('works on rotated pages and password-protected PDFs', async ({ page }) => {
    await page.goto('/tools/edit-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('rotated.pdf'))
    await page.getByRole('radio', { name: 'Add text' }).click()
    await dragOnPage(page, 1, [0.1, 0.1], [0.6, 0.18])
    await page.getByRole('textbox', { name: 'Edit text in place' }).fill('Upright note')
    await page.getByRole('textbox', { name: 'Edit text in place' }).press('Escape')
    const { bytes } = await exportPdf(page)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPage(0).getRotation().angle).toBe(90)
    expect((await pdfTexts(bytes))[0]).toContain('Upright note')

    await page.getByRole('button', { name: 'Back to editing' }).click()
    await page.getByRole('button', { name: 'Choose another PDF' }).click()
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('locked.pdf'))
    await page.getByLabel(/password/i).fill(LOCKED_PASSWORD)
    await page.getByRole('button', { name: /Open|Unlock/ }).click()
    await expect(page.getByTestId('page-status')).toContainText('Page 1 of')
  })

  test('scanned pages: replace by dragging an area; long PDFs: thumbnails navigate', async ({ page }) => {
    await page.goto('/tools/edit-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('photo-report.pdf'))
    await page.getByRole('radio', { name: 'Replace text' }).click()
    // Only the real text heading is highlighted; the photo (like a scan) has no text to click.
    await expect(page.locator('[data-run]')).toHaveCount(1)
    await dragOnPage(page, 1, [0.2, 0.3], [0.7, 0.36])
    await page.getByRole('textbox', { name: 'Edit text in place' }).fill('Corrected label')
    await page.getByRole('textbox', { name: 'Edit text in place' }).press('Escape')
    await expect(page.getByTestId('properties').getByLabel('Hide what’s underneath with a solid colour')).toBeChecked()
    const { bytes } = await exportPdf(page)
    expect((await pdfTexts(bytes))[0]).toContain('Corrected label')

    await page.getByRole('button', { name: 'Back to editing' }).click()
    await page.getByRole('button', { name: 'Choose another PDF' }).click()
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('ten.pdf'))
    await expect(page.getByTestId('page-status')).toHaveText('Page 1 of 10')
    await page.getByRole('navigation', { name: 'Pages' }).getByRole('button', { name: 'Page 7' }).click()
    await expect(page.getByTestId('page-status')).toHaveText('Page 7 of 10')
    await page.getByRole('button', { name: 'Previous page' }).click()
    await expect(page.getByTestId('page-status')).toHaveText('Page 6 of 10')
  })

  test('rejects files that are not PDFs', async ({ page }) => {
    await page.goto('/tools/edit-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('not-a-pdf.pdf'))
    await expect(alertBox(page)).toContainText('not-a-pdf.pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('corrupt.pdf'))
    await expect(alertBox(page)).toContainText('corrupt.pdf')
  })
})
