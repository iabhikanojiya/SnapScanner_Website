// Draws laid-out pages into a PDF with pdf-lib. Text is real, selectable PDF
// text in embedded (subset) fonts; images are embedded as PNG or JPEG.
import * as fontkit from '@cantoo/fontkit'
import { PDFDocument, PDFString, rgb, type PDFFont, type PDFImage, type PDFPage } from '@cantoo/pdf-lib'
import { SITE_DOMAIN } from '@/lib/site'
import type { FaceKey, FontBook } from './fonts'
import type { Draw, Layout } from './layout'
import type { DocImage } from './model'

/** Converts an image pdf-lib can't embed directly (GIF, BMP, WebP, SVG) to PNG, or returns null. */
export type ImageConverter = (img: DocImage) => Promise<Uint8Array | null>

export interface RenderOptions {
  title?: string
  convertImage: ImageConverter
  onPage?: (done: number, total: number) => void | Promise<void>
}

const color = (hex: string) => {
  const n = parseInt(hex, 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

export async function renderPdf(layout: Layout, book: FontBook, images: Map<string, DocImage>, opts: RenderOptions) {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit as unknown as Parameters<PDFDocument['registerFontkit']>[0])
  if (opts.title) doc.setTitle(opts.title)
  doc.setCreator('Snap Scanner Word to PDF')
  doc.setProducer(`Snap Scanner (${SITE_DOMAIN})`)

  const fonts = new Map<FaceKey, PDFFont>()
  const font = async (key: FaceKey) => {
    let f = fonts.get(key)
    if (!f) {
      f = await doc.embedFont(book.faces.get(key)!.bytes, { subset: true })
      fonts.set(key, f)
    }
    return f
  }
  const embedded = new Map<string, PDFImage | null>()
  let failedImages = 0
  const image = async (id: string) => {
    if (embedded.has(id)) return embedded.get(id)!
    const img = images.get(id)
    let out: PDFImage | null = null
    try {
      if (img?.format === 'png') out = await doc.embedPng(img.bytes)
      else if (img?.format === 'jpeg') out = await doc.embedJpg(img.bytes)
      else if (img) {
        const png = await opts.convertImage(img)
        if (png) out = await doc.embedPng(png)
      }
    } catch {
      // pdf-lib rejects some valid files (e.g. 16-bit or interlaced PNGs); re-encode them.
      try {
        const png = img ? await opts.convertImage(img) : null
        out = png ? await doc.embedPng(png) : null
      } catch {
        out = null
      }
    }
    if (!out) failedImages++
    embedded.set(id, out)
    return out
  }

  const total = layout.pages.length
  for (let i = 0; i < total; i++) {
    const lp = layout.pages[i]
    const page = doc.addPage([lp.width, lp.height])
    const H = lp.height
    for (const d of lp.draws) await draw(page, H, d)
    await opts.onPage?.(i + 1, total)
  }

  async function draw(page: PDFPage, H: number, d: Draw) {
    switch (d.t) {
      case 'text':
        page.drawText(d.text, { x: d.x, y: H - d.y, size: d.size, font: await font(d.face), color: color(d.color) })
        return
      case 'line':
        page.drawLine({ start: { x: d.x1, y: H - d.y1 }, end: { x: d.x2, y: H - d.y2 }, thickness: d.width, color: color(d.color) })
        return
      case 'rect':
        page.drawRectangle({ x: d.x, y: H - d.y - d.h, width: d.w, height: d.h, color: color(d.fill) })
        return
      case 'image': {
        const img = await image(d.id)
        if (img) page.drawImage(img, { x: d.x, y: H - d.y - d.h, width: d.w, height: d.h })
        else await placeholder(page, H, { t: 'placeholder', label: 'Image', x: d.x, y: d.y, w: d.w, h: d.h })
        return
      }
      case 'placeholder':
        await placeholder(page, H, d)
        return
      case 'link': {
        const annot = doc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [d.x, H - d.y - d.h, d.x + d.w, H - d.y],
          Border: [0, 0, 0],
          A: { Type: 'Action', S: 'URI', URI: PDFString.of(d.href) },
        })
        page.node.addAnnot(doc.context.register(annot))
        return
      }
      case 'field':
        return
    }
  }

  async function placeholder(page: PDFPage, H: number, d: Extract<Draw, { t: 'placeholder' }>) {
    page.drawRectangle({ x: d.x, y: H - d.y - d.h, width: d.w, height: d.h, color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.75 })
    const f = book.faces.has('arimo-r') ? await font('arimo-r') : null
    if (!f) return
    const label = `[${d.label}]`
    const size = Math.min(9, d.h * 0.6)
    const w = f.widthOfTextAtSize(label, size)
    if (w < d.w - 4 && size >= 4) page.drawText(label, { x: d.x + (d.w - w) / 2, y: H - d.y - d.h / 2 - size / 3, size, font: f, color: rgb(0.4, 0.4, 0.4) })
  }

  const bytes = await doc.save({ useObjectStreams: true })
  return { bytes, failedImages, pageCount: total }
}
