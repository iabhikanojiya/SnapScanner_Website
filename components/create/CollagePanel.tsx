'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ImageField from '@/components/create/ImageField'
import { slotKey } from '@/lib/create/categories/photo-collages'
import type { ImageValue } from '@/lib/create/engine'
import { imageFromFile } from '@/lib/create/images'
import { img, type Content } from '@/lib/create/kit'
import { cn } from '@/lib/utils'

interface Props {
  content: Content
  slots: number
  selected: number
  onSelect: (i: number) => void
  /** Applies several content changes as one undo step. */
  onPatch: (patch: Content, coalesce?: string) => void
  onError: (message: string) => void
}

/** Photo frames of a collage: add many at once, drag to rearrange, crop the selected one. */
export default function CollagePanel({ content, slots, selected, onSelect, onPatch, onError }: Props) {
  const [busy, setBusy] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const photo = (i: number) => img(content, slotKey(i))

  const swap = (a: number, b: number) => {
    if (a === b || b < 0 || b >= slots) return
    onPatch({ [slotKey(a)]: content[slotKey(b)], [slotKey(b)]: content[slotKey(a)] })
    onSelect(b)
  }

  /** Fills frames with files: the target frame first, then empty frames in order. */
  const addFiles = async (files: File[], start?: number) => {
    if (!files.length) return
    setBusy(true)
    const patch: Content = {}
    const order = [...(start !== undefined ? [start] : []), ...Array.from({ length: slots }, (_, i) => i).filter((i) => i !== start && !photo(i))]
    const errors: string[] = []
    let k = 0
    for (const f of files) {
      if (k >= order.length) {
        errors.push(`There’s no empty frame for “${f.name}”. Choose a layout with more frames, or replace a photo.`)
        continue
      }
      try {
        patch[slotKey(order[k])] = await imageFromFile(f, 'photo')
        k++
      } catch (e) {
        errors.push(e instanceof Error ? e.message : `“${f.name}” couldn’t be used.`)
      }
    }
    setBusy(false)
    if (Object.keys(patch).length) onPatch(patch)
    if (errors.length) onError(errors.join(' '))
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="photos-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="photos-heading" className="text-sm font-bold text-ink">
          Photos ({slots} frames)
        </h2>
        <label className={cn('inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700 focus-within:ring-2 focus-within:ring-brand-600 focus-within:ring-offset-2', busy && 'pointer-events-none opacity-60')}>
          {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ImagePlus aria-hidden className="h-4 w-4" />}
          Add photos
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              void addFiles(files)
            }}
          />
        </label>
      </div>
      <p className="mt-1 text-xs text-ink-muted">Drag a photo onto another frame to swap them, or drop image files onto a frame. Photos are processed on this device.</p>
      <ul className="mt-3 grid grid-cols-3 gap-2" data-testid="collage-slots">
        {Array.from({ length: slots }, (_, i) => {
          const p = photo(i)
          return (
            <li key={i}>
              <div
                role="button"
                tabIndex={0}
                aria-pressed={selected === i}
                aria-label={`Frame ${i + 1}${p ? '' : ', empty'}`}
                draggable={!!p}
                onClick={() => onSelect(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(i)
                  }
                }}
                onDragStart={(e) => {
                  setDragFrom(i)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', String(i))
                }}
                onDragEnd={() => {
                  setDragFrom(null)
                  setOver(null)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOver(i)
                }}
                onDragLeave={() => setOver((o) => (o === i ? null : o))}
                onDrop={(e) => {
                  e.preventDefault()
                  setOver(null)
                  if (e.dataTransfer.files.length) void addFiles(Array.from(e.dataTransfer.files), i)
                  else if (dragFrom !== null) swap(dragFrom, i)
                  setDragFrom(null)
                }}
                data-slot={i}
                className={cn(
                  'relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 bg-gray-100 text-xs font-semibold text-ink-muted outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                  selected === i ? 'border-brand-600' : 'border-transparent',
                  over === i && 'border-dashed border-brand-600 bg-brand-50'
                )}
              >
                {p ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL chosen by the user
                  <img src={p.src} alt="" className="pointer-events-none h-full w-full object-cover" />
                ) : (
                  'Empty'
                )}
                <span className="absolute left-1 top-1 rounded bg-white/90 px-1 text-[10px] font-bold text-ink">{i + 1}</span>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-4 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Frame {selected + 1}</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" aria-label={`Move frame ${selected + 1} photo earlier`} disabled={selected === 0} onClick={() => swap(selected, selected - 1)}>
              <ArrowLeft aria-hidden className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Move frame ${selected + 1} photo later`} disabled={selected >= slots - 1} onClick={() => swap(selected, selected + 1)}>
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ImageField
          className="mt-2"
          label={`Photo in frame ${selected + 1}`}
          kind="photo"
          value={photo(selected)}
          onChange={(v: ImageValue | undefined, coalesce) => onPatch({ [slotKey(selected)]: v }, coalesce)}
          onError={onError}
        />
      </div>
    </section>
  )
}
