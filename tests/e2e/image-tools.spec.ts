import { expect, test } from '@playwright/test'
import { PDFDocument } from '@cantoo/pdf-lib'
import { alertBox, asTouchDevice, clickDownload, FIXTURES, watchErrors } from './fixtures'

test.describe('Image to PDF', () => {
  test('converts images with edits, page size and a custom file name', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/tools/image-to-pdf')
    await page.locator('input[type=file]').first().setInputFiles([FIXTURES.photo, FIXTURES.path('gradient.png')])
    await expect(page.getByRole('heading', { name: '2 pages' })).toBeVisible()
    await expect(page.getByTestId('image-page')).toHaveCount(2)

    // Edit page 1: apply Grayscale.
    await page.getByRole('button', { name: 'Edit page 1', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: /Edit photo.jpg/ })).toBeVisible()
    await dialog.locator('label', { hasText: 'Grayscale' }).click()
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByTestId('image-page').first()).toContainText('Grayscale')

    // Rotate page 2 and move it first.
    await page.getByRole('button', { name: 'Rotate page 2 right' }).click()
    await expect(page.getByTestId('image-page').nth(1)).toContainText('90°')
    await page.getByRole('button', { name: 'Move page 2 earlier' }).click()

    await page.locator('label', { hasText: 'Letter' }).click()
    await page.getByLabel('File name').fill('My images')
    await page.getByRole('button', { name: 'Convert to PDF' }).click()
    await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible()

    const { download, bytes } = await clickDownload(page)
    expect(download.suggestedFilename()).toBe('My images.pdf')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(2)
    const sizes = doc.getPages().map((p) => p.getSize())
    // The rotated gradient (800×600 → 600×800) is portrait; the photo is portrait too.
    expect(sizes[0]).toEqual({ width: 612, height: 792 })
    expect(sizes[1]).toEqual({ width: 612, height: 792 })
    expect(errors).toEqual([])
  })

  test('rejects unsupported files', async ({ page }) => {
    await page.goto('/tools/image-to-pdf')
    await page.locator('input[type=file]').first().setInputFiles(FIXTURES.path('alpha.pdf'))
    await expect(alertBox(page)).toContainText('alpha.pdf')
  })
})

test.describe('Scan to PDF', () => {
  test('detects page edges on an uploaded photo and saves a PDF', async ({ page }) => {
    await asTouchDevice(page)
    await page.goto('/tools/scan-pdf')
    await page.locator('input[type=file]').first().setInputFiles(FIXTURES.path('desk-scan.png'))
    await expect(page.getByRole('heading', { name: '1 scanned page' })).toBeVisible()
    await expect(page.getByTestId('image-page')).toContainText('cropped')
    await expect(page.getByText('Edges not found')).toHaveCount(0)

    await page.getByLabel('Filter for all pages').selectOption('bw')
    await expect(page.getByTestId('image-page')).toContainText('B&W')
    await page.getByRole('button', { name: 'Save as PDF' }).click()
    const { bytes } = await clickDownload(page)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
  })

  test('falls back to manual crop when no page is found', async ({ page }) => {
    await asTouchDevice(page)
    await page.goto('/tools/scan-pdf')
    await page.locator('input[type=file]').first().setInputFiles(FIXTURES.path('gradient.png'))
    await expect(page.getByText('Edges not found: crop by hand')).toBeVisible()
    await page.getByRole('button', { name: 'Edit page 1', exact: true }).click()
    const corner = page.getByRole('button', { name: /Move top-left corner/ })
    await corner.focus()
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Shift+ArrowDown')
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByTestId('image-page')).toContainText('cropped')
  })

  test('explains a blocked camera and keeps upload available', async ({ page, context }) => {
    await context.clearPermissions()
    await asTouchDevice(page)
    await page.goto('/tools/scan-pdf')
    await page.evaluate(() => {
      // Simulate the user denying the permission prompt.
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
    })
    await page.getByRole('button', { name: 'Use camera' }).click()
    await expect(page.getByText('Camera access was blocked')).toBeVisible()
    await page.getByRole('button', { name: 'Close camera' }).click()
    await page.locator('input[type=file]').first().setInputFiles(FIXTURES.photo)
    await expect(page.getByRole('heading', { name: '1 scanned page' })).toBeVisible()
  })
})

test.describe('Resize Image', () => {
  test('resizes with a locked aspect ratio and downloads the new image', async ({ page }) => {
    await page.goto('/tools/resize-image')
    await page.locator('input[type=file]').first().setInputFiles(FIXTURES.path('gradient.png'))
    await expect(page.getByText('800 × 600 px')).toBeVisible()
    await page.getByLabel('Width (px)').fill('400')
    await expect(page.getByLabel('Height (px)')).toHaveValue('300')
    await page.locator('label', { hasText: 'JPG' }).click()
    await page.getByRole('button', { name: 'Resize image' }).click()
    await expect(page.getByRole('heading', { name: 'Your image is resized' })).toBeVisible()
    const { download, bytes } = await clickDownload(page)
    expect(download.suggestedFilename()).toBe('gradient_400x300.jpg')
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xff, 0xd8, 0xff])
    // JPEG SOF0 holds height then width.
    const sof = bytes.findIndex((b, i) => b === 0xff && (bytes[i + 1] === 0xc0 || bytes[i + 1] === 0xc2))
    expect([(bytes[sof + 5] << 8) | bytes[sof + 6], (bytes[sof + 7] << 8) | bytes[sof + 8]]).toEqual([300, 400])
  })

  test('unlocked aspect ratio and validation', async ({ page }) => {
    await page.goto('/tools/resize-image')
    await page.locator('input[type=file]').first().setInputFiles(FIXTURES.path('gradient.png'))
    await page.getByRole('button', { name: 'Keep aspect ratio' }).click()
    await page.getByLabel('Width (px)').fill('100')
    await expect(page.getByLabel('Height (px)')).toHaveValue('600')
    await page.getByLabel('Width (px)').fill('90000')
    await expect(page.getByRole('button', { name: 'Resize image' })).toBeDisabled()
  })
})
