'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/tools/Feedback'
import { checkFile, FileRejectedError } from '@/lib/files/validate'
import { SIGNATURE_FONTS } from '@/lib/fonts'
import { cn } from '@/lib/utils'

export interface Signature {
  png: Uint8Array
  url: string
  /** width / height */
  aspect: number
}

type Tab = 'draw' | 'type' | 'upload'

const INKS = [
  { name: 'Black', css: '#111827' },
  { name: 'Blue', css: '#1D4ED8' },
  { name: 'Red', css: '#B91C1C' },
]

/** Crops a canvas to its non-transparent pixels and encodes it as PNG. */
async function trimToSignature(canvas: HTMLCanvasElement): Promise<Signature | null> {
  const ctx = canvas.getContext('2d')!
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
  if (maxX < 0) return null
  const pad = 6
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)
  const out = document.createElement('canvas')
  out.width = maxX - minX + 1
  out.height = maxY - minY + 1
  out.getContext('2d')!.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height)
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, 'image/png'))
  if (!blob) return null
  return { png: new Uint8Array(await blob.arrayBuffer()), url: URL.createObjectURL(blob), aspect: out.width / out.height }
}

export default function SignatureMaker({ onClose, onCreate }: { onClose: () => void; onCreate: (s: Signature) => void }) {
  const [tab, setTab] = useState<Tab>('draw')
  const [ink, setInk] = useState(INKS[0])
  const [text, setText] = useState('')
  const [fontId, setFontId] = useState<(typeof SIGNATURE_FONTS)[number]['id']>('caveat')
  const [upload, setUpload] = useState<{ bitmap: ImageBitmap; name: string } | null>(null)
  const [removeWhite, setRemoveWhite] = useState(true)
  const [hasInk, setHasInk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const padRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef<{ x: number; y: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => upload?.bitmap.close(), [upload])

  // Size the drawing pad to its element at device resolution.
  useEffect(() => {
    if (tab !== 'draw') return
    const c = padRef.current
    if (!c) return
    const r = c.getBoundingClientRect()
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    c.width = Math.round(r.width * ratio)
    c.height = Math.round(r.height * ratio)
    setHasInk(false)
  }, [tab])

  const padPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * e.currentTarget.width, y: ((e.clientY - r.top) / r.height) * e.currentTarget.height }
  }

  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }, pressure: number) => {
    const ctx = padRef.current!.getContext('2d')!
    ctx.strokeStyle = ink.css
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = (padRef.current!.width / 220) * (0.6 + (pressure || 0.5) * 0.8)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  const clearPad = () => {
    const c = padRef.current
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
    setHasInk(false)
  }

  const create = async () => {
    setError(null)
    let source: HTMLCanvasElement | null = null
    if (tab === 'draw') source = padRef.current
    if (tab === 'type') {
      const font = SIGNATURE_FONTS.find((f) => f.id === fontId)!.font
      const family = font.style.fontFamily
      await document.fonts.load(`120px ${family}`)
      source = document.createElement('canvas')
      const ctx = source.getContext('2d')!
      ctx.font = `120px ${family}`
      const w = Math.ceil(ctx.measureText(text).width) + 80
      source.width = Math.max(200, w)
      source.height = 260
      ctx.font = `120px ${family}`
      ctx.fillStyle = ink.css
      ctx.textBaseline = 'middle'
      ctx.fillText(text, 40, 130)
    }
    if (tab === 'upload' && upload) {
      const scale = Math.min(1, 1200 / Math.max(upload.bitmap.width, upload.bitmap.height))
      source = document.createElement('canvas')
      source.width = Math.round(upload.bitmap.width * scale)
      source.height = Math.round(upload.bitmap.height * scale)
      const ctx = source.getContext('2d')!
      ctx.drawImage(upload.bitmap, 0, 0, source.width, source.height)
      if (removeWhite) {
        const img = ctx.getImageData(0, 0, source.width, source.height)
        const d = img.data
        for (let i = 0; i < d.length; i += 4) {
          const l = (d[i] + d[i + 1] + d[i + 2]) / 3
          // Fade light paper to transparent, keeping the ink.
          if (l > 200) d[i + 3] = Math.max(0, Math.round(d[i + 3] * (255 - l) / 55))
        }
        ctx.putImageData(img, 0, 0)
      }
    }
    if (!source) return
    const sig = await trimToSignature(source)
    if (!sig) return setError('The signature is empty. Draw, type or upload one first.')
    onCreate(sig)
  }

  const ready = tab === 'draw' ? hasInk : tab === 'type' ? text.trim().length > 0 : !!upload

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title="Create your signature"
      description="It’s added to the PDF as an image. Nothing is stored after you leave this page."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={create} disabled={!ready}>
            Use signature
          </Button>
        </>
      }
    >
      <div role="tablist" aria-label="Signature type" className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1">
        {(['draw', 'type', 'upload'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn('rounded-md py-1.5 text-sm font-semibold capitalize', tab === t ? 'bg-white text-ink shadow-card' : 'text-ink-muted hover:text-ink')}
          >
            {t}
          </button>
        ))}
      </div>

      {tab !== 'upload' && (
        <div className="mt-4 flex items-center gap-2" role="radiogroup" aria-label="Ink colour">
          <span className="text-sm font-semibold text-ink">Ink</span>
          {INKS.map((c) => (
            <button
              key={c.name}
              type="button"
              role="radio"
              aria-checked={ink.name === c.name}
              aria-label={c.name}
              onClick={() => setInk(c)}
              className={cn('h-7 w-7 rounded-full border-2', ink.name === c.name ? 'border-brand-600' : 'border-white ring-1 ring-gray-300')}
              style={{ background: c.css }}
            />
          ))}
        </div>
      )}

      {tab === 'draw' && (
        <div className="mt-3">
          <canvas
            ref={padRef}
            aria-label="Signature drawing pad. Draw with a mouse, finger or stylus."
            data-testid="signature-pad"
            className="h-48 w-full touch-none rounded-xl border-2 border-dashed border-gray-300 bg-white"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              drawing.current = padPoint(e)
              stroke(drawing.current, { x: drawing.current.x + 0.1, y: drawing.current.y }, e.pressure)
              setHasInk(true)
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return
              const p = padPoint(e)
              stroke(drawing.current, p, e.pressure)
              drawing.current = p
            }}
            onPointerUp={() => (drawing.current = null)}
            onPointerCancel={() => (drawing.current = null)}
          />
          <Button variant="ghost" size="xs" className="mt-2" onClick={clearPad} disabled={!hasInk}>
            <Eraser aria-hidden className="h-4 w-4" />
            Clear
          </Button>
        </div>
      )}

      {tab === 'type' && (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="sig-text" className="field-label">
              Your name
            </label>
            <input id="sig-text" className="field" value={text} maxLength={60} onChange={(e) => setText(e.target.value)} autoFocus />
          </div>
          <fieldset>
            <legend className="field-label">Style</legend>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
              {SIGNATURE_FONTS.map((f) => (
                <label key={f.id} className="choice h-16 text-2xl font-normal">
                  <input type="radio" name="sig-font" className="sr-only" checked={fontId === f.id} onChange={() => setFontId(f.id)} />
                  <span className={f.font.className} style={{ color: ink.css }}>
                    {text.trim() || 'Your name'}
                  </span>
                  <span className="sr-only">{f.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {tab === 'upload' && (
        <div className="mt-4 space-y-3">
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload aria-hidden className="h-4 w-4" />
            Choose signature image
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            data-testid="signature-upload"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                await checkFile(file, 'image')
                setUpload({ bitmap: await createImageBitmap(file), name: file.name })
                setError(null)
              } catch (err) {
                setError(err instanceof FileRejectedError ? err.message : 'That image couldn’t be read.')
              }
            }}
          />
          {upload && <p className="text-sm text-ink-soft">{upload.name}</p>}
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={removeWhite} onChange={(e) => setRemoveWhite(e.target.checked)} />
            Make white background transparent
          </label>
        </div>
      )}

      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}
    </Dialog>
  )
}
