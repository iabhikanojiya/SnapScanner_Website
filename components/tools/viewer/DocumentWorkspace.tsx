'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Eraser,
  Highlighter,
  MoveHorizontal,
  PenLine,
  RotateCw,
  Save,
  Search,
  TextCursor,
  Type,
  ImagePlus,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { PDFPageProxy } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Alert, Progress } from '@/components/tools/Feedback'
import PdfPageView from '@/components/tools/viewer/PdfPageView'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { SinglePdfInput, useSinglePdf, type LoadedPdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { downloadBlob, pdfBlob } from '@/lib/browser/download'
import { checkFile } from '@/lib/files/validate'
import { decodeImage, encodePixels } from '@/lib/image/browser'
import { baseName } from '@/lib/files/validate'
import { handOff } from '@/lib/handoff'
import { applyOverlays, type Overlay, type RGB } from '@/lib/pdf/operations'
import { mergeLineRects } from '@/lib/pdf/rects'
import { buildIndex, findInPage, matchRects, type Match, type PageTextIndex } from '@/lib/pdf/search'
import { newId } from '@/lib/storage/db'
import { TOOLS, type ToolId } from '@/lib/tools'
import { cn } from '@/lib/utils'

const PT_TO_PX = 4 / 3
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

type Mode = 'read' | 'annotate'
type AnnotateTool = 'text' | 'marker' | 'pen' | 'note' | 'image'

const COLORS: { name: string; rgb: RGB; css: string }[] = [
  { name: 'Yellow', rgb: [1, 0.86, 0.1], css: '#FFDB1A' },
  { name: 'Green', rgb: [0.45, 0.9, 0.35], css: '#73E659' },
  { name: 'Pink', rgb: [1, 0.45, 0.7], css: '#FF73B3' },
  { name: 'Blue', rgb: [0.35, 0.7, 1], css: '#59B3FF' },
  { name: 'Red', rgb: [0.85, 0.15, 0.15], css: '#D92626' },
]

type Mark = Overlay & { id: string }

const ACTIONS: ToolId[] = ['sign-pdf', 'compress-pdf', 'lock-pdf', 'split-pdf']

export default function DocumentWorkspace({ initialMode }: { initialMode: Mode }) {
  const state = useSinglePdf(initialMode === 'read' ? 'pdf-reader' : 'annotate-pdf', { render: true, unlockEncrypted: true })
  const { pdf } = state
  if (!pdf?.view) return <SinglePdfInput state={state} hint="Drop a PDF here to open it, or choose one from your device." />
  return <Workspace key={pdf.id} pdf={pdf} initialMode={initialMode} onClose={state.reset} />
}

function Workspace({ pdf, initialMode, onClose }: { pdf: LoadedPdf; initialMode: Mode; onClose: () => void }) {
  const doc = pdf.view!
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<PDFPageProxy[]>([])
  const [containerWidth, setContainerWidth] = useState(800)
  const [zoom, setZoom] = useState<number | 'fit'>('fit')
  const [rotation, setRotation] = useState(0)
  const [current, setCurrent] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const visibility = useRef(new Map<number, number>())
  const [mode, setMode] = useState<Mode>(initialMode)

  // Search
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [active, setActive] = useState(0)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [indexes, setIndexes] = useState<Map<number, PageTextIndex>>(() => new Map())

  // Annotations
  const [tool, setTool] = useState<AnnotateTool>('text')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const imageInput = useRef<HTMLInputElement>(null)

  useEffect(() => () => Object.values(imageUrls).forEach((u) => URL.revokeObjectURL(u)), [imageUrls])


  const [color, setColor] = useState(COLORS[0])
  const [marks, setMarks] = useState<Mark[]>([])
  const [drawing, setDrawing] = useState<{ page: number; points: { x: number; y: number }[] } | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultFile | null>(null)
  const [hint, setHint] = useState<string | null>(null)

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
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth))
    ro.observe(el)
    setContainerWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Annotation coordinates are in the page's own orientation.
  const viewRotation = mode === 'annotate' ? 0 : rotation

  const sizes = useMemo(
    () =>
      pages.map((p) => {
        const vp = p.getViewport({ scale: 1, rotation: p.rotate + viewRotation })
        return { w: vp.width, h: vp.height }
      }),
    [pages, viewRotation]
  )
  const maxWidthPt = Math.max(1, ...sizes.map((s) => s.w))

  const addImage = async (file: File) => {
    try {
      await checkFile(file, 'image')
      const px = await decodeImage(file, file.name, 1600)
      const png = await encodePixels(px, 'image/png')
      const id = newId()
      const page = current - 1
      const pageSize = sizes[page]
      const w = 0.3
      const h = pageSize ? (w * pageSize.w * (px.height / px.width)) / pageSize.h : 0.2
      const bytes = new Uint8Array(await png.arrayBuffer())
      setImageUrls((cur) => ({ ...cur, [id]: URL.createObjectURL(png) }))
      setMarks((cur) => [...cur, { id, kind: 'image', page, rect: { x: 0.35, y: 0.3, w, h }, png: bytes }])
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const fitZoom = Math.max(0.2, (containerWidth - 32) / (maxWidthPt * PT_TO_PX))
  const z = zoom === 'fit' ? fitZoom : zoom

  const onVisible = useCallback((page: number, ratio: number) => {
    visibility.current.set(page, ratio)
    let best = 1
    let bestRatio = -1
    for (const [p, r] of visibility.current) if (r > bestRatio || (r === bestRatio && p < best)) [best, bestRatio] = [p, r]
    setCurrent(best)
    setPageInput(String(best))
  }, [])

  const goTo = (n: number, offset = 0) => {
    const page = Math.min(Math.max(1, n), doc.numPages)
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-page="${page}"]`)
    if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 16 + offset, behavior: 'auto' })
  }

  const stepZoom = (dir: 1 | -1) => {
    const next = dir > 0 ? ZOOM_STEPS.find((s) => s > z + 0.01) : [...ZOOM_STEPS].reverse().find((s) => s < z - 0.01)
    setZoom(next ?? (dir > 0 ? ZOOM_STEPS[ZOOM_STEPS.length - 1] : ZOOM_STEPS[0]))
  }

  // --- Search ---------------------------------------------------------------
  const runSearch = async () => {
    const q = query.trim()
    if (!q) return setMatches([])
    setSearching(true)
    const found: Match[] = []
    const map = new Map(indexes)
    for (let i = 0; i < pages.length; i++) {
      let index = map.get(i)
      if (!index) {
        const tc = await pages[i].getTextContent()
        index = buildIndex(tc.items.filter((it) => 'str' in it) as never)
        map.set(i, index)
      }
      found.push(...findInPage(index, q, i))
    }
    setIndexes(map)
    setMatches(found)
    setActive(0)
    setSearching(false)
    setSearched(true)
    if (found.length) jumpToMatch(found[0], map)
  }

  const marksFor = (pageIndex: number, cssScale: number) => {
    const page = pages[pageIndex]
    const index = indexes.get(pageIndex)
    if (!page || !index) return []
    const vp = page.getViewport({ scale: cssScale, rotation: page.rotate + viewRotation })
    return matches.flatMap((m, mi) =>
      m.page !== pageIndex
        ? []
        : matchRects(index, m).map((r) => {
            const [x1, y1, x2, y2] = toViewportRect(vp, r)
            return { left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1), active: mi === active }
          })
    )
  }

  const jumpToMatch = (m: Match, map = indexes) => {
    const page = pages[m.page]
    const index = map.get(m.page)
    if (!page || !index) return
    const cssScale = z * PT_TO_PX
    const vp = page.getViewport({ scale: cssScale, rotation: page.rotate + viewRotation })
    const r = matchRects(index, m)[0]
    const vr = r ? toViewportRect(vp, r) : null
    const top = vr ? Math.min(vr[1], vr[3]) : 0
    goTo(m.page + 1, Math.max(0, top - 120))
  }

  const nextMatch = (dir: 1 | -1) => {
    if (!matches.length) return
    const i = (active + dir + matches.length) % matches.length
    setActive(i)
    jumpToMatch(matches[i])
  }

  // --- Annotation -----------------------------------------------------------
  // Selecting text with the Highlight tool turns the selection into highlights.
  useEffect(() => {
    if (mode !== 'annotate' || tool !== 'text') return
    const highlightSelection = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !scrollRef.current) return
      const rects: DOMRect[] = []
      for (let i = 0; i < sel.rangeCount; i++) rects.push(...Array.from(sel.getRangeAt(i).getClientRects()))
      const added: Mark[] = []
      scrollRef.current.querySelectorAll<HTMLElement>('[data-page]').forEach((el) => {
        const box = el.getBoundingClientRect()
        const inPage = rects
          .filter((r) => r.top + r.height / 2 >= box.top && r.top + r.height / 2 <= box.bottom && r.width > 0)
          .map((r) => ({ left: r.left - box.left, top: r.top - box.top, right: r.right - box.left, bottom: r.bottom - box.top }))
        const merged = mergeLineRects(inPage)
        if (merged.length)
          added.push({
            id: newId(),
            kind: 'highlight',
            page: Number(el.dataset.page) - 1,
            color: color.rgb,
            rects: merged.map((r) => ({ x: r.left / box.width, y: r.top / box.height, w: (r.right - r.left) / box.width, h: (r.bottom - r.top) / box.height })),
          })
      })
      sel.removeAllRanges()
      if (added.length) {
        setMarks((cur) => [...cur, ...added])
        setHint(null)
      }
    }
    const onUp = () => setTimeout(highlightSelection, 0)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('keyup', onUp)
    return () => {
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('keyup', onUp)
    }
  }, [mode, tool, color])

  const pointOf = (e: React.PointerEvent<HTMLElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    return { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height }
  }

  const finishStroke = () => {
    if (!drawing) return
    const ink: Mark = {
      id: newId(),
      kind: 'ink',
      page: drawing.page,
      points: drawing.points,
      color: color.rgb,
      width: tool === 'marker' ? 0.022 : 0.004,
      opacity: tool === 'marker' ? 0.4 : 1,
    }
    setMarks((cur) => [...cur, ink])
    setDrawing(null)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const bytes = await applyOverlays({ name: pdf.name, bytes: pdf.bytes, password: pdf.password }, marks.map(toOverlay))
      setResult({ blob: pdfBlob(bytes), name: `${baseName(pdf.name)}_annotated.pdf`, pageCount: pdf.pageCount })
      focusResult()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const openIn = (id: ToolId) => {
    const t = TOOLS.find((x) => x.id === id)!
    handOff(id, [new File([pdf.bytes as BlobPart], pdf.name, { type: 'application/pdf' })])
    router.push(t.href)
  }

  if (result) {
    return (
      <ResultPanel
        title="Your annotated PDF is ready"
        summary={`${marks.length} annotation${marks.length === 1 ? '' : 's'} saved into a new copy. The original is unchanged.`}
        files={[result]}
        source="annotate-pdf"
        resetLabel="Back to the document"
        onReset={() => setResult(null)}
      />
    )
  }

  const cssScale = z * PT_TO_PX
  const annotating = mode === 'annotate'

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white" data-testid="workspace">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 px-3 py-2">
        <p className="mr-auto min-w-0 max-w-[16rem] truncate text-sm font-semibold text-ink" title={pdf.name}>
          {pdf.name}
        </p>
        <div className="flex items-center gap-1" role="group" aria-label="Pages">
          <Button variant="ghost" size="icon-sm" aria-label="Previous page" onClick={() => goTo(current - 1)} disabled={current <= 1}>
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </Button>
          <label className="sr-only" htmlFor="page-number">
            Page number
          </label>
          <input
            id="page-number"
            className="h-9 w-12 rounded-lg border border-gray-300 text-center text-sm"
            value={pageInput}
            inputMode="numeric"
            onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && goTo(Number(pageInput) || 1)}
            onBlur={() => setPageInput(String(current))}
          />
          <span className="text-sm text-ink-muted" data-testid="page-count">
            / {doc.numPages}
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Next page" onClick={() => goTo(current + 1)} disabled={current >= doc.numPages}>
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => stepZoom(-1)}>
            <ZoomOut aria-hidden className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-sm tabular-nums text-ink-soft" data-testid="zoom-level">
            {Math.round(z * 100)}%
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => stepZoom(1)}>
            <ZoomIn aria-hidden className="h-4 w-4" />
          </Button>
          <Button variant={zoom === 'fit' ? 'secondary' : 'ghost'} size="xs" onClick={() => setZoom('fit')} aria-pressed={zoom === 'fit'}>
            <MoveHorizontal aria-hidden className="h-4 w-4" />
            Fit width
          </Button>
          {!annotating && (
            <Button variant="ghost" size="icon-sm" aria-label="Rotate view" onClick={() => setRotation((r) => (r + 90) % 360)}>
              <RotateCw aria-hidden className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex rounded-lg border border-gray-300 p-0.5" role="group" aria-label="Mode">
          {(['read', 'annotate'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn('rounded-md px-3 py-1 text-sm font-semibold', mode === m ? 'bg-ink text-white' : 'text-ink-soft hover:bg-gray-100')}
            >
              {m === 'read' ? 'Read' : 'Annotate'}
            </button>
          ))}
        </div>
      </div>

      {/* Second row: search, or annotation tools */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <form
          role="search"
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            if (matches.length && searched) nextMatch(1)
            else void runSearch()
          }}
        >
          <label htmlFor="pdf-search" className="sr-only">
            Search text
          </label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              id="pdf-search"
              type="search"
              placeholder="Search text"
              className="h-9 w-44 rounded-lg border border-gray-300 bg-white pl-8 pr-2 text-sm sm:w-56"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSearched(false)
                setMatches([])
              }}
            />
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous match" disabled={!matches.length} onClick={() => nextMatch(-1)}>
            <ChevronUp aria-hidden className="h-4 w-4" />
          </Button>
          <Button type="submit" variant="ghost" size="icon-sm" aria-label="Next match" disabled={!query.trim()}>
            <ChevronDown aria-hidden className="h-4 w-4" />
          </Button>
          <span className="text-xs text-ink-muted" role="status" data-testid="search-status">
            {searching ? 'Searching…' : searched ? (matches.length ? `${active + 1} of ${matches.length}` : 'No matches') : ''}
          </span>
        </form>

        {annotating ? (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <div className="flex rounded-lg border border-gray-300 bg-white p-0.5" role="group" aria-label="Annotation tool">
              {(
                [
                  ['text', 'Highlight text', TextCursor],
                  ['marker', 'Marker', Highlighter],
                  ['pen', 'Pen', PenLine],
                  ['note', 'Text box', Type],
                  ['image', 'Image', ImagePlus],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={tool === id}
                  onClick={() => {
                    setTool(id)
                    setHint(
                      id === 'text'
                        ? 'Select text on the page to highlight it.'
                        : id === 'note'
                          ? 'Click on a page to add a text box. Drag a box to move it.'
                          : id === 'image'
                            ? 'Choose an image; it’s added to the page you’re viewing. Drag to move, use the corner to resize.'
                            : 'Draw on the page with your mouse, finger or stylus.'
                    )
                    if (id === 'image') imageInput.current?.click()
                  }}
                  className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold', tool === id ? 'bg-brand-50 text-brand-800' : 'text-ink-soft hover:bg-gray-100')}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Colour">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  role="radio"
                  aria-checked={color.name === c.name}
                  aria-label={c.name}
                  onClick={() => setColor(c)}
                  className={cn('h-7 w-7 rounded-full border-2', color.name === c.name ? 'border-ink' : 'border-white ring-1 ring-gray-300')}
                  style={{ background: c.css }}
                />
              ))}
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Undo" disabled={!marks.length} onClick={() => setMarks((m) => m.slice(0, -1))}>
              <Undo2 aria-hidden className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Clear all annotations" disabled={!marks.length} onClick={() => setConfirmClear(true)}>
              <Eraser aria-hidden className="h-4 w-4" />
            </Button>
            <Button size="xs" onClick={save} disabled={!marks.length || saving}>
              <Save aria-hidden className="h-4 w-4" />
              Save annotated PDF
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
            {ACTIONS.map((id) => (
              <Button key={id} variant="ghost" size="xs" onClick={() => openIn(id)}>
                {TOOLS.find((t) => t.id === id)!.name}
              </Button>
            ))}
            <Button variant="secondary" size="xs" onClick={() => downloadBlob(pdfBlob(pdf.bytes), pdf.name)}>
              <Download aria-hidden className="h-4 w-4" />
              Download
            </Button>
            <Button variant="ghost" size="xs" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>

      {(hint && annotating) || error || saving ? (
        <div className="space-y-2 border-b border-gray-200 px-3 py-2">
          {hint && annotating && <p className="text-sm text-ink-muted">{hint}</p>}
          {saving && <Progress label="Saving annotations" done={0} total={0} />}
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      ) : null}

      <div className="flex">
        {/* Page rail */}
        <nav aria-label="Page thumbnails" className="hidden w-28 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-2 lg:block" style={{ height: 'calc(100dvh - 15rem)' }}>
          <ol className="space-y-2">
            {sizes.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => goTo(i + 1)}
                  aria-label={`Go to page ${i + 1}`}
                  aria-current={current === i + 1 ? 'page' : undefined}
                  className={cn('block w-full rounded-md p-1 text-center text-xs', current === i + 1 ? 'bg-brand-50 font-bold text-brand-800 ring-2 ring-brand-600' : 'text-ink-muted hover:bg-white')}
                >
                  <PdfPageView doc={doc} pageNumber={i + 1} width={80} aspect={s.h / s.w} rotation={viewRotation} textLayer={false} className="mx-auto shadow-none ring-1 ring-gray-200" />
                  <span className="mt-1 block">{i + 1}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div
          ref={scrollRef}
          className={cn('relative min-w-0 flex-1 overflow-auto bg-gray-100 px-4 py-4', annotating && tool !== 'text' && 'no-text-select')}
          style={{ height: 'calc(100dvh - 15rem)', minHeight: '24rem' }}
        >
          <div className="mx-auto flex w-max min-w-full flex-col items-center gap-4">
            {sizes.map((s, i) => {
              const width = Math.round(s.w * cssScale)
              return (
                <PdfPageView
                  key={i}
                  doc={doc}
                  pageNumber={i + 1}
                  width={width}
                  aspect={s.h / s.w}
                  rotation={viewRotation}
                  marks={matches.length ? marksFor(i, cssScale) : undefined}
                  onVisible={onVisible}
                >
                  {(box) => (
                    <>
                      <svg className="pointer-events-none absolute inset-0 z-[3] h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
                        {marks
                          .filter((m) => m.page === i)
                          .map((m) =>
                            m.kind === 'highlight' ? (
                              m.rects.map((r, j) => (
                                <rect key={`${m.id}-${j}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={rgbCss(m.color)} opacity={0.4} style={{ mixBlendMode: 'multiply' }} />
                              ))
                            ) : m.kind === 'ink' ? (
                              <polyline
                                key={m.id}
                                points={m.points.map((p) => `${p.x},${p.y}`).join(' ')}
                                fill="none"
                                stroke={rgbCss(m.color)}
                                strokeOpacity={m.opacity ?? 1}
                                strokeWidth={m.width * box.width}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                                style={{ mixBlendMode: (m.opacity ?? 1) < 1 ? 'multiply' : 'normal' }}
                              />
                            ) : null
                          )}
                        {drawing?.page === i && (
                          <polyline
                            points={drawing.points.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke={color.css}
                            strokeOpacity={tool === 'marker' ? 0.4 : 1}
                            strokeWidth={(tool === 'marker' ? 0.022 : 0.004) * box.width}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        )}
                      </svg>
                      <OverlayItems
                        marks={marks.filter((m) => m.page === i && (m.kind === 'text' || m.kind === 'image'))}
                        box={box}
                        interactive={annotating && (tool === 'note' || tool === 'image')}
                        editingId={editingId}
                        imageUrls={imageUrls}
                        onChange={(id, patch) => setMarks((cur) => cur.map((m) => (m.id === id ? ({ ...m, ...patch } as Mark) : m)))}
                        onEdit={setEditingId}
                        onRemove={(id) => setMarks((cur) => cur.filter((m) => m.id !== id))}
                      />
                      {annotating && tool === 'note' && (
                        <div
                          className="absolute inset-0 z-[4] cursor-text"
                          data-testid={`note-layer-${i + 1}`}
                          onClick={(e) => {
                            if (e.target !== e.currentTarget) return
                            const p = pointOf(e as unknown as React.PointerEvent<HTMLElement>)
                            const id = newId()
                            setMarks((cur) => [...cur.filter((m) => !(m.kind === 'text' && !m.text.trim())), { id, kind: 'text', page: i, x: p.x, y: p.y, text: '', size: 0.022, color: color.rgb }])
                            setEditingId(id)
                          }}
                        />
                      )}
                      {annotating && (tool === 'marker' || tool === 'pen') && (
                        <div
                          className="absolute inset-0 z-[4] cursor-crosshair touch-none"
                          data-testid={`draw-layer-${i + 1}`}
                          onPointerDown={(e) => {
                            e.currentTarget.setPointerCapture(e.pointerId)
                            setDrawing({ page: i, points: [pointOf(e)] })
                          }}
                          onPointerMove={(e) => {
                            if (!drawing || drawing.page !== i) return
                            const p = pointOf(e)
                            const last = drawing.points[drawing.points.length - 1]
                            if (Math.hypot(p.x - last.x, p.y - last.y) > 0.002) setDrawing({ page: i, points: [...drawing.points, p] })
                          }}
                          onPointerUp={finishStroke}
                          onPointerCancel={() => setDrawing(null)}
                        />
                      )}
                    </>
                  )}
                </PdfPageView>
              )
            })}
          </div>
        </div>
      </div>

      <input
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="overlay-image-input"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void addImage(f)
        }}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Remove all annotations?"
        description="Highlights and drawings you haven’t saved will be removed. This can’t be undone."
        confirmLabel="Remove all"
        destructive
        onConfirm={() => {
          setMarks([])
          setConfirmClear(false)
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}

/** Text boxes and images placed on a page: editable, draggable and (images) resizable. */
function OverlayItems({
  marks,
  box,
  interactive,
  editingId,
  imageUrls,
  onChange,
  onEdit,
  onRemove,
}: {
  marks: Mark[]
  box: { width: number; height: number }
  interactive: boolean
  editingId: string | null
  imageUrls: Record<string, string>
  onChange: (id: string, patch: Partial<Mark>) => void
  onEdit: (id: string | null) => void
  onRemove: (id: string) => void
}) {
  const drag = useRef<{ id: string; mode: 'move' | 'resize'; sx: number; sy: number; orig: Mark } | null>(null)
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.sx) / box.width
    const dy = (e.clientY - d.sy) / box.height
    const o = d.orig
    if (o.kind === 'text') onChange(d.id, { x: Math.min(0.98, Math.max(0, o.x + dx)), y: Math.min(0.98, Math.max(0, o.y + dy)) } as Partial<Mark>)
    if (o.kind === 'image') {
      if (d.mode === 'move') onChange(d.id, { rect: { ...o.rect, x: Math.min(1 - o.rect.w, Math.max(0, o.rect.x + dx)), y: Math.min(1 - o.rect.h, Math.max(0, o.rect.y + dy)) } } as Partial<Mark>)
      else {
        const w = Math.min(1 - o.rect.x, Math.max(0.03, o.rect.w + dx))
        onChange(d.id, { rect: { ...o.rect, w, h: (o.rect.h * w) / o.rect.w } } as Partial<Mark>)
      }
    }
  }
  return (
    <>
      {marks.map((m) => {
        if (m.kind === 'text') {
          const style: React.CSSProperties = { left: `${m.x * 100}%`, top: `${m.y * 100}%`, fontSize: m.size * box.width, color: rgbCss(m.color), lineHeight: 1.2, fontFamily: 'Arial, Helvetica, sans-serif' }
          if (editingId === m.id)
            return (
              <textarea
                key={m.id}
                autoFocus
                aria-label="Text box"
                data-testid="text-box-input"
                className="absolute z-[6] min-w-[8rem] resize rounded border border-brand-600 bg-white/90 p-0.5 outline-none"
                style={style}
                value={m.text}
                rows={Math.max(1, m.text.split('\n').length)}
                onChange={(e) => onChange(m.id, { text: e.target.value } as Partial<Mark>)}
                onBlur={() => {
                  onEdit(null)
                  if (!m.text.trim()) onRemove(m.id)
                }}
                onKeyDown={(e) => e.key === 'Escape' && (e.currentTarget as HTMLTextAreaElement).blur()}
              />
            )
          return (
            <div
              key={m.id}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `Text box: ${m.text}. Press Enter to edit, Delete to remove.` : undefined}
              data-testid="text-box"
              className={cn('absolute z-[5] whitespace-pre', interactive ? 'cursor-move rounded outline-1 outline-dashed outline-brand-300 hover:outline-brand-600' : 'pointer-events-none')}
              style={style}
              onPointerDown={(e) => {
                if (!interactive) return
                e.currentTarget.setPointerCapture(e.pointerId)
                drag.current = { id: m.id, mode: 'move', sx: e.clientX, sy: e.clientY, orig: m }
              }}
              onPointerMove={move}
              onPointerUp={(e) => {
                const d = drag.current
                drag.current = null
                if (d && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3) onEdit(m.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEdit(m.id)
                if (e.key === 'Delete' || e.key === 'Backspace') onRemove(m.id)
              }}
            >
              {m.text}
            </div>
          )
        }
        if (m.kind === 'image')
          return (
            <div
              key={m.id}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? 'Placed image. Drag to move, Delete to remove.' : undefined}
              data-testid="placed-image"
              className={cn('absolute z-[5] touch-none', interactive ? 'cursor-move ring-1 ring-brand-300 hover:ring-brand-600' : 'pointer-events-none')}
              style={{ left: `${m.rect.x * 100}%`, top: `${m.rect.y * 100}%`, width: `${m.rect.w * 100}%`, height: `${m.rect.h * 100}%` }}
              onPointerDown={(e) => {
                if (!interactive) return
                e.currentTarget.setPointerCapture(e.pointerId)
                drag.current = { id: m.id, mode: 'move', sx: e.clientX, sy: e.clientY, orig: m }
              }}
              onPointerMove={move}
              onPointerUp={() => (drag.current = null)}
              onKeyDown={(e) => (e.key === 'Delete' || e.key === 'Backspace') && onRemove(m.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
              {imageUrls[m.id] && <img src={imageUrls[m.id]} alt="" className="pointer-events-none h-full w-full select-none" draggable={false} />}
              {interactive && (
                <span
                  aria-hidden
                  className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-white bg-brand-600 shadow"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    e.currentTarget.parentElement!.setPointerCapture(e.pointerId)
                    drag.current = { id: m.id, mode: 'resize', sx: e.clientX, sy: e.clientY, orig: m }
                  }}
                />
              )}
            </div>
          )
        return null
      })}
    </>
  )
}

function toOverlay({ id, ...overlay }: Mark): Overlay {
  void id
  return overlay as Overlay
}

/** Maps a PDF-space rectangle to viewport (CSS pixel) coordinates. */
function toViewportRect(vp: { convertToViewportPoint: (x: number, y: number) => number[] }, r: number[]) {
  const [x1, y1] = vp.convertToViewportPoint(r[0], r[1])
  const [x2, y2] = vp.convertToViewportPoint(r[2], r[3])
  return [x1, y1, x2, y2]
}

function rgbCss([r, g, b]: RGB) {
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`
}
