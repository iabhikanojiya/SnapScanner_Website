'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { Check, Copy, Download, Globe, Mail, Phone, RotateCcw, Type, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/tools/Feedback'
import { downloadBlob } from '@/lib/browser/download'
import { EMPTY_FIELDS, QrTooLongError, buildPayload, colourWarning, qrMatrix, type QrFields, type QrLevel, type QrType } from '@/lib/qr'
import { QR_TEMPLATES, getTemplate, styledQrSvg, svgDataUrl } from '@/lib/qr-style'
import { SITE_URL } from '@/lib/site'
import { cn } from '@/lib/utils'

const TYPES: { id: QrType; label: string; icon: typeof Globe }[] = [
  { id: 'url', label: 'Website', icon: Globe },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'phone', label: 'Phone', icon: Phone },
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
]

const SIZES = [256, 512, 1024, 2048]
const LEVELS: { id: QrLevel; label: string }[] = [
  { id: 'L', label: 'Low (7%)' },
  { id: 'M', label: 'Medium (15%)' },
  { id: 'Q', label: 'Quartile (25%)' },
  { id: 'H', label: 'High (30%)' },
]

const noSubscribe = () => () => {}

const DEFAULTS = { template: 'classic', fg: '#111827', bg: '#ffffff', size: 1024, level: 'M' as QrLevel, margin: 4, label: 'SCAN ME' }

/** Content used for template thumbnails until the user has entered something valid. */
const SAMPLE_MATRIX = qrMatrix(SITE_URL, 'M')

/** Draws the SVG onto a canvas at the given pixel size and returns a PNG. */
async function rasterize(svg: string, width: number, height: number): Promise<Blob> {
  const img = new Image()
  img.src = svgDataUrl(svg)
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas isn’t available in this browser.')
  ctx.drawImage(img, 0, 0, width, height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => {
      canvas.width = canvas.height = 0
      if (b) resolve(b)
      else reject(new Error('The PNG couldn’t be created.'))
    }, 'image/png')
  )
}

export default function QrCodeGenerator() {
  const [type, setType] = useState<QrType>('url')
  const [fields, setFields] = useState<QrFields>(EMPTY_FIELDS)
  const [templateId, setTemplateId] = useState(DEFAULTS.template)
  const [label, setLabel] = useState(DEFAULTS.label)
  const [fg, setFg] = useState(DEFAULTS.fg)
  const [bg, setBg] = useState(DEFAULTS.bg)
  const [size, setSize] = useState(DEFAULTS.size)
  const [level, setLevel] = useState<QrLevel>(DEFAULTS.level)
  const [margin, setMargin] = useState(DEFAULTS.margin)
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  // Copying images needs the async Clipboard API (not available on the server or in some browsers).
  const canCopy = useSyncExternalStore(
    noSubscribe,
    () => typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write,
    () => false
  )

  const set = <K extends keyof QrFields>(k: K, v: QrFields[K]) => {
    setFields((f) => ({ ...f, [k]: v }))
    setStatus(null)
  }

  // The code updates as soon as the input is valid.
  const payload = useMemo(() => buildPayload(type, fields), [type, fields])
  const result = useMemo(() => {
    if (!payload.ok) return null
    try {
      return { matrix: qrMatrix(payload.data, level), error: null }
    } catch (e) {
      return { matrix: null, error: e instanceof QrTooLongError ? e.message : 'The QR code couldn’t be created.' }
    }
  }, [payload, level])
  const matrix = result?.matrix ?? null
  const warning = colourWarning(fg, bg)
  const template = getTemplate(templateId)
  const styled = useMemo(() => (matrix ? styledQrSvg(matrix, { fg, bg, margin, style: template.style, label, size }) : null), [matrix, fg, bg, margin, template, label, size])
  const pngHeight = styled ? Math.round((size * styled.height) / styled.width) : size
  const fileBase = `qr-code-${type}`

  // Template thumbnails show the user's code once it's valid, in each template's own colours.
  const thumbs = useMemo(
    () => QR_TEMPLATES.map((t) => ({ t, url: svgDataUrl(styledQrSvg(matrix ?? SAMPLE_MATRIX, { fg: t.fg, bg: t.bg, margin: 2, style: t.style, label, size: 160 }).svg) })),
    [matrix, label]
  )
  const applyTemplate = (id: string) => {
    const t = getTemplate(id)
    setTemplateId(id)
    setFg(t.fg)
    setBg(t.bg)
    setStatus(null)
  }

  const reset = () => {
    setFields(EMPTY_FIELDS)
    setTemplateId(DEFAULTS.template)
    setLabel(DEFAULTS.label)
    setFg(DEFAULTS.fg)
    setBg(DEFAULTS.bg)
    setSize(DEFAULTS.size)
    setLevel(DEFAULTS.level)
    setMargin(DEFAULTS.margin)
    setStatus(null)
  }

  const downloadPng = async () => {
    if (!styled) return
    try {
      downloadBlob(await rasterize(styled.svg, size, pngHeight), `${fileBase}.png`)
    } catch (e) {
      setStatus({ tone: 'error', text: e instanceof Error ? e.message : 'The PNG couldn’t be created.' })
    }
  }
  const downloadSvg = () => {
    if (!styled) return
    downloadBlob(new Blob([styled.svg], { type: 'image/svg+xml' }), `${fileBase}.svg`)
  }
  const copy = async () => {
    if (!styled) return
    try {
      const blob = await rasterize(styled.svg, size, pngHeight)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setStatus({ tone: 'success', text: 'QR code image copied. Paste it into a document or message.' })
    } catch {
      setStatus({ tone: 'error', text: 'Copying images isn’t allowed here. Download the PNG instead.' })
    }
  }

  const field = (key: keyof QrFields, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`qr-${key}`} className="field-label">
        {label}
      </label>
      <input id={`qr-${key}`} className="field" value={fields[key] as string} onChange={(e) => set(key, e.target.value as never)} {...props} />
    </div>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="space-y-5">
        <section className="panel p-5" aria-labelledby="qr-content">
          <h2 id="qr-content" className="font-bold text-ink">
            Content
          </h2>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="QR code type">
            {TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={type === id}
                onClick={() => {
                  setType(id)
                  setStatus(null)
                }}
                className={cn('inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold', type === id ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white text-ink-soft hover:border-gray-400')}
              >
                <Icon aria-hidden className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3">
            {type === 'url' && field('url', 'Website address', { placeholder: 'https://example.com', inputMode: 'url', autoComplete: 'url' })}
            {type === 'text' && (
              <div>
                <label htmlFor="qr-text" className="field-label">
                  Text
                </label>
                <textarea id="qr-text" rows={4} className="field" value={fields.text} onChange={(e) => set('text', e.target.value)} maxLength={1500} />
              </div>
            )}
            {type === 'email' && (
              <>
                {field('email', 'Email address', { type: 'email', placeholder: 'name@example.com', autoComplete: 'email' })}
                {field('subject', 'Subject (optional)')}
                <div>
                  <label htmlFor="qr-body" className="field-label">
                    Message (optional)
                  </label>
                  <textarea id="qr-body" rows={3} className="field" value={fields.body} onChange={(e) => set('body', e.target.value)} maxLength={800} />
                </div>
              </>
            )}
            {type === 'phone' && field('phone', 'Phone number', { type: 'tel', placeholder: '+1 555 0100', autoComplete: 'tel' })}
            {type === 'wifi' && (
              <>
                {field('ssid', 'Network name (SSID)')}
                <div>
                  <label htmlFor="qr-security" className="field-label">
                    Security
                  </label>
                  <select id="qr-security" className="field" value={fields.security} onChange={(e) => set('security', e.target.value as QrFields['security'])}>
                    <option value="WPA">WPA/WPA2/WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">No password</option>
                  </select>
                </div>
                {fields.security !== 'nopass' && field('password', 'Password', { type: 'text', autoComplete: 'off', spellCheck: false })}
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={fields.hidden} onChange={(e) => set('hidden', e.target.checked)} />
                  Hidden network
                </label>
                <p className="text-xs text-ink-muted">The password is put into the QR code itself, so anyone who scans it can read it. It never leaves this page.</p>
              </>
            )}
          </div>
          {!payload.ok && !payload.empty && (
            <p className="mt-2 text-sm text-brand-700" role="alert">
              {payload.error}
            </p>
          )}
        </section>

        <section className="panel p-5" aria-labelledby="qr-templates">
          <h2 id="qr-templates" className="font-bold text-ink">
            Design templates
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Pick a style. You can still change the colours below.</p>
          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6" role="radiogroup" aria-label="QR code design" data-testid="qr-templates">
            {thumbs.map(({ t, url }) => (
              <li key={t.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={templateId === t.id}
                  aria-label={t.name}
                  onClick={() => applyTemplate(t.id)}
                  className={cn(
                    'flex w-full flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-colors',
                    templateId === t.id ? 'border-brand-600 bg-brand-50' : 'border-transparent bg-gray-50 hover:border-gray-300'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- locally generated SVG */}
                  <img src={url} alt="" className="aspect-square w-full object-contain" />
                  <span className="text-center text-xs font-semibold leading-tight text-ink">{t.name}</span>
                </button>
              </li>
            ))}
          </ul>
          {template.style.frame !== 'none' && (
            <div className="mt-4 max-w-xs">
              <label htmlFor="qr-label" className="field-label">
                Frame text
              </label>
              <input id="qr-label" className="field" value={label} maxLength={24} onChange={(e) => setLabel(e.target.value)} />
            </div>
          )}
        </section>

        <section className="panel p-5" aria-labelledby="qr-style">
          <h2 id="qr-style" className="font-bold text-ink">
            Style
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="qr-fg" className="field-label">
                  Foreground
                </label>
                <input id="qr-fg" type="color" className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white" value={fg} onChange={(e) => setFg(e.target.value)} />
              </div>
              <div className="flex-1">
                <label htmlFor="qr-bg" className="field-label">
                  Background
                </label>
                <input id="qr-bg" type="color" className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white" value={bg} onChange={(e) => setBg(e.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="qr-size" className="field-label">
                Image size
              </label>
              <select id="qr-size" className="field" value={size} onChange={(e) => setSize(Number(e.target.value))}>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} × {s} px
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="qr-level" className="field-label">
                Error correction
              </label>
              <select id="qr-level" className="field" value={level} onChange={(e) => setLevel(e.target.value as QrLevel)}>
                {LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <p className="field-hint">Higher levels still scan when part of the code is damaged or covered, but make the code denser.</p>
            </div>
            <div>
              <label htmlFor="qr-margin" className="field-label">
                Margin (quiet zone): {margin} {margin === 1 ? 'module' : 'modules'}
              </label>
              <input id="qr-margin" type="range" min={0} max={10} step={1} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="mt-3 w-full accent-brand-600" />
              {margin < 2 && <p className="field-hint text-amber-800">Scanners need a clear border. Keep at least 2 modules unless the code sits on a plain, light background.</p>}
            </div>
          </div>
          {warning && (
            <Alert tone="warning" className="mt-3">
              {warning}
            </Alert>
          )}
        </section>
      </div>

      <section className="panel h-fit p-5 lg:sticky lg:top-[calc(var(--header-height)+1rem)]" aria-labelledby="qr-preview">
        <h2 id="qr-preview" className="font-bold text-ink">
          Preview
        </h2>
        <div className="mt-3 flex aspect-square items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4">
          {styled ? (
            // eslint-disable-next-line @next/next/no-img-element -- locally generated SVG
            <img src={svgDataUrl(styled.svg)} alt="Generated QR code" className="max-h-full w-full object-contain" data-testid="qr-preview" />
          ) : (
            <p className="px-6 text-center text-sm text-ink-muted">{result?.error ?? 'Enter content to create your QR code. It updates as you type.'}</p>
          )}
        </div>
        {result?.error && (
          <p className="mt-2 text-sm text-brand-700" role="alert">
            {result.error}
          </p>
        )}
        {styled && (
          <p className="mt-2 text-xs text-ink-muted" data-testid="qr-info">
            {template.name} · PNG {size} × {pngHeight} px · {matrix!.length} × {matrix!.length} modules · SVG scales to any size
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => void downloadPng()} disabled={!styled}>
            <Download aria-hidden className="h-4 w-4" />
            PNG
          </Button>
          <Button size="sm" variant="secondary" onClick={downloadSvg} disabled={!styled}>
            <Download aria-hidden className="h-4 w-4" />
            SVG
          </Button>
          {canCopy && (
            <Button size="sm" variant="secondary" onClick={() => void copy()} disabled={!styled}>
              {status?.tone === 'success' ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
              Copy image
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={reset} className={cn(!canCopy && 'col-span-2')}>
            <RotateCcw aria-hidden className="h-4 w-4" />
            Reset
          </Button>
        </div>
        {status && (
          <p className={cn('mt-3 text-sm', status.tone === 'success' ? 'text-emerald-800' : 'text-brand-700')} role="status">
            {status.text}
          </p>
        )}
        <p className="mt-3 text-xs text-ink-muted">Test the code with your phone before printing it. Your content stays on this page; nothing is sent to a QR service.</p>
      </section>
    </div>
  )
}
