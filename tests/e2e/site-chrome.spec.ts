import { expect, test } from '@playwright/test'
import { FIXTURES, pdfTexts, downloadBytes } from './fixtures'

test.describe('footer, home Create section and PDF result actions', () => {
  test('the dark footer links to real pages and its wordmark is decorative', async ({ page, request }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer).toHaveCSS('background-color', 'rgb(11, 11, 11)')
    for (const col of ['Products', 'Company', 'Legal']) await expect(footer.getByRole('navigation', { name: col })).toBeVisible()
    await expect(footer).toContainText('Every document. Every tool. One place.')
    const wordmark = footer.getByText('SNAP SCANNER', { exact: true })
    await expect(wordmark.locator('xpath=..')).toHaveAttribute('aria-hidden', 'true')
    const hrefs = await footer.getByRole('link').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))
    expect(hrefs).toContain('/create/invoices')
    expect(hrefs.filter((h) => h.startsWith('mailto:'))).toEqual(['mailto:fusionsix.tech@gmail.com'])
    for (const href of new Set(hrefs.filter((h) => h.startsWith('/')).map((h) => h.split('#')[0]))) expect((await request.get(href)).status(), href).toBe(200)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('the home page Create section opens each tool', async ({ page }) => {
    await page.goto('/')
    const section = page.locator('section', { has: page.getByRole('heading', { name: 'Create anything, beautifully' }) })
    for (const name of ['Resume Builder', 'ID Card Maker', 'Invoice Maker', 'Business Card Maker', 'Certificate Maker', 'Photo Collage Maker']) await expect(section.getByRole('heading', { name })).toBeVisible()
    await expect(section.getByRole('link', { name: 'Explore Create Studio' })).toHaveAttribute('href', '/create')
    await section.getByRole('link', { name: 'Explore Photo Collage Maker templates' }).click()
    await expect(page).toHaveURL(/\/create\/photo-collages$/)
    await page.goBack()
    await page.locator('section', { has: page.getByRole('heading', { name: 'Create anything, beautifully' }) }).getByRole('button', { name: 'Start creating with Invoice Maker' }).click()
    await expect(page).toHaveURL(/\/create\/invoices\/edit\?project=/)
  })

  test('a PDF result shows the file name, then Download PDF, then Save, Open and Share', async ({ page }) => {
    await page.goto('/tools/merge-pdf')
    await page.locator('input[type=file]').setInputFiles([FIXTURES.path('alpha.pdf'), FIXTURES.path('bravo.pdf')])
    await page.getByRole('button', { name: /Merge 2 PDFs/ }).click()
    const result = page.getByTestId('result')
    const name = result.getByLabel('File name')
    const download = result.getByRole('button', { name: 'Download PDF' })
    await expect(download).toBeVisible()
    const [nameBox, dlBox] = [await name.boundingBox(), await download.boundingBox()]
    expect(dlBox!.y).toBeGreaterThan(nameBox!.y)
    expect(dlBox!.height).toBeGreaterThanOrEqual(52)
    await expect(download).toHaveCSS('background-color', 'rgb(211, 47, 47)')

    await name.fill('Combined bills')
    const [d] = await Promise.all([page.waitForEvent('download'), download.click()])
    expect(d.suggestedFilename()).toBe('Combined bills.pdf')
    expect(await pdfTexts(await downloadBytes(d))).toHaveLength(5)

    // Save once; the button then shows Saved, so the same file isn't saved twice.
    const actions = result.getByRole('group', { name: 'More actions' })
    await actions.getByRole('button', { name: 'Save to My Files' }).click()
    await expect(result.getByText('Saved to My files in this browser.')).toBeVisible()
    await expect(actions.getByRole('button', { name: 'Saved' })).toBeDisabled()

    // Share falls back to a download where file sharing isn't available (desktop Chromium).
    const [shared] = await Promise.all([page.waitForEvent('download'), actions.getByRole('button', { name: 'Share' }).click()])
    expect(shared.suggestedFilename()).toBe('Combined bills.pdf')
    await expect(result).toContainText('can’t share files directly')

    await actions.getByRole('button', { name: 'Open' }).click()
    await expect(page).toHaveURL(/\/tools\/pdf-reader$/)
    await expect(page.getByText('Combined bills.pdf').first()).toBeVisible()

    await page.goto('/files')
    await expect(page.getByTestId('file-row')).toHaveCount(1)
    await expect(page.getByTestId('file-row')).toContainText('Combined bills.pdf')
  })
})

test.describe('download CTA', () => {
  test('replaces the app promo above the tools directory, links to Google Play and its QR code decodes to the listing', async ({ page }) => {
    await page.goto('/')
    const cta = page.locator('section[aria-labelledby=download-cta-title]')
    // It sits directly above the tools directory, in a rounded box, and the old app promo is gone.
    expect(await cta.evaluate((el) => el.nextElementSibling?.querySelector('[data-testid=tools-directory]') !== null)).toBe(true)
    await expect(cta.locator('.cta-gradient')).toHaveCSS('border-top-left-radius', '24px')
    await expect(page.getByText('Take Snap Scanner with you')).toHaveCount(0)
    await expect(cta.getByRole('heading', { level: 2 })).toHaveText(/Scan smarter\.\s*Create faster\.\s*Get started today\./)
    const play = 'https://play.google.com/store/apps/details?id=com.antigravity.snapscanner.snap_scanner&hl=en_IN'
    await expect(cta.getByRole('link', { name: /Download App/ })).toHaveAttribute('href', play)
    // Decorations are hidden from assistive technology.
    await expect(cta.locator('.cta-gradient > div[aria-hidden=true]')).toHaveCount(1)

    // Decode the QR code with the browser's barcode detector where available.
    const decoded = await page.evaluate(async () => {
      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
      if (!BD) return null
      const svg = document.querySelector('[data-testid=play-qr]')!
      const xml = new XMLSerializer().serializeToString(svg).replace('<svg ', '<svg width="400" height="400" ')
      const img = new Image()
      img.src = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
      await img.decode()
      const c = document.createElement('canvas')
      c.width = c.height = 400
      c.getContext('2d')!.drawImage(img, 0, 0, 400, 400)
      const codes = await new BD({ formats: ['qr_code'] }).detect(c)
      return codes[0]?.rawValue ?? ''
    })
    test.skip(decoded === null, 'BarcodeDetector is not available in this browser')
    expect(decoded).toBe(play)
  })

  test('has no horizontal overflow and keeps the panel inside the viewport', async ({ page }) => {
    await page.goto('/')
    const panel = page.locator('section[aria-labelledby=download-cta-title] .rounded-2xl.bg-white')
    await panel.scrollIntoViewIfNeeded()
    const box = (await panel.boundingBox())!
    const width = page.viewportSize()!.width
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    // Headline on the left and card on the right on wide screens; stacked on phones.
    const heading = (await page.locator('#download-cta-title').boundingBox())!
    if (width >= 768) expect(box.x).toBeGreaterThan(heading.x + heading.width - 1)
    else expect(box.y).toBeGreaterThan(heading.y + heading.height - 1)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})

test('other pages use the same download CTA with a smaller headline', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop font sizes')
  await page.goto('/')
  await expect(page.locator('#download-cta-title')).toHaveCSS('font-size', '44px')
  for (const path of ['/tools', '/resume-builder', '/tools/merge-pdf']) {
    await page.goto(path)
    const heading = page.locator('#download-cta-title')
    await expect(heading).toHaveText(/Scan smarter\./)
    await expect(heading).toHaveCSS('font-size', '32px')
    await expect(page.locator('section[aria-labelledby=download-cta-title]').getByRole('link', { name: /Download App/ })).toHaveAttribute('href', /play\.google\.com/)
  }
})

test('the home page alternates light and dark sections, with light text on the dark ones', async ({ page }) => {
  await page.goto('/')
  for (const id of ['scan', 'create', 'assistant']) {
    const section = page.locator(`section[aria-labelledby=${id}]`)
    await expect(section).toHaveCSS('background-image', /gradient/)
    await expect(section.locator(`#${id}`)).toHaveCSS('color', 'rgb(255, 255, 255)')
  }
  // Each dark band sits between light sections.
  const order = await page.evaluate(() =>
    [...document.querySelectorAll('main > section')].map((s) => (/band-|assistant-hero/.test(s.className) ? 'dark' : 'light'))
  )
  for (let i = 1; i < order.length; i++) if (order[i] === 'dark') expect(order[i - 1], `section ${i}`).toBe('light')
})

test('Scan to PDF sends computer users to the phone app, and phones scan in the browser', async ({ page }, info) => {
  await page.goto('/tools/scan-pdf')
  const prompt = page.getByTestId('phone-scan-prompt')
  if (info.project.name === 'mobile') {
    await expect(page.getByRole('button', { name: 'Use camera' })).toBeVisible()
    await expect(page.getByText('Scan with your camera or upload photos')).toBeVisible()
    await expect(prompt).toHaveCount(0)
    return
  }
  await expect(prompt).toBeVisible()
  await expect(prompt.getByRole('heading', { name: 'Scan with your phone instead' })).toBeVisible()
  const play = 'https://play.google.com/store/apps/details?id=com.antigravity.snapscanner.snap_scanner&hl=en_IN'
  await expect(prompt.getByRole('link', { name: /Get it on Google Play/ })).toHaveAttribute('href', play)
  const decoded = await page.evaluate(async () => {
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (!BD) return null
    const xml = new XMLSerializer().serializeToString(document.querySelector('[data-testid=scan-play-qr]')!).replace('<svg ', '<svg width="400" height="400" ')
    const img = new Image()
    img.src = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
    await img.decode()
    const c = document.createElement('canvas')
    c.width = c.height = 400
    c.getContext('2d')!.drawImage(img, 0, 0, 400, 400)
    return (await new BD({ formats: ['qr_code'] }).detect(c))[0]?.rawValue ?? ''
  })
  if (decoded !== null) expect(decoded).toBe(play)
  // On computers there's no upload area or webcam; photos already on the computer go to Images to PDF.
  await expect(page.getByText('Scan with your camera or upload photos')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Use camera' })).toHaveCount(0)
  await expect(prompt.getByRole('link', { name: 'Use Images to PDF' })).toHaveAttribute('href', '/tools/image-to-pdf')
})
