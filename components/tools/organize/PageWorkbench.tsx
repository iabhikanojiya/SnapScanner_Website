'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Copy, RotateCcw, RotateCw, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Progress } from '@/components/tools/Feedback'
import { PageThumbnail } from '@/components/tools/PdfThumbs'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import SortableList, { moveItem } from '@/components/tools/SortableList'
import { SinglePdfInput, useSinglePdf, type LoadedPdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { pdfBlob } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import { removePages, reorganizePdf, rotatePages } from '@/lib/pdf/edit'
import { formatPageRanges } from '@/lib/pdf/ranges'
import { cn } from '@/lib/utils'

export type WorkbenchMode = 'organize' | 'rotate' | 'remove'

const TOOL_FOR = { organize: 'organize-pdf', rotate: 'rotate-pdf', remove: 'remove-pages' } as const

interface Tile {
  key: string
  source: number
  rotate: number
}

/** Thumbnail grid for organizing, rotating or removing pages. */
export default function PageWorkbench({ mode }: { mode: WorkbenchMode }) {
  const state = useSinglePdf(TOOL_FOR[mode], { render: true, unlockEncrypted: true })
  if (!state.pdf?.view) return <SinglePdfInput state={state} />
  return <Workbench key={state.pdf.id} mode={mode} pdf={state.pdf} onClose={state.reset} />
}

function Workbench({ mode, pdf, onClose }: { mode: WorkbenchMode; pdf: LoadedPdf; onClose: () => void }) {
  const doc = pdf.view!
  const initial = useMemo(() => Array.from({ length: pdf.pageCount }, (_, i) => ({ key: `p${i}`, source: i, rotate: 0 })), [pdf.pageCount])
  const [tiles, setTiles] = useState<Tile[]>(initial)
  const [removed, setRemoved] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultFile | null>(null)
  const [dupCount, setDupCount] = useState(0)

  const rotateTile = (key: string, d: number) => setTiles((cur) => cur.map((t) => (t.key === key ? { ...t, rotate: (t.rotate + d + 360) % 360 } : t)))
  const rotateAll = (d: number) => setTiles((cur) => cur.map((t) => ({ ...t, rotate: (t.rotate + d + 360) % 360 })))
  const toggleRemove = (source: number) =>
    setRemoved((cur) => {
      const next = new Set(cur)
      if (next.has(source)) next.delete(source)
      else next.add(source)
      return next
    })

  const changed = mode === 'remove' ? removed.size > 0 : mode === 'rotate' ? tiles.some((t) => t.rotate) : JSON.stringify(tiles) !== JSON.stringify(initial)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const input = { name: pdf.name, bytes: pdf.bytes, password: pdf.password }
      let bytes: Uint8Array
      let pages: number
      if (mode === 'remove') {
        bytes = await removePages(input, [...removed])
        pages = pdf.pageCount - removed.size
      } else if (mode === 'rotate') {
        bytes = await rotatePages(input, Object.fromEntries(tiles.map((t) => [t.source, t.rotate])))
        pages = pdf.pageCount
      } else {
        bytes = await reorganizePdf(input, tiles.map(({ source, rotate }) => ({ source, rotate })))
        pages = tiles.length
      }
      const suffix = mode === 'remove' ? 'pages_removed' : mode === 'rotate' ? 'rotated' : 'organized'
      setResult({ blob: pdfBlob(bytes), name: `${baseName(pdf.name)}_${suffix}.pdf`, pageCount: pages })
      focusResult()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (result)
    return (
      <ResultPanel
        title={mode === 'remove' ? `${removed.size} page${removed.size === 1 ? '' : 's'} removed` : mode === 'rotate' ? 'Your pages are rotated' : 'Your PDF is organized'}
        summary={pdf.encrypted ? 'The new file isn’t password-protected.' : undefined}
        files={[result]}
        source={TOOL_FOR[mode]}
        resetLabel="Back to the pages"
        onReset={() => setResult(null)}
      />
    )

  const thumb = (t: Tile, index: number, handle?: React.ReactNode) => {
    const isRemoved = mode === 'remove' && removed.has(t.source)
    const aspectRotated = t.rotate % 180 !== 0
    return (
      <div className={cn('flex h-full flex-col rounded-xl border bg-white p-2', isRemoved ? 'border-brand-300 bg-brand-50' : 'border-gray-200')} data-testid="page-tile">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink-soft">{mode === 'organize' ? `${index + 1}` : `Page ${t.source + 1}`}</span>
          {handle}
        </div>
        <button
          type="button"
          disabled={mode !== 'remove'}
          aria-pressed={mode === 'remove' ? isRemoved : undefined}
          aria-label={mode === 'remove' ? `${isRemoved ? 'Keep' : 'Remove'} page ${t.source + 1}` : undefined}
          onClick={() => mode === 'remove' && toggleRemove(t.source)}
          className="relative mt-1 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-gray-100 enabled:cursor-pointer"
        >
          <div className="transition-transform" style={{ transform: `rotate(${t.rotate}deg)`, width: aspectRotated ? '70%' : '78%' }}>
            <PageThumbnail doc={doc} pageNumber={t.source + 1} width={150} className={cn('rounded border border-gray-200', isRemoved && 'opacity-40')} />
          </div>
          {isRemoved && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">Removed</span>
            </span>
          )}
        </button>
        {mode !== 'remove' && (
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-0.5">
            <Button variant="ghost" size="icon-sm" aria-label={`Rotate page ${index + 1} left`} onClick={() => rotateTile(t.key, -90)}>
              <RotateCcw aria-hidden className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Rotate page ${index + 1} right`} onClick={() => rotateTile(t.key, 90)}>
              <RotateCw aria-hidden className="h-4 w-4" />
            </Button>
            {mode === 'organize' && (
              <>
                <Button variant="ghost" size="icon-sm" aria-label={`Move page ${index + 1} earlier`} disabled={index === 0} onClick={() => setTiles((cur) => moveItem(cur, index, -1))}>
                  <ArrowLeft aria-hidden className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Move page ${index + 1} later`} disabled={index === tiles.length - 1} onClick={() => setTiles((cur) => moveItem(cur, index, 1))}>
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Duplicate page ${index + 1}`}
                  onClick={() => {
                    setDupCount((n) => n + 1)
                    setTiles((cur) => [...cur.slice(0, index + 1), { ...t, key: `d${dupCount}-${t.key}` }, ...cur.slice(index + 1)])
                  }}
                >
                  <Copy aria-hidden className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Delete page ${index + 1}`} disabled={tiles.length === 1} onClick={() => setTiles((cur) => cur.filter((x) => x.key !== t.key))}>
                  <Trash2 aria-hidden className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
        {t.rotate !== 0 && <p className="mt-1 text-center text-xs text-ink-muted">+{t.rotate}°</p>}
      </div>
    )
  }

  const grid = 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5'

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_19rem]">
      <section aria-labelledby="pages-heading" className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="pages-heading" className="font-bold text-ink">
            {mode === 'organize' ? `${tiles.length} pages` : `${pdf.pageCount} pages`}
          </h2>
          <p className="text-sm text-ink-muted">
            {mode === 'organize' ? 'Drag pages to reorder them.' : mode === 'rotate' ? 'Rotate single pages or all of them.' : 'Select the pages to remove.'}
          </p>
        </div>
        <div className="mt-4">
          {mode === 'organize' ? (
            <SortableList items={tiles} getId={(t) => t.key} onReorder={setTiles} layout="grid" handleLabel={(t) => `Reorder page from position ${tiles.indexOf(t) + 1}`} className={grid} renderItem={(t, i, h) => thumb(t, i, h)} />
          ) : (
            <ul className={grid}>
              {tiles.map((t, i) => (
                <li key={t.key}>{thumb(t, i)}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="panel space-y-3 p-5">
          <p className="truncate text-sm font-semibold text-ink">{pdf.name}</p>
          {mode !== 'remove' && (
            <div>
              <p className="field-label">All pages</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <Button variant="secondary" size="xs" onClick={() => rotateAll(-90)}>
                  <RotateCcw aria-hidden className="h-4 w-4" />
                  Left
                </Button>
                <Button variant="secondary" size="xs" onClick={() => rotateAll(90)}>
                  <RotateCw aria-hidden className="h-4 w-4" />
                  Right
                </Button>
                <Button variant="secondary" size="xs" onClick={() => rotateAll(180)}>
                  180°
                </Button>
              </div>
            </div>
          )}
          {mode === 'remove' && (
            <p className="text-sm text-ink-soft" role="status">
              {removed.size ? `Removing ${formatPageRanges([...removed])}. ${pdf.pageCount - removed.size} page${pdf.pageCount - removed.size === 1 ? '' : 's'} will remain.` : 'No pages selected.'}
            </p>
          )}
          {mode === 'remove' && removed.size === pdf.pageCount && <Alert tone="warning">You can’t remove every page. Keep at least one.</Alert>}
          <Button className="w-full" onClick={run} disabled={!changed || busy || (mode === 'remove' && removed.size === pdf.pageCount)}>
            {mode === 'remove' ? `Remove ${removed.size || ''} page${removed.size === 1 ? '' : 's'}`.replace('  ', ' ') : mode === 'rotate' ? 'Save rotation' : 'Save PDF'}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="xs"
              disabled={!changed}
              onClick={() => {
                setTiles(initial)
                setRemoved(new Set())
              }}
            >
              <Undo2 aria-hidden className="h-4 w-4" />
              Reset
            </Button>
            <Button variant="ghost" size="xs" onClick={onClose}>
              Choose another PDF
            </Button>
          </div>
        </div>
        {busy && <Progress label="Saving PDF" done={0} total={0} />}
        {error && <Alert tone="error">{error}</Alert>}
      </aside>
    </div>
  )
}
