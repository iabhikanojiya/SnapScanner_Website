'use client'

import { useEffect, useRef, useState } from 'react'
import { GitCompareArrows, X } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import Dropzone from '@/components/tools/Dropzone'
import { Alert, ErrorList, Progress } from '@/components/tools/Feedback'
import { readPdfFiles, type PdfItem } from '@/components/tools/pdfInput'
import { useInitialFiles } from '@/components/tools/useInitialFiles'
import { compareText, diffPixels, type TextComparison } from '@/lib/pdf/compare'
import { openForView, ViewerPasswordError, type OpenedPdf } from '@/lib/pdf/viewer'
import { cn } from '@/lib/utils'

interface Side {
  item: PdfItem
  opened: OpenedPdf
  text: string[]
}

async function loadSide(item: PdfItem): Promise<Side> {
  const opened = await openForView(item.bytes)
  const text: string[] = []
  for (let i = 1; i <= opened.doc.numPages; i++) {
    const tc = await (await opened.doc.getPage(i)).getTextContent()
    text.push(tc.items.map((it) => ('str' in it ? it.str + (it.hasEOL ? ' ' : '') : '')).join(''))
  }
  return { item, opened, text }
}

export default function CompareTool() {
  const [sides, setSides] = useState<[Side | null, Side | null]>([null, null])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState<number | null>(null)
  const [comparison, setComparison] = useState<TextComparison | null>(null)

  // Destroy a document only when it's replaced or the tool unmounts.
  const opened = useRef(new Set<OpenedPdf>())
  useEffect(() => {
    const live = new Set(sides.filter((s): s is Side => !!s).map((s) => s.opened))
    for (const o of opened.current) if (!live.has(o)) void o.task.destroy()
    opened.current = live
  }, [sides])
  useEffect(() => () => opened.current.forEach((o) => void o.task.destroy()), [])

  const pick = (index: 0 | 1) => async (files: File[]) => {
    setErrors([])
    setLoading(index)
    try {
      const { items, errors: errs } = await readPdfFiles(files.slice(0, 1))
      setErrors(errs)
      if (!items[0]) return
      if (items[0].encrypted) return setErrors([`“${items[0].name}” is password-protected. Unlock it first, then compare.`])
      const side = await loadSide(items[0])
      setComparison(null)
      setSides((cur) => (index === 0 ? [side, cur[1]] : [cur[0], side]))
    } catch (e) {
      setErrors([e instanceof ViewerPasswordError ? 'Password-protected PDFs must be unlocked first.' : 'The PDF couldn’t be opened.'])
    } finally {
      setLoading(null)
    }
  }

  // Files handed over from My files or Snap Assistant: the first two become the pair.
  useInitialFiles('compare-pdf', async (files) => {
    await pick(0)(files.slice(0, 1))
    if (files[1]) await pick(1)(files.slice(1, 2))
  }, (m) => setErrors([m]))

  const [a, b] = sides
  const run = () => a && b && setComparison(compareText(a.text.join('\n'), b.text.join('\n')))
  const noText = a && b && !a.text.join('').trim() && !b.text.join('').trim()

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {([0, 1] as const).map((i) => {
          const s = sides[i]
          return (
            <div key={i}>
              <p className="mb-2 text-sm font-bold text-ink">{i === 0 ? 'Original' : 'Changed version'}</p>
              {s ? (
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3" data-testid={`compare-file-${i}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{s.item.name}</p>
                    <p className="text-xs text-ink-muted">{s.item.pageCount} pages</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label={`Remove ${s.item.name}`} onClick={() => setSides((cur) => (i === 0 ? [null, cur[1]] : [cur[0], null]))}>
                    <X aria-hidden className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Dropzone accept="pdf" compact onFiles={pick(i)} disabled={loading !== null} hint={i === 0 ? 'Drop the original PDF.' : 'Drop the PDF to compare with.'} />
              )}
            </div>
          )
        })}
      </div>
      {loading !== null && <Progress label="Reading PDF" done={0} total={0} />}
      <ErrorList errors={errors} onDismiss={() => setErrors([])} />
      {a && b && (
        <Button onClick={run}>
          <GitCompareArrows aria-hidden className="h-5 w-5" />
          Compare
        </Button>
      )}
      {comparison && a && b && (
        <>
          <section aria-labelledby="text-diff" className="panel p-5" data-testid="result">
            <h2 id="text-diff" tabIndex={-1} className="text-lg font-bold text-ink">
              Text differences
            </h2>
            {noText ? (
              <Alert tone="warning" className="mt-3">
                Neither PDF has a text layer (they may be scans), so only the visual comparison below is available. Run OCR PDF first to compare text.
              </Alert>
            ) : comparison.identical ? (
              <Alert tone="success" className="mt-3">
                The text of both documents is identical (ignoring spacing and line breaks). Check the visual comparison for layout or image changes.
              </Alert>
            ) : (
              <>
                <dl className="mt-3 flex flex-wrap gap-3 text-sm" data-testid="diff-summary">
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
                    <dt className="inline">Added: </dt>
                    <dd className="inline font-bold">{comparison.added} words</dd>
                  </div>
                  <div className="rounded-lg bg-brand-50 px-3 py-2 text-brand-800">
                    <dt className="inline">Removed: </dt>
                    <dd className="inline font-bold">{comparison.removed} words</dd>
                  </div>
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                    <dt className="inline">Changed: </dt>
                    <dd className="inline font-bold">{comparison.changed} words</dd>
                  </div>
                </dl>
                <div className="mt-4 max-h-[28rem] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed" data-testid="diff-text">
                  {comparison.changes.map((c, i) =>
                    c.kind === 'same' ? (
                      <span key={i}>{c.text}</span>
                    ) : c.kind === 'added' ? (
                      <ins key={i} className="rounded bg-emerald-100 px-0.5 text-emerald-900 no-underline">
                        <span className="sr-only">[added: </span>
                        {c.text}
                        <span className="sr-only">]</span>
                      </ins>
                    ) : (
                      <del key={i} className="rounded bg-brand-100 px-0.5 text-brand-800">
                        <span className="sr-only">[removed: </span>
                        {c.text}
                        <span className="sr-only">]</span>
                      </del>
                    )
                  )}
                </div>
              </>
            )}
            {a.item.pageCount !== b.item.pageCount && (
              <p className="mt-3 text-sm text-ink-soft">
                Page count changed: {a.item.pageCount} → {b.item.pageCount}.
              </p>
            )}
          </section>
          <VisualDiff a={a.opened.doc} b={b.opened.doc} />
          <p className="text-xs text-ink-muted">
            The comparison is a helpful guide, not a legal or certified review. Reflowed text, different layouts and scanned pages can make unchanged content look
            different.
          </p>
        </>
      )}
    </div>
  )
}

const WIDTH = 520

async function renderToImage(doc: PDFDocumentProxy, pageNo: number, width: number, height: number) {
  const page = await doc.getPage(pageNo)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: width / base.width })
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  await page.render({ canvas, viewport, background: 'rgb(255,255,255)' }).promise
  return { canvas, data: ctx.getImageData(0, 0, width, height).data }
}

function VisualDiff({ a, b }: { a: PDFDocumentProxy; b: PDFDocumentProxy }) {
  const pages = Math.max(a.numPages, b.numPages)
  const [page, setPage] = useState(1)
  const [ratio, setRatio] = useState<number | null>(null)
  const origRef = useRef<HTMLCanvasElement>(null)
  const changedRef = useRef<HTMLCanvasElement>(null)
  const diffRef = useRef<HTMLCanvasElement>(null)
  const [missing, setMissing] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (page > a.numPages || page > b.numPages) {
        setMissing(`Page ${page} only exists in the ${page > a.numPages ? 'changed version' : 'original'}.`)
        setRatio(null)
        return
      }
      setMissing(null)
      const vp = (await a.getPage(page)).getViewport({ scale: 1 })
      const height = Math.round((WIDTH * vp.height) / vp.width)
      const [ia, ib] = await Promise.all([renderToImage(a, page, WIDTH, height), renderToImage(b, page, WIDTH, height)])
      if (cancelled) return
      const d = diffPixels(ia.data, ib.data, WIDTH, height)
      const draw = (c: HTMLCanvasElement | null, src: HTMLCanvasElement | ImageData) => {
        if (!c) return
        c.width = WIDTH
        c.height = height
        const ctx = c.getContext('2d')!
        if (src instanceof ImageData) ctx.putImageData(src, 0, 0)
        else ctx.drawImage(src, 0, 0)
      }
      draw(origRef.current, ia.canvas)
      draw(changedRef.current, ib.canvas)
      draw(diffRef.current, new ImageData(d.overlay as ImageDataArray, WIDTH, height))
      setRatio(d.ratio)
    })()
    return () => {
      cancelled = true
    }
  }, [a, b, page])

  return (
    <section aria-labelledby="visual-diff" className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="visual-diff" className="text-lg font-bold text-ink">
          Visual comparison
        </h2>
        <div className="flex items-center gap-2">
          <label htmlFor="diff-page" className="text-sm text-ink-soft">
            Page
          </label>
          <select id="diff-page" className="field mt-0 w-auto py-1" value={page} onChange={(e) => setPage(Number(e.target.value))}>
            {Array.from({ length: pages }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-1 text-sm text-ink-soft" role="status" data-testid="visual-status">
        {missing ?? (ratio === null ? 'Rendering…' : ratio === 0 ? 'No visual differences on this page.' : `${(ratio * 100).toFixed(2)}% of this page looks different (shown in red).`)}
      </p>
      <div className={cn('mt-4 grid gap-3 md:grid-cols-3', missing && 'hidden')}>
        {(
          [
            ['Original', origRef],
            ['Changed version', changedRef],
            ['Differences', diffRef],
          ] as const
        ).map(([label, ref]) => (
          <figure key={label} className="min-w-0">
            <canvas ref={ref} className="w-full rounded border border-gray-200 bg-white" aria-label={`${label}, page ${page}`} role="img" />
            <figcaption className="mt-1 text-center text-xs text-ink-muted">{label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
