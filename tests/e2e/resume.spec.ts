import { expect, test } from '@playwright/test'
import { clickDownload, pdfTexts, watchErrors } from './fixtures'

test.describe('Resume Builder', () => {
  test('creates, edits, autosaves, switches templates and exports a text PDF', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/resume-builder')
    await page.getByRole('button', { name: 'Use the Modern Sidebar template' }).click()
    await expect(page).toHaveURL(/\/resume-builder\/edit\?id=/)
    const sheet = page.getByTestId('resume-sheet')
    await expect(sheet).toContainText('Jordan Patel')

    await page.getByLabel('Full name').fill('Priya Sharma')
    await page.getByLabel('Job title').fill('Data Analyst')
    await page.getByRole('textbox', { name: 'Professional summary' }).fill('Analyst who turns messy data into decisions.')
    await expect(sheet).toContainText('Priya Sharma')
    await expect(page.getByTestId('save-state')).toHaveText(/Saved in this browser/)

    // Add a Projects section and an entry.
    await page.getByRole('button', { name: 'Projects', exact: true }).click()
    await page.getByLabel('Project name').last().fill('Sales dashboard')
    await expect(sheet).toContainText('Sales dashboard')

    // Autosaved: survives a reload.
    await expect(page.getByTestId('save-state')).toHaveText(/Saved in this browser/)
    await page.reload()
    await expect(page.getByTestId('resume-sheet')).toContainText('Priya Sharma')
    await expect(page.getByTestId('resume-sheet')).toContainText('Sales dashboard')

    // Switch template and palette; content is kept.
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Minimal ATS/ }).click()
    await expect(page.getByText('ATS-friendly layout')).toBeVisible()
    await expect(page.getByTestId('resume-sheet')).toContainText('Data Analyst')
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: /Teal Modern/ }).click()
    await page.getByRole('radio', { name: 'Plum' }).click()

    const { download, bytes } = await clickDownload(page, /^Download PDF$/)
    expect(download.suggestedFilename()).toBe('Priya Sharma resume.pdf')
    const text = (await pdfTexts(bytes)).join(' ')
    for (const s of ['Priya Sharma', 'Data Analyst', 'Analyst who turns messy data into decisions.', 'Sales dashboard', 'Senior Product Designer'])
      expect(text).toContain(s)
    expect(errors).toEqual([])
  })

  test('renders every template and exports multi-page resumes', async ({ page }) => {
    await page.goto('/resume-builder')
    await page.getByRole('button', { name: 'New resume' }).click()
    await expect(page.getByTestId('resume-sheet')).toBeVisible()
    // Make the resume long enough for two pages.
    await page.getByRole('button', { name: /Senior Product Designer · Northwind Health/ }).first().click()
    const desc = page.getByLabel('Description').first()
    await desc.fill(Array.from({ length: 45 }, (_, i) => `- Achievement number ${i + 1} with measurable results`).join('\n'))
    await expect(page.getByTestId('page-count')).toHaveText(/^[2-4] pages$/)
    const shown = Number((await page.getByTestId('page-count').textContent())!.split(' ')[0])
    const { bytes } = await clickDownload(page, /^Download PDF$/)
    const texts = await pdfTexts(bytes)
    expect(texts).toHaveLength(shown)
    expect(texts.join(' ')).toContain('Achievement number 45')

    for (const name of ['Corporate Split', 'Photo Profile', 'Academic CV', 'Minimal Grid', 'Navy Executive']) {
      await page.getByRole('button', { name: 'Template', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: new RegExp(name) }).click()
      await expect(page.getByTestId('resume-sheet')).toContainText('Jordan Patel')
    }
  })

  test('manages drafts: rename, duplicate, delete', async ({ page }) => {
    await page.goto('/resume-builder')
    await page.getByRole('button', { name: 'Use the Soft Blue template' }).click()
    await expect(page.getByTestId('resume-sheet')).toBeVisible()
    await page.goto('/resume-builder')
    const list = page.getByTestId('draft-list')
    await expect(list).toContainText('Soft Blue resume')
    await page.getByRole('button', { name: 'Rename Soft Blue resume' }).click()
    await page.getByRole('dialog').getByLabel('Name').fill('Marketing CV')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(list).toContainText('Marketing CV')
    await page.getByRole('button', { name: 'Duplicate Marketing CV' }).click()
    await expect(list).toContainText('Marketing CV (copy)')
    await page.getByRole('button', { name: 'Delete Marketing CV (copy)' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expect(list).not.toContainText('(copy)')
  })

  test('prints only the resume sheet', async ({ page }) => {
    await page.goto('/resume-builder')
    await page.getByRole('button', { name: 'New resume' }).click()
    await expect(page.getByTestId('resume-sheet')).toBeVisible()
    await page.evaluate(() => {
      ;(window as unknown as { printed: boolean }).printed = false
      window.print = () => {
        ;(window as unknown as { printed: boolean; printClass: boolean }).printed = true
        ;(window as unknown as { printClass: boolean }).printClass = document.body.classList.contains('printing-resume')
      }
    })
    await page.getByRole('button', { name: 'Print' }).click()
    expect(await page.evaluate(() => (window as unknown as { printed: boolean; printClass: boolean }).printClass)).toBe(true)
    // Print the page as the browser would while the print dialog is open.
    await page.evaluate(() => document.body.classList.add('printing-resume'))
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    const texts = await pdfTexts(new Uint8Array(pdf))
    expect(texts[0]).toContain('Jordan Patel')
    expect(texts.join(' ')).not.toContain('Personal details')
  })
})

test('sample resume fits on one page in every template', async ({ page }) => {
  await page.goto('/resume-builder')
  await page.getByRole('button', { name: 'New resume' }).click()
  await expect(page.getByTestId('resume-sheet')).toBeVisible()
  for (const name of ['Classic Professional', 'Modern Sidebar', 'Corporate Split', 'Soft Blue', 'Photo Profile', 'Emerald Professional', 'Bold Header']) {
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: new RegExp(`^${name}`) }).click()
    await expect(page.getByTestId('page-count'), name).toHaveText('1 page')
  }
})

test('resume preview zooms to set sizes', async ({ page }) => {
  await page.goto('/resume-builder')
  await page.getByRole('button', { name: 'New resume' }).click()
  const sheet = page.getByTestId('resume-sheet')
  await expect(sheet).toBeVisible()
  await page.getByTestId('zoom-select').selectOption('0.9')
  await expect.poll(async () => Math.round((await sheet.boundingBox())!.width)).toBe(Math.round(794 * 0.9))
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await expect.poll(async () => Math.round((await sheet.boundingBox())!.width)).toBe(Math.round(794 * 0.8))
  // Exporting at any zoom gives the same text PDF.
  const { bytes } = await clickDownload(page, /^Download PDF$/)
  expect((await pdfTexts(bytes))[0]).toContain('Jordan Patel')
})
