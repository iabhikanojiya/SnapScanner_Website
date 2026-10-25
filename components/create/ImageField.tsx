'use client'

import { useId, useState } from 'react'
import { ImagePlus, Loader2, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ImageValue } from '@/lib/create/engine'
import { imageFromFile, rotateImage, type ImageKind } from '@/lib/create/images'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  kind: ImageKind
  value?: ImageValue
  onChange: (v: ImageValue | undefined, coalesce?: string) => void
  onError: (message: string) => void
  hint?: string
  /** Show zoom and position controls (frames that crop). */
  crop?: boolean
  className?: string
}

/** Choose, replace, rotate, crop (zoom and position) or remove one image. */
export default function ImageField({ label, kind, value, onChange, onError, hint, crop = true, className }: Props) {
  const id = useId()
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)

  const load = async (file: File) => {
    setBusy(true)
    try {
      onChange(await imageFromFile(file, kind))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'The image couldn’t be used.')
    } finally {
      setBusy(false)
    }
  }

  const rotate = async (dir: 1 | -1) => {
    if (!value) return
    setBusy(true)
    try {
      onChange(await rotateImage(value, dir))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'The image couldn’t be rotated.')
    } finally {
      setBusy(false)
    }
  }

  const slider = (key: 'zoom' | 'ox' | 'oy', text: string, min: number, max: number) =>
    value && (
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-${key}`} className="w-20 shrink-0 text-xs text-ink-muted">
          {text}
        </label>
        <input
          id={`${id}-${key}`}
          type="range"
          min={min}
          max={max}
          step={0.01}
          value={value[key]}
          onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) }, `${id}-${key}`)}
          className="h-2 flex-1 accent-brand-600"
        />
      </div>
    )

  return (
    <div className={className}>
      <p className="field-label text-xs" id={`${id}-label`}>
        {label}
      </p>
      <div
        className={cn('mt-1 flex items-center gap-3 rounded-lg border border-dashed p-2', over ? 'border-brand-600 bg-brand-50' : 'border-gray-300')}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault()
            setOver(true)
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          const f = e.dataTransfer.files[0]
          if (f) void load(f)
        }}
      >
        <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100', kind === 'person' && 'rounded-full')}>
          {busy ? (
            <Loader2 aria-hidden className="h-5 w-5 animate-spin text-ink-muted" />
          ) : value ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL chosen by the user
            <img src={value.src} alt="" className={cn('h-full w-full', kind === 'logo' || kind === 'signature' ? 'object-contain' : 'object-cover')} />
          ) : (
            <ImagePlus aria-hidden className="h-5 w-5 text-ink-muted" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <label className={cn('inline-flex h-9 cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-ink hover:bg-gray-50 focus-within:ring-2 focus-within:ring-brand-600', busy && 'pointer-events-none opacity-50')}>
            {value ? 'Replace' : 'Choose image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
              className="sr-only"
              aria-label={`${value ? 'Replace' : 'Choose'} ${label}`}
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void load(f)
              }}
            />
          </label>
          {value && (
            <>
              <Button variant="ghost" size="icon-sm" aria-label={`Rotate ${label} left`} onClick={() => void rotate(-1)} disabled={busy}>
                <RotateCcw aria-hidden className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Rotate ${label} right`} onClick={() => void rotate(1)} disabled={busy}>
                <RotateCw aria-hidden className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${label}`} onClick={() => onChange(undefined)} disabled={busy}>
                <Trash2 aria-hidden className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      {value && crop && (
        <div className="mt-2 space-y-1.5" role="group" aria-label={`Crop ${label}`}>
          {slider('zoom', 'Zoom', 1, 4)}
          {slider('ox', 'Left–right', -1, 1)}
          {slider('oy', 'Up–down', -1, 1)}
          {(value.zoom !== 1 || value.ox !== 0 || value.oy !== 0) && (
            <button type="button" className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => onChange({ ...value, zoom: 1, ox: 0, oy: 0 })}>
              Reset crop
            </button>
          )}
        </div>
      )}
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}
