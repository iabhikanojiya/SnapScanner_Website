'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import { loadPdfJs } from '@/lib/pdf/viewer'
import { cn } from '@/lib/utils'

export interface PageBox {
  width: number
  height: number
}

interface PdfPageViewProps {
  doc: PDFDocumentProxy
  pageNumber: number
  /** CSS width of the page box. */
  width: number
  /** Height / width of the page as displayed (including rotation). */
  aspect: number
  /** Extra clockwise rotation on top of the page's own /Rotate. */
  rotation?: number
  textLayer?: boolean
  /** Highlight rectangles in CSS pixels relative to the page box. */
  marks?: { left: number; top: number; width: number; height: number; active?: boolean }[]
  className?: string
  children?: (box: PageBox) => React.ReactNode
  onVisible?: (pageNumber: number, ratio: number) => void
}

/**
 * One PDF page: a canvas plus (optionally) a selectable text layer. Renders
 * only while near the viewport and re-renders when the size changes.
 */
export default function PdfPageView({
  doc,
  pageNumber,
  width,
  aspect,
  rotation = 0,
  textLayer = true,
  marks,
  className,
  children,
  onVisible,
}: PdfPageViewProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [rendered, setRendered] = useState(false)
  const height = Math.round(width * aspect)
  const onVisibleRef = useRef(onVisible)
  useEffect(() => {
    onVisibleRef.current = onVisible
  })

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const nearObserver = new IntersectionObserver((entries) => setNear(entries[0].isIntersecting), { rootMargin: '1200px 0px' })
    const visObserver = new IntersectionObserver((entries) => onVisibleRef.current?.(pageNumber, entries[0].intersectionRatio), {
      threshold: [0, 0.25, 0.5, 0.75, 1],
    })
    nearObserver.observe(el)
    visObserver.observe(el)
    return () => {
      nearObserver.disconnect()
      visObserver.disconnect()
    }
  }, [pageNumber])

  useEffect(() => {
    const canvas = canvasRef.current
    const textDiv = textRef.current
    if (!near || !canvas) {
      // Free canvas memory for pages far from view.
      if (canvas) canvas.width = canvas.height = 0
      if (textDiv) textDiv.replaceChildren()
      setRendered(false)
      return
    }
    let cancelled = false
    let task: RenderTask | null = null
    let page: PDFPageProxy | null = null
    const timer = setTimeout(async () => {
      try {
        page = await doc.getPage(pageNumber)
        if (cancelled) return
        const base = page.getViewport({ scale: 1, rotation: page.rotate + rotation })
        const cssScale = width / base.width
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        let scale = cssScale * ratio
        const maxPixels = 16_000_000
        if (base.width * base.height * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (base.width * base.height))
        const viewport = page.getViewport({ scale, rotation: page.rotate + rotation })
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        task = page.render({ canvas, viewport })
        await task.promise
        if (cancelled) return
        setRendered(true)
        if (textLayer && textDiv) {
          const lib = await loadPdfJs()
          const cssViewport = page.getViewport({ scale: cssScale, rotation: page.rotate + rotation })
          textDiv.replaceChildren()
          textDiv.parentElement?.style.setProperty('--total-scale-factor', String(cssScale))
          const layer = new lib.TextLayer({ textContentSource: page.streamTextContent(), container: textDiv, viewport: cssViewport })
          await layer.render()
        }
      } catch (e) {
        if (!(e instanceof Error && e.name === 'RenderingCancelledException')) setRendered(false)
      }
    }, 60)
    return () => {
      cancelled = true
      clearTimeout(timer)
      task?.cancel()
    }
  }, [near, doc, pageNumber, width, rotation, textLayer])

  return (
    <div
      ref={boxRef}
      data-page={pageNumber}
      className={cn('pdf-page relative bg-white shadow-panel', !rendered && 'animate-pulse', className)}
      style={{ width, height }}
    >
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
      {textLayer && <div ref={textRef} className="textLayer" />}
      {marks?.map((m, i) => (
        <div
          key={i}
          aria-hidden
          className={cn('pointer-events-none absolute z-[3] rounded-sm mix-blend-multiply', m.active ? 'bg-orange-400/60 ring-2 ring-orange-500' : 'bg-yellow-300/60')}
          style={{ left: m.left, top: m.top, width: m.width, height: m.height }}
        />
      ))}
      {children?.({ width, height })}
      <span className="sr-only">Page {pageNumber}</span>
    </div>
  )
}
