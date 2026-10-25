import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Download, Page } from '@playwright/test'
import { PDFDocument } from '@cantoo/pdf-lib'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

const ROOT = process.cwd()

export const FIXTURES = {
  dir: join(ROOT, 'tests/fixtures/generated'),
  path: (name: string) => join(ROOT, 'tests/fixtures/generated', name),
  photo: join(ROOT, 'tests/fixtures/photo.jpg'),
}

export const LOCKED_PASSWORD = 'open-sesame'

const FONTS = join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/')

export async function downloadBytes(download: Download): Promise<Uint8Array> {
  const path = await download.path()
  return new Uint8Array(readFileSync(path!))
}

/** Clicks a download button and returns the downloaded file. */
/** Clicks a result's download button ("Download PDF" for a single PDF, "Download" otherwise). */
export async function clickDownload(page: Page, name = /^Download( PDF)?$/) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name }).first().click()])
  return { download, bytes: await downloadBytes(download) }
}

export async function pdfTexts(bytes: Uint8Array, password?: string): Promise<string[]> {
  const task = pdfjs.getDocument({ data: bytes.slice(), password, standardFontDataUrl: FONTS, verbosity: 0 })
  const doc = await task.promise
  const out: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent()
    out.push(tc.items.map((it) => ('str' in it ? it.str : '')).join(' '))
  }
  await task.destroy()
  return out
}

export async function pageCount(bytes: Uint8Array) {
  return (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount()
}

/** Collects console errors and failed same-origin requests during a test. */
export function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Download the React DevTools|favicon/.test(m.text())) errors.push(`console: ${m.text()}`)
  })
  page.on('requestfailed', (r) => {
    // Aborted RSC prefetches during navigation are expected.
    if (!r.url().startsWith('blob:') && !r.url().startsWith('data:') && !r.url().includes('_rsc=')) errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`)
  })
  return errors
}

/** The page's error alert (excluding Next.js's route announcer, which also has role=alert). */
export const alertBox = (page: Page) => page.locator('[role=alert]:not(#__next-route-announcer__)')

/** Makes the page behave like a phone or tablet (no precise, hovering pointer), e.g. so Scan to PDF offers upload and camera. */
export async function asTouchDevice(page: Page) {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window)
    window.matchMedia = (query: string) => {
      if (!query.includes('pointer: fine')) return original(query)
      const noop = () => {}
      return { matches: false, media: query, onchange: null, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop, dispatchEvent: () => false } as MediaQueryList
    }
  })
}
