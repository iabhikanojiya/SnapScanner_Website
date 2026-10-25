'use client'

// Browser exports: PNG/JPG by drawing the SVG rendering onto a canvas, PDF via
// export-pdf.ts with a canvas image rasterizer, and printing.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Design } from './engine'
import { designToPdf, type ImageRasterizer } from './export-pdf'
import { DesignPageSvg, framePath, imagePlacement } from './render-svg'

/** Largest canvas side used for raster exports, to stay within browser limits. */
const MAX_CANVAS_SIDE = 8000

/** Standalone SVG document of one page at the given pixel size (XML forbids duplicate attributes, so size is only set here). */
export function svgMarkup(design: Design, pageIndex: number, width = design.width, height = design.height) {
  const svg = renderToStaticMarkup(createElement(DesignPageSvg, { design, page: design.pages[pageIndex], mode: 'export' }))
  return svg.replace('<svg ', `<svg width="${width}" height="${height}" `)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('The design couldn’t be rendered.'))
    img.src = src
  })
}

/** Renders one page to PNG or JPEG at `scale` pixels per point. */
export async function exportRaster(design: Design, pageIndex: number, type: 'image/png' | 'image/jpeg', scale: number, quality = 0.92): Promise<Blob> {
  const s = Math.min(scale, MAX_CANVAS_SIDE / Math.max(design.width, design.height))
  const w = Math.round(design.width * s)
  const h = Math.round(design.height * s)
  const markup = svgMarkup(design, pageIndex, w, h)
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality))
    canvas.width = canvas.height = 0
    if (!blob) throw new Error('The image couldn’t be created.')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Crops an image element to its frame (shape, zoom and pan) on a canvas. */
export const canvasRasterizer: ImageRasterizer = async (el, scale) => {
  if (!el.image) return null
  const img = await loadImage(el.image.src)
  const w = Math.max(1, Math.round(el.w * scale))
  const h = Math.max(1, Math.round(el.h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.scale(w / el.w, h / el.h)
  ctx.translate(-el.x, -el.y)
  const shaped = el.shape !== 'rect'
  if (shaped) ctx.clip(new Path2D(framePath(el)))
  const p = imagePlacement(el.image, el.x, el.y, el.w, el.h, el.fit)
  ctx.drawImage(img, p.x, p.y, p.w, p.h)
  const type = shaped || el.fit === 'contain' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.92))
  canvas.width = canvas.height = 0
  if (!blob) return null
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type: type === 'image/png' ? 'png' : 'jpeg' }
}

export function exportPdf(design: Design, title: string, bleed = false) {
  return designToPdf(design, { title, rasterize: canvasRasterizer, imageScale: 4, bleed })
}
