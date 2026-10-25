import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'
import { FIXTURES, downloadBytes, watchErrors } from './fixtures'

/** Decodes the QR code in an <svg> or an image (PNG bytes) with the browser's BarcodeDetector; null if unavailable. */
async function decode(page: Page, source: { svgSelector: string } | { png: Uint8Array }) {
  return page.evaluate(async (src) => {
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (!BD) return null
    const img = new Image()
    if ('svgSelector' in src) img.src = (document.querySelector(src.svgSelector) as HTMLImageElement).src
    else img.src = URL.createObjectURL(new Blob([new Uint8Array(src.png)], { type: 'image/png' }))
    await img.decode()
    const c = document.createElement('canvas')
    c.width = c.height = 600
    c.getContext('2d')!.drawImage(img, 0, 0, 600, 600)
    return (await new BD({ formats: ['qr_code'] }).detect(c))[0]?.rawValue ?? ''
  }, 'png' in source ? { png: Array.from(source.png) as unknown as Uint8Array } : source)
}

test.describe('QR Code Generator', () => {
  test('creates scannable codes for each type and downloads PNG and SVG', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/tools/qr-code-generator')
    await expect(page.getByText('Enter content to create your QR code')).toBeVisible()
    await expect(page.getByRole('button', { name: 'PNG', exact: true })).toBeDisabled()

    // Website: invalid, then valid.
    await page.getByLabel('Website address').fill('not a url')
    await expect(page.getByRole('alert').filter({ hasText: /web(site)? address/ })).toBeVisible()
    await page.getByLabel('Website address').fill('snapscanner.vercel.app/tools')
    await expect(page.getByTestId('qr-preview')).toBeVisible()
    const url = await decode(page, { svgSelector: '[data-testid=qr-preview]' })
    if (url !== null) expect(url).toBe('https://snapscanner.vercel.app/tools')

    // Colours, size, error correction and margin.
    await page.getByLabel('Foreground').fill('#1e3a8a')
    await page.getByLabel('Image size').selectOption('512')
    await page.getByLabel('Error correction').selectOption('H')
    await expect(page.getByTestId('qr-preview')).toHaveAttribute('src', /fill%3D%22%231e3a8a%22/)

    const [pngDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG', exact: true }).click()])
    expect(pngDl.suggestedFilename()).toBe('qr-code-url.png')
    const png = await downloadBytes(pngDl)
    const meta = await sharp(png).metadata()
    expect(meta.format).toBe('png')
    expect([meta.width, meta.height]).toEqual([512, 512])
    const fromPng = await decode(page, { png })
    if (fromPng !== null) expect(fromPng).toBe('https://snapscanner.vercel.app/tools')

    const [svgDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'SVG', exact: true }).click()])
    expect(svgDl.suggestedFilename()).toBe('qr-code-url.svg')
    const svg = Buffer.from(await downloadBytes(svgDl)).toString('utf8')
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).toContain('fill="#1e3a8a"')

    // Every design template produces a scannable code; framed ones are taller than wide.
    const templates = page.getByTestId('qr-templates').getByRole('radio')
    const count = await templates.count()
    expect(count).toBeGreaterThanOrEqual(10)
    for (let i = 0; i < count; i++) {
      const name = (await templates.nth(i).getAttribute('aria-label'))!
      await templates.nth(i).click()
      await expect(templates.nth(i)).toHaveAttribute('aria-checked', 'true')
      await expect(page.getByTestId('qr-info')).toContainText(name)
      const value = await decode(page, { svgSelector: '[data-testid=qr-preview]' })
      if (value !== null) expect(value, name).toBe('https://snapscanner.vercel.app/tools')
    }
    await page.getByRole('radio', { name: 'Scan Me Card' }).click()
    await page.getByLabel('Frame text').fill('Menu')
    await expect(page.getByTestId('qr-preview')).toHaveAttribute('src', /Menu/)
    const [framed] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG', exact: true }).click()])
    const fm = await sharp(await downloadBytes(framed)).metadata()
    expect(fm.width).toBe(512)
    expect(fm.height!).toBeGreaterThan(512)
    await page.getByRole('radio', { name: 'Classic' }).click()

    // Wi-Fi with special characters.
    await page.getByRole('radio', { name: 'Wi-Fi' }).click()
    await page.getByLabel('Network name (SSID)').fill('Home;Net')
    await page.getByLabel('Password', { exact: true }).fill('correct horse')
    const wifi = await decode(page, { svgSelector: '[data-testid=qr-preview]' })
    if (wifi !== null) expect(wifi).toBe('WIFI:T:WPA;S:Home\\;Net;P:correct horse;;')

    // Unicode text.
    await page.getByRole('radio', { name: 'Text' }).click()
    await page.getByLabel('Text').fill('Grüße ✓ 你好')
    const text = await decode(page, { svgSelector: '[data-testid=qr-preview]' })
    if (text !== null) expect(text).toBe('Grüße ✓ 你好')

    // Low-contrast warning and reset.
    await page.getByLabel('Foreground').fill('#f0f0f0')
    await expect(page.getByText(/inverted|too similar/)).toBeVisible()
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.getByLabel('Text')).toHaveValue('')
    await expect(page.getByRole('radio', { name: 'Classic' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByLabel('Foreground')).toHaveValue('#111827')
    expect(errors).toEqual([])
  })
})

test.describe('PNG/JPG to WebP', () => {
  test('converts a batch to real WebP files, keeps transparency and reports real sizes', async ({ page }) => {
    const errors = watchErrors(page)
    // A 64×48 PNG whose left half is fully transparent.
    const raw = Buffer.alloc(64 * 48 * 4)
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 64; x++) {
        const o = (y * 64 + x) * 4
        raw.set(x < 32 ? [0, 0, 0, 0] : [220, 40, 60, 255], o)
      }
    const transparent = await sharp(raw, { raw: { width: 64, height: 48, channels: 4 } }).png().toBuffer()

    await page.goto('/tools/image-to-webp')
    await page.locator('input[type=file]').first().setInputFiles([
      { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: readFileSync(FIXTURES.photo) },
      { name: 'logo.png', mimeType: 'image/png', buffer: transparent },
      { name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') },
    ])
    await expect(page.getByTestId('webp-item')).toHaveCount(2)
    await expect(page.getByText(/Choose a JPG, PNG|Choose PNG or JPG/)).toBeVisible()

    await page.getByRole('button', { name: 'Convert 2 images to WebP' }).click()
    await expect(page.getByTestId('download')).toHaveCount(2)

    const rows = page.getByTestId('webp-item')
    const [photo] = await Promise.all([page.waitForEvent('download'), rows.nth(0).getByTestId('download').click()])
    expect(photo.suggestedFilename()).toBe('photo.webp')
    const photoBytes = await downloadBytes(photo)
    expect(Buffer.from(photoBytes.slice(0, 4)).toString()).toBe('RIFF')
    expect(Buffer.from(photoBytes.slice(8, 12)).toString()).toBe('WEBP')
    const pm = await sharp(photoBytes).metadata()
    expect([pm.format, pm.width, pm.height]).toEqual(['webp', 574, 1280])

    const [logo] = await Promise.all([page.waitForEvent('download'), rows.nth(1).getByTestId('download').click()])
    const logoBytes = await downloadBytes(logo)
    const { data, info } = await sharp(logoBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect([info.width, info.height]).toEqual([64, 48])
    expect(data[(10 * 64 + 5) * 4 + 3]).toBe(0) // transparent half stays transparent
    expect(data[(10 * 64 + 50) * 4 + 3]).toBe(255)

    // The size shown is the size of the downloaded file.
    const kb = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024 >= 100 ? Math.round(n / 1024) : (n / 1024).toFixed(1))} KB`)
    await expect(rows.nth(1).getByTestId('webp-out-size')).toHaveText(kb(logoBytes.length))

    const [zip] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download all as ZIP' }).click()])
    expect(zip.suggestedFilename()).toBe('webp-images.zip')
    expect(Array.from((await downloadBytes(zip)).slice(0, 2))).toEqual([0x50, 0x4b])

    // Shrinking large images and removing an item.
    await page.getByLabel('Shrink large images').check()
    await page.getByLabel('Longest side (px)').fill('640')
    await page.getByRole('button', { name: 'Convert 2 images to WebP' }).click()
    await expect(page.getByTestId('download')).toHaveCount(2)
    const [small] = await Promise.all([page.waitForEvent('download'), rows.nth(0).getByTestId('download').click()])
    const sm = await sharp(await downloadBytes(small)).metadata()
    expect([sm.width, sm.height]).toEqual([287, 640])
    await page.getByRole('button', { name: 'Remove logo.png' }).click()
    await expect(page.getByTestId('webp-item')).toHaveCount(1)
    await page.getByRole('button', { name: 'Start over' }).click()
    await expect(page.getByTestId('webp-item')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('WebP is in Convert & Image, QR in Create, and both are searchable on the home page', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop menus')
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await nav.getByRole('button', { name: 'Convert & Image' }).click()
    const panel = page.locator(`#${(await nav.getByRole('button', { name: 'Convert & Image' }).getAttribute('aria-controls'))!.replace(/:/g, '\\:')}`)
    await expect(panel.getByRole('link', { name: 'QR Code Generator' })).toHaveCount(0)
    await expect(panel.getByRole('link', { name: 'PNG/JPG to WebP' })).toHaveAttribute('href', '/tools/image-to-webp')
    await page.keyboard.press('Escape')
    await nav.getByRole('button', { name: 'Create', exact: true }).click()
    const createPanel = page.locator(`#${(await nav.getByRole('button', { name: 'Create', exact: true }).getAttribute('aria-controls'))!.replace(/:/g, '\\:')}`)
    await expect(createPanel.getByRole('link', { name: /QR Code Generator/ })).toHaveAttribute('href', '/tools/qr-code-generator')
    await page.keyboard.press('Escape')
    await page.locator('#home-search').fill('webp')
    await expect(page.getByTestId('tool-results').getByRole('link', { name: /PNG\/JPG to WebP/ })).toBeVisible()
    await page.locator('#home-search').fill('qr code')
    await expect(page.getByTestId('tool-results').getByRole('link', { name: /QR Code Generator/ })).toBeVisible()
    const directory = page.getByTestId('tools-directory')
    await expect(directory.getByRole('link', { name: 'QR Code Generator' })).toHaveAttribute('href', '/tools/qr-code-generator')
    await expect(directory.getByRole('link', { name: 'PNG/JPG to WebP' })).toHaveAttribute('href', '/tools/image-to-webp')
  })
})
