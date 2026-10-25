'use client'

import { useEffect, useState } from 'react'
import { Info, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/tools/Feedback'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { SinglePdfInput, useSinglePdf, type LoadedPdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { pdfBlob } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import { formatBytes } from '@/lib/limits'
import { readMetadata, writeMetadata, type PdfMetadata } from '@/lib/pdf/edit'

export default function MetadataTool() {
  const state = useSinglePdf('pdf-metadata', { render: false, unlockEncrypted: true })
  return (
    <div className="space-y-5">
      <SinglePdfInput state={state} />
      {state.pdf && <MetadataEditor key={state.pdf.id} pdf={state.pdf} />}
    </div>
  )
}

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—')

function MetadataEditor({ pdf }: { pdf: LoadedPdf }) {
  const [meta, setMeta] = useState<PdfMetadata | null>(null)
  const [fields, setFields] = useState({ title: '', author: '', subject: '', keywords: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ file: ResultFile; removed: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    readMetadata({ name: pdf.name, bytes: pdf.bytes, password: pdf.password })
      .then((m) => {
        if (cancelled) return
        setMeta(m)
        setFields({ title: m.title ?? '', author: m.author ?? '', subject: m.subject ?? '', keywords: m.keywords ?? '' })
      })
      .catch((e: unknown) => !cancelled && setError(errorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [pdf])

  const save = async (removeAll: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const bytes = await writeMetadata({ name: pdf.name, bytes: pdf.bytes, password: pdf.password }, { ...fields, removeAll })
      setResult({ file: { blob: pdfBlob(bytes), name: `${baseName(pdf.name)}_${removeAll ? 'no_metadata' : 'edited'}.pdf`, pageCount: pdf.pageCount }, removed: removeAll })
      focusResult()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (result)
    return (
      <ResultPanel
        title={result.removed ? 'Metadata removed' : 'Metadata updated'}
        summary={result.removed ? 'The title, author, dates, producer and XMP metadata were removed. Page content is unchanged.' : undefined}
        files={[result.file]}
        source="pdf-metadata"
        resetLabel="Back to the metadata"
        onReset={() => setResult(null)}
      />
    )
  if (error && !meta) return <Alert tone="error">{error}</Alert>
  if (!meta) return <Spinner label="Reading metadata…" />

  const rows: [string, string][] = [
    ['PDF version', meta.version],
    ['Pages', String(meta.pageCount)],
    ['Page size', meta.pageSizes.join(', ')],
    ['File size', formatBytes(pdf.size)],
    ['Created', fmtDate(meta.created)],
    ['Modified', fmtDate(meta.modified)],
    ['Creator app', meta.creator ?? '—'],
    ['Producer', meta.producer ?? '—'],
    ['Encrypted', pdf.encrypted ? 'Yes' : 'No'],
    ['Form fields', String(meta.formFields)],
    ['Attachments', String(meta.attachments)],
    ['XMP metadata', meta.hasXmp ? 'Yes' : 'No'],
    ['JavaScript', meta.hasJavaScript ? 'Yes' : 'No'],
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section aria-labelledby="meta-info" className="panel p-5">
        <h2 id="meta-info" className="flex items-center gap-2 font-bold text-ink">
          <Info aria-hidden className="h-4 w-4" />
          Document information
        </h2>
        <dl className="mt-3 divide-y divide-gray-100 text-sm" data-testid="metadata">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 py-2">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="break-words font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        {(meta.attachments > 0 || meta.hasJavaScript) && (
          <Alert tone="warning" className="mt-3">
            {meta.attachments > 0 && 'This PDF has embedded attachments. '}
            {meta.hasJavaScript && 'This PDF contains JavaScript, which some viewers may run when it opens.'}
          </Alert>
        )}
      </section>
      <section aria-labelledby="meta-edit" className="panel h-fit space-y-3 p-5">
        <h2 id="meta-edit" className="font-bold text-ink">
          Edit
        </h2>
        {(['title', 'author', 'subject', 'keywords'] as const).map((k) => (
          <div key={k}>
            <label htmlFor={`meta-${k}`} className="field-label capitalize">
              {k}
            </label>
            <input id={`meta-${k}`} className="field" value={fields[k]} onChange={(e) => setFields((f) => ({ ...f, [k]: e.target.value }))} placeholder={k === 'keywords' ? 'Comma-separated' : undefined} />
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" onClick={() => save(false)} disabled={busy}>
            Save changes
          </Button>
          <Button size="sm" variant="danger" onClick={() => save(true)} disabled={busy}>
            <Trash2 aria-hidden className="h-4 w-4" />
            Remove all metadata
          </Button>
        </div>
        {busy && <Spinner label="Saving…" />}
        {error && <Alert tone="error">{error}</Alert>}
        <p className="text-xs text-ink-muted">Removing metadata doesn’t change text inside the pages. To remove page content, use Redact PDF.</p>
      </section>
    </div>
  )
}
