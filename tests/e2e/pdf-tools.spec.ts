import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { FIXTURES, LOCKED_PASSWORD, alertBox, clickDownload, downloadBytes, pageCount, pdfTexts, watchErrors } from './fixtures'

test.describe('Merge PDF', () => {
  test('merges files in the chosen order and downloads a valid PDF', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/tools/merge-pdf')
    await page.locator('input[type=file]').setInputFiles([FIXTURES.path('alpha.pdf'), FIXTURES.path('bravo.pdf')])
    await expect(page.getByText('2 files · 5 pages')).toBeVisible()
    // Real page counts are shown for each file.
    await expect(page.getByText('2 pages', { exact: false }).first()).toBeVisible()

    // Put Bravo first using the keyboard-accessible move button.
    await page.getByRole('button', { name: 'Move bravo.pdf up' }).click()
    await page.getByRole('button', { name: /Merge 2 PDFs/ }).click()
    await expect(page.getByRole('heading', { name: 'Your PDFs are merged' })).toBeVisible()

    const { bytes } = await clickDownload(page)
    const texts = await pdfTexts(bytes)
    expect(texts).toHaveLength(5)
    expect(texts[0]).toContain('Bravo Page 1')
    expect(texts[3]).toContain('Alpha Page 1')
    expect(errors).toEqual([])
  })

  test('rejects files that are not PDFs and explains why', async ({ page }) => {
    await page.goto('/tools/merge-pdf')
    await page.locator('input[type=file]').setInputFiles([FIXTURES.path('alpha.pdf'), FIXTURES.path('not-a-pdf.pdf')])
    await expect(alertBox(page)).toContainText('not-a-pdf.pdf')
    await expect(page.getByText('1 file · 2 pages')).toBeVisible()
  })

  test('removing a file updates the selection', async ({ page }) => {
    await page.goto('/tools/merge-pdf')
    await page.locator('input[type=file]').setInputFiles([FIXTURES.path('alpha.pdf'), FIXTURES.path('bravo.pdf'), FIXTURES.path('ten.pdf')])
    await expect(page.getByText('3 files · 15 pages')).toBeVisible()
    await page.getByRole('button', { name: 'Remove ten.pdf' }).click()
    await expect(page.getByText('2 files · 5 pages')).toBeVisible()
    await page.getByRole('button', { name: /Merge 2 PDFs/ }).click()
    const { bytes } = await clickDownload(page)
    expect(await pageCount(bytes)).toBe(5)
  })
})

test.describe('Split PDF', () => {
  test('splits custom ranges into separate PDFs and offers a ZIP', async ({ page }) => {
    await page.goto('/tools/split-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('ten.pdf'))
    await expect(page.getByTestId('file-name')).toHaveText('ten.pdf')
    await page.getByLabel('Page ranges', { exact: true }).fill('1-3, 5, 8-10')
    await page.getByRole('button', { name: 'Create 3 PDFs' }).click()
    await expect(page.getByRole('heading', { name: 'Split into 3 PDFs' })).toBeVisible()

    const buttons = page.getByTestId('download')
    await expect(buttons).toHaveCount(3)
    const [d1] = await Promise.all([page.waitForEvent('download'), buttons.nth(0).click()])
    const t1 = await pdfTexts(await downloadBytes(d1))
    expect(t1.map((t) => t.split(' Page ')[1].split(' ')[0])).toEqual(['1', '2', '3'])
    const [d3] = await Promise.all([page.waitForEvent('download'), buttons.nth(2).click()])
    expect((await pdfTexts(await downloadBytes(d3))).length).toBe(3)

    const [zip] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all as ZIP' }).click()])
    expect(zip.suggestedFilename()).toBe('ten_split.zip')
    const zipBytes = await downloadBytes(zip)
    expect(String.fromCharCode(zipBytes[0], zipBytes[1])).toBe('PK')
  })

  test('validates ranges', async ({ page }) => {
    await page.goto('/tools/split-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('alpha.pdf'))
    await page.getByLabel('Page ranges', { exact: true }).fill('1-5')
    await expect(alertBox(page)).toContainText('goes past the last page')
    await expect(page.getByRole('button', { name: 'Split PDF', exact: true })).toBeDisabled()
  })

  test('extracts pages selected from thumbnails into one PDF', async ({ page }) => {
    await page.goto('/tools/split-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('ten.pdf'))
    await page.getByText('Select pages', { exact: true }).click()
    await page.getByRole('button', { name: 'Page 2', exact: true }).click()
    await page.getByRole('button', { name: 'Page 7', exact: true }).click()
    await expect(page.getByText('Selected: 2, 7')).toBeVisible()
    await page.getByRole('button', { name: 'Split PDF', exact: true }).click()
    const { bytes } = await clickDownload(page)
    const texts = await pdfTexts(bytes)
    expect(texts).toHaveLength(2)
    expect(texts[1]).toContain('Ten Page 7')
  })
})

test.describe('Compress PDF', () => {
  test('reduces an image-heavy PDF and reports real sizes', async ({ page }) => {
    const original = readFileSync(FIXTURES.path('photo-report.pdf'))
    await page.goto('/tools/compress-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('photo-report.pdf'))
    await page.locator('label', { hasText: 'High compression' }).click()
    await page.getByRole('button', { name: 'Compress PDF' }).click()
    await expect(page.getByTestId('compress-stats')).toBeVisible()
    const { bytes } = await clickDownload(page)
    expect(bytes.length).toBeLessThan(original.length * 0.5)
    // Text survives compression.
    expect((await pdfTexts(bytes))[0]).toContain('Photo report')
  })

  test('keeps the original when it cannot be reduced', async ({ page }) => {
    await page.goto('/tools/compress-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('alpha.pdf'))
    await page.getByRole('button', { name: 'Compress PDF' }).click()
    await expect(page.getByText(/couldn’t be made smaller|Compressed by/)).toBeVisible()
  })
})

test.describe('Lock and unlock', () => {
  test('locks a PDF that then requires the password', async ({ page }) => {
    await page.goto('/tools/lock-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('alpha.pdf'))
    await page.getByLabel('Password', { exact: true }).fill('tiger-lily-42')
    await page.getByLabel('Confirm password').fill('tiger-lily-4')
    await expect(page.getByText('The passwords don’t match.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Protect PDF' })).toBeDisabled()
    await page.getByLabel('Confirm password').fill('tiger-lily-42')
    await page.getByRole('button', { name: 'Protect PDF' }).click()
    await expect(page.getByRole('heading', { name: 'Your PDF is password-protected' })).toBeVisible()
    const { bytes } = await clickDownload(page)
    await expect(pdfTexts(bytes)).rejects.toMatchObject({ name: 'PasswordException' })
    expect((await pdfTexts(bytes, 'tiger-lily-42'))[0]).toContain('Alpha Page 1')
  })

  test('unlocks with the correct password and rejects a wrong one', async ({ page }) => {
    await page.goto('/tools/unlock-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('locked.pdf'))
    await page.getByLabel('Current password').fill('wrong-password')
    await page.getByRole('button', { name: 'Remove password' }).click()
    await expect(alertBox(page)).toContainText('incorrect')
    await page.getByLabel('Current password').fill(LOCKED_PASSWORD)
    await page.getByRole('button', { name: 'Remove password' }).click()
    await expect(page.getByRole('heading', { name: 'Password removed' })).toBeVisible()
    const { bytes } = await clickDownload(page)
    expect((await pdfTexts(bytes))[0]).toContain('Secret Page 1')
  })

  test('explains when a PDF is not protected', async ({ page }) => {
    await page.goto('/tools/unlock-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('alpha.pdf'))
    await expect(alertBox(page)).toContainText('isn’t password-protected')
  })

  test('split asks for the password of a protected PDF', async ({ page }) => {
    await page.goto('/tools/split-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('locked.pdf'))
    await page.getByLabel('Password', { exact: true }).fill('nope')
    await page.getByRole('button', { name: 'Open PDF' }).click()
    await expect(alertBox(page)).toContainText('incorrect')
    await page.getByLabel('Password', { exact: true }).fill(LOCKED_PASSWORD)
    await page.getByRole('button', { name: 'Open PDF' }).click()
    await expect(page.getByTestId('file-name')).toHaveText('locked.pdf')
  })
})
