'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Download,
  Italic,
  Loader2,
  MousePointer2,
  Pipette,
  Redo2,
  Replace,
  SquareDashed,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react'
import type { PDFPageProxy } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/tools/Feedback'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { SinglePdfInput, useSinglePdf, type LoadedPdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import PdfPageView from '@/components/tools/viewer/PdfPageView'
import ZoomControl, { resolveZoom, type ZoomMode } from '@/components/tools/viewer/ZoomControl'
import { pdfBlob } from '@/lib/browser/download'
import { CSS_FONTS, type FontFamily } from '@/lib/create/engine'
import { baseName } from '@/lib/files/validate'
import type { NormRect } from '@/lib/pdf/document'
import { DEFAULT_STYLE, TEXT_PAD, applyTextEdits, familyFor, fittedHeight, layoutText, type DetectedText, type EditBox, type TextStyle } from '@/lib/pdf/text-edit'
import { renderThumbnail } from '@/lib/pdf/viewer'
import { newId } from '@/lib/storage/db'
import { cn } from '@/lib/utils'

type Mode = 'select' | 'text' | 'replace' | 'cover'
interface PageSize {
  /** Displayed size in points (after the page's rotation). */
  w: number
  h: number
}

const MODES: { id: Mode; label: string; icon: typeof Type; hint: string }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2, hint: 'Select, move and resize edits.' },
  { id: 'text', label: 'Add text', icon: Type, hint: 'Click or drag on a page to add a text box.' },
  { id: 'replace', label: 'Replace text', icon: Replace, hint: 'Click highlighted text to cover it and type new text, or drag around an area.' },
  { id: 'cover', label: 'Cover area', icon: SquareDashed, hint: 'Drag over an area to cover it with a solid colour.' },
]

const FONTS: { value: FontFamily; label: string }[] = [
  { value: 'sans', label: 'Sans serif (Helvetica)' },
  { value: 'serif', label: 'Serif (Times)' },
  { value: 'mono', label: 'Monospace (Courier)' },
]

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`

/**
 * Estimates the background and text colours inside a page area from the
 * rendered page: the background is the median colour around the area, and the
 * text colour the average of the pixels that differ most from it.
 */
function sampleColours(root: HTMLElement | null, page: number, rect: NormRect): { bg: string; fg: string } | null {
  const canvas = root?.querySelector<HTMLCanvasElement>(`[data-page="${page + 1}"] canvas`)
  if (!canvas || !canvas.width) return null
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const W = canvas.width
  const H = canvas.height
  const x0 = clamp(Math.floor(rect.x * W) - 3, 0, W - 1)
  const y0 = clamp(Math.floor(rect.y * H) - 3, 0, H - 1)
  const x1 = clamp(Math.ceil((rect.x + rect.w) * W) + 3, x0 + 1, W)
  const y1 = clamp(Math.ceil((rect.y + rect.h) * H) + 3, y0 + 1, H)
  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data
  } catch {
    return null
  }
  const w = x1 - x0
  const h = y1 - y0
  const ring: number[][] = []
  const inside: number[][] = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const px = [data[i], data[i + 1], data[i + 2]]
      if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) ring.push(px)
      else inside.push(px)
    }
  if (!ring.length) return null
  const median = (k: number) => ring.map((p) => p[k]).sort((a, b) => a - b)[Math.floor(ring.length / 2)]
  const bg = [median(0), median(1), median(2)]
  const dist = (p: number[]) => Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2])
  const ink = inside.filter((p) => dist(p) > 90).sort((a, b) => dist(b) - dist(a))
  const top = ink.slice(0, Math.max(1, Math.floor(ink.length * 0.3)))
  const avg = (k: number) => top.reduce((s, p) => s + p[k], 0) / top.length
  return { bg: toHex(bg[0], bg[1], bg[2]), fg: ink.length ? toHex(avg(0), avg(1), avg(2)) : '#111827' }
}

/** Text runs on a page with their display rectangles, for "click to replace". */
async function detectText(page: PDFPageProxy): Promise<DetectedText[]> {
  const vp = page.getViewport({ scale: 1 })
  const tc = await page.getTextContent()
  const out: DetectedText[] = []
  for (const item of tc.items) {
    if (!('str' in item) || !item.str.trim()) continue
    const t = item.transform
    // Only horizontal text; rotated runs within a page are skipped.
    if (Math.abs(t[1]) > 0.01 || Math.abs(t[2]) > 0.01) continue
    const size = Math.abs(t[3]) || item.height
    if (!size || !item.width) continue
    const [ax, ay] = vp.convertToViewportPoint(t[4], t[5] - size * 0.24)
    const [bx, by] = vp.convertToViewportPoint(t[4] + item.width, t[5] + size * 0.86)
    out.push({
      str: item.str,
      size: Math.round(size * 10) / 10,
      font: familyFor(tc.styles[item.fontName]?.fontFamily, item.fontName),
      rect: { x: Math.min(ax, bx) / vp.width, y: Math.min(ay, by) / vp.height, w: Math.abs(bx - ax) / vp.width, h: Math.abs(by - ay) / vp.height },
    })
  }
  return out
}

export default function EditPdfTool() {
  const state = useSinglePdf('edit-pdf', { render: true, unlockEncrypted: true })
  if (!state.pdf?.view) return <SinglePdfInput state={state} hint="Your PDF opens here in your browser. It isn’t uploaded." />
  return <Editor key={state.pdf.id} pdf={state.pdf} onClose={state.reset} />
}

function Editor({ pdf, onClose }: { pdf: LoadedPdf; onClose: () => void }) {
  const doc = pdf.view!
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<PDFPageProxy[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [box, setBox] = useState({ w: 800, h: 700 })
  const [zoom, setZoom] = useState<ZoomMode>('width')
  const [current, setCurrent] = useState(1)
  const visibility = useRef(new Map<number, number>())
  const [mode, setMode] = useState<Mode>('select')
  const [boxes, setBoxesState] = useState<EditBox[]>([])
  const boxesRef = useRef<EditBox[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [texts, setTexts] = useState<Record<number, DetectedText[]>>({})
  const loadingText = useRef(new Set<number>())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultFile | null>(null)
  // Undo history (kept in refs, mirrored to state for the buttons).
  const hist = useRef<{ past: EditBox[][]; future: EditBox[][] }>({ past: [], future: [] })
  const [canUndo, setCanUndo] = useState({ undo: false, redo: false })
  const coalesce = useRef<{ key: string; at: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list: PDFPageProxy[] = []
        for (let i = 1; i <= doc.numPages; i++) list.push(await doc.getPage(i))
        if (!cancelled) setPages(list)
      } catch {
        if (!cancelled) setLoadError('This PDF’s pages couldn’t be read. It may be damaged.')
      }
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

  const sizes = useMemo<PageSize[]>(() => pages.map((p) => p.getViewport({ scale: 1 })).map((vp) => ({ w: vp.width, h: vp.height })), [pages])
  const maxW = Math.max(1, ...sizes.map((s) => (s.w * 4) / 3))
  const maxH = Math.max(1, ...sizes.map((s) => (s.h * 4) / 3))
  const fitWidth = Math.max(0.2, Math.min(2, (box.w - 32) / maxW))
  const fitPage = Math.max(0.2, Math.min(fitWidth, (box.h - 32) / maxH))
  const scale = resolveZoom(zoom, fitWidth, fitPage)

  // ---------------------------------------------------------------------------
  // Edits and undo

  const syncHistory = () => setCanUndo({ undo: hist.current.past.length > 0, redo: hist.current.future.length > 0 })
  const apply = useCallback((next: EditBox[]) => {
    boxesRef.current = next
    setBoxesState(next)
  }, [])
  /** Saves the current state as an undo step. */
  const snapshot = useCallback(() => {
    hist.current = { past: [...hist.current.past.slice(-99), boxesRef.current], future: [] }
    coalesce.current = null
    syncHistory()
  }, [])
  /** Applies a change as an undo step; changes with the same key within 1.2 s are merged. */
  const change = useCallback(
    (fn: (b: EditBox[]) => EditBox[], key?: string) => {
      const now = Date.now()
      const merge = key && coalesce.current?.key === key && now - coalesce.current.at < 1200
      if (!merge) snapshot()
      coalesce.current = key ? { key, at: now } : null
      apply(fn(boxesRef.current))
    },
    [apply, snapshot]
  )
  const update = useCallback((id: string, patch: Partial<EditBox>, key?: string) => change((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)), key), [change])
  const undo = useCallback(() => {
    const prev = hist.current.past.at(-1)
    if (!prev) return
    hist.current = { past: hist.current.past.slice(0, -1), future: [boxesRef.current, ...hist.current.future] }
    coalesce.current = null
    apply(prev)
    syncHistory()
  }, [apply])
  const redo = useCallback(() => {
    const next = hist.current.future[0]
    if (!next) return
    hist.current = { past: [...hist.current.past, boxesRef.current], future: hist.current.future.slice(1) }
    coalesce.current = null
    apply(next)
    syncHistory()
  }, [apply])
  const remove = useCallback(
    (id: string) => {
      change((b) => b.filter((x) => x.id !== id))
      setSelected((s) => (s === id ? null : s))
      setEditing((e) => (e === id ? null : e))
    },
    [change]
  )

  // Keyboard: undo/redo anywhere except while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // ---------------------------------------------------------------------------
  // Pages

  const onVisible = useCallback((page: number, ratio: number) => {
    visibility.current.set(page, ratio)
    let best = 1
    let bestRatio = -1
    for (const [p, r] of visibility.current) if (r > bestRatio) [best, bestRatio] = [p, r]
    setCurrent(best)
  }, [])

  const goTo = (n: number) => {
    const p = clamp(n, 1, doc.numPages)
    scrollRef.current?.querySelector(`[data-page="${p}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const ensureText = useCallback(
    (index: number) => {
      if (texts[index] || loadingText.current.has(index) || !pages[index]) return
      loadingText.current.add(index)
      void detectText(pages[index])
        .then((found) => setTexts((cur) => ({ ...cur, [index]: found })))
        .catch(() => setTexts((cur) => ({ ...cur, [index]: [] })))
    },
    [pages, texts]
  )
  useEffect(() => {
    if (mode === 'replace') ensureText(current - 1)
  }, [mode, current, ensureText])

  // ---------------------------------------------------------------------------
  // Creating edits

  const newBox = (page: number, rect: NormRect, patch: Partial<EditBox> = {}): EditBox => ({ id: newId(), page, rect, fill: null, text: '', style: { ...DEFAULT_STYLE }, ...patch })

  const add = (b: EditBox, edit: boolean) => {
    change((cur) => [...cur, b])
    setSelected(b.id)
    setEditing(edit ? b.id : null)
    setMode('select')
  }

  /** Covers a detected text run and puts the same text, editable, on top. */
  const replaceRun = (page: number, run: DetectedText) => {
    const size = sizes[page]
    const colours = sampleColours(scrollRef.current, page, run.rect)
    const style: TextStyle = { ...DEFAULT_STYLE, font: run.font, size: run.size, color: colours?.fg ?? DEFAULT_STYLE.color }
    const draft = { rect: run.rect, text: run.str, style }
    const pad = 2 / size.w
    const width = Math.max(run.rect.w + pad * 2, Math.min(1, (layoutText({ ...draft, rect: { ...run.rect, w: 1 } }, size.w, size.h).lines[0]?.text ? run.rect.w : 0) + pad * 2))
    const h = fittedHeight({ ...draft, rect: { ...run.rect, w: width } }, size.w, size.h)
    // Line the new baseline up with the old one: the run's rectangle spans 0.86 size above to 0.24 below the baseline.
    const baseline = run.rect.y + (run.rect.h * 0.86) / 1.1
    const y = baseline - (TEXT_PAD + style.size * 0.8) / size.h
    const rect = { x: clamp(run.rect.x - pad, 0, 1), y: clamp(Math.min(y, run.rect.y), 0, 1), w: Math.min(width, 1), h: Math.max(h, run.rect.y + run.rect.h - Math.min(y, run.rect.y)) }
    add(newBox(page, { ...rect, h: Math.min(rect.h, 1 - rect.y) }, { fill: colours?.bg ?? '#ffffff', text: run.str, style }), true)
  }

  const createFromDrag = (page: number, rect: NormRect | null, point: { x: number; y: number }) => {
    const size = sizes[page]
    if (mode === 'replace' && !rect) {
      const run = (texts[page] ?? []).find((r) => point.x >= r.rect.x && point.x <= r.rect.x + r.rect.w && point.y >= r.rect.y && point.y <= r.rect.y + r.rect.h)
      if (run) return replaceRun(page, run)
    }
    if (mode === 'text') {
      const w = rect?.w ?? Math.min(0.4, 220 / size.w)
      const r = rect ?? { x: clamp(point.x, 0, 1 - w), y: clamp(point.y, 0, 1), w, h: 0 }
      const h = Math.max(r.h, fittedHeight({ rect: r, text: 'X', style: DEFAULT_STYLE }, size.w, size.h))
      return add(newBox(page, { ...r, h: Math.min(h, 1 - r.y) }), true)
    }
    const r = rect ?? { x: clamp(point.x - 60 / size.w, 0, 1), y: clamp(point.y - 9 / size.h, 0, 1), w: Math.min(120 / size.w, 1), h: Math.min(18 / size.h, 1) }
    const colours = sampleColours(scrollRef.current, page, r)
    if (mode === 'cover') return add(newBox(page, r, { fill: colours?.bg ?? '#ffffff' }), false)
    // Replace by area: cover it and type new text in the same place.
    const style = { ...DEFAULT_STYLE, color: colours?.fg ?? DEFAULT_STYLE.color, size: clamp(Math.round(((r.h * size.h - TEXT_PAD * 2) / 1.05) * 2) / 2, 6, 36) }
    add(newBox(page, r, { fill: colours?.bg ?? '#ffffff', style }), true)
  }

  // ---------------------------------------------------------------------------
  // Export

  const save = async () => {
    setSaving(true)
    setError(null)
    setEditing(null)
    try {
      const bytes = await applyTextEdits({ name: pdf.name, bytes: pdf.bytes, password: pdf.password }, boxesRef.current)
      setResult({ blob: pdfBlob(bytes), name: `${baseName(pdf.name)}_edited.pdf`, pageCount: pdf.pageCount })
      focusResult()
    } catch (e) {
      setError(errorMessage(e, 'The PDF couldn’t be saved. If it’s very large, close other tabs and try again.'))
    } finally {
      setSaving(false)
    }
  }

  const sel = boxes.find((b) => b.id === selected) ?? null
  const activeCount = boxes.filter((b) => b.fill || b.text.trim()).length

  if (result)
    return (
      <ResultPanel
        title="Your PDF is ready"
        summary="The covers and new text are drawn into this copy. Covered text is hidden, not deleted: it can still be found by search or copied. Use Redact PDF to remove content permanently."
        files={[result]}
        source="edit-pdf"
        resetLabel="Back to editing"
        onReset={() => setResult(null)}
      />
    )

  if (loadError) return <Alert tone="error">{loadError}</Alert>

  return (
    <div className="space-y-3" data-testid="edit-pdf">
      {/* Toolbar */}
      <div className="sticky top-[calc(var(--header-height)+0.5rem)] z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-card backdrop-blur">
        <div className="min-w-0 px-2">
          <p className="max-w-[14rem] truncate text-sm font-semibold text-ink" title={pdf.name}>
            {pdf.name}
          </p>
          <p className="text-xs text-ink-muted" data-testid="page-status">
            Page {current} of {doc.numPages}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1" role="radiogroup" aria-label="Editing tool">
          {MODES.map(({ id, label, icon: Icon, hint }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              title={hint}
              onClick={() => {
                setMode(id)
                setEditing(null)
              }}
              className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors', mode === id ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink')}
            >
              <Icon aria-hidden className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sr-only sm:hidden">{label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Undo" title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo.undo}>
            <Undo2 aria-hidden className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canUndo.redo}>
            <Redo2 aria-hidden className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Previous page" onClick={() => goTo(current - 1)} disabled={current <= 1}>
            <ChevronUp aria-hidden className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next page" onClick={() => goTo(current + 1)} disabled={current >= doc.numPages}>
            <ChevronDown aria-hidden className="h-4 w-4" />
          </Button>
        </div>
        <ZoomControl mode={zoom} scale={scale} onChange={setZoom} className="flex flex-wrap items-center gap-1" />
        <Button size="sm" className="ml-auto" onClick={() => void save()} disabled={saving || activeCount === 0}>
          {saving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Download aria-hidden className="h-4 w-4" />}
          Download PDF
        </Button>
      </div>
      <p className="px-1 text-sm text-ink-muted" role="status">
        {MODES.find((m) => m.id === mode)!.hint}
      </p>
      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid gap-3 lg:grid-cols-[8.5rem_minmax(0,1fr)_19rem]">
        {/* Thumbnails */}
        <nav aria-label="Pages" className="hidden max-h-[calc(100dvh-var(--header-height)-10rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 lg:block">
          <ol className="space-y-2">
            {sizes.map((s, i) => (
              <li key={i}>
                <Thumb doc={doc} page={i + 1} aspect={s.h / s.w} active={current === i + 1} edits={boxes.filter((b) => b.page === i).length} onClick={() => goTo(i + 1)} />
              </li>
            ))}
          </ol>
        </nav>

        {/* Pages */}
        <div
          ref={scrollRef}
          className="min-w-0 overflow-auto rounded-2xl border border-gray-200 bg-gray-100 p-4"
          style={{ height: 'calc(100dvh - var(--header-height) - 10rem)', minHeight: '24rem' }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelected(null)
              setEditing(null)
            }
          }}
        >
          {pages.length === 0 ? (
            <Spinner label="Opening pages…" />
          ) : (
            <div className="mx-auto flex w-max min-w-full flex-col items-center gap-4">
              {sizes.map((s, i) => (
                <PdfPageView key={i} doc={doc} pageNumber={i + 1} width={Math.round(((s.w * 4) / 3) * scale)} aspect={s.h / s.w} textLayer={false} onVisible={onVisible}>
                  {(pageBox) => (
                    <PageLayer
                      pageBox={pageBox}
                      size={s}
                      mode={mode}
                      runs={mode === 'replace' ? texts[i] : undefined}
                      onEnter={() => mode === 'replace' && ensureText(i)}
                      onCreate={(rect, point) => createFromDrag(i, rect, point)}
                      onBackground={() => {
                        setSelected(null)
                        setEditing(null)
                      }}
                    >
                      {boxes
                        .filter((b) => b.page === i)
                        .map((b) => (
                          <BoxView
                            key={b.id}
                            b={b}
                            pageBox={pageBox}
                            size={s}
                            selected={selected === b.id}
                            editing={editing === b.id}
                            onSelect={() => setSelected(b.id)}
                            onEdit={(on) => setEditing(on ? b.id : null)}
                            onBegin={snapshot}
                            onLive={(rect) => apply(boxesRef.current.map((x) => (x.id === b.id ? { ...x, rect } : x)))}
                            onChange={(patch, key) => update(b.id, patch, key)}
                            onRemove={() => remove(b.id)}
                          />
                        ))}
                    </PageLayer>
                  )}
                </PdfPageView>
              ))}
            </div>
          )}
        </div>

        {/* Properties */}
        <aside className="space-y-3 lg:max-h-[calc(100dvh-var(--header-height)-10rem)] lg:overflow-y-auto" aria-label="Properties">
          {sel ? (
            <Properties
              b={sel}
              size={sizes[sel.page]}
              onChange={(patch, key) => update(sel.id, patch, key)}
              onRemove={() => remove(sel.id)}
              onMatchCover={() => {
                const c = sampleColours(scrollRef.current, sel.page, sel.rect)
                if (c) update(sel.id, { fill: c.bg })
              }}
            />
          ) : (
            <div className="panel space-y-3 p-4 text-sm text-ink-soft">
              <h2 className="font-bold text-ink">How to edit</h2>
              <ul className="space-y-2">
                {MODES.slice(1).map(({ id, label, icon: Icon, hint }) => (
                  <li key={id} className="flex gap-2">
                    <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    <span>
                      <button type="button" className="font-semibold text-ink hover:underline" onClick={() => setMode(id)}>
                        {label}
                      </button>
                      : {hint}
                    </span>
                  </li>
                ))}
              </ul>
              <p>Select an edit to change its text, font, colours and size. Double-click a box to type in it.</p>
            </div>
          )}
          <div className="panel p-4 text-sm">
            <h2 className="font-bold text-ink">Edits ({activeCount})</h2>
            {boxes.length === 0 ? (
              <p className="mt-1 text-ink-muted">Nothing changed yet.</p>
            ) : (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {boxes.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      className={cn('w-full truncate rounded px-2 py-1 text-left hover:bg-gray-50', selected === b.id && 'bg-brand-50 text-brand-800')}
                      onClick={() => {
                        setSelected(b.id)
                        goTo(b.page + 1)
                      }}
                    >
                      p.{b.page + 1} · {b.text.trim() ? `“${b.text.trim().slice(0, 28)}”` : 'Cover'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink-muted">Covering hides text visually. The original text stays in the file underneath and may still be searchable. To remove content for good, use Redact PDF.</p>
            <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={onClose}>
              Choose another PDF
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page overlay: draws new boxes and highlights detected text in Replace mode

function PageLayer({
  pageBox,
  mode,
  runs,
  onEnter,
  onCreate,
  onBackground,
  children,
}: {
  pageBox: { width: number; height: number }
  size: PageSize
  mode: Mode
  runs?: DetectedText[]
  onEnter: () => void
  onCreate: (rect: NormRect | null, point: { x: number; y: number }) => void
  onBackground: () => void
  children: React.ReactNode
}) {
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const drawing = mode !== 'select'
  const point = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) }
  }
  const rectOf = (d: NonNullable<typeof drag>) => ({ x: Math.min(d.x0, d.x1), y: Math.min(d.y0, d.y1), w: Math.abs(d.x1 - d.x0), h: Math.abs(d.y1 - d.y0) })
  return (
    <div
      className={cn('absolute inset-0 z-[4] touch-none', drawing ? 'cursor-crosshair' : 'cursor-default')}
      data-testid="page-layer"
      onPointerEnter={onEnter}
      onPointerDown={(e) => {
        // Start on the page itself or on a highlighted text run, not on an existing edit.
        if (e.target !== e.currentTarget && (e.target as HTMLElement).dataset.run === undefined) return
        if (!drawing) return onBackground()
        const p = point(e)
        e.currentTarget.setPointerCapture(e.pointerId)
        setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
      }}
      onPointerMove={(e) => {
        if (!drag) return
        const p = point(e)
        setDrag({ ...drag, x1: p.x, y1: p.y })
      }}
      onPointerUp={() => {
        if (!drag) return
        const r = rectOf(drag)
        setDrag(null)
        const isDrag = r.w * pageBox.width > 6 && r.h * pageBox.height > 6
        onCreate(isDrag ? r : null, { x: drag.x0, y: drag.y0 })
      }}
    >
      {runs?.map((r, i) => (
        <span
          key={i}
          data-run=""
          aria-hidden
          className="absolute rounded-sm bg-sky-400/10 ring-1 ring-sky-400/50 hover:bg-sky-400/25"
          style={{ left: r.rect.x * pageBox.width, top: r.rect.y * pageBox.height, width: r.rect.w * pageBox.width, height: r.rect.h * pageBox.height }}
        />
      ))}
      {drag && (
        <span
          aria-hidden
          className="pointer-events-none absolute border-2 border-dashed border-brand-600 bg-brand-500/10"
          style={{ left: rectOf(drag).x * pageBox.width, top: rectOf(drag).y * pageBox.height, width: rectOf(drag).w * pageBox.width, height: rectOf(drag).h * pageBox.height }}
        />
      )}
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// One edit on the page

type Corner = 'nw' | 'ne' | 'sw' | 'se'

function BoxView({
  b,
  pageBox,
  size,
  selected,
  editing,
  onSelect,
  onEdit,
  onBegin,
  onLive,
  onChange,
  onRemove,
}: {
  b: EditBox
  pageBox: { width: number; height: number }
  size: PageSize
  selected: boolean
  editing: boolean
  onSelect: () => void
  onEdit: (on: boolean) => void
  onBegin: () => void
  onLive: (rect: NormRect) => void
  onChange: (patch: Partial<EditBox>, key?: string) => void
  onRemove: () => void
}) {
  const drag = useRef<{ mode: 'move' | Corner; sx: number; sy: number; orig: NormRect; moved: boolean } | null>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const pxPerPt = pageBox.width / size.w
  const layout = useMemo(() => layoutText(b, size.w, size.h), [b, size])
  const minW = 8 / size.w
  const minH = 8 / size.h

  // Focus the editor once the click that created or opened it has finished.
  useEffect(() => {
    if (!editing) return
    const t = setTimeout(() => areaRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [editing])

  const start = (e: React.PointerEvent, m: 'move' | Corner) => {
    e.stopPropagation()
    onSelect()
    if (editing && m === 'move') return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { mode: m, sx: e.clientX, sy: e.clientY, orig: b.rect, moved: false }
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.sx) / pageBox.width
    const dy = (e.clientY - d.sy) / pageBox.height
    if (!d.moved) {
      if (Math.abs(dx * pageBox.width) + Math.abs(dy * pageBox.height) < 3) return
      d.moved = true
      onBegin()
    }
    const o = d.orig
    if (d.mode === 'move') return onLive({ ...o, x: clamp(o.x + dx, 0, 1 - o.w), y: clamp(o.y + dy, 0, 1 - o.h) })
    let { x, y, w, h } = o
    if (d.mode.includes('w')) {
      x = clamp(o.x + dx, 0, o.x + o.w - minW)
      w = o.x + o.w - x
    } else w = clamp(o.w + dx, minW, 1 - o.x)
    if (d.mode.includes('n')) {
      y = clamp(o.y + dy, 0, o.y + o.h - minH)
      h = o.y + o.h - y
    } else h = clamp(o.h + dy, minH, 1 - o.y)
    onLive({ x, y, w, h })
  }
  const end = () => {
    drag.current = null
  }

  const setText = (text: string) => {
    // Grow the box as you type so new lines stay visible.
    const fit = fittedHeight({ ...b, text }, size.w, size.h)
    onChange({ text, rect: fit > b.rect.h ? { ...b.rect, h: Math.min(fit, 1 - b.rect.y) } : b.rect }, `text-${b.id}`)
  }

  const s = b.style
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${b.text.trim() ? `Text “${b.text.trim().slice(0, 40)}”` : 'Cover'}${b.fill && b.text.trim() ? ' over a cover' : ''}. Arrow keys move, Enter edits, Delete removes.`}
      data-testid="edit-box"
      className={cn(
        'absolute z-[6] touch-none outline-none',
        editing ? 'cursor-text' : 'cursor-move',
        selected ? 'ring-2 ring-brand-600' : 'ring-1 ring-dashed ring-brand-300/80 hover:ring-brand-500'
      )}
      style={{ left: b.rect.x * pageBox.width, top: b.rect.y * pageBox.height, width: b.rect.w * pageBox.width, height: b.rect.h * pageBox.height, background: b.fill ?? undefined }}
      onPointerDown={(e) => start(e, 'move')}
      onPointerMove={move}
      onPointerUp={end}
      onDoubleClick={() => onEdit(true)}
      onFocus={onSelect}
      onKeyDown={(e) => {
        if (editing) return
        const step = (e.shiftKey ? 10 : 1) / size.w
        const stepY = (e.shiftKey ? 10 : 1) / size.h
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          onRemove()
        } else if (e.key === 'Enter') {
          e.preventDefault()
          onEdit(true)
        } else {
          const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -stepY], ArrowDown: [0, stepY] }
          if (d[e.key]) {
            e.preventDefault()
            onChange({ rect: { ...b.rect, x: clamp(b.rect.x + d[e.key][0], 0, 1 - b.rect.w), y: clamp(b.rect.y + d[e.key][1], 0, 1 - b.rect.h) } }, `nudge-${b.id}`)
          }
        }
      }}
    >
      {editing ? (
        <textarea
          ref={areaRef}
          aria-label="Edit text in place"
          value={b.text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => {
            // Keep editing if focus only moved to this box itself.
            const box = e.currentTarget.parentElement
            if (e.relatedTarget && box?.contains(e.relatedTarget as Node)) return void areaRef.current?.focus()
            onEdit(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onEdit(false)
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent outline-none"
          style={{
            fontFamily: CSS_FONTS[s.font],
            fontSize: s.size * pxPerPt,
            lineHeight: s.lineHeight,
            fontWeight: s.bold ? 700 : 400,
            fontStyle: s.italic ? 'italic' : 'normal',
            color: s.color,
            textAlign: s.align,
            padding: TEXT_PAD * pxPerPt,
            paddingTop: TEXT_PAD * pxPerPt + s.size * pxPerPt * (0.8 - 0.5 * s.lineHeight + 0.15),
          }}
        />
      ) : (
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${b.rect.w * size.w} ${b.rect.h * size.h}`} preserveAspectRatio="none">
          {layout.lines.map((l, i) => (
            <text
              key={i}
              x={l.x}
              y={l.baseline}
              fill={s.color}
              fontFamily={CSS_FONTS[s.font]}
              fontSize={s.size}
              fontWeight={s.bold ? 700 : 400}
              fontStyle={s.italic ? 'italic' : 'normal'}
              style={{ whiteSpace: 'pre' }}
            >
              {l.text}
            </text>
          ))}
          {!b.text && !b.fill && (
            <text x={TEXT_PAD} y={TEXT_PAD + s.size * 0.8} fill="#9CA3AF" fontFamily={CSS_FONTS.sans} fontSize={s.size}>
              Type text
            </text>
          )}
        </svg>
      )}
      {layout.overflow && !editing && <span aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 bg-amber-500" title="Text doesn’t fit" />}
      {selected && !editing && (
        <>
          <Handle corner="nw" onDown={(e) => start(e, 'nw')} onMove={move} onUp={end} />
          <Handle corner="ne" onDown={(e) => start(e, 'ne')} onMove={move} onUp={end} />
          <Handle corner="sw" onDown={(e) => start(e, 'sw')} onMove={move} onUp={end} />
          <Handle corner="se" onDown={(e) => start(e, 'se')} onMove={move} onUp={end} />
        </>
      )}
    </div>
  )
}

/** A corner resize handle. */
function Handle({ corner: c, onDown, onMove, onUp }: { corner: Corner; onDown: (e: React.PointerEvent) => void; onMove: (e: React.PointerEvent) => void; onUp: () => void }) {
  return (
    <span
      aria-hidden
      data-handle={c}
      className={cn(
        'absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-600 shadow',
        c === 'nw' && '-left-2 -top-2 cursor-nwse-resize',
        c === 'ne' && '-right-2 -top-2 cursor-nesw-resize',
        c === 'sw' && '-bottom-2 -left-2 cursor-nesw-resize',
        c === 'se' && '-bottom-2 -right-2 cursor-nwse-resize'
      )}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    />
  )
}

// ---------------------------------------------------------------------------
// Properties of the selected edit

function Properties({
  b,
  size,
  onChange,
  onRemove,
  onMatchCover,
}: {
  b: EditBox
  size: PageSize
  onChange: (patch: Partial<EditBox>, key?: string) => void
  onRemove: () => void
  onMatchCover: () => void
}) {
  const s = b.style
  const setStyle = (patch: Partial<TextStyle>, key?: string) => onChange({ style: { ...s, ...patch } }, key)
  const layout = layoutText(b, size.w, size.h)
  const pt = (v: number, total: number) => Math.round(v * total * 10) / 10
  const setRect = (k: 'x' | 'y' | 'w' | 'h', value: number) => {
    const total = k === 'x' || k === 'w' ? size.w : size.h
    const v = value / total
    const r = { ...b.rect }
    if (k === 'x') r.x = clamp(v, 0, 1 - r.w)
    if (k === 'y') r.y = clamp(v, 0, 1 - r.h)
    if (k === 'w') r.w = clamp(v, 8 / size.w, 1 - r.x)
    if (k === 'h') r.h = clamp(v, 8 / size.h, 1 - r.y)
    onChange({ rect: r }, `rect-${k}-${b.id}`)
  }
  return (
    <div className="panel space-y-4 p-4" data-testid="properties">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink">Selected edit · page {b.page + 1}</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Delete this edit" title="Delete (Delete key)" onClick={onRemove}>
          <Trash2 aria-hidden className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <label htmlFor="edit-text" className="field-label text-xs">
          Text
        </label>
        <textarea id="edit-text" rows={3} className="field" value={b.text} onChange={(e) => onChange({ text: e.target.value }, `text-${b.id}`)} placeholder="Leave empty for a cover only" />
      </div>
      <div className="grid grid-cols-[1fr_5rem] gap-2">
        <div>
          <label htmlFor="edit-font" className="field-label text-xs">
            Font
          </label>
          <select id="edit-font" className="field" value={s.font} onChange={(e) => setStyle({ font: e.target.value as FontFamily })}>
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="edit-size" className="field-label text-xs">
            Size (pt)
          </label>
          <input id="edit-size" type="number" min={4} max={144} step={0.5} className="field" value={s.size} onChange={(e) => setStyle({ size: clamp(Number(e.target.value) || 4, 4, 144) }, `size-${b.id}`)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={s.bold ? 'dark' : 'secondary'} size="icon-sm" aria-label="Bold" aria-pressed={s.bold} onClick={() => setStyle({ bold: !s.bold })}>
          <Bold aria-hidden className="h-4 w-4" />
        </Button>
        <Button variant={s.italic ? 'dark' : 'secondary'} size="icon-sm" aria-label="Italic" aria-pressed={s.italic} onClick={() => setStyle({ italic: !s.italic })}>
          <Italic aria-hidden className="h-4 w-4" />
        </Button>
        <div className="flex rounded-lg border border-gray-300" role="radiogroup" aria-label="Alignment">
          {(
            [
              ['left', AlignLeft],
              ['center', AlignCenter],
              ['right', AlignRight],
            ] as const
          ).map(([a, Icon]) => (
            <button key={a} type="button" role="radio" aria-checked={s.align === a} aria-label={`Align ${a}`} onClick={() => setStyle({ align: a })} className={cn('flex h-9 w-9 items-center justify-center first:rounded-l-lg last:rounded-r-lg', s.align === a ? 'bg-ink text-white' : 'text-ink-soft hover:bg-gray-50')}>
              <Icon aria-hidden className="h-4 w-4" />
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-ink-soft">
          Colour
          <input type="color" aria-label="Text colour" className="h-9 w-11 cursor-pointer rounded border border-gray-300 bg-white" value={s.color} onChange={(e) => setStyle({ color: e.target.value }, `colour-${b.id}`)} />
        </label>
      </div>
      <div>
        <label htmlFor="edit-spacing" className="field-label text-xs">
          Line spacing
        </label>
        <select id="edit-spacing" className="field" value={s.lineHeight} onChange={(e) => setStyle({ lineHeight: Number(e.target.value) })}>
          {[1, 1.15, 1.25, 1.5, 2].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="rounded-xl border border-gray-200 p-3">
        <legend className="px-1 text-xs font-semibold text-ink-soft">Cover underneath</legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!b.fill} onChange={(e) => onChange({ fill: e.target.checked ? '#ffffff' : null })} />
          Hide what’s underneath with a solid colour
        </label>
        {b.fill && (
          <div className="mt-2 flex items-center gap-2">
            <input type="color" aria-label="Cover colour" className="h-9 w-11 cursor-pointer rounded border border-gray-300 bg-white" value={b.fill} onChange={(e) => onChange({ fill: e.target.value }, `fill-${b.id}`)} />
            <Button variant="secondary" size="xs" onClick={onMatchCover}>
              <Pipette aria-hidden className="h-4 w-4" />
              Match page colour
            </Button>
          </div>
        )}
      </fieldset>
      <div>
        <p className="field-label text-xs">Position and size (pt)</p>
        <div className="mt-1 grid grid-cols-4 gap-2">
          {(
            [
              ['x', 'X', b.rect.x, size.w],
              ['y', 'Y', b.rect.y, size.h],
              ['w', 'W', b.rect.w, size.w],
              ['h', 'H', b.rect.h, size.h],
            ] as const
          ).map(([k, label, v, total]) => (
            <label key={k} className="text-xs text-ink-muted">
              {label}
              <input type="number" step={1} className="field mt-0.5 px-2" value={pt(v, total)} onChange={(e) => setRect(k, Number(e.target.value) || 0)} />
            </label>
          ))}
        </div>
        <Button variant="ghost" size="xs" className="mt-2" onClick={() => onChange({ rect: { ...b.rect, h: Math.min(fittedHeight(b, size.w, size.h), 1 - b.rect.y) } })} disabled={!b.text.trim()}>
          Fit height to text
        </Button>
      </div>
      {layout.overflow && <Alert tone="warning">The text is taller than its box, so it extends below it. Enlarge the box, make the text smaller, or use Fit height to text.</Alert>}
      {layout.unsupported && <Alert tone="warning">Some characters can’t be drawn with the standard PDF fonts and will appear as “?”. Latin-alphabet text is fully supported.</Alert>}
    </div>
  )
}

function Thumb({ doc, page, aspect, active, edits, onClick }: { doc: LoadedPdf['view'] & object; page: number; aspect: number; active: boolean; edits: number; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let created: string | null = null
    let cancelled = false
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || created) return
        io.disconnect()
        void renderThumbnail(doc, page, 110)
          .then((u) => {
            created = u
            if (cancelled) URL.revokeObjectURL(u)
            else setUrl(u)
          })
          .catch(() => {})
      },
      { rootMargin: '300px' }
    )
    io.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
      if (created) URL.revokeObjectURL(created)
    }
  }, [doc, page])
  return (
    <button ref={ref} type="button" onClick={onClick} aria-current={active ? 'page' : undefined} aria-label={`Page ${page}${edits ? `, ${edits} edit${edits === 1 ? '' : 's'}` : ''}`} className={cn('relative block w-full rounded-lg border-2 p-1', active ? 'border-brand-600' : 'border-transparent hover:border-gray-300')}>
      <span className="block w-full bg-gray-100" style={{ aspectRatio: `1 / ${aspect}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        {url && <img src={url} alt="" className="h-full w-full object-contain" />}
      </span>
      <span className="mt-1 block text-center text-xs font-semibold text-ink-soft">{page}</span>
      {edits > 0 && <span className="absolute right-1.5 top-1.5 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">{edits}</span>}
    </button>
  )
}
