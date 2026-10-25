'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PenLine, Plus, Save, Trash2 } from 'lucide-react'
import type { PDFPageProxy } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/tools/Feedback'
import PdfPageView from '@/components/tools/viewer/PdfPageView'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import SignatureMaker, { type Signature } from '@/components/tools/sign/SignatureMaker'
import ZoomControl, { resolveZoom, type ZoomMode } from '@/components/tools/viewer/ZoomControl'
import { SinglePdfInput, useSinglePdf, type LoadedPdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { pdfBlob } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import { applyOverlays } from '@/lib/pdf/operations'
import { newId } from '@/lib/storage/db'
import { cn } from '@/lib/utils'

interface Placement {
  id: string
  page: number
  /** Normalized to the displayed page. */
  x: number
  y: number
  w: number
  sig: Signature
}

export default function SignTool() {
  const state = useSinglePdf('sign-pdf', { render: true, unlockEncrypted: true })
  if (!state.pdf?.view) return <SinglePdfInput state={state} />
  return <SignWorkspace key={state.pdf.id} pdf={state.pdf} onClose={state.reset} />
}

function SignWorkspace({ pdf, onClose }: { pdf: LoadedPdf; onClose: () => void }) {
  const doc = pdf.view!
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<PDFPageProxy[]>([])
  const [box, setBox] = useState({ w: 800, h: 700 })
  const workspaceRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<ZoomMode>('page')
  const [current, setCurrent] = useState(1)
  const visibility = useRef(new Map<number, number>())
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [makerOpen, setMakerOpen] = useState(false)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultFile | null>(null)

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

  // Bring the whole workspace into view when a PDF opens, so "Fit page" shows a full page.
  const loaded = pages.length > 0
  useEffect(() => {
    if (loaded) workspaceRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [loaded])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => () => signatures.forEach((s) => URL.revokeObjectURL(s.url)), [signatures])

  // Page sizes in CSS px at 100% (PDF points × 4/3).
  const sizes = useMemo(
    () =>
      pages.map((p) => {
        const vp = p.getViewport({ scale: 1 })
        return { w: (vp.width * 4) / 3, h: (vp.height * 4) / 3 }
      }),
    [pages]
  )
  const aspects = useMemo(() => sizes.map((s) => s.h / s.w), [sizes])
  const maxW = Math.max(1, ...sizes.map((s) => s.w))
  const maxH = Math.max(1, ...sizes.map((s) => s.h))
  const fitWidth = Math.max(0.2, (box.w - 32) / maxW)
  const fitPage = Math.max(0.2, Math.min(fitWidth, (box.h - 32) / maxH))
  const scale = resolveZoom(zoom, fitWidth, fitPage)

  const onVisible = useCallback((page: number, ratio: number) => {
    visibility.current.set(page, ratio)
    let best = 1
    let bestRatio = -1
    for (const [p, r] of visibility.current) if (r > bestRatio) [best, bestRatio] = [p, r]
    setCurrent(best)
  }, [])

  const place = (sig: Signature) => {
    const page = current - 1
    const w = 0.3
    const h = (w / sig.aspect) * (1 / (aspects[page] ?? 1.414))
    // Centre it in the part of the page that is currently on screen.
    let centerY = 0.5
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-page="${current}"]`)
    const view = scrollRef.current?.getBoundingClientRect()
    if (el && view) {
      const r = el.getBoundingClientRect()
      const top = Math.max(r.top, view.top)
      const bottom = Math.min(r.bottom, view.bottom)
      if (bottom > top) centerY = ((top + bottom) / 2 - r.top) / r.height
    }
    const y = Math.min(Math.max(0, centerY - h / 2), 1 - h)
    const p: Placement = { id: newId(), page, x: 0.5 - w / 2, y, w, sig }
    setPlacements((cur) => [...cur, p])
    setSelected(p.id)
  }

  const update = (id: string, patch: Partial<Placement>) => setPlacements((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const bytes = await applyOverlays(
        { name: pdf.name, bytes: pdf.bytes, password: pdf.password },
        placements.map((p) => {
          const h = (p.w / p.sig.aspect) / aspects[p.page]
          return { kind: 'image' as const, page: p.page, rect: { x: p.x, y: p.y, w: p.w, h }, png: p.sig.png }
        })
      )
      setResult({ blob: pdfBlob(bytes), name: `${baseName(pdf.name)}_signed.pdf`, pageCount: pdf.pageCount })
      focusResult()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    return (
      <ResultPanel
        title="Your PDF is signed"
        summary="The signature is part of the page in this new copy. It’s a visible electronic signature, not a certificate-based digital signature."
        files={[result]}
        source="sign-pdf"
        resetLabel="Back to the document"
        onReset={() => setResult(null)}
      />
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <div ref={workspaceRef} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2">
          <span className="text-sm text-ink-muted">
            Page {current} of {doc.numPages}
          </span>
          <ZoomControl mode={zoom} scale={scale} onChange={setZoom} />
        </div>
        <div ref={scrollRef} className="overflow-auto p-4" style={{ height: 'calc(100dvh - var(--header-height) - 5rem)', minHeight: '22rem' }} onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="mx-auto flex w-max min-w-full flex-col items-center gap-4">
            {aspects.map((aspect, i) => (
              <PdfPageView key={i} doc={doc} pageNumber={i + 1} width={Math.round(sizes[i].w * scale)} aspect={aspect} textLayer={false} onVisible={onVisible}>
                {(box) =>
                  placements
                    .filter((p) => p.page === i)
                    .map((p) => (
                      <PlacedSignature
                        key={p.id}
                        p={p}
                        box={box}
                        selected={selected === p.id}
                        onSelect={() => setSelected(p.id)}
                        onChange={(patch) => update(p.id, patch)}
                        onRemove={() => setPlacements((cur) => cur.filter((x) => x.id !== p.id))}
                      />
                    ))
                }
              </PdfPageView>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="panel p-5">
          <p className="truncate text-sm font-semibold text-ink">{pdf.name}</p>
          <p className="text-xs text-ink-muted">
            Viewing page {current} of {doc.numPages}
          </p>
          <h2 className="mt-4 font-bold text-ink">Signatures</h2>
          {signatures.length === 0 ? (
            <p className="mt-1 text-sm text-ink-muted">Create a signature, then place it on the page you’re viewing.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {signatures.map((s, i) => (
                <li key={s.url} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                  <img src={s.url} alt={`Signature ${i + 1}`} className="h-10 min-w-0 flex-1 object-contain object-left" />
                  <Button size="xs" onClick={() => place(s)}>
                    <Plus aria-hidden className="h-4 w-4" />
                    Add to page {current}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="secondary" className="mt-3 w-full" size="sm" onClick={() => setMakerOpen(true)}>
            <PenLine aria-hidden className="h-4 w-4" />
            {signatures.length ? 'Create another signature' : 'Create signature'}
          </Button>
        </div>

        <div className="panel p-5">
          <h2 className="font-bold text-ink">Placed ({placements.length})</h2>
          {placements.length > 0 ? (
            <>
              <p className="mt-1 text-xs text-ink-muted">Drag to move. Drag the corner to resize. With a signature selected, arrow keys move it and + / − resize it.</p>
              <ul className="mt-2 space-y-1 text-sm">
                {placements.map((p, i) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <button type="button" className="text-left text-ink-soft hover:text-ink" onClick={() => setSelected(p.id)}>
                      Signature {i + 1} · page {p.page + 1}
                    </button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove signature ${i + 1}`} onClick={() => setPlacements((cur) => cur.filter((x) => x.id !== p.id))}>
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">Nothing placed yet.</p>
          )}
          <Button className="mt-4 w-full" onClick={save} disabled={!placements.length || saving}>
            <Save aria-hidden className="h-5 w-5" />
            Save signed PDF
          </Button>
          {saving && <Spinner label="Signing…" className="mt-2" />}
          {error && (
            <Alert tone="error" className="mt-3">
              {error}
            </Alert>
          )}
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={onClose}>
            Choose another PDF
          </Button>
        </div>
      </aside>

      {makerOpen && (
        <SignatureMaker
          onClose={() => setMakerOpen(false)}
          onCreate={(s) => {
            setSignatures((cur) => [...cur, s])
            setMakerOpen(false)
            place(s)
          }}
        />
      )}
    </div>
  )
}

function PlacedSignature({
  p,
  box,
  selected,
  onSelect,
  onChange,
  onRemove,
}: {
  p: Placement
  box: { width: number; height: number }
  selected: boolean
  onSelect: () => void
  onChange: (patch: Partial<Placement>) => void
  onRemove: () => void
}) {
  const drag = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; orig: Placement } | null>(null)
  const hNorm = (p.w * box.width) / p.sig.aspect / box.height
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.startX) / box.width
    const dy = (e.clientY - d.startY) / box.height
    if (d.mode === 'move') {
      onChange({ x: clamp(d.orig.x + dx, 0, 1 - d.orig.w), y: clamp(d.orig.y + dy, 0, 1 - hNorm) })
    } else {
      onChange({ w: clamp(d.orig.w + dx, 0.05, 1 - d.orig.x) })
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Placed signature. Arrow keys move it, plus and minus resize it, Delete removes it."
      data-testid="placed-signature"
      className={cn('absolute z-[5] cursor-move touch-none outline-none', selected ? 'ring-2 ring-brand-600' : 'ring-1 ring-dashed ring-brand-300 hover:ring-brand-600')}
      style={{ left: p.x * box.width, top: p.y * box.height, width: p.w * box.width, height: hNorm * box.height }}
      onPointerDown={(e) => {
        onSelect()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { mode: 'move', startX: e.clientX, startY: e.clientY, orig: p }
      }}
      onPointerMove={onMove}
      onPointerUp={() => (drag.current = null)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.05 : 0.01
        if (e.key === 'Delete' || e.key === 'Backspace') return onRemove()
        const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
        if (moves[e.key]) {
          e.preventDefault()
          onChange({ x: clamp(p.x + moves[e.key][0], 0, 1 - p.w), y: clamp(p.y + moves[e.key][1], 0, 1 - hNorm) })
        } else if (e.key === '+' || e.key === '=') onChange({ w: clamp(p.w + 0.02, 0.05, 1 - p.x) })
        else if (e.key === '-') onChange({ w: clamp(p.w - 0.02, 0.05, 1) })
      }}
      onFocus={onSelect}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
      <img src={p.sig.url} alt="" className="pointer-events-none h-full w-full select-none" draggable={false} />
      {selected && (
        <span
          aria-hidden
          className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-brand-600 shadow"
          onPointerDown={(e) => {
            e.stopPropagation()
            e.currentTarget.parentElement!.setPointerCapture(e.pointerId)
            drag.current = { mode: 'resize', startX: e.clientX, startY: e.clientY, orig: p }
          }}
        />
      )}
    </div>
  )
}
