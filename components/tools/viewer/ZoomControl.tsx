'use client'

import { Maximize2, MoveHorizontal, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** 'width' fits the page width to the panel, 'page' fits a whole page; a number is a fixed zoom (1 = 100%). */
export type ZoomMode = 'width' | 'page' | number

export const ZOOM_STEPS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2]

/** Resolves a zoom mode to a scale, given the scales that fit the width and a whole page. */
export function resolveZoom(mode: ZoomMode, fitWidth: number, fitPage: number) {
  return mode === 'width' ? fitWidth : mode === 'page' ? fitPage : mode
}

interface ZoomControlProps {
  mode: ZoomMode
  /** The scale currently applied, shown as a percentage. */
  scale: number
  onChange: (mode: ZoomMode) => void
  className?: string
}

export default function ZoomControl({ mode, scale, onChange, className }: ZoomControlProps) {
  const pct = Math.round(scale * 100)
  const step = (dir: 1 | -1) => {
    const next = dir > 0 ? ZOOM_STEPS.find((s) => s > scale + 0.01) : [...ZOOM_STEPS].reverse().find((s) => s < scale - 0.01)
    onChange(next ?? (dir > 0 ? ZOOM_STEPS[ZOOM_STEPS.length - 1] : ZOOM_STEPS[0]))
  }
  const options = ZOOM_STEPS.includes(Math.round(scale * 100) / 100) || typeof mode !== 'number' ? ZOOM_STEPS : [...ZOOM_STEPS, scale].sort((a, b) => a - b)

  return (
    <div className={className ?? 'flex flex-wrap items-center gap-1'} role="group" aria-label="Zoom">
      <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => step(-1)} disabled={scale <= ZOOM_STEPS[0] + 0.001}>
        <ZoomOut aria-hidden className="h-4 w-4" />
      </Button>
      <label className="sr-only" htmlFor="zoom-level">
        Zoom level
      </label>
      <select
        id="zoom-level"
        data-testid="zoom-select"
        className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm tabular-nums text-ink"
        value={typeof mode === 'number' ? String(mode) : mode}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === 'width' || v === 'page' ? v : Number(v))
        }}
      >
        {typeof mode !== 'number' && <option value={mode}>{pct}%</option>}
        {options.map((s) => (
          <option key={s} value={String(s)}>
            {Math.round(s * 100)}%
          </option>
        ))}
      </select>
      <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => step(1)} disabled={scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1] - 0.001}>
        <ZoomIn aria-hidden className="h-4 w-4" />
      </Button>
      <Button variant={mode === 'width' ? 'secondary' : 'ghost'} size="xs" aria-pressed={mode === 'width'} onClick={() => onChange('width')}>
        <MoveHorizontal aria-hidden className="h-4 w-4" />
        Fit width
      </Button>
      <Button variant={mode === 'page' ? 'secondary' : 'ghost'} size="xs" aria-pressed={mode === 'page'} onClick={() => onChange('page')}>
        <Maximize2 aria-hidden className="h-4 w-4" />
        Fit page
      </Button>
    </div>
  )
}
