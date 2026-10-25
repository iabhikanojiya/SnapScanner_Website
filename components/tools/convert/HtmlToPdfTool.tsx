'use client'

import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { FileUp, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/tools/Feedback'
import { sanitizeHtml } from '@/lib/html'

const SAMPLE = `<h1>Meeting notes</h1>
<p><strong>Date:</strong> 23 October 2026</p>
<h2>Decisions</h2>
<ul>
  <li>Launch the new website tools</li>
  <li>Review the privacy notice</li>
</ul>
<table border="1" cellpadding="6" style="border-collapse:collapse">
  <tr><th>Owner</th><th>Task</th></tr>
  <tr><td>Asha</td><td>Final checks</td></tr>
</table>`

const MAX_HTML_BYTES = 5 * 1024 * 1024

export default function HtmlToPdfTool() {
  const [html, setHtml] = useState(SAMPLE)
  const [size, setSize] = useState<'A4' | 'Letter'>('A4')
  const [margin, setMargin] = useState<'10mm' | '20mm' | '0'>('20mm')
  const [error, setError] = useState<string | null>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // The sanitizer needs the browser's DOMParser, so the preview is built only on the client.
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const doc = useMemo(() => {
    if (!isClient) return ''
    const { body, head } = sanitizeHtml(html)
    return `<!doctype html><html><head><meta charset="utf-8">${head}<style>@page{size:${size};margin:${margin}}body{font-family:Arial,Helvetica,sans-serif;line-height:1.45;color:#111;margin:${margin === '0' ? '0' : '16px'}}img{max-width:100%}</style></head><body>${body}</body></html>`
  }, [html, size, margin, isClient])

  const print = () => {
    const w = frameRef.current?.contentWindow
    if (!w) return setError('The preview isn’t ready yet.')
    w.focus()
    w.print()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="html-source" className="font-bold text-ink">
            HTML
          </label>
          <Button variant="secondary" size="xs" onClick={() => fileRef.current?.click()}>
            <FileUp aria-hidden className="h-4 w-4" />
            Open .html file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".html,.htm,text/html"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              if (f.size > MAX_HTML_BYTES) return setError('HTML files up to 5 MB are supported.')
              const text = await f.text()
              if (text.includes('\u0000')) return setError(`“${f.name}” isn’t a text HTML file.`)
              setError(null)
              setHtml(text)
            }}
          />
        </div>
        <textarea id="html-source" className="field h-80 font-mono text-sm" value={html} onChange={(e) => setHtml(e.target.value)} spellCheck={false} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="html-size" className="field-label">
              Page size
            </label>
            <select id="html-size" className="field" value={size} onChange={(e) => setSize(e.target.value as 'A4' | 'Letter')}>
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </select>
          </div>
          <div>
            <label htmlFor="html-margin" className="field-label">
              Margins
            </label>
            <select id="html-margin" className="field" value={margin} onChange={(e) => setMargin(e.target.value as typeof margin)}>
              <option value="0">None</option>
              <option value="10mm">Small</option>
              <option value="20mm">Normal</option>
            </select>
          </div>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <Alert tone="info">
          Scripts, forms and embedded frames are removed, and images or styles from other websites aren’t loaded. Use images embedded as data URLs if you need them.
        </Alert>
      </div>
      <div className="panel flex flex-col p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-ink">Preview</h2>
          <Button size="sm" onClick={print}>
            <Printer aria-hidden className="h-4 w-4" />
            Save as PDF
          </Button>
        </div>
        <p className="mt-1 text-xs text-ink-muted">Opens your browser’s print dialog. Choose “Save as PDF” (or “Microsoft Print to PDF”) as the destination.</p>
        <iframe
          ref={frameRef}
          title="HTML preview"
          data-testid="html-preview"
          // No scripts can run; same-origin is needed only so this page can call print() on it.
          sandbox="allow-same-origin allow-modals"
          srcDoc={doc}
          className="mt-3 min-h-[28rem] w-full flex-1 rounded-lg border border-gray-200 bg-white"
        />
      </div>
    </div>
  )
}
