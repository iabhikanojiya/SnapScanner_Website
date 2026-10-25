'use client'

import { useEffect, useState } from 'react'
import { FormInput } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/tools/Feedback'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { SinglePdfInput, useSinglePdf, type LoadedPdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { pdfBlob } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import { fillForm, readForm, type FormField, type FormInfo, type FormValues } from '@/lib/pdf/edit'

export default function FormTool() {
  const state = useSinglePdf('fill-pdf-form', { render: false, unlockEncrypted: true })
  return (
    <div className="space-y-5">
      <SinglePdfInput state={state} />
      {state.pdf && <FormEditor key={state.pdf.id} pdf={state.pdf} />}
    </div>
  )
}

function initialValues(fields: FormField[]): FormValues {
  const v: FormValues = {}
  for (const f of fields) {
    if (f.kind === 'text') v[f.name] = f.value
    else if (f.kind === 'checkbox') v[f.name] = f.checked
    else if (f.kind === 'dropdown' || f.kind === 'list') v[f.name] = f.multiple ? f.selected : f.selected[0] ?? ''
    else if (f.kind === 'radio') v[f.name] = f.selected ?? ''
  }
  return v
}

function FormEditor({ pdf }: { pdf: LoadedPdf }) {
  const [info, setInfo] = useState<FormInfo | null>(null)
  const [values, setValues] = useState<FormValues>({})
  const [flatten, setFlatten] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultFile | null>(null)
  const input = { name: pdf.name, bytes: pdf.bytes, password: pdf.password }

  useEffect(() => {
    let cancelled = false
    readForm({ name: pdf.name, bytes: pdf.bytes, password: pdf.password })
      .then((i) => {
        if (cancelled) return
        setInfo(i)
        setValues(initialValues(i.fields))
      })
      .catch((e: unknown) => !cancelled && setError(errorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [pdf])

  if (result)
    return (
      <ResultPanel
        title="Your form is filled"
        summary={flatten ? 'Fields were flattened into the page, so they can no longer be edited.' : 'Fields stay editable in other PDF apps.'}
        files={[result]}
        source="fill-pdf-form"
        resetLabel="Edit the answers"
        onReset={() => setResult(null)}
      />
    )
  if (error && !info) return <Alert tone="error">{error}</Alert>
  if (!info) return <Spinner label="Reading form fields…" />

  const editable = info.fields.filter((f) => f.kind !== 'unsupported')
  const unsupported = info.fields.filter((f) => f.kind === 'unsupported')

  if (editable.length === 0)
    return (
      <Alert tone="warning" title="No fillable fields found">
        {info.xfa
          ? 'This PDF uses an XFA form, which browsers and pdf-lib can’t fill. Open it in Adobe Acrobat Reader instead.'
          : 'This PDF doesn’t contain interactive form fields. To write on a flat form, use Annotate PDF to add text boxes.'}
      </Alert>
    )

  const set = (name: string, v: string | boolean | string[]) => setValues((cur) => ({ ...cur, [name]: v }))

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const bytes = await fillForm(input, values, flatten)
      setResult({ blob: pdfBlob(bytes), name: `${baseName(pdf.name)}_filled.pdf`, pageCount: pdf.pageCount })
      focusResult()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel max-w-2xl space-y-4 p-5">
      <h2 className="font-bold text-ink">
        {editable.length} field{editable.length === 1 ? '' : 's'}
      </h2>
      {info.xfa && <Alert tone="warning">This PDF also has an XFA form. Only its standard (AcroForm) fields can be filled here.</Alert>}
      <div className="space-y-4" data-testid="form-fields">
        {editable.map((f) => {
          const id = `field-${f.name.replace(/[^\w-]/g, '_')}`
          if (f.kind === 'checkbox')
            return (
              <label key={f.name} className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" disabled={f.readOnly} checked={!!values[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
                {f.name}
              </label>
            )
          if (f.kind === 'radio')
            return (
              <fieldset key={f.name} disabled={f.readOnly}>
                <legend className="field-label">{f.name}</legend>
                <div className="mt-1.5 flex flex-wrap gap-3 text-sm">
                  {f.options.map((o) => (
                    <label key={o} className="flex items-center gap-1.5">
                      <input type="radio" name={id} className="h-4 w-4 accent-brand-600" checked={values[f.name] === o} onChange={() => set(f.name, o)} />
                      {o}
                    </label>
                  ))}
                </div>
              </fieldset>
            )
          if (f.kind === 'dropdown' || f.kind === 'list')
            return (
              <div key={f.name}>
                <label htmlFor={id} className="field-label">
                  {f.name}
                </label>
                <select
                  id={id}
                  className="field"
                  disabled={f.readOnly}
                  multiple={f.multiple}
                  value={f.multiple ? (values[f.name] as string[]) : (values[f.name] as string)}
                  onChange={(e) => set(f.name, f.multiple ? Array.from(e.target.selectedOptions).map((o) => o.value) : e.target.value)}
                >
                  {!f.multiple && <option value="">—</option>}
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            )
          if (f.kind === 'text')
            return (
              <div key={f.name}>
                <label htmlFor={id} className="field-label">
                  {f.name}
                  {f.readOnly && <span className="ml-2 font-normal text-ink-muted">(read-only)</span>}
                </label>
                {f.multiline ? (
                  <textarea id={id} className="field" rows={3} disabled={f.readOnly} maxLength={f.maxLength} value={values[f.name] as string} onChange={(e) => set(f.name, e.target.value)} />
                ) : (
                  <input id={id} className="field" disabled={f.readOnly} maxLength={f.maxLength} value={values[f.name] as string} onChange={(e) => set(f.name, e.target.value)} />
                )}
              </div>
            )
          return null
        })}
      </div>
      {unsupported.length > 0 && (
        <p className="text-xs text-ink-muted">
          Not editable here: {unsupported.map((f) => `${f.name} (${f.type})`).join(', ')}. Signature fields can be signed with Sign PDF.
        </p>
      )}
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} />
        Flatten the form (answers become part of the page and can’t be changed)
      </label>
      <Button onClick={run} disabled={busy}>
        <FormInput aria-hidden className="h-5 w-5" />
        Save filled PDF
      </Button>
      {busy && <Spinner label="Saving…" className="ml-3" />}
      {error && <Alert tone="error">{error}</Alert>}
      <p className="text-xs text-ink-muted">Text is written with a standard Latin font; characters it can’t display may not appear.</p>
    </div>
  )
}
