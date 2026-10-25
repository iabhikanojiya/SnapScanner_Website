import { expect, test } from '@playwright/test'
import { FIXTURES, clickDownload, pageCount } from './fixtures'

test.describe('My files', () => {
  test('imports, persists across reloads, renames, organises, searches and deletes', async ({ page }) => {
    await page.goto('/files')
    await expect(page.getByText('No files yet')).toBeVisible()
    await page.locator('input[type=file]').first().setInputFiles([FIXTURES.path('alpha.pdf'), FIXTURES.path('bravo.pdf'), FIXTURES.photo])
    await expect(page.getByText('3 files added.')).toBeVisible()
    await expect(page.getByTestId('file-row')).toHaveCount(3)
    await expect(page.getByTestId('file-row').filter({ hasText: 'alpha.pdf' })).toContainText('2 pages')

    // Persistence: reload the page.
    await page.reload()
    await expect(page.getByTestId('file-row')).toHaveCount(3)

    // Rename.
    await page.getByRole('button', { name: 'Actions for alpha.pdf' }).click()
    await page.getByRole('menuitem', { name: 'Rename' }).click()
    await page.getByLabel('File name').fill('Electricity bill.pdf')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Electricity bill.pdf')).toBeVisible()

    // Folder and move.
    await page.getByRole('button', { name: 'New folder' }).click()
    await page.getByLabel('Folder name').fill('Bills')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { name: 'Bills' })).toBeVisible()
    await page.getByRole('button', { name: 'All files' }).click()
    await page.getByRole('button', { name: 'Actions for Electricity bill.pdf' }).click()
    await page.getByRole('menuitem', { name: 'Move to folder' }).click()
    await page.getByLabel('Destination').selectOption({ label: 'Bills' })
    await page.getByRole('button', { name: 'Move', exact: true }).click()
    await page.getByRole('button', { name: /^Bills/ }).click()
    await expect(page.getByTestId('file-row')).toHaveCount(1)

    // Search and type filter.
    await page.getByRole('button', { name: 'All files' }).click()
    await page.getByLabel('Search files').fill('bravo')
    await expect(page.getByTestId('file-row')).toHaveCount(1)
    await page.getByLabel('Search files').fill('')
    await page.getByLabel('File type').selectOption('image')
    await expect(page.getByTestId('file-row')).toHaveCount(1)
    await page.getByLabel('File type').selectOption('all')

    // Download.
    await page.getByRole('button', { name: 'Actions for bravo.pdf' }).click()
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: 'Download' }).click()])
    expect(dl.suggestedFilename()).toBe('bravo.pdf')

    // Delete with confirmation.
    await page.getByRole('button', { name: 'Actions for photo.jpg' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByTestId('file-row')).toHaveCount(2)

    await page.reload()
    await expect(page.getByTestId('file-row')).toHaveCount(2)
    await expect(page.getByRole('button', { name: /^Bills/ })).toBeVisible()
  })

  test('selects PDFs and merges them through the Merge tool', async ({ page }) => {
    await page.goto('/files')
    await page.locator('input[type=file]').first().setInputFiles([FIXTURES.path('alpha.pdf'), FIXTURES.path('bravo.pdf')])
    await expect(page.getByTestId('file-row')).toHaveCount(2)
    await page.getByLabel('Select all shown files').check()
    await page.getByRole('button', { name: 'Merge', exact: true }).click()
    await expect(page).toHaveURL(/\/tools\/merge-pdf\?files=/)
    await expect(page.getByText('2 files · 5 pages')).toBeVisible()
    await page.getByRole('button', { name: /Merge 2 PDFs/ }).click()
    const { bytes } = await clickDownload(page)
    expect(await pageCount(bytes)).toBe(5)
  })

  test('saves a tool result into the library and clears all data', async ({ page }) => {
    await page.goto('/tools/split-pdf')
    await page.locator('input[type=file]').setInputFiles(FIXTURES.path('ten.pdf'))
    await page.getByLabel('Page ranges', { exact: true }).fill('2-4')
    await page.getByRole('button', { name: 'Split PDF', exact: true }).click()
    await page.getByRole('button', { name: 'Save to My files' }).click()
    await expect(page.getByText('Saved to My files in this browser.')).toBeVisible()
    await page.getByRole('link', { name: 'View My files' }).click()
    await expect(page.getByTestId('file-row')).toContainText('ten_pages_2-4.pdf')

    await page.getByRole('button', { name: 'Clear all local data' }).click()
    await page.getByRole('button', { name: 'Delete everything' }).click()
    await expect(page.getByText('No files yet')).toBeVisible()
  })

  test('shows a clear message when storage is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', { value: undefined })
    })
    await page.goto('/files')
    await expect(page.getByText('Your files couldn’t be loaded')).toBeVisible()
    await expect(page.getByText(/Browser storage isn’t available/)).toBeVisible()
  })
})

test('My files shows no storage estimate but keeps Clear all local data working', async ({ page }) => {
  await page.goto('/files')
  await page.locator('input[type=file]').first().setInputFiles([FIXTURES.path('alpha.pdf')])
  await expect(page.getByTestId('file-row')).toHaveCount(1)
  for (const text of ['Storage in this browser', /used of about .* available/, 'runs low on space', 'Files stay on this device, in this browser only']) await expect(page.getByText(text)).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear all local data' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Clear|Delete/ }).last().click()
  await expect(page.getByText('No files yet')).toBeVisible()
  await page.reload()
  await expect(page.getByText('No files yet')).toBeVisible()
})
