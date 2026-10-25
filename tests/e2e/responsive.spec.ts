import { expect, test } from '@playwright/test'
import { FIXTURES, clickDownload, pageCount } from './fixtures'

const PAGES = ['/', '/tools', '/tools/merge-pdf', '/tools/scan-pdf', '/tools/pdf-reader', '/tools/organize-pdf', '/tools/compare-pdf', '/tools/html-to-pdf', '/tools/crop-image', '/tools/edit-pdf', '/resume-builder', '/create', '/create/invoices', '/create/photo-collages', '/files', '/assistant', '/support', '/privacy-policy', '/terms']

test.describe('layout and navigation', () => {
  for (const path of PAGES) {
    test(`${path} has no horizontal overflow`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(1)
    })
  }

  test('mobile menu opens, lists tools and navigates', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'mobile only')
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    const menu = page.locator('#mobile-menu')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Get the Android app' })).toHaveAttribute('href', /play\.google\.com/)
    await menu.getByRole('button', { name: 'PDF Tools' }).click()
    await menu.getByRole('link', { name: 'Split PDF', exact: true }).click()
    await expect(page).toHaveURL(/\/tools\/split-pdf$/)
    await expect(menu).toBeHidden()
  })

  test('a tool works end to end on a phone', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'mobile only')
    await page.goto('/tools/merge-pdf')
    await page.locator('input[type=file]').setInputFiles([FIXTURES.path('alpha.pdf'), FIXTURES.path('bravo.pdf')])
    await page.getByRole('button', { name: /Merge 2 PDFs/ }).click()
    const { bytes } = await clickDownload(page)
    expect(await pageCount(bytes)).toBe(5)
  })

  test('the resume editor switches between edit and preview on a phone', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'mobile only')
    await page.goto('/resume-builder')
    await page.getByRole('button', { name: 'New resume' }).click()
    await page.getByRole('tab', { name: 'preview' }).click()
    await expect(page.getByTestId('resume-sheet')).toBeVisible()
    await page.getByRole('tab', { name: 'edit' }).click()
    await expect(page.getByLabel('Full name')).toBeVisible()
  })

  test('keyboard users can skip to content, search tools and open one', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop keyboard')
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await page.getByLabel('Search tools').focus()
    await page.keyboard.type('unlock')
    await expect(page.getByTestId('tool-results').getByRole('link')).toHaveCount(1)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/tools\/unlock-pdf$/)
  })

  test('header menu works with the keyboard and focus is visible', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop keyboard')
    await page.goto('/')
    const trigger = page.getByRole('button', { name: 'PDF Tools' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
    const ring = await trigger.evaluate((el) => getComputedStyle(el).boxShadow)
    expect(ring).not.toBe('none')
  })

  test('tool categories filter the directory', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop')
    await page.goto('/tools')
    await page.getByRole('group', { name: 'Tool categories' }).getByRole('button', { name: 'Security' }).click()
    await expect(page.getByTestId('tool-results').getByRole('link')).toHaveCount(4)
    await page.getByLabel('Search tools').fill('nothing-matches')
    await expect(page.getByText('No tools match')).toBeVisible()
  })

  test('reduced motion disables animation', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto(new URL('/', test.info().project.use.baseURL).toString())
    const duration = await page.locator('h1').evaluate((el) => getComputedStyle(el).animationDuration)
    expect(parseFloat(duration)).toBeLessThan(0.01)
    await context.close()
  })
})
