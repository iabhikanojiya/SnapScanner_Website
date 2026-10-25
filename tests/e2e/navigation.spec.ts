import { expect, test } from '@playwright/test'

test.describe('header menus and tools directory', () => {
  test('PDF Tools and Convert & Image are separate dropdowns', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop menus')
    await page.goto('/')
    const pdf = page.getByRole('button', { name: 'PDF Tools' })
    const convert = page.getByRole('button', { name: 'Convert & Image' })
    await pdf.click()
    const pdfPanel = page.locator(`#${await pdf.getAttribute('aria-controls')}`.replace(/:/g, '\\:'))
    await expect(pdfPanel.getByRole('link', { name: 'Merge PDF' })).toBeVisible()
    await expect(pdfPanel.getByRole('link', { name: 'PDF to JPG' })).toHaveCount(0)
    // Opening the other menu closes the first.
    await convert.click()
    await expect(pdf).toHaveAttribute('aria-expanded', 'false')
    const convertPanel = page.locator(`#${await convert.getAttribute('aria-controls')}`.replace(/:/g, '\\:'))
    await expect(convertPanel.getByRole('link', { name: 'Resize image' })).toBeVisible()
    await expect(convertPanel.getByRole('link', { name: 'Merge PDF' })).toHaveCount(0)
    await convertPanel.getByRole('link', { name: 'PDF to JPG' }).click()
    await expect(page).toHaveURL(/\/tools\/pdf-to-jpg$/)
    await expect(page.getByRole('heading', { level: 1, name: 'PDF to JPG' })).toBeVisible()
  })

  test('dropdowns work with the keyboard', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop menus')
    await page.goto('/')
    const convert = page.getByRole('button', { name: 'Convert & Image' })
    await convert.focus()
    await page.keyboard.press('Enter')
    await expect(convert).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveText('Scan to PDF')
    await page.keyboard.press('Escape')
    await expect(convert).toHaveAttribute('aria-expanded', 'false')
    await expect(convert).toBeFocused()
  })

  test('mobile menu groups expand and navigate', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'mobile only')
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const menu = page.locator('#mobile-menu')
    await expect(menu.getByRole('link', { name: 'Crop image' })).toBeHidden()
    await menu.getByRole('button', { name: 'Convert & Image' }).click()
    await menu.getByRole('link', { name: 'Crop image' }).click()
    await expect(page).toHaveURL(/\/tools\/crop-image$/)
    await page.getByRole('button', { name: 'Open menu' }).click()
    await menu.getByRole('button', { name: 'Create' }).click()
    await expect(menu).toContainText('Two-sided cards with print guides')
    await menu.getByRole('link', { name: /Business Card Maker/ }).click()
    await expect(page).toHaveURL(/\/create\/business-cards$/)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('the home page ends with the complete tools directory, and every link works', async ({ page, request }) => {
    await page.goto('/')
    const directory = page.getByTestId('tools-directory')
    // Nothing visible sits between the directory section and the footer.
    const next = await page.evaluate(() => {
      const section = document.querySelector('[data-testid=tools-directory]')!.closest('section')!
      let el = section.nextElementSibling
      while (el && el.tagName === 'SCRIPT') el = el.nextElementSibling
      return el ? el.tagName : 'END'
    })
    expect(next).toBe('END')
    const links = await directory.getByRole('link').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!))
    expect(links.length).toBe(51)
    for (const href of new Set(links.map((h) => h.split('#')[0]))) expect((await request.get(href)).status(), href).toBe(200)
    await expect(directory.getByRole('heading', { name: 'Convert & Image' })).toBeVisible()
  })
})

test.describe('floating header', () => {
  test('is a black pill and marks the active section with one red dot', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop navigation')
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav).toHaveCSS('background-color', 'rgb(5, 5, 5)')
    // A tab attached to the top edge: flat top, rounded bottom, flush with the viewport.
    await expect(nav).toHaveCSS('border-top-left-radius', '0px')
    await expect(nav).toHaveCSS('border-bottom-left-radius', '22px')
    const tab = (await nav.boundingBox())!
    expect(tab.y).toBe(0)
    expect(tab.height).toBe(56)
    expect(tab.width).toBeLessThan(page.viewportSize()!.width * 0.8)
    // Home: the brand is current and no navigation item has a dot.
    await expect(nav.getByRole('link', { name: 'Snap Scanner' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByTestId('active-dot')).toHaveCount(0)

    const cases: [string, string][] = [
      ['/tools/merge-pdf', 'PDF Tools'],
      ['/tools/pdf-to-jpg', 'Convert & Image'],
      ['/create/invoices', 'Create'],
      ['/resume-builder', 'Create'],
      ['/files', 'My files'],
      ['/assistant', 'Assistant'],
    ]
    for (const [path, label] of cases) {
      await page.goto(path)
      const dots = nav.getByTestId('active-dot')
      await expect(dots, path).toHaveCount(1)
      const owner = nav.locator('[aria-current]:has([data-testid=active-dot])')
      await expect(owner, path).toHaveText(label)
      await expect(owner).toHaveCSS('color', 'rgb(255, 255, 255)')
      await expect(dots).toHaveCSS('background-color', 'rgb(229, 57, 53)')
    }

    // The bar keeps its width whichever tab is active.
    const widths = new Set<number>()
    for (const path of ['/', '/tools/merge-pdf', '/tools/pdf-to-jpg', '/create', '/files', '/assistant']) {
      await page.goto(path)
      widths.add(Math.round((await nav.boundingBox())!.width))
    }
    expect([...widths]).toHaveLength(1)

    // Nested editor routes keep their section active, and dropdowns still open above the page.
    await page.goto('/create/certificates/edit?project=missing')
    await expect(nav.locator('[aria-current]:has([data-testid=active-dot])')).toHaveText('Create')
    await nav.getByRole('button', { name: 'PDF Tools' }).click()
    const panel = page.locator(`#${(await nav.getByRole('button', { name: 'PDF Tools' }).getAttribute('aria-controls'))!.replace(/:/g, '\\:')}`)
    await expect(panel.getByRole('link', { name: 'Merge PDF' })).toBeVisible()
    expect((await panel.boundingBox())!.y).toBeGreaterThanOrEqual((await nav.boundingBox())!.y + 56)
  })

  test('only one tab is highlighted, even while another menu is open', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop navigation')
    await page.goto('/tools/merge-pdf')
    const nav = page.getByRole('navigation', { name: 'Main' })
    const white = () => nav.locator('button, a').evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null && getComputedStyle(e).color === 'rgb(255, 255, 255)' && e.closest('[aria-label=Main]') && !e.matches('[href="/"]') && e.textContent?.trim()).map((e) => e.textContent!.trim()))
    await page.mouse.move(0, 400)
    await expect.poll(white).toEqual(['PDF Tools'])
    await nav.getByRole('button', { name: 'Create' }).click()
    await page.mouse.move(0, 400)
    await expect(nav.getByTestId('active-dot')).toHaveCount(1)
    await expect.poll(white).toEqual(['Create'])
    // PDF Tools is still the current section for assistive technology.
    await expect(nav.getByRole('button', { name: 'PDF Tools' })).toHaveAttribute('aria-current', 'true')
    // Choosing a tool from a menu makes that menu the active tab.
    await nav.getByRole('button', { name: 'Convert & Image' }).click()
    await page.getByRole('link', { name: 'PDF to PNG' }).click()
    await expect(page).toHaveURL(/\/tools\/pdf-to-png$/)
    await page.mouse.move(0, 400)
    await expect(nav.locator('[aria-current]:has([data-testid=active-dot])')).toHaveText('Convert & Image')
    await expect.poll(white).toEqual(['Convert & Image'])
  })

  test('Download app opens a popup with a scannable Google Play QR code', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop navigation')
    await page.goto('/tools')
    const nav = page.getByRole('navigation', { name: 'Main' })
    const button = nav.getByRole('button', { name: 'Download app' })
    await expect(button.locator('svg.lucide-scan-line')).toHaveCount(1)
    // Record the dialog's animations as they're created.
    await page.evaluate(() => {
      const w = window as unknown as { __anims: string[][] }
      w.__anims = []
      const orig = Element.prototype.animate
      Element.prototype.animate = function (this: Element, frames: Keyframe[] | PropertyIndexedKeyframes | null, opts?: number | KeyframeAnimationOptions) {
        if (this.matches('dialog.app-dialog') && Array.isArray(frames)) w.__anims.push(frames.map((f) => String(f.transform)))
        return orig.call(this, frames, opts)
      }
    })
    const anims = () => page.evaluate(() => (window as unknown as { __anims: string[][] }).__anims)
    await button.click()
    const dialog = page.getByRole('dialog', { name: 'Download our app' })
    await expect(dialog).toBeVisible()
    const play = 'https://play.google.com/store/apps/details?id=com.antigravity.snapscanner.snap_scanner&hl=en_IN'
    await expect(dialog.getByRole('link', { name: /Get it on Google Play/ })).toHaveAttribute('href', play)
    const decoded = await page.evaluate(async () => {
      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
      if (!BD) return null
      const svg = document.querySelector('[data-testid=header-play-qr]')!
      const xml = new XMLSerializer().serializeToString(svg).replace('<svg ', '<svg width="400" height="400" ')
      const img = new Image()
      img.src = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
      await img.decode()
      const c = document.createElement('canvas')
      c.width = c.height = 400
      c.getContext('2d')!.drawImage(img, 0, 0, 400, 400)
      return (await new BD({ formats: ['qr_code'] }).detect(c))[0]?.rawValue ?? ''
    })
    if (decoded !== null) expect(decoded).toBe(play)
    // It grows out of the button: the first keyframe sits over the button, which is above and right of the centred popup.
    const box = (await button.boundingBox())!
    await expect.poll(async () => (await anims()).length).toBe(1)
    const opening = (await anims())[0][0]
    const [, dx, dy] = opening.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/) ?? []
    expect(Number(dy)).toBeLessThan(0)
    expect(Number(dx)).toBeGreaterThan(0)
    const dialogBox = (await page.locator('dialog.app-dialog').boundingBox())!
    expect(Math.abs(dialogBox.y + dialogBox.height / 2 + Number(dy) - (box.y + box.height / 2))).toBeLessThan(40)
    // …and shrinks back into it when closed.
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog.app-dialog.is-closing')).toHaveCount(1)
    await expect.poll(async () => (await anims()).length).toBe(2)
    const closing = (await anims())[1].at(-1)
    expect(closing).toMatch(/translate\(.+\) scale\(0\.\d+\)/)
    await expect(dialog).toBeHidden()
    await expect(button).toBeFocused()
  })

  test('the strip beside the tab shows the page, not a separate band', async ({ page }) => {
    for (const path of ['/', '/tools', '/create', '/files', '/tools/merge-pdf', 'invoice editor']) {
      if (path === 'invoice editor') {
        await page.goto('/create/invoices')
        await page.getByRole('button', { name: 'Use the Bold Band template' }).click()
        await expect(page.getByTestId('design-preview')).toBeVisible()
      } else await page.goto(path)
      await page.evaluate(() => window.scrollTo(0, 0))
      const result = await page.evaluate(() => {
        const hit = document.elementFromPoint(4, 20)
        const block = [...document.querySelectorAll('main > *')].find((el) => !el.classList.contains('sr-only') && el.tagName !== 'TEMPLATE')!
        const h1 = [...document.querySelectorAll('h1')].find((h) => !h.classList.contains('sr-only'))
        return {
          sameBlock: !!hit && block.contains(hit),
          blockTop: block.getBoundingClientRect().top + window.scrollY,
          h1Top: h1 ? h1.getBoundingClientRect().top + window.scrollY : 999,
        }
      })
      expect(result.sameBlock, path).toBe(true)
      expect(result.blockTop, path).toBe(0)
      expect(result.h1Top, path).toBeGreaterThanOrEqual(56)
    }
  })

  test('the mobile menu keeps the black style and shows the active dot', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'mobile only')
    await page.goto('/tools/compress-pdf')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const menu = page.locator('#mobile-menu')
    await expect(menu).toHaveCSS('background-color', 'rgb(5, 5, 5)')
    const owner = menu.locator('[aria-current]:has([data-testid=active-dot])')
    await expect(owner).toHaveText('PDF Tools')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
