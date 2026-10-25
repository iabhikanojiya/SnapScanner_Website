'use client'

import { useEffect, useRef, useState } from 'react'
import { FileWarning, Lock } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { openForView, renderThumbnail, ViewerPasswordError } from '@/lib/pdf/viewer'
import { cn } from '@/lib/utils'

/** Calls `fn` once the element scrolls near the viewport. */
function useNearViewport<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '300px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])
  return [ref, visible]
}

/** A page of an open pdf.js document, rendered when scrolled into view. */
export function PageThumbnail({
  doc,
  pageNumber,
  width = 160,
  aspect = 1.414,
  className,
}: {
  doc: PDFDocumentProxy
  pageNumber: number
  width?: number
  aspect?: number
  className?: string
}) {
  const [ref, visible] = useNearViewport<HTMLDivElement>()
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    let created: string | null = null
    renderThumbnail(doc, pageNumber, width)
      .then((u) => {
        created = u
        if (cancelled) URL.revokeObjectURL(u)
        else setUrl(u)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [visible, doc, pageNumber, width])

  return (
    <div
      ref={ref}
      className={cn('relative overflow-hidden bg-white', !url && 'animate-pulse bg-gray-100', className)}
      style={{ aspectRatio: `1 / ${aspect}` }}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- object URL of a locally rendered page
        <img src={url} alt="" className="h-full w-full object-contain" draggable={false} />
      )}
      {failed && (
        <span className="absolute inset-0 flex items-center justify-center text-ink-muted">
          <FileWarning aria-hidden className="h-6 w-6" />
        </span>
      )}
    </div>
  )
}

/** First-page preview of a PDF file. Shows a lock for encrypted files. */
export function PdfCover({ bytes, className }: { bytes: Uint8Array; className?: string }) {
  const [ref, visible] = useNearViewport<HTMLDivElement>()
  const [url, setUrl] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'locked' | 'failed' | 'ok'>('loading')

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    let created: string | null = null
    let destroy: (() => void) | null = null
    openForView(bytes)
      .then(async ({ doc, task }) => {
        destroy = () => void task.destroy()
        const u = await renderThumbnail(doc, 1, 120)
        created = u
        if (cancelled) return URL.revokeObjectURL(u)
        setUrl(u)
        setState('ok')
      })
      .catch((e) => !cancelled && setState(e instanceof ViewerPasswordError ? 'locked' : 'failed'))
      .finally(() => destroy?.())
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [visible, bytes])

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex aspect-[1/1.414] items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white',
        state === 'loading' && 'animate-pulse bg-gray-100',
        className
      )}
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- object URL of a locally rendered page
        <img src={url} alt="" className="h-full w-full object-contain" draggable={false} />
      )}
      {state === 'locked' && <Lock aria-hidden className="h-5 w-5 text-ink-muted" />}
      {state === 'failed' && <FileWarning aria-hidden className="h-5 w-5 text-ink-muted" />}
    </div>
  )
}
