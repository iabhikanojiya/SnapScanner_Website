'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize, RotateCcw, RotateCw, ScanSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Alert, Spinner } from '@/components/tools/Feedback'
import CropArea from '@/components/tools/images/CropArea'
import { decodeImage, detectEdges, encodePixels, processImage } from '@/lib/image/browser'
import { FILTER_LABELS, SCAN_FILTERS, type Pixels, type ScanFilter } from '@/lib/image/filters'
import { FULL_QUAD, type Quad } from '@/lib/image/geometry'
import type { ImagePage } from '@/lib/image/pages'
import type { PageEdits } from '@/lib/image/pipeline'
import { cn } from '@/lib/utils'

interface PageEditorProps {
  page: ImagePage
  onClose: () => void
  onSave: (edits: PageEdits, applyFilterToAll: boolean) => void
}

/** Crop, rotate and filter one page, with live previews of every filter. */
export default function PageEditor({ page, onClose, onSave }: PageEditorProps) {
  const [edits, setEdits] = useState<PageEdits>(page.edits)
  const [work, setWork] = useState<{ pixels: Pixels; url: string } | null>(null)
  const [previews, setPreviews] = useState<Partial<Record<ScanFilter, string>>>({})
  const [detectState, setDetectState] = useState<'idle' | 'running' | 'found' | 'none'>('idle')
  const [error, setError] = useState<string | null>(null)
  const previewUrls = useRef<string[]>([])

  // Decode once at a size suitable for the crop view.
  useEffect(() => {
    let url: string | null = null
    let cancelled = false
    decodeImage(page.source, page.name, 1400)
      .then(async (pixels) => {
        const blob = await encodePixels(pixels, 'image/jpeg', 0.85)
        url = URL.createObjectURL(blob)
        if (cancelled) URL.revokeObjectURL(url)
        else setWork({ pixels, url })
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'The image couldn’t be opened.'))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [page.source, page.name])

  // Filter previews follow the crop and rotation (debounced while dragging).
  const { quad, rotation } = edits
  useEffect(() => {
    if (!work) return
    let cancelled = false
    const timer = setTimeout(async () => {
      const urls: Partial<Record<ScanFilter, string>> = {}
      for (const f of SCAN_FILTERS) {
        const out = await processImage(work.pixels, { quad, rotation, filter: f }, 200)
        urls[f] = URL.createObjectURL(await encodePixels(out, 'image/jpeg', 0.8))
      }
      if (cancelled) return Object.values(urls).forEach((u) => URL.revokeObjectURL(u!))
      previewUrls.current.forEach((u) => URL.revokeObjectURL(u))
      previewUrls.current = Object.values(urls) as string[]
      setPreviews(urls)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [work, quad, rotation])

  useEffect(() => () => previewUrls.current.forEach((u) => URL.revokeObjectURL(u)), [])

  const detect = async () => {
    if (!work) return
    setDetectState('running')
    const found = await detectEdges(work.pixels)
    if (found) setEdits((e) => ({ ...e, quad: found.quad }))
    setDetectState(found ? 'found' : 'none')
  }

  const rotate = (delta: number) => setEdits((e) => ({ ...e, rotation: (e.rotation + delta + 360) % 360 }))

  const footer = (
    <>
      <Button variant="secondary" size="sm" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="secondary" size="sm" onClick={() => onSave(edits, true)}>
        Save and use {FILTER_LABELS[edits.filter]} on all pages
      </Button>
      <Button size="sm" onClick={() => onSave(edits, false)}>
        Save
      </Button>
    </>
  )

  return (
    <Dialog open onClose={onClose} title={`Edit ${page.name}`} size="lg" footer={footer}>
      {error ? (
        <Alert tone="error">{error}</Alert>
      ) : (
        <div className="grid gap-5 md:grid-cols-[1fr_15rem]">
          <div>
            <div className="canvas-backdrop flex h-[min(55dvh,32rem)] items-center justify-center rounded-xl p-3">
              {work ? (
                <CropArea src={work.url} aspect={work.pixels.width / work.pixels.height} quad={quad} onChange={(q: Quad) => setEdits((e) => ({ ...e, quad: q }))} />
              ) : (
                <Spinner label="Opening image…" />
              )}
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Drag the corners to the page edges. Tilted pages are straightened when you save.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-ink">Crop</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" size="xs" onClick={detect} disabled={!work || detectState === 'running'}>
                  <ScanSearch aria-hidden className="h-4 w-4" />
                  Detect edges
                </Button>
                <Button variant="secondary" size="xs" onClick={() => setEdits((e) => ({ ...e, quad: FULL_QUAD }))}>
                  <Maximize aria-hidden className="h-4 w-4" />
                  Full image
                </Button>
              </div>
              <p className="mt-2 text-xs text-ink-muted" role="status">
                {detectState === 'running' && 'Looking for the page…'}
                {detectState === 'found' && 'Page edges found. Adjust the corners if needed.'}
                {detectState === 'none' && 'No clear page edge found. Drag the corners to crop by hand.'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Rotate</h3>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" size="xs" onClick={() => rotate(-90)} aria-label="Rotate left">
                  <RotateCcw aria-hidden className="h-4 w-4" />
                  Left
                </Button>
                <Button variant="secondary" size="xs" onClick={() => rotate(90)} aria-label="Rotate right">
                  <RotateCw aria-hidden className="h-4 w-4" />
                  Right
                </Button>
              </div>
            </div>
            <fieldset>
              <legend className="text-sm font-bold text-ink">Filter</legend>
              <div className="mt-2 grid grid-cols-4 gap-2 md:grid-cols-2">
                {SCAN_FILTERS.map((f) => (
                  <label
                    key={f}
                    className={cn(
                      'cursor-pointer rounded-lg border-2 p-1 text-center text-xs font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600',
                      edits.filter === f ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-transparent text-ink-soft hover:bg-gray-50'
                    )}
                  >
                    <input type="radio" name="filter" className="sr-only" checked={edits.filter === f} onChange={() => setEdits((e) => ({ ...e, filter: f }))} />
                    <span className="block aspect-square overflow-hidden rounded bg-gray-100">
                      {previews[f] && (
                        // eslint-disable-next-line @next/next/no-img-element -- local object URL
                        <img src={previews[f]} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="mt-1 block">{FILTER_LABELS[f]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      )}
    </Dialog>
  )
}
