'use client'

import { useState } from 'react'
import { ListOrdered, Stamp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/tools/Feedback'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { SinglePdfInput, useSinglePdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { pdfBlob } from '@/lib/browser/download'
import { baseName, checkFile } from '@/lib/files/validate'
import { addPageNumbers, addWatermark, type NumberPosition, type WatermarkPosition } from '@/lib/pdf/edit'
import type { RGB } from '@/lib/pdf/operations'
import { parsePageRanges } from '@/lib/pdf/ranges'
import type { ToolId } from '@/lib/tools'

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function pagesFrom(text: string, count: number): number[] | undefined {
  if (!text.trim()) return undefined
  return [...new Set(parsePageRanges(text, count).flat())].sort((a, b) => a - b)
}

function useJob(tool: ToolId) {
  const state = useSinglePdf(tool, { render: false, unlockEncrypted: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultFile | null>(null)
  const run = async (fn: () => Promise<Uint8Array>, suffix: string) => {
    if (!state.pdf) return
    setBusy(true)
    setError(null)
    try {
      const bytes = await fn()
      setResult({ blob: pdfBlob(bytes), name: `${baseName(state.pdf.name)}_${suffix}.pdf`, pageCount: state.pdf.pageCount })
      focusResult()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return { state, busy, error, result, setResult, run }
}

const NUMBER_POSITIONS: [NumberPosition, string][] = [
  ['top-left', 'Top left'],
  ['top-center', 'Top centre'],
  ['top-right', 'Top right'],
  ['bottom-left', 'Bottom left'],
  ['bottom-center', 'Bottom centre'],
  ['bottom-right', 'Bottom right'],
]

const FORMATS = ['{n}', 'Page {n}', '{n} of {total}', 'Page {n} of {total}', '- {n} -']

export function PageNumbersTool() {
  const { state, busy, error, result, setResult, run } = useJob('add-page-numbers')
  const { pdf } = state
  const [position, setPosition] = useState<NumberPosition>('bottom-center')
  const [format, setFormat] = useState('Page {n} of {total}')
  const [start, setStart] = useState('1')
  const [size, setSize] = useState(11)
  const [margin, setMargin] = useState(28)
  const [color, setColor] = useState('#333333')
  const [pages, setPages] = useState('')

  if (result)
    return <ResultPanel title="Page numbers added" files={[result]} source="add-page-numbers" resetLabel="Change settings" onReset={() => setResult(null)} />

  return (
    <div className="space-y-5">
      <SinglePdfInput state={state} />
      {pdf && (
        <div className="panel grid max-w-3xl gap-5 p-5 md:grid-cols-2">
          <fieldset className="md:col-span-2">
            <legend className="field-label">Position</legend>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {NUMBER_POSITIONS.map(([v, l]) => (
                <label key={v} className="choice">
                  <input type="radio" name="num-pos" className="sr-only" checked={position === v} onChange={() => setPosition(v)} />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="num-format" className="field-label">
              Format
            </label>
            <select id="num-format" className="field" value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f.replace('{n}', '3').replace('{total}', '10')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="num-start" className="field-label">
              First number
            </label>
            <input id="num-start" inputMode="numeric" className="field" value={start} onChange={(e) => setStart(e.target.value.replace(/[^\d]/g, ''))} />
          </div>
          <div>
            <label htmlFor="num-size" className="field-label">
              Font size: {size} pt
            </label>
            <input id="num-size" type="range" min={6} max={36} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mt-2 w-full accent-brand-600" />
          </div>
          <div>
            <label htmlFor="num-margin" className="field-label">
              Distance from edge: {margin} pt
            </label>
            <input id="num-margin" type="range" min={8} max={72} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="mt-2 w-full accent-brand-600" />
          </div>
          <div>
            <label htmlFor="num-color" className="field-label">
              Colour
            </label>
            <input id="num-color" type="color" className="mt-1.5 h-10 w-20 rounded border border-gray-300" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <div>
            <label htmlFor="num-pages" className="field-label">
              Pages (optional)
            </label>
            <input id="num-pages" className="field" placeholder={`All ${pdf.pageCount}, or e.g. 2-${pdf.pageCount}`} value={pages} onChange={(e) => setPages(e.target.value)} />
            <p className="field-hint">The first chosen page gets the first number.</p>
          </div>
          <div className="md:col-span-2">
            <Button
              onClick={() =>
                run(
                  () =>
                    addPageNumbers(
                      { name: pdf.name, bytes: pdf.bytes, password: pdf.password },
                      { position, format, start: Number(start || 1), fontSize: size, margin, color: hexToRgb(color), pages: pagesFrom(pages, pdf.pageCount) }
                    ),
                  'numbered'
                )
              }
              disabled={busy}
            >
              <ListOrdered aria-hidden className="h-5 w-5" />
              Add page numbers
            </Button>
            {busy && <Spinner label="Numbering pages…" className="ml-3" />}
            {error && (
              <Alert tone="error" className="mt-3">
                {error}
              </Alert>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const WM_POSITIONS: [WatermarkPosition, string][] = [
  ['center', 'Centre'],
  ['top-left', 'Top left'],
  ['top-center', 'Top centre'],
  ['top-right', 'Top right'],
  ['bottom-left', 'Bottom left'],
  ['bottom-center', 'Bottom centre'],
  ['bottom-right', 'Bottom right'],
]

export function WatermarkTool() {
  const { state, busy, error, result, setResult, run } = useJob('add-watermark')
  const { pdf } = state
  const [kind, setKind] = useState<'text' | 'image'>('text')
  const [text, setText] = useState('CONFIDENTIAL')
  const [image, setImage] = useState<{ bytes: Uint8Array; type: 'png' | 'jpeg'; name: string } | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [position, setPosition] = useState<WatermarkPosition>('center')
  const [scale, setScale] = useState(kind === 'text' ? 10 : 30)
  const [opacity, setOpacity] = useState(30)
  const [rotation, setRotation] = useState(45)
  const [color, setColor] = useState('#E53935')
  const [pages, setPages] = useState('')

  if (result) return <ResultPanel title="Watermark added" files={[result]} source="add-watermark" resetLabel="Change settings" onReset={() => setResult(null)} />

  return (
    <div className="space-y-5">
      <SinglePdfInput state={state} />
      {pdf && (
        <div className="panel grid max-w-3xl gap-5 p-5 md:grid-cols-2">
          <fieldset className="md:col-span-2">
            <legend className="field-label">Watermark</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:w-80">
              {(['text', 'image'] as const).map((k) => (
                <label key={k} className="choice capitalize">
                  <input
                    type="radio"
                    name="wm-kind"
                    className="sr-only"
                    checked={kind === k}
                    onChange={() => {
                      setKind(k)
                      setScale(k === 'text' ? 10 : 30)
                    }}
                  />
                  {k}
                </label>
              ))}
            </div>
          </fieldset>
          {kind === 'text' ? (
            <>
              <div>
                <label htmlFor="wm-text" className="field-label">
                  Text
                </label>
                <input id="wm-text" className="field" maxLength={80} value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              <div>
                <label htmlFor="wm-color" className="field-label">
                  Colour
                </label>
                <input id="wm-color" type="color" className="mt-1.5 h-10 w-20 rounded border border-gray-300" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
            </>
          ) : (
            <div className="md:col-span-2">
              <label className="field-label" htmlFor="wm-image">
                Image (PNG or JPG)
              </label>
              <input
                id="wm-image"
                type="file"
                accept="image/png,image/jpeg"
                className="mt-1.5 block text-sm"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  try {
                    const { kind: k } = await checkFile(f, 'image')
                    if (k !== 'png' && k !== 'jpeg') throw new Error('Use a PNG or JPG image.')
                    setImage({ bytes: new Uint8Array(await f.arrayBuffer()), type: k, name: f.name })
                    setImageError(null)
                  } catch (err) {
                    setImageError(errorMessage(err))
                  }
                }}
              />
              {imageError && (
                <Alert tone="error" className="mt-2">
                  {imageError}
                </Alert>
              )}
            </div>
          )}
          <fieldset className="md:col-span-2">
            <legend className="field-label">Position</legend>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {WM_POSITIONS.map(([v, l]) => (
                <label key={v} className="choice px-1 text-xs sm:text-sm">
                  <input type="radio" name="wm-pos" className="sr-only" checked={position === v} onChange={() => setPosition(v)} />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="wm-scale" className="field-label">
              Size: {scale}% of page width
            </label>
            <input id="wm-scale" type="range" min={kind === 'text' ? 2 : 5} max={kind === 'text' ? 25 : 100} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="mt-2 w-full accent-brand-600" />
          </div>
          <div>
            <label htmlFor="wm-opacity" className="field-label">
              Opacity: {opacity}%
            </label>
            <input id="wm-opacity" type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="mt-2 w-full accent-brand-600" />
          </div>
          <div>
            <label htmlFor="wm-rotation" className="field-label">
              Rotation: {rotation}°
            </label>
            <input id="wm-rotation" type="range" min={-90} max={90} step={5} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="mt-2 w-full accent-brand-600" />
          </div>
          <div>
            <label htmlFor="wm-pages" className="field-label">
              Pages (optional)
            </label>
            <input id="wm-pages" className="field" placeholder={`All ${pdf.pageCount}, or e.g. 1-3`} value={pages} onChange={(e) => setPages(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button
              disabled={busy || (kind === 'image' && !image) || (kind === 'text' && !text.trim())}
              onClick={() =>
                run(
                  () =>
                    addWatermark(
                      { name: pdf.name, bytes: pdf.bytes, password: pdf.password },
                      {
                        kind,
                        text,
                        image: image ?? undefined,
                        position,
                        scale: scale / 100,
                        opacity: opacity / 100,
                        rotation,
                        color: hexToRgb(color),
                        pages: pagesFrom(pages, pdf.pageCount),
                      }
                    ),
                  'watermarked'
                )
              }
            >
              <Stamp aria-hidden className="h-5 w-5" />
              Add watermark
            </Button>
            {busy && <Spinner label="Adding watermark…" className="ml-3" />}
            {error && (
              <Alert tone="error" className="mt-3">
                {error}
              </Alert>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
