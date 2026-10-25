'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, KeyRound, Lock, X } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import Dropzone from '@/components/tools/Dropzone'
import { Alert, ErrorList, Spinner } from '@/components/tools/Feedback'
import { readPdfFiles, type PdfItem } from '@/components/tools/pdfInput'
import { useInitialFiles } from '@/components/tools/useInitialFiles'
import { formatBytes } from '@/lib/limits'
import { openForView, ViewerPasswordError, type OpenedPdf } from '@/lib/pdf/viewer'
import type { ToolId } from '@/lib/tools'

export interface LoadedPdf extends PdfItem {
  /** The password that opened it, if it is encrypted. */
  password?: string
  /** Rendering handle, when `render` was requested. */
  view?: PDFDocumentProxy
}

interface Options {
  /** Open with pdf.js for previews (and to verify passwords). */
  render: boolean
  /** Ask for the password of encrypted PDFs. Lock PDF instead rejects them. */
  unlockEncrypted: boolean
}

/**
 * State for tools that work on one PDF: file selection, validation, password
 * entry for encrypted files and an open pdf.js document for previews.
 */
export function useSinglePdf(tool: ToolId, { render, unlockEncrypted }: Options) {
  const [pending, setPending] = useState<PdfItem | null>(null)
  const [pdf, setPdf] = useState<LoadedPdf | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const opened = useRef<OpenedPdf | null>(null)

  const closeView = () => {
    void opened.current?.task.destroy()
    opened.current = null
  }

  useEffect(() => closeView, [])

  const open = useCallback(
    async (item: PdfItem, password?: string): Promise<boolean> => {
      closeView()
      if (item.encrypted && !unlockEncrypted) {
        setErrors([`“${item.name}” is already password-protected. Unlock it first if you want to change its password.`])
        return false
      }
      if (item.encrypted && !password) {
        setPending(item)
        return false
      }
      if (render || item.encrypted) {
        try {
          opened.current = await openForView(item.bytes, password)
        } catch (e) {
          if (e instanceof ViewerPasswordError) {
            setPending(item)
            throw e
          }
          setErrors([`“${item.name}” couldn’t be opened. It may be damaged.`])
          return false
        }
        if (!render) closeView()
      }
      setPending(null)
      setPdf({ ...item, password, view: render ? opened.current?.doc : undefined })
      return true
    },
    [render, unlockEncrypted]
  )

  const addFiles = useCallback(
    async (files: File[]) => {
      setErrors([])
      setLoading(true)
      try {
        const { items, errors: errs } = await readPdfFiles(files.slice(0, 1))
        setErrors(errs)
        if (items[0]) await open(items[0]).catch(() => undefined)
      } finally {
        setLoading(false)
      }
    },
    [open]
  )

  useInitialFiles(tool, addFiles, (m) => setErrors([m]))

  const reset = useCallback(() => {
    closeView()
    setPdf(null)
    setPending(null)
    setErrors([])
  }, [])

  return { pdf, pending, errors, setErrors, loading, addFiles, open, reset }
}

type SinglePdfState = ReturnType<typeof useSinglePdf>

/** File chooser, password prompt or the chosen file's summary, depending on state. */
export function SinglePdfInput({ state, hint }: { state: SinglePdfState; hint?: string }) {
  const { pdf, pending, errors, setErrors, loading, addFiles, reset } = state
  return (
    <div className="space-y-4">
      {pending ? (
        <PasswordGate item={pending} state={state} />
      ) : pdf ? (
        <PdfFileCard pdf={pdf} onRemove={reset} />
      ) : (
        <Dropzone accept="pdf" onFiles={addFiles} disabled={loading} hint={hint} />
      )}
      {loading && <Spinner label="Opening PDF…" />}
      <ErrorList errors={errors} onDismiss={() => setErrors([])} />
    </div>
  )
}

export function PdfFileCard({ pdf, onRemove }: { pdf: LoadedPdf; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <FileText aria-hidden className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink" data-testid="file-name">
          {pdf.name}
        </p>
        <p className="text-xs text-ink-muted">
          {pdf.pageCount} page{pdf.pageCount === 1 ? '' : 's'} · {formatBytes(pdf.size)}
          {pdf.encrypted && ' · unlocked with password'}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove}>
        <X aria-hidden className="h-4 w-4" />
        Change file
      </Button>
    </div>
  )
}

function PasswordGate({ item, state }: { item: PdfItem; state: SinglePdfState }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setBusy(true)
    setError(null)
    try {
      await state.open(item, password)
    } catch (err) {
      setError(err instanceof ViewerPasswordError ? 'That password is incorrect. Check it and try again.' : 'The PDF couldn’t be opened.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="panel max-w-lg p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
          <Lock aria-hidden className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-ink">This PDF is password-protected</h2>
          <p className="mt-1 truncate text-sm text-ink-muted">{item.name}</p>
        </div>
      </div>
      <label htmlFor="pdf-password" className="field-label mt-4">
        Password
      </label>
      <input
        id="pdf-password"
        type="password"
        autoComplete="off"
        className="field"
        value={password}
        autoFocus
        onChange={(e) => setPassword(e.target.value)}
        aria-invalid={!!error}
        aria-describedby="pdf-password-hint"
      />
      <p id="pdf-password-hint" className="field-hint">
        The password is used only in this tab to open the file. It isn’t stored or sent anywhere.
      </p>
      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}
      <div className="mt-4 flex gap-2">
        <Button type="submit" size="sm" disabled={!password || busy}>
          <KeyRound aria-hidden className="h-4 w-4" />
          Open PDF
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={state.reset}>
          Choose another file
        </Button>
      </div>
    </form>
  )
}
