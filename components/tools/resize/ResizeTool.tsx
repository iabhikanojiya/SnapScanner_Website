'use client'

import { useEffect, useState } from 'react'
import { Link2, Link2Off, Scaling, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Dropzone from '@/components/tools/Dropzone'
import { Alert, ErrorList, Spinner } from '@/components/tools/Feedback'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { useInitialFiles } from '@/components/tools/useInitialFiles'
import { baseName, checkFiles } from '@/lib/files/validate'
import { MAX_RESIZE_SIDE, imageSize, lockedSize, resizeImage, type OutputFormat } from '@/lib/image/browser'
import { formatBytes } from '@/lib/limits'

interface Source {
  file: File
  url: string
  width: number
  height: number
}

const FORMATS: { type: OutputFormat; label: string; ext: string }[] = [
  { type: 'image/jpeg', label: 'JPG', ext: 'jpg' },
  { type: 'image/png', label: 'PNG', ext: 'png' },
  { type: 'image/webp', label: 'WebP', ext: 'webp' },
]

export default function ResizeTool() {
  const [source, setSource] = useState<Source | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [locked, setLocked] = useState(true)
  const [format, setFormat] = useState<OutputFormat>('image/jpeg')
  const [quality, setQuality] = useState(90)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<(ResultFile & { url: string; width: number; height: number }) | null>(null)

  useEffect(() => {
    if (!source) return
    return () => URL.revokeObjectURL(source.url)
  }, [source])
  useEffect(() => {
    if (!result) return
    return () => URL.revokeObjectURL(result.url)
  }, [result])

  const load = async (files: File[]) => {
    setErrors([])
    const { accepted, errors: errs } = await checkFiles(files.slice(0, 1), 'image')
    if (!accepted[0]) return setErrors(errs)
    try {
      const file = accepted[0].file
      const size = await imageSize(file, file.name)
      setSource({ file, url: URL.createObjectURL(file), ...size })
      setWidth(String(size.width))
      setHeight(String(size.height))
      setFormat(accepted[0].kind === 'png' ? 'image/png' : accepted[0].kind === 'webp' ? 'image/webp' : 'image/jpeg')
    } catch (e) {
      setErrors([errorMessage(e)])
    }
  }

  useInitialFiles('resize-image', load, (m) => setErrors([m]))

  const onDimension = (which: 'width' | 'height', raw: string) => {
    const value = raw.replace(/[^\d]/g, '').slice(0, 5)
    if (which === 'width') setWidth(value)
    else setHeight(value)
    const n = Number(value)
    if (locked && source && n > 0) {
      const other = lockedSize(source, which, n)
      if (which === 'width') setHeight(String(other.height))
      else setWidth(String(other.width))
    }
  }

  const scaleTo = (pct: number) => {
    if (!source) return
    setWidth(String(Math.max(1, Math.round((source.width * pct) / 100))))
    setHeight(String(Math.max(1, Math.round((source.height * pct) / 100))))
  }

  const w = Number(width)
  const h = Number(height)
  const invalid = !w || !h || w > MAX_RESIZE_SIDE || h > MAX_RESIZE_SIDE

  const run = async () => {
    if (!source || invalid) return
    setBusy(true)
    setError(null)
    try {
      const blob = await resizeImage(source.file, source.file.name, w, h, format, quality / 100)
      const ext = FORMATS.find((f) => f.type === format)!.ext
      setResult({ blob, name: `${baseName(source.file.name)}_${w}x${h}.${ext}`, url: URL.createObjectURL(blob), width: w, height: h })
      focusResult()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (result && source) {
    return (
      <ResultPanel
        title="Your image is resized"
        summary={`${source.width} × ${source.height} → ${result.width} × ${result.height} px · ${formatBytes(source.file.size)} → ${formatBytes(result.blob.size)}`}
        files={[result]}
        source="resize-image"
        resetLabel="Resize again"
        onReset={() => setResult(null)}
      >
        <div className="canvas-backdrop mt-4 flex max-h-80 justify-center overflow-hidden rounded-xl p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={result.url} alt="Resized image preview" className="max-h-72 object-contain" />
        </div>
      </ResultPanel>
    )
  }

  return (
    <div className="space-y-5">
      {!source ? (
        <Dropzone accept="image" onFiles={load} hint="Drop a JPG, PNG, WebP, GIF or BMP image here, or choose one from your device." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{source.file.name}</p>
                <p className="text-xs text-ink-muted">
                  {source.width} × {source.height} px · {formatBytes(source.file.size)}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSource(null)}>
                <X aria-hidden className="h-4 w-4" />
                Change image
              </Button>
            </div>
            <div className="canvas-backdrop mt-4 flex max-h-[28rem] justify-center overflow-hidden rounded-xl p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
              <img src={source.url} alt="Original image preview" className="max-h-[26rem] object-contain" />
            </div>
          </div>

          <div className="panel space-y-4 p-5 lg:sticky lg:top-24 lg:self-start">
            <h2 className="font-bold text-ink">New size</h2>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="resize-width" className="field-label">
                  Width (px)
                </label>
                <input id="resize-width" inputMode="numeric" className="field" value={width} onChange={(e) => onDimension('width', e.target.value)} />
              </div>
              <Button
                variant={locked ? 'secondary' : 'ghost'}
                size="icon"
                aria-pressed={locked}
                aria-label="Keep aspect ratio"
                title="Keep aspect ratio"
                onClick={() => setLocked((l) => !l)}
              >
                {locked ? <Link2 aria-hidden className="h-5 w-5" /> : <Link2Off aria-hidden className="h-5 w-5" />}
              </Button>
              <div className="flex-1">
                <label htmlFor="resize-height" className="field-label">
                  Height (px)
                </label>
                <input id="resize-height" inputMode="numeric" className="field" value={height} onChange={(e) => onDimension('height', e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-ink-muted">{locked ? 'Aspect ratio locked.' : 'Aspect ratio unlocked: the image may stretch.'}</p>
            <div className="flex flex-wrap gap-2">
              {[25, 50, 75, 200].map((p) => (
                <Button key={p} variant="secondary" size="xs" onClick={() => scaleTo(p)}>
                  {p}%
                </Button>
              ))}
            </div>
            <fieldset>
              <legend className="field-label">Format</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {FORMATS.map((f) => (
                  <label key={f.type} className="choice">
                    <input type="radio" name="format" className="sr-only" checked={format === f.type} onChange={() => setFormat(f.type)} />
                    {f.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {format !== 'image/png' && (
              <div>
                <label htmlFor="quality" className="field-label">
                  Quality: {quality}%
                </label>
                <input
                  id="quality"
                  type="range"
                  min={40}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-600"
                />
              </div>
            )}
            {invalid && (width || height) && (
              <Alert tone="error">Enter a width and height between 1 and {MAX_RESIZE_SIDE} pixels.</Alert>
            )}
            <Button className="w-full" onClick={run} disabled={invalid || busy}>
              <Scaling aria-hidden className="h-5 w-5" />
              Resize image
            </Button>
            {busy && <Spinner label="Resizing…" />}
            {error && <Alert tone="error">{error}</Alert>}
          </div>
        </div>
      )}
      <ErrorList errors={errors} onDismiss={() => setErrors([])} />
    </div>
  )
}
