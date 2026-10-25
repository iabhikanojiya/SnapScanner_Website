// Vector PDF export of a design with pdf-lib. Shapes and text are drawn as
// real PDF content (text stays selectable); images are cropped to their frame
// by an injected rasterizer (canvas in the browser).
import {
  PDFDocument,
  concatTransformationMatrix,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setCharacterSpacing,
  type PDFFont,
} from '@cantoo/pdf-lib'
import { SITE_DOMAIN } from '@/lib/site'
import { fontKey, hexToRgb, measure, qrPath, standardFontFor, type Design, type El } from './engine'

export interface RasterImage {
  bytes: Uint8Array
  type: 'png' | 'jpeg'
}

/** Renders an image element (already cropped to its frame) at `scale` px per point. */
export type ImageRasterizer = (el: Extract<El, { t: 'image' }>, scale: number) => Promise<RasterImage | null>

const color = (hex: string) => {
  const [r, g, b] = hexToRgb(hex)
  return rgb(r / 255, g / 255, b / 255)
}

function roundedPath(w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  return `M${rr} 0H${w - rr}A${rr} ${rr} 0 0 1 ${w} ${rr}V${h - rr}A${rr} ${rr} 0 0 1 ${w - rr} ${h}H${rr}A${rr} ${rr} 0 0 1 0 ${h - rr}V${rr}A${rr} ${rr} 0 0 1 ${rr} 0Z`
}

export interface PdfExportOptions {
  title: string
  rasterize: ImageRasterizer
  /** Pixels per point for raster images (2 ≈ 144 dpi, 4 ≈ 288 dpi). */
  imageScale?: number
  /** Include the bleed area (print). */
  bleed?: boolean
}

export async function designToPdf(design: Design, opts: PdfExportOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(opts.title)
  doc.setCreator('Snap Scanner Create Studio')
  doc.setProducer(`Snap Scanner (${SITE_DOMAIN})`)
  const fonts = new Map<string, PDFFont>()
  const font = async (f: Extract<El, { t: 'text' }>) => {
    const key = fontKey(f.font, f.bold, f.italic)
    if (!fonts.has(key)) fonts.set(key, await doc.embedFont(standardFontFor(f.font, f.bold, f.italic)))
    return fonts.get(key)!
  }
  const b = opts.bleed ? design.bleed : 0
  const PW = design.width + 2 * b
  const PH = design.height + 2 * b
  const X = (x: number) => x + b
  const Y = (y: number) => PH - b - y

  for (const pg of design.pages) {
    const page = doc.addPage([PW, PH])
    if (b > 0) {
      page.setBleedBox(0, 0, PW, PH)
      page.setTrimBox(b, b, design.width, design.height)
    }
    const draw = async (el: El): Promise<void> => {
      const opacity = 'opacity' in el ? el.opacity : undefined
      switch (el.t) {
        case 'rect': {
          if (el.w <= 0 || el.h <= 0) return
          const common = {
            color: el.fill ? color(el.fill) : undefined,
            borderColor: el.stroke ? color(el.stroke) : undefined,
            borderWidth: el.stroke ? (el.sw ?? 1) : 0,
            opacity,
            borderOpacity: opacity,
            borderDashArray: el.dash,
          }
          if (el.r) page.drawSvgPath(roundedPath(el.w, el.h, el.r), { x: X(el.x), y: Y(el.y), ...common })
          else page.drawRectangle({ x: X(el.x), y: Y(el.y + el.h), width: el.w, height: el.h, ...common })
          return
        }
        case 'circle':
          page.drawCircle({
            x: X(el.cx),
            y: Y(el.cy),
            size: el.r,
            color: el.fill ? color(el.fill) : undefined,
            borderColor: el.stroke ? color(el.stroke) : undefined,
            borderWidth: el.stroke ? (el.sw ?? 1) : 0,
            opacity,
            borderOpacity: opacity,
          })
          return
        case 'line':
          page.drawLine({ start: { x: X(el.x1), y: Y(el.y1) }, end: { x: X(el.x2), y: Y(el.y2) }, thickness: el.sw, color: color(el.stroke), dashArray: el.dash, opacity })
          return
        case 'path':
          page.drawSvgPath(el.d, {
            x: X(0),
            y: Y(0),
            color: el.fill ? color(el.fill) : undefined,
            borderColor: el.stroke ? color(el.stroke) : undefined,
            borderWidth: el.stroke ? (el.sw ?? 1) : 0,
            borderLineCap: 1,
            opacity,
            borderOpacity: opacity,
          })
          return
        case 'text': {
          const f = await font(el)
          const ls = el.ls ?? 0
          if (ls) page.pushOperators(setCharacterSpacing(ls))
          el.lines.forEach((line, i) => {
            if (!line) return
            const w = measure(line, el.size, el.font, el.bold, el.italic, ls)
            const x = el.align === 'center' ? el.x - w / 2 : el.align === 'right' ? el.x - w : el.x
            page.drawText(line, { x: X(x), y: Y(el.y + i * el.lh), size: el.size, font: f, color: color(el.color), opacity })
          })
          if (ls) page.pushOperators(setCharacterSpacing(0))
          return
        }
        case 'image': {
          if (!el.image) return
          const raster = await opts.rasterize(el, opts.imageScale ?? 3)
          if (!raster) return
          const img = raster.type === 'png' ? await doc.embedPng(raster.bytes) : await doc.embedJpg(raster.bytes)
          page.drawImage(img, { x: X(el.x), y: Y(el.y + el.h), width: el.w, height: el.h, opacity })
          return
        }
        case 'qr':
          if (el.bg) page.drawRectangle({ x: X(el.x), y: Y(el.y + el.size), width: el.size, height: el.size, color: color(el.bg) })
          page.drawSvgPath(qrPath(el.data, el.x, el.y, el.size), { x: X(0), y: Y(0), color: color(el.color), borderWidth: 0 })
          return
        case 'group': {
          if (el.mirror !== undefined) {
            page.pushOperators(pushGraphicsState(), concatTransformationMatrix(-1, 0, 0, 1, 2 * X(el.mirror), 0))
            for (const child of el.children) await draw(child)
            page.pushOperators(popGraphicsState())
            return
          }
          // Clockwise rotation (as on screen) about the group's centre, in PDF space.
          const t = (el.rot * Math.PI) / 180
          const cx = X(el.cx)
          const cy = Y(el.cy)
          const a = Math.cos(t)
          const bb = -Math.sin(t)
          const c = Math.sin(t)
          const d = Math.cos(t)
          page.pushOperators(pushGraphicsState(), concatTransformationMatrix(a, bb, c, d, cx - a * cx - c * cy, cy - bb * cx - d * cy))
          for (const child of el.children) await draw(child)
          page.pushOperators(popGraphicsState())
          return
        }
      }
    }
    // Paint the background across the bleed so trimming leaves no white edge.
    page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: rgb(1, 1, 1) })
    for (const el of pg.els) await draw(el)
  }
  return doc.save({ useObjectStreams: true })
}
