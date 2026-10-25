'use client'

import { useEffect, useState } from 'react'
import { Download, Images } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Progress } from '@/components/tools/Feedback'
import { SinglePdfInput, useSinglePdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { downloadBlob, zipFiles } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import { formatBytes } from '@/lib/limits'
import { parsePageRanges } from '@/lib/pdf/ranges'
import { saveFile } from '@/lib/storage/library'

const DPI = [72, 150, 300] as const
/** Very large pages at 300 dpi can exceed browser canvas limits. */
const MAX_PIXELS = 36_000_000

interface Output {
  name: string
  blob: Blob
  url: string
  width: number
  height: number
}

export default function PdfToImagesTool({ format }: { format: 'jpeg' | 'png' }) {
  const tool = format === 'jpeg' ? 'pdf-to-jpg' : 'pdf-to-png'
  const ext = format === 'jpeg' ? 'jpg' : 'png'
  const state = useSinglePdf(tool, { render: true, unlockEncrypted: true })
  const { pdf } = state
  const [dpi, setDpi] = useState<(typeof DPI)[number]>(150)
  const [quality, setQuality] = useState(90)
  const [range, setRange] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [outputs, setOutputs] = useState<Output[] | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => () => outputs?.forEach((o) => URL.revokeObjectURL(o.url)), [outputs])

  const run = async () => {
    if (!pdf?.view) return
    setError(null)
    let pages: number[]
    try {
      pages = range.trim() ? [...new Set(parsePageRanges(range, pdf.pageCount).flat())].sort((a, b) => a - b) : Array.from({ length: pdf.pageCount }, (_, i) => i)
    } catch (e) {
      return setError(errorMessage(e))
    }
    setProgress({ done: 0, total: pages.length })
    const results: Output[] = []
    try {
      for (let i = 0; i < pages.length; i++) {
        const page = await pdf.view.getPage(pages[i] + 1)
        const base = page.getViewport({ scale: 1 })
        let scale = dpi / 72
        if (base.width * base.height * scale * scale > MAX_PIXELS) scale = Math.sqrt(MAX_PIXELS / (base.width * base.height))
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvas, viewport, background: 'rgb(255,255,255)' }).promise
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, `image/${format}`, quality / 100))
        const { width, height } = canvas
        canvas.width = canvas.height = 0
        page.cleanup()
        if (!blob) throw new Error('A page couldn’t be converted to an image.')
        results.push({ name: `${baseName(pdf.name)}_page_${pages[i] + 1}.${ext}`, blob, url: URL.createObjectURL(blob), width, height })
        setProgress({ done: i + 1, total: pages.length })
      }
      setOutputs(results)
      setSaved(false)
      focusResult()
    } catch (e) {
      results.forEach((r) => URL.revokeObjectURL(r.url))
      setError(errorMessage(e))
    } finally {
      setProgress(null)
    }
  }

  const downloadZip = async () => {
    if (!outputs || !pdf) return
    const files = await Promise.all(outputs.map(async (o) => ({ name: o.name, bytes: new Uint8Array(await o.blob.arrayBuffer()) })))
    downloadBlob(zipFiles(files), `${baseName(pdf.name)}_${ext}.zip`)
  }

  if (outputs && pdf)
    return (
      <section aria-labelledby="result-title" className="panel p-5 sm:p-6" data-testid="result">
        <h2 id="result-title" tabIndex={-1} className="text-xl font-bold text-ink focus:outline-none">
          {outputs.length} image{outputs.length === 1 ? '' : 's'} created
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {ext.toUpperCase()} at {dpi} dpi · {formatBytes(outputs.reduce((n, o) => n + o.blob.size, 0))} in total
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {outputs.length > 1 && (
            <Button size="sm" onClick={downloadZip}>
              <Download aria-hidden className="h-4 w-4" />
              Download all as ZIP
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            disabled={saved}
            onClick={async () => {
              try {
                for (const o of outputs) await saveFile(o.blob, { name: o.name, kind: 'image', source: tool })
                setSaved(true)
              } catch (e) {
                setError(errorMessage(e))
              }
            }}
          >
            {saved ? 'Saved to My files' : 'Save all to My files'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOutputs(null)}>
            Convert again
          </Button>
        </div>
        {error && (
          <Alert tone="error" className="mt-3">
            {error}
          </Alert>
        )}
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {outputs.map((o) => (
            <li key={o.name} className="rounded-xl border border-gray-200 bg-gray-50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
              <img src={o.url} alt={`Preview of ${o.name}`} className="aspect-[3/4] w-full rounded bg-white object-contain" />
              <p className="mt-1 truncate text-xs font-semibold text-ink">{o.name}</p>
              <p className="text-xs text-ink-muted">
                {o.width} × {o.height} · {formatBytes(o.blob.size)}
              </p>
              <Button size="xs" variant="secondary" className="mt-1.5 w-full" data-testid="download" onClick={() => downloadBlob(o.blob, o.name)}>
                <Download aria-hidden className="h-3.5 w-3.5" />
                Download
              </Button>
            </li>
          ))}
        </ul>
      </section>
    )

  return (
    <div className="space-y-5">
      <SinglePdfInput state={state} />
      {pdf && (
        <div className="panel max-w-2xl space-y-4 p-5">
          <fieldset>
            <legend className="field-label">Resolution</legend>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {DPI.map((d) => (
                <label key={d} className="choice h-auto flex-col py-2">
                  <input type="radio" name="dpi" className="sr-only" checked={dpi === d} onChange={() => setDpi(d)} />
                  {d} dpi
                  <span className="text-xs font-normal text-ink-muted">{d === 72 ? 'Screen' : d === 150 ? 'Standard' : 'Print'}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {format === 'jpeg' && (
            <div>
              <label htmlFor="jpg-quality" className="field-label">
                JPG quality: {quality}%
              </label>
              <input id="jpg-quality" type="range" min={50} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="mt-2 w-full accent-brand-600" />
            </div>
          )}
          <div>
            <label htmlFor="img-pages" className="field-label">
              Pages (optional)
            </label>
            <input id="img-pages" className="field" placeholder={`All ${pdf.pageCount} pages, or e.g. 1-3, 5`} value={range} onChange={(e) => setRange(e.target.value)} />
          </div>
          <Button onClick={run} disabled={!!progress}>
            <Images aria-hidden className="h-5 w-5" />
            Convert to {ext.toUpperCase()}
          </Button>
          {progress && <Progress label="Rendering pages" done={progress.done} total={progress.total} />}
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      )}
    </div>
  )
}
