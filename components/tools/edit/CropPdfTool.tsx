'use client'

import { useEffect, useRef, useState } from 'react'
import { Crop } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/tools/Feedback'
import PdfPageView from '@/components/tools/viewer/PdfPageView'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { SinglePdfInput, useSinglePdf, type LoadedPdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { pdfBlob } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import { cropPages } from '@/lib/pdf/edit'
import { parsePageRanges } from '@/lib/pdf/ranges'

/** Crop margins as fractions of the displayed page. */
interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

export default function CropPdfTool() {
  const state = useSinglePdf('crop-pdf', { render: true, unlockEncrypted: true })
  if (!state.pdf?.view) return <SinglePdfInput state={state} />
  return <Cropper key={state.pdf.id} pdf={state.pdf} />
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function Cropper({ pdf }: { pdf: LoadedPdf }) {
  const doc = pdf.view!
  const [pageNo, setPageNo] = useState(1)
  const [aspect, setAspect] = useState(1.414)
  const [m, setM] = useState<Margins>({ top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 })
  const [scope, setScope] = useState<'all' | 'this' | 'range'>('all')
  const [range, setRange] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultFile | null>(null)
  const drag = useRef<{ edge: keyof Margins; start: number; orig: number; size: number } | null>(null)

  useEffect(() => {
    void doc.getPage(pageNo).then((p) => {
      const vp = p.getViewport({ scale: 1 })
      setAspect(vp.height / vp.width)
    })
  }, [doc, pageNo])

  const width = 460
  const setEdge = (edge: keyof Margins, value: number) =>
    setM((cur) => {
      const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[edge] as keyof Margins
      return { ...cur, [edge]: clamp(value, 0, 0.95 - cur[opposite]) }
    })

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const pages = scope === 'all' ? undefined : scope === 'this' ? [pageNo - 1] : [...new Set(parsePageRanges(range, pdf.pageCount).flat())]
      const bytes = await cropPages({ name: pdf.name, bytes: pdf.bytes, password: pdf.password }, { x: m.left, y: m.top, w: 1 - m.left - m.right, h: 1 - m.top - m.bottom }, pages)
      setResult({ blob: pdfBlob(bytes), name: `${baseName(pdf.name)}_cropped.pdf`, pageCount: pdf.pageCount })
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
        title="Your pages are cropped"
        summary="The hidden margins are still in the file and can be restored by resetting the crop in another PDF editor."
        files={[result]}
        source="crop-pdf"
        resetLabel="Adjust the crop"
        onReset={() => setResult(null)}
      />
    )

  const handle = (edge: keyof Margins, style: React.CSSProperties, cursor: string) => (
    <button
      type="button"
      aria-label={`Move ${edge} crop edge. Use arrow keys.`}
      className="absolute z-10 rounded-full border-2 border-white bg-brand-600 shadow focus-visible:ring-offset-0"
      style={{ ...style, cursor, width: 18, height: 18, transform: 'translate(-50%, -50%)' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        const vertical = edge === 'top' || edge === 'bottom'
        drag.current = { edge, start: vertical ? e.clientY : e.clientX, orig: m[edge], size: vertical ? width * aspect : width }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d || d.edge !== edge) return
        const pos = edge === 'top' || edge === 'bottom' ? e.clientY : e.clientX
        const delta = (pos - d.start) / d.size
        setEdge(edge, d.orig + (edge === 'top' || edge === 'left' ? delta : -delta))
      }}
      onPointerUp={() => (drag.current = null)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.05 : 0.01
        const inward = { top: 'ArrowDown', bottom: 'ArrowUp', left: 'ArrowRight', right: 'ArrowLeft' }[edge]
        const outward = { top: 'ArrowUp', bottom: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[edge]
        if (e.key === inward) setEdge(edge, m[edge] + step)
        else if (e.key === outward) setEdge(edge, m[edge] - step)
        else return
        e.preventDefault()
      }}
    />
  )

  const pct = (v: number) => `${v * 100}%`

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <div className="panel overflow-x-auto p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <label htmlFor="crop-page" className="text-sm font-semibold text-ink">
            Preview page
          </label>
          <select id="crop-page" className="field mt-0 w-auto py-1" value={pageNo} onChange={(e) => setPageNo(Number(e.target.value))}>
            {Array.from({ length: pdf.pageCount }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
        <PdfPageView doc={doc} pageNumber={pageNo} width={width} aspect={aspect} textLayer={false} className="mx-auto">
          {() => (
            <div className="absolute inset-0 z-[4]" data-testid="crop-area">
              {/* Shade the area that will be hidden. */}
              <div className="absolute inset-x-0 top-0 bg-gray-900/45" style={{ height: pct(m.top) }} />
              <div className="absolute inset-x-0 bottom-0 bg-gray-900/45" style={{ height: pct(m.bottom) }} />
              <div className="absolute left-0 bg-gray-900/45" style={{ top: pct(m.top), bottom: pct(m.bottom), width: pct(m.left) }} />
              <div className="absolute right-0 bg-gray-900/45" style={{ top: pct(m.top), bottom: pct(m.bottom), width: pct(m.right) }} />
              <div className="absolute border-2 border-brand-600" style={{ top: pct(m.top), bottom: pct(m.bottom), left: pct(m.left), right: pct(m.right) }} />
              {handle('top', { top: pct(m.top), left: pct(m.left + (1 - m.left - m.right) / 2) }, 'ns-resize')}
              {handle('bottom', { top: pct(1 - m.bottom), left: pct(m.left + (1 - m.left - m.right) / 2) }, 'ns-resize')}
              {handle('left', { left: pct(m.left), top: pct(m.top + (1 - m.top - m.bottom) / 2) }, 'ew-resize')}
              {handle('right', { left: pct(1 - m.right), top: pct(m.top + (1 - m.top - m.bottom) / 2) }, 'ew-resize')}
            </div>
          )}
        </PdfPageView>
      </div>

      <div className="panel h-fit max-w-md space-y-4 p-5">
        <h2 className="font-bold text-ink">Crop margins</h2>
        <div className="grid grid-cols-2 gap-3">
          {(['top', 'bottom', 'left', 'right'] as const).map((edge) => (
            <div key={edge}>
              <label htmlFor={`crop-${edge}`} className="field-label capitalize">
                {edge} (%)
              </label>
              <input
                id={`crop-${edge}`}
                type="number"
                min={0}
                max={90}
                step={1}
                className="field"
                value={Math.round(m[edge] * 1000) / 10}
                onChange={(e) => setEdge(edge, Number(e.target.value) / 100)}
              />
            </div>
          ))}
        </div>
        <fieldset>
          <legend className="field-label">Apply to</legend>
          <div className="mt-1.5 space-y-1.5 text-sm">
            {(
              [
                ['all', `All ${pdf.pageCount} pages`],
                ['this', `Only page ${pageNo}`],
                ['range', 'Pages…'],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2">
                <input type="radio" name="crop-scope" className="h-4 w-4 accent-brand-600" checked={scope === v} onChange={() => setScope(v)} />
                {l}
              </label>
            ))}
          </div>
          {scope === 'range' && <input aria-label="Pages to crop" className="field" placeholder="e.g. 1-3, 7" value={range} onChange={(e) => setRange(e.target.value)} />}
        </fieldset>
        <Alert tone="info">Cropping hides the margins by changing each page’s visible area. Content outside it isn’t deleted. To remove sensitive content, use Redact PDF.</Alert>
        <Button onClick={run} disabled={busy}>
          <Crop aria-hidden className="h-5 w-5" />
          Crop PDF
        </Button>
        {busy && <Spinner label="Cropping…" className="ml-3" />}
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </div>
  )
}
