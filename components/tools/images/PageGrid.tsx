'use client'

import { ArrowLeft, ArrowRight, Pencil, RotateCw, ScanSearch, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SortableList, { moveItem } from '@/components/tools/SortableList'
import { FILTER_LABELS } from '@/lib/image/filters'
import { isFullQuad } from '@/lib/image/geometry'
import type { ImagePage } from '@/lib/image/pages'

interface PageGridProps {
  pages: ImagePage[]
  onReorder: (pages: ImagePage[]) => void
  onEdit: (page: ImagePage) => void
  onRotate: (page: ImagePage) => void
  onRemove: (page: ImagePage) => void
  showDetection?: boolean
}

/** Reorderable grid of image pages with per-page actions. */
export default function PageGrid({ pages, onReorder, onEdit, onRotate, onRemove, showDetection }: PageGridProps) {
  return (
    <SortableList
      items={pages}
      getId={(p) => p.id}
      onReorder={onReorder}
      layout="grid"
      handleLabel={(p) => `Reorder page ${pages.indexOf(p) + 1}, ${p.name}`}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
      renderItem={(page, index, handle) => (
        <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-2" data-testid="image-page">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-ink-soft">Page {index + 1}</span>
            {handle}
          </div>
          <button
            type="button"
            onClick={() => onEdit(page)}
            className="canvas-backdrop mt-1 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg"
            aria-label={`Edit page ${index + 1}: crop, rotate and filter`}
          >
            {page.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL
              <img src={page.previewUrl} alt="" className="max-h-full max-w-full object-contain shadow-sm" draggable={false} />
            ) : (
              <span className="h-full w-full animate-pulse bg-gray-100" />
            )}
          </button>
          <p className="mt-1.5 truncate text-xs text-ink-muted" title={page.name}>
            {FILTER_LABELS[page.edits.filter]}
            {!isFullQuad(page.edits.quad) && ' · cropped'}
            {page.edits.rotation ? ` · ${page.edits.rotation}°` : ''}
          </p>
          {showDetection && page.detected === false && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-800">
              <ScanSearch aria-hidden className="h-3.5 w-3.5" />
              Edges not found: crop by hand
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-0.5 pt-1.5">
            <Button variant="ghost" size="icon-sm" aria-label={`Edit page ${index + 1}`} onClick={() => onEdit(page)}>
              <Pencil aria-hidden className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Rotate page ${index + 1} right`} onClick={() => onRotate(page)}>
              <RotateCw aria-hidden className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Move page ${index + 1} earlier`}
              disabled={index === 0}
              onClick={() => onReorder(moveItem(pages, index, -1))}
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Move page ${index + 1} later`}
              disabled={index === pages.length - 1}
              onClick={() => onReorder(moveItem(pages, index, 1))}
            >
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Remove page ${index + 1}`} onClick={() => onRemove(page)}>
              <Trash2 aria-hidden className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    />
  )
}
