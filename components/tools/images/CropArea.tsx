'use client'

import { useEffect, useRef, useState } from 'react'
import type { Point, Quad } from '@/lib/image/geometry'

const CORNER_NAMES = ['top-left', 'top-right', 'bottom-right', 'bottom-left']

interface CropAreaProps {
  src: string
  /** Natural aspect ratio of the image (width / height). */
  aspect: number
  quad: Quad
  onChange: (quad: Quad) => void
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Four-corner crop over an image. Corners can be dragged with a mouse or
 * finger, or focused and moved with the arrow keys (Shift for larger steps).
 * Non-rectangular shapes are straightened by perspective correction.
 */
export default function CropArea({ src, aspect, quad, onChange }: CropAreaProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const outerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<number | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  // Fit the image inside the available space without distorting it.
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const fit = () => {
      const { width, height } = el.getBoundingClientRect()
      const w = Math.min(width, height * aspect)
      setSize({ w, h: w / aspect })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [aspect])

  const setCorner = (i: number, p: Point) => {
    const next = quad.map((q, j) => (j === i ? { x: clamp01(p.x), y: clamp01(p.y) } : q)) as Quad
    onChange(next)
  }

  const pointFromEvent = (e: React.PointerEvent): Point | null => {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return null
    return { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height }
  }

  const path = `M0 0H1000V1000H0Z M${quad.map((p) => `${p.x * 1000} ${p.y * 1000}`).join(' L')}Z`

  return (
    <div ref={outerRef} className="flex h-full w-full items-center justify-center">
      <div
        ref={boxRef}
        className="relative touch-none select-none"
        style={size ? { width: size.w, height: size.h } : { visibility: 'hidden' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        <img src={src} alt="" className="absolute inset-0 h-full w-full" draggable={false} />
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d={path} fill="rgba(17,24,39,0.55)" fillRule="evenodd" />
          <polygon
            points={quad.map((p) => `${p.x * 1000},${p.y * 1000}`).join(' ')}
            fill="none"
            stroke="#E53935"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {quad.map((p, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Move ${CORNER_NAMES[i]} corner. Use arrow keys.`}
            className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full focus-visible:ring-offset-0 active:cursor-grabbing"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              dragging.current = i
            }}
            onPointerMove={(e) => {
              if (dragging.current !== i) return
              const pt = pointFromEvent(e)
              if (pt) setCorner(i, pt)
            }}
            onPointerUp={() => (dragging.current = null)}
            onPointerCancel={() => (dragging.current = null)}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.05 : 0.01
              const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
              if (!d) return
              e.preventDefault()
              setCorner(i, { x: p.x + d[0], y: p.y + d[1] })
            }}
          >
            <span className="h-5 w-5 rounded-full border-[3px] border-white bg-brand-600 shadow-md" />
          </button>
        ))}
      </div>
    </div>
  )
}
