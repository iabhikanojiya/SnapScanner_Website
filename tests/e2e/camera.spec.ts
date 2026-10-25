import { expect, test } from '@playwright/test'
import { PDFDocument } from '@cantoo/pdf-lib'
import { asTouchDevice, clickDownload } from './fixtures'

// Chromium's fake camera produces a test pattern, so capture runs end to end.
test.use({
  permissions: ['camera'],
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
})

test.describe('Scan with a camera', () => {
  test('captures pages from the live camera', async ({ page }) => {
    // Scanning in the browser is offered on phones and tablets; computers are pointed to the app.
    await asTouchDevice(page)
    await page.goto('/tools/scan-pdf')
    await page.getByRole('button', { name: 'Use camera' }).click()
    const shutter = page.getByRole('button', { name: 'Capture page' })
    await expect(shutter).toBeEnabled()
    await shutter.click()
    await expect(page.getByRole('heading', { name: '1 scanned page' })).toBeVisible()
    await shutter.click()
    await expect(page.getByRole('heading', { name: '2 scanned pages' })).toBeVisible()
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: 'Save as PDF' }).click()
    const { bytes } = await clickDownload(page)
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2)
  })
})
