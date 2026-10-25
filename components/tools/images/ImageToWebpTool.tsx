'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FileArchive, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Dropzone from '@/components/tools/Dropzone'
import { Alert, ErrorList, Progress } from '@/components/tools/Feedback'
import { useInitialFiles } from '@/components/tools/useInitialFiles'
import { downloadBlob, zipFiles } from '@/lib/browser/download'
import { baseName, checkFile, safeFileName } from '@/lib/files/validate'
import { MAX_RESIZE_SIDE, imageSize, resizeImage } from '@/lib/image/browser'
import { LIMITS, formatBytes } from '@/lib/limits'
import { newId } from '@/lib/storage/db'

interface Item {
  id: string
  file: File
  /** Object URL for the thumbnail; revoked when the item is removed. */
  preview: string
  width?: number
  height?: number
  status: 'ready' | 'converting' | 'done' | 'error'
  output?: Blob
  outWidth?: number
  outHeight?: number
  error?: string
}

/** True if the bytes are a WebP file (RIFF....WEBP), not a renamed PNG/JPEG. */
async function isWebp(blob: Blob) {
  const b = new Uint8Array(await blob.slice(0, 12).arrayBuffer())
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to))
  return blob.type === 'image/webp' && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
}

/** Size change as a signed percentage of the original. */
function sizeChange(before: number, after: number) {
  return before > 0 ? ((after - before) / before) * 100 : 0
}

export default function ImageToWebpTool() {
  const [items, setItems] = useState<Item[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [quality, setQuality] = useState(85)
  const [limit, setLimit] = useState(false)
  const [maxSide, setMaxSide] = useState(2000)
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null)
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  })
  // Release thumbnails when leaving the page.
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), [])

  const add = useCallback(async (files: File[]) => {
    const problems: string[] = []
    const room = LIMITS.filesPerJob - itemsRef.current.length
    if (files.length > room) problems.push(`Up to ${LIMITS.filesPerJob} images can be converted at once; ${files.length - Math.max(0, room)} were not added.`)
    const added: Item[] = []
    for (const file of files.slice(0, Math.max(0, room))) {
      try {
        const { kind } = await checkFile(file, 'image')
        if (kind !== 'png' && kind !== 'jpeg') throw new Error(`“${file.name}” is ${kind === 'webp' ? 'already a WebP image' : `a ${kind.toUpperCase()} image`}. Choose PNG or JPG images.`)
        const { width, height } = await imageSize(file, file.name)
        added.push({ id: newId(), file, preview: URL.createObjectURL(file), width, height, status: 'ready' })
      } catch (e) {
        problems.push(e instanceof Error ? e.message : `“${file.name}” couldn’t be read.`)
      }
    }
    setErrors(problems)
    if (added.length) setItems((list) => [...list, ...added])
  }, [])

  useInitialFiles('image-to-webp', (files) => void add(files), (m) => setErrors([m]))

  const remove = (id: string) =>
    setItems((list) => {
      const gone = list.find((i) => i.id === id)
      if (gone) URL.revokeObjectURL(gone.preview)
      return list.filter((i) => i.id !== id)
    })

  const reset = () => {
    items.forEach((i) => URL.revokeObjectURL(i.preview))
    setItems([])
    setErrors([])
  }

  /** Output dimensions: original size, or scaled down so the longest side fits. */
  const target = (i: Item) => {
    const w = i.width ?? 1
    const h = i.height ?? 1
    const cap = Math.min(limit ? Math.max(16, maxSide) : Infinity, MAX_RESIZE_SIDE)
    const s = Math.min(1, cap / Math.max(w, h))
    return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) }
  }

  const convertAll = async () => {
    const list = itemsRef.current
    setBusy({ done: 0, total: list.length })
    for (let n = 0; n < list.length; n++) {
      const item = list[n]
      setItems((all) => all.map((x) => (x.id === item.id ? { ...x, status: 'converting', error: undefined } : x)))
      try {
        const { width, height } = target(item)
        const out = await resizeImage(item.file, item.file.name, width, height, 'image/webp', quality / 100)
        if (!(await isWebp(out))) throw new Error('This browser can’t create WebP images. Try a recent version of Chrome, Edge, Firefox or Safari.')
        setItems((all) => all.map((x) => (x.id === item.id ? { ...x, status: 'done', output: out, outWidth: width, outHeight: height } : x)))
      } catch (e) {
        setItems((all) => all.map((x) => (x.id === item.id ? { ...x, status: 'error', output: undefined, error: e instanceof Error ? e.message : 'Conversion failed.' } : x)))
      }
      setBusy({ done: n + 1, total: list.length })
    }
    setBusy(null)
  }

  const outName = (i: Item) => safeFileName(baseName(i.file.name), 'webp')
  const done = items.filter((i) => i.status === 'done' && i.output)
  const totals = done.reduce((t, i) => ({ before: t.before + i.file.size, after: t.after + i.output!.size }), { before: 0, after: 0 })

  const downloadAll = async () => {
    const files = await Promise.all(done.map(async (i) => ({ name: outName(i), bytes: new Uint8Array(await i.output!.arrayBuffer()) })))
    downloadBlob(zipFiles(files), 'webp-images.zip')
  }

  // Settings changed after converting: results no longer match them.
  const stale = done.length > 0 && !busy
  const settingsChanged = () => setItems((all) => all.map((x) => (x.status === 'done' ? { ...x, status: 'ready', output: undefined } : x)))

  return (
    <div className="space-y-6">
      <Dropzone accept="image" multiple onFiles={(f) => void add(f)} title="Add PNG or JPG images" hint={`Up to ${LIMITS.filesPerJob} images, ${formatBytes(LIMITS.imageBytes)} each`} compact={items.length > 0} disabled={!!busy} />
      {errors.length > 0 && <ErrorList errors={errors} onDismiss={() => setErrors([])} />}

      {items.length > 0 && (
        <>
          <section className="panel p-5" aria-labelledby="webp-settings">
            <h2 id="webp-settings" className="font-bold text-ink">
              WebP settings
            </h2>
            <div className="mt-3 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="webp-quality" className="field-label">
                  Quality: {quality}%
                </label>
                <input
                  id="webp-quality"
                  type="range"
                  min={40}
                  max={100}
                  step={1}
                  value={quality}
                  disabled={!!busy}
                  onChange={(e) => {
                    setQuality(Number(e.target.value))
                    if (stale) settingsChanged()
                  }}
                  className="mt-3 w-full accent-brand-600"
                />
                <p className="field-hint">WebP is lossy at these settings: lower quality gives smaller files but can soften detail. 85% suits most photos. Transparency is kept.</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    checked={limit}
                    disabled={!!busy}
                    onChange={(e) => {
                      setLimit(e.target.checked)
                      if (stale) settingsChanged()
                    }}
                  />
                  Shrink large images
                </label>
                {limit ? (
                  <div className="mt-2">
                    <label htmlFor="webp-max" className="field-label text-xs">
                      Longest side (px)
                    </label>
                    <input
                      id="webp-max"
                      type="number"
                      min={16}
                      max={MAX_RESIZE_SIDE}
                      className="field max-w-[10rem]"
                      value={maxSide}
                      disabled={!!busy}
                      onChange={(e) => {
                        setMaxSide(Number(e.target.value) || 16)
                        if (stale) settingsChanged()
                      }}
                    />
                  </div>
                ) : (
                  <p className="field-hint">Off: images keep their original dimensions (up to {MAX_RESIZE_SIDE} px per side).</p>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => void convertAll()} disabled={!!busy}>
                {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
                Convert {items.length} {items.length === 1 ? 'image' : 'images'} to WebP
              </Button>
              {done.length > 1 && (
                <Button variant="secondary" onClick={() => void downloadAll()} disabled={!!busy}>
                  <FileArchive aria-hidden className="h-4 w-4" />
                  Download all as ZIP
                </Button>
              )}
              <Button variant="ghost" onClick={reset} disabled={!!busy}>
                <RotateCcw aria-hidden className="h-4 w-4" />
                Start over
              </Button>
            </div>
            {busy && (
              <div className="mt-4">
                <Progress label="Converting" done={busy.done} total={busy.total} />
              </div>
            )}
            {done.length > 0 && !busy && (
              <Alert tone="success" className="mt-4">
                Converted {done.length} of {items.length}: {formatBytes(totals.before)} → {formatBytes(totals.after)} ({formatChange(sizeChange(totals.before, totals.after))}).
              </Alert>
            )}
          </section>

          <ul className="grid gap-3" data-testid="webp-items">
            {items.map((i) => {
              const out = i.output
              const t = target(i)
              return (
                <li key={i.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center" data-testid="webp-item">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                  <img src={i.preview} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 bg-[conic-gradient(#e5e7eb_25%,#fff_0_50%,#e5e7eb_0_75%,#fff_0)] bg-[length:12px_12px] object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{i.file.name}</p>
                    <p className="text-xs text-ink-muted">
                      {formatBytes(i.file.size)} · {i.width} × {i.height} px
                      {out && (
                        <>
                          {' '}
                          → <span className="font-semibold text-ink" data-testid="webp-out-size">{formatBytes(out.size)}</span> WebP · {i.outWidth} × {i.outHeight} px ·{' '}
                          <span className={sizeChange(i.file.size, out.size) <= 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-800'} data-testid="webp-change">
                            {formatChange(sizeChange(i.file.size, out.size))}
                          </span>
                        </>
                      )}
                      {!out && i.status !== 'error' && (t.width !== i.width || t.height !== i.height) && ` → ${t.width} × ${t.height} px`}
                    </p>
                    {i.status === 'error' && <p className="mt-1 text-sm text-brand-700">{i.error}</p>}
                    {out && out.size > i.file.size && <p className="mt-1 text-xs text-amber-800">The WebP is larger than the original. Try a lower quality, or keep the original.</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {i.status === 'converting' && <Loader2 aria-label="Converting" className="h-5 w-5 animate-spin text-ink-muted" />}
                    {out && (
                      <Button size="sm" onClick={() => downloadBlob(out, outName(i))} data-testid="download">
                        <Download aria-hidden className="h-4 w-4" />
                        Download
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${i.file.name}`} onClick={() => remove(i.id)} disabled={!!busy}>
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

function formatChange(pct: number) {
  const r = Math.round(pct * 10) / 10
  return r <= 0 ? `${Math.abs(r)}% smaller` : `${r}% larger`
}
