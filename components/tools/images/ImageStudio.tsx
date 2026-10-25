'use client'

import { useEffect, useState } from 'react'
import { FlipHorizontal, FlipVertical, Maximize, RotateCcw, RotateCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Dropzone from '@/components/tools/Dropzone'
import { Alert, ErrorList, Spinner } from '@/components/tools/Feedback'
import CropArea from '@/components/tools/images/CropArea'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { useInitialFiles } from '@/components/tools/useInitialFiles'
import { baseName, checkFiles } from '@/lib/files/validate'
import { decodeImage, encodePixels, processImage, type OutputFormat } from '@/lib/image/browser'
import { FILTER_LABELS, SCAN_FILTERS, type Pixels, type ScanFilter } from '@/lib/image/filters'
import { FULL_QUAD, flipPixels, isFullQuad, type Quad } from '@/lib/image/geometry'
import { LIMITS, formatBytes } from '@/lib/limits'
import type { ToolId } from '@/lib/tools'
import { cn } from '@/lib/utils'

export type StudioFocus = 'crop' | 'rotate' | 'filter' | 'convert'

const TOOL_FOR: Record<StudioFocus, ToolId> = { crop: 'crop-image', rotate: 'rotate-image', filter: 'filter-image', convert: 'convert-image' }

const FORMATS: { type: OutputFormat; label: string; ext: string }[] = [
  { type: 'image/jpeg', label: 'JPG', ext: 'jpg' },
  { type: 'image/png', label: 'PNG', ext: 'png' },
  { type: 'image/webp', label: 'WebP', ext: 'webp' },
]

interface Loaded {
  file: File
  /** Decoded at up to 1400 px for editing. */
  preview: Pixels
  previewUrl: string
}

/** One editor for Crop, Rotate, Filters and Convert image, opened on the relevant control. */
export default function ImageStudio({ focus }: { focus: StudioFocus }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [quad, setQuad] = useState<Quad>(FULL_QUAD)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [filter, setFilter] = useState<ScanFilter>(focus === 'filter' ? 'enhance' : 'original')
  const [format, setFormat] = useState<OutputFormat>(focus === 'convert' ? 'image/png' : 'image/jpeg')
  const [quality, setQuality] = useState(90)
  const [result, setResult] = useState<(ResultFile & { url: string; width: number; height: number }) | null>(null)
  const [livePreview, setLivePreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) return
    return () => URL.revokeObjectURL(loaded.previewUrl)
  }, [loaded])
  useEffect(() => {
    if (!result) return
    return () => URL.revokeObjectURL(result.url)
  }, [result])

  const load = async (files: File[]) => {
    setErrors([])
    const { accepted, errors: errs } = await checkFiles(files.slice(0, 1), 'image')
    setErrors(errs)
    const file = accepted[0]?.file
    if (!file) return
    try {
      const preview = await decodeImage(file, file.name, 1400)
      const blob = await encodePixels(preview, 'image/jpeg', 0.85)
      setLoaded({ file, preview, previewUrl: URL.createObjectURL(blob) })
      setQuad(FULL_QUAD)
      setRotation(0)
      setFlipH(false)
      setFlipV(false)
      if (focus === 'convert') setFormat(accepted[0].kind === 'png' ? 'image/jpeg' : 'image/png')
    } catch (e) {
      setErrors([errorMessage(e)])
    }
  }
  useInitialFiles(TOOL_FOR[focus], load, (m) => setErrors([m]))

  // Live result preview (rotation, flips and filter applied).
  useEffect(() => {
    if (!loaded) return
    let cancelled = false
    let url: string | null = null
    const t = setTimeout(async () => {
      const out = flipPixels(await processImage(loaded.preview, { quad, rotation, filter }, 520), flipH, flipV)
      url = URL.createObjectURL(await encodePixels(out, 'image/jpeg', 0.82))
      if (cancelled) URL.revokeObjectURL(url)
      else
        setLivePreview((old) => {
          if (old) URL.revokeObjectURL(old)
          return url
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [loaded, quad, rotation, filter, flipH, flipV])

  const save = async () => {
    if (!loaded) return
    setBusy(true)
    setError(null)
    try {
      const full = await decodeImage(loaded.file, loaded.file.name, LIMITS.imageMaxSide)
      const out = flipPixels(await processImage(full, { quad, rotation, filter }, LIMITS.imageMaxSide), flipH, flipV)
      const blob = await encodePixels(out, format, quality / 100)
      const ext = FORMATS.find((f) => f.type === format)!.ext
      setResult({ blob, name: `${baseName(loaded.file.name)}_edited.${ext}`, url: URL.createObjectURL(blob), width: out.width, height: out.height })
      focusResult()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (result && loaded)
    return (
      <ResultPanel
        title="Your image is ready"
        summary={`${result.width} × ${result.height} px · ${formatBytes(loaded.file.size)} → ${formatBytes(result.blob.size)}`}
        files={[result]}
        source={TOOL_FOR[focus]}
        resetLabel="Keep editing"
        onReset={() => setResult(null)}
      >
        <div className="canvas-backdrop mt-4 flex max-h-80 justify-center overflow-hidden rounded-xl p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={result.url} alt="Edited image" className="max-h-72 object-contain" />
        </div>
      </ResultPanel>
    )

  if (!loaded)
    return (
      <div className="space-y-4">
        <Dropzone accept="image" onFiles={load} hint="Drop a JPG, PNG, WebP, GIF or BMP image here, or choose one from your device." />
        <ErrorList errors={errors} onDismiss={() => setErrors([])} />
      </div>
    )

  const section = (id: StudioFocus, title: string, body: React.ReactNode) => (
    <section aria-labelledby={`studio-${id}`} className={cn('rounded-xl border p-4', focus === id ? 'border-brand-200 bg-brand-50/40' : 'border-gray-200')}>
      <h2 id={`studio-${id}`} className="text-sm font-bold text-ink">
        {title}
      </h2>
      <div className="mt-2">{body}</div>
    </section>
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <div className="panel space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-ink">{loaded.file.name}</p>
          <Button variant="ghost" size="xs" onClick={() => setLoaded(null)}>
            <X aria-hidden className="h-4 w-4" />
            Change image
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-ink-muted">Crop (original orientation)</p>
            <div className="canvas-backdrop flex h-80 items-center justify-center rounded-xl p-2">
              <CropArea src={loaded.previewUrl} aspect={loaded.preview.width / loaded.preview.height} quad={quad} onChange={setQuad} />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-ink-muted">Result</p>
            <div className="canvas-backdrop flex h-80 items-center justify-center rounded-xl p-2" data-testid="studio-preview">
              {livePreview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL
                <img src={livePreview} alt="Preview of the edited image" className="max-h-full max-w-full object-contain" />
              ) : (
                <Spinner label="Rendering…" />
              )}
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        {section(
          'crop',
          'Crop',
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="xs" onClick={() => setQuad(FULL_QUAD)} disabled={isFullQuad(quad)}>
              <Maximize aria-hidden className="h-4 w-4" />
              Reset crop
            </Button>
            <p className="w-full text-xs text-ink-muted">Drag the corners on the image. Tilted shapes are straightened.</p>
          </div>
        )}
        {section(
          'rotate',
          'Rotate & flip',
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="xs" onClick={() => setRotation((r) => (r + 270) % 360)} aria-label="Rotate left">
              <RotateCcw aria-hidden className="h-4 w-4" />
              Left
            </Button>
            <Button variant="secondary" size="xs" onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="Rotate right">
              <RotateCw aria-hidden className="h-4 w-4" />
              Right
            </Button>
            <Button variant={flipH ? 'dark' : 'secondary'} size="xs" aria-pressed={flipH} onClick={() => setFlipH((f) => !f)}>
              <FlipHorizontal aria-hidden className="h-4 w-4" />
              Flip
            </Button>
            <Button variant={flipV ? 'dark' : 'secondary'} size="xs" aria-pressed={flipV} onClick={() => setFlipV((f) => !f)}>
              <FlipVertical aria-hidden className="h-4 w-4" />
              Flip vertical
            </Button>
            <p className="w-full text-xs text-ink-muted" data-testid="rotation-status">
              Rotation {rotation}°{flipH ? ' · flipped' : ''}
              {flipV ? ' · flipped vertically' : ''}
            </p>
          </div>
        )}
        {section(
          'filter',
          'Filter',
          <select aria-label="Filter" className="field mt-0" value={filter} onChange={(e) => setFilter(e.target.value as ScanFilter)}>
            {SCAN_FILTERS.map((f) => (
              <option key={f} value={f}>
                {FILTER_LABELS[f]}
              </option>
            ))}
          </select>
        )}
        {section(
          'convert',
          'Format',
          <>
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Output format">
              {FORMATS.map((f) => (
                <label key={f.type} className="choice">
                  <input type="radio" name="studio-format" className="sr-only" checked={format === f.type} onChange={() => setFormat(f.type)} />
                  {f.label}
                </label>
              ))}
            </div>
            {format !== 'image/png' && (
              <>
                <label htmlFor="studio-quality" className="field-label mt-3 text-xs">
                  Quality: {quality}%
                </label>
                <input id="studio-quality" type="range" min={40} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="mt-1 w-full accent-brand-600" />
              </>
            )}
          </>
        )}
        <Button className="w-full" onClick={save} disabled={busy}>
          Save image
        </Button>
        {busy && <Spinner label="Processing…" />}
        {error && <Alert tone="error">{error}</Alert>}
        <p className="text-xs text-ink-muted">Images larger than {LIMITS.imageMaxSide} px on the long side are scaled down. Camera metadata (EXIF) isn’t kept.</p>
      </aside>
    </div>
  )
}
