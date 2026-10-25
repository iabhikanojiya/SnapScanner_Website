'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { EyeOff, Search, ShieldCheck, Trash2 } from 'lucide-react'
import type { PDFPageProxy } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { Alert, Progress } from '@/components/tools/Feedback'
import PdfPageView from '@/components/tools/viewer/PdfPageView'
import ZoomControl, { resolveZoom, type ZoomMode } from '@/components/tools/viewer/ZoomControl'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { SinglePdfInput, useSinglePdf, type LoadedPdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { pdfBlob } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import type { NormRect } from '@/lib/pdf/document'
import { formatPageRanges } from '@/lib/pdf/ranges'
import { buildRedactedPdf, marksToPixels, type RasterPage, type RedactionMark } from '@/lib/pdf/redact'
import { buildIndex, findInPage, matchRects } from '@/lib/pdf/search'
import { openForView } from '@/lib/pdf/viewer'
import { newId } from '@/lib/storage/db'

type Mark = RedactionMark & { id: string; source: 'box' | 'search' }

/** Rendering resolution for redacted pages (about 180 dpi). */
const RASTER_SCALE = 2.5

export default function RedactTool() {
  const state = useSinglePdf('redact-pdf', { render: true, unlockEncrypted: true })
  if (!state.pdf?.view) return <SinglePdfInput state={state} />
  return <Redactor key={state.pdf.id} pdf={state.pdf} onClose={state.reset} />
}

interface Verification {
  cleanPages: number[]
  remaining: { term: string; pages: number[] }[]
}

function Redactor({ pdf, onClose }: { pdf: LoadedPdf; onClose: () => void }) {
  const doc = pdf.view!
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<PDFPageProxy[]>([])
  const [box, setBox] = useState({ w: 800, h: 700 })
  const [zoom, setZoom] = useState<ZoomMode>('page')
  const [marks, setMarks] = useState<Mark[]>([])
  const [draft, setDraft] = useState<{ page: number; x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [term, setTerm] = useState('')
  const [terms, setTerms] = useState<string[]>([])
  const [searchNote, setSearchNote] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ file: ResultFile; verification: Verification; redactedPages: number[] } | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const list: PDFPageProxy[] = []
      for (let i = 1; i <= doc.numPages; i++) list.push(await doc.getPage(i))
      if (!cancelled) setPages(list)
    })()
    return () => {
      cancelled = true
    }
  }, [doc])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const sizes = useMemo(() => pages.map((p) => p.getViewport({ scale: 1 })).map((v) => ({ w: (v.width * 4) / 3, h: (v.height * 4) / 3 })), [pages])
  const maxW = Math.max(1, ...sizes.map((s) => s.w))
  const maxH = Math.max(1, ...sizes.map((s) => s.h))
  const fitWidth = Math.max(0.2, (box.w - 32) / maxW)
  const scale = resolveZoom(zoom, fitWidth, Math.max(0.2, Math.min(fitWidth, (box.h - 32) / maxH)))

  const markTerm = async () => {
    const q = term.trim()
    if (!q) return
    setSearchNote(null)
    const found: Mark[] = []
    for (let i = 0; i < pages.length; i++) {
      const tc = await pages[i].getTextContent()
      const index = buildIndex(tc.items.filter((it) => 'str' in it) as never)
      const vp = pages[i].getViewport({ scale: 1 })
      for (const m of findInPage(index, q, i)) {
        for (const r of matchRects(index, m)) {
          const [x1, y1] = vp.convertToViewportPoint(r[0], r[1])
          const [x2, y2] = vp.convertToViewportPoint(r[2], r[3])
          const rect: NormRect = { x: Math.min(x1, x2) / vp.width, y: Math.min(y1, y2) / vp.height, w: Math.abs(x2 - x1) / vp.width, h: Math.abs(y2 - y1) / vp.height }
          found.push({ id: newId(), page: i, rect, source: 'search' })
        }
      }
    }
    if (!found.length) setSearchNote(`“${q}” wasn’t found in the PDF’s text. Scanned pages have no text, so draw boxes over them instead.`)
    else {
      setMarks((cur) => [...cur, ...found])
      setSearchNote(`Marked ${found.length} match${found.length === 1 ? '' : 'es'} of “${q}”.`)
      setTerms((cur) => (cur.includes(q) ? cur : [...cur, q]))
    }
    setTerm('')
  }

  const pointOf = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }
  }

  const apply = async () => {
    setError(null)
    const pageSet = [...new Set(marks.map((m) => m.page))].sort((a, b) => a - b)
    setProgress({ label: 'Removing content', done: 0, total: pageSet.length })
    try {
      const rasters: RasterPage[] = []
      for (let k = 0; k < pageSet.length; k++) {
        const pi = pageSet[k]
        const page = pages[pi]
        const display = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: RASTER_SCALE })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')!
        await page.render({ canvas, viewport, background: 'rgb(255,255,255)' }).promise
        ctx.fillStyle = '#000'
        for (const r of marksToPixels(marks, pi, canvas.width, canvas.height, 3)) ctx.fillRect(r.x, r.y, r.w, r.h)
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
        canvas.width = canvas.height = 0
        if (!blob) throw new Error('A page couldn’t be rendered.')
        rasters.push({ page: pi, image: new Uint8Array(await blob.arrayBuffer()), type: 'jpeg', width: display.width, height: display.height })
        setProgress({ label: 'Removing content', done: k + 1, total: pageSet.length })
      }
      const bytes = await buildRedactedPdf({ name: pdf.name, bytes: pdf.bytes, password: pdf.password }, rasters)

      // Verify by reading the output back.
      setProgress({ label: 'Verifying the redacted copy', done: 0, total: 0 })
      const { doc: out, task } = await openForView(bytes)
      const texts: string[] = []
      try {
        for (let i = 1; i <= out.numPages; i++) {
          const tc = await (await out.getPage(i)).getTextContent()
          texts.push(tc.items.map((it) => ('str' in it ? it.str : '')).join(' ').toLowerCase())
        }
      } finally {
        void task.destroy()
      }
      const verification: Verification = {
        cleanPages: pageSet.filter((p) => !texts[p].trim()),
        remaining: terms.map((t) => ({ term: t, pages: texts.flatMap((x, i) => (x.includes(t.toLowerCase()) ? [i] : [])) })).filter((r) => r.pages.length),
      }
      setResult({ file: { blob: pdfBlob(bytes), name: `${baseName(pdf.name)}_redacted.pdf`, pageCount: pdf.pageCount }, verification, redactedPages: pageSet })
      focusResult()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setProgress(null)
    }
  }

  if (result) {
    const v = result.verification
    const ok = v.remaining.length === 0 && v.cleanPages.length === result.redactedPages.length
    return (
      <ResultPanel
        title={ok ? 'Redaction complete' : 'Redaction needs attention'}
        summary={
          <>
            Pages {formatPageRanges(result.redactedPages)} were replaced with flattened images, so their original text and graphics are gone. Other pages are unchanged.
            Document metadata, bookmarks and attachments were not copied.
          </>
        }
        files={[result.file]}
        source="redact-pdf"
        resetLabel="Back to marking"
        onReset={() => setResult(null)}
      >
        <div className="mt-4" data-testid="redaction-check">
          {ok ? (
            <Alert tone="success" title="Verified">
              <ShieldCheck aria-hidden className="mr-1 inline h-4 w-4" />
              The redacted pages have no extractable text{terms.length ? `, and ${terms.map((t) => `“${t}”`).join(', ')} no longer appear anywhere in the text` : ''}.
            </Alert>
          ) : (
            <Alert tone="error" title="Some content is still present">
              {v.remaining.map((r) => (
                <p key={r.term}>
                  “{r.term}” still appears on page {formatPageRanges(r.pages)}.
                </p>
              ))}
              Go back and mark those places before sharing this file.
            </Alert>
          )}
          <p className="mt-2 text-xs text-ink-muted">Check the preview: redaction only removes what you marked. Images in unmarked pages aren’t inspected.</p>
        </div>
      </ResultPanel>
    )
  }

  const marksOnPage = (i: number) => marks.filter((m) => m.page === i)

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2">
          <span className="text-sm text-ink-muted">Drag on a page to draw a redaction box.</span>
          <ZoomControl mode={zoom} scale={scale} onChange={setZoom} />
        </div>
        <div ref={scrollRef} className="overflow-auto p-4" style={{ height: 'calc(100dvh - var(--header-height) - 5rem)', minHeight: '22rem' }}>
          <div className="mx-auto flex w-max min-w-full flex-col items-center gap-4">
            {sizes.map((s, i) => (
              <PdfPageView key={i} doc={doc} pageNumber={i + 1} width={Math.round(s.w * scale)} aspect={s.h / s.w} textLayer={false}>
                {() => (
                  <div
                    className="absolute inset-0 z-[4] cursor-crosshair touch-none"
                    data-testid={`redact-layer-${i + 1}`}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId)
                      const p = pointOf(e)
                      setDraft({ page: i, x0: p.x, y0: p.y, x1: p.x, y1: p.y })
                    }}
                    onPointerMove={(e) => draft?.page === i && setDraft({ ...draft, ...{ x1: pointOf(e).x, y1: pointOf(e).y } })}
                    onPointerUp={() => {
                      if (draft && draft.page === i) {
                        const rect = { x: Math.min(draft.x0, draft.x1), y: Math.min(draft.y0, draft.y1), w: Math.abs(draft.x1 - draft.x0), h: Math.abs(draft.y1 - draft.y0) }
                        if (rect.w > 0.005 && rect.h > 0.005) setMarks((cur) => [...cur, { id: newId(), page: i, rect, source: 'box' }])
                      }
                      setDraft(null)
                    }}
                  >
                    {[...marksOnPage(i), ...(draft?.page === i ? [{ id: 'draft', page: i, source: 'box' as const, rect: { x: Math.min(draft.x0, draft.x1), y: Math.min(draft.y0, draft.y1), w: Math.abs(draft.x1 - draft.x0), h: Math.abs(draft.y1 - draft.y0) } }] : [])].map((m) => (
                      <div
                        key={m.id}
                        className="absolute border border-brand-600 bg-gray-900/80"
                        data-testid={m.id === 'draft' ? undefined : 'redaction-mark'}
                        style={{ left: `${m.rect.x * 100}%`, top: `${m.rect.y * 100}%`, width: `${m.rect.w * 100}%`, height: `${m.rect.h * 100}%` }}
                      />
                    ))}
                  </div>
                )}
              </PdfPageView>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="panel space-y-3 p-5">
          <p className="truncate text-sm font-semibold text-ink">{pdf.name}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void markTerm()
            }}
          >
            <label htmlFor="redact-term" className="field-label">
              Find and mark text
            </label>
            <div className="mt-1.5 flex gap-2">
              <input id="redact-term" className="field mt-0" placeholder="Name, number, email…" value={term} onChange={(e) => setTerm(e.target.value)} autoComplete="off" />
              <Button type="submit" size="icon" aria-label="Mark all matches" disabled={!term.trim()}>
                <Search aria-hidden className="h-4 w-4" />
              </Button>
            </div>
          </form>
          {searchNote && (
            <p className="text-xs text-ink-muted" role="status">
              {searchNote}
            </p>
          )}
          <p className="text-sm text-ink-soft" data-testid="mark-count">
            {marks.length} area{marks.length === 1 ? '' : 's'} marked{marks.length ? ` on page ${formatPageRanges(marks.map((m) => m.page))}` : ''}
          </p>
          {marks.length > 0 && (
            <div className="flex gap-2">
              <Button variant="ghost" size="xs" onClick={() => setMarks((m) => m.slice(0, -1))}>
                Undo last
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setMarks([])
                  setTerms([])
                }}
              >
                <Trash2 aria-hidden className="h-4 w-4" />
                Clear all
              </Button>
            </div>
          )}
          <Button className="w-full" onClick={apply} disabled={!marks.length || !!progress}>
            <EyeOff aria-hidden className="h-5 w-5" />
            Apply redactions
          </Button>
          <Alert tone="info">
            Pages with redactions become images in the new copy: their text can no longer be selected or searched. This is what makes the removal permanent.
          </Alert>
          <Button variant="ghost" size="xs" onClick={onClose}>
            Choose another PDF
          </Button>
        </div>
        {progress && <Progress label={progress.label} done={progress.done} total={progress.total} />}
        {error && <Alert tone="error">{error}</Alert>}
      </aside>
    </div>
  )
}
