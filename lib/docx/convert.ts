// Word to PDF: parse the .docx, load the fonts it needs, lay out pages and
// write the PDF. Runs in a Web Worker (word.worker.ts) in the browser and
// directly in unit tests; nothing here touches the DOM or the network except
// through the injected font loader.
import { FontBook, type FontLoader } from './fonts'
import { collectFontUses, layoutDocument } from './layout'
import { parseDocx } from './parse'
import { renderPdf, type ImageConverter } from './render-pdf'

export type Stage = 'reading' | 'fonts' | 'layout' | 'writing'

export interface ConvertOptions {
  loadFont: FontLoader
  convertImage: ImageConverter
  onProgress?: (stage: Stage, done: number, total: number) => void
}

export interface WordToPdfResult {
  bytes: Uint8Array
  pageCount: number
  warnings: string[]
}

const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/

export async function convertDocxToPdf(docx: Uint8Array, opts: ConvertOptions): Promise<WordToPdfResult> {
  opts.onProgress?.('reading', 0, 0)
  const model = parseDocx(docx)
  opts.onProgress?.('fonts', 0, 0)
  const book = new FontBook(opts.loadFont)
  const uses = collectFontUses(model)
  await book.prepare(uses)
  opts.onProgress?.('layout', 0, 0)
  const layout = layoutDocument(model, book)
  const { bytes, failedImages, pageCount } = await renderPdf(layout, book, model.images, {
    title: model.title,
    convertImage: opts.convertImage,
    onPage: (done, total) => opts.onProgress?.('writing', done, total),
  })

  const warnings = [...model.warnings, ...layout.warnings]
  if (failedImages) warnings.push(`${failedImages} image${failedImages === 1 ? '' : 's'} couldn’t be decoded and ${failedImages === 1 ? 'is' : 'are'} shown as a placeholder.`)
  if (book.missing.size) {
    const sample = [...book.missing].slice(0, 8).join(' ')
    warnings.push(`Some characters (${sample}${book.missing.size > 8 ? ' …' : ''}) aren’t covered by the bundled fonts and may show as empty boxes. Latin, Greek, Cyrillic and Devanagari are supported.`)
  }
  const usesRtl = [...uses.values()].some((set) => [...set].some((c) => RTL.test(c)))
  if (usesRtl) warnings.push('Right-to-left text (such as Arabic or Hebrew) may appear in the wrong order.')
  return { bytes, pageCount, warnings }
}
