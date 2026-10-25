import { writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { PDFDocument } from '@cantoo/pdf-lib'
import { FIXTURES, clickDownload, pdfTexts, watchErrors } from './fixtures'

test('OCR recognizes text in an image-only PDF and makes it searchable', async ({ page }) => {
  test.setTimeout(180_000)
  const errors = watchErrors(page)
  await page.goto('/tools/ocr-pdf')
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
  const path = FIXTURES.path('scanned-invoice.pdf')
  writeFileSync(path, await doc.save())
  expect((await pdfTexts(new Uint8Array(await doc.save())))[0].trim()).toBe('')

  await page.locator('input[type=file]').setInputFiles(path)
  await page.getByRole('button', { name: 'Recognize text' }).click()
  await expect(page.getByTestId('ocr-text')).toBeVisible({ timeout: 150_000 })
  await expect(page.getByTestId('ocr-text')).toHaveValue(/INVOICE 2026/)
  await expect(page.getByTestId('ocr-text')).toHaveValue(/Total amount due/)
  const { bytes } = await clickDownload(page)
  const text = (await pdfTexts(bytes))[0]
  expect(text).toContain('INVOICE')
  expect(text).toContain('2026')
  expect(errors).toEqual([])
})
