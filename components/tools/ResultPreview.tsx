'use client'

import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { PageThumbnail } from '@/components/tools/PdfThumbs'
import { openForView, type OpenedPdf } from '@/lib/pdf/viewer'

/** Thumbnails of the generated PDF itself, so users can check the output before downloading. */
export default function ResultPreview({ blob, max = 6 }: { blob: Blob; max?: number }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [aspects, setAspects] = useState<number[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let opened: OpenedPdf | null = null
    let cancelled = false
    void blob
      .arrayBuffer()
      .then((buf) => openForView(new Uint8Array(buf)))
      .then(async (o) => {
        opened = o
        const list: number[] = []
        for (let i = 1; i <= Math.min(max, o.doc.numPages); i++) {
          const vp = (await o.doc.getPage(i)).getViewport({ scale: 1 })
          list.push(vp.height / vp.width)
        }
        if (cancelled) return
        setAspects(list)
        setDoc(o.doc)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      void opened?.task.destroy()
    }
  }, [blob, max])

  if (failed) return <p className="mt-3 text-sm text-brand-700">The result couldn’t be previewed.</p>
  if (!doc) return null
  return (
    <div className="mt-4" data-testid="result-preview">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
        Preview{doc.numPages > max ? ` (first ${max} of ${doc.numPages} pages)` : ''}
      </p>
      <ul className="mt-2 flex gap-3 overflow-x-auto pb-2">
        {aspects.map((aspect, i) => (
          <li key={i} className="w-28 shrink-0">
            <PageThumbnail doc={doc} pageNumber={i + 1} width={112} aspect={aspect} className="rounded-md border border-gray-200" />
            <span className="mt-1 block text-center text-xs text-ink-muted">{i + 1}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
