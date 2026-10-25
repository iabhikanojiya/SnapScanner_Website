'use client'

import { useState } from 'react'
import { KeyRound, Lock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Dropzone from '@/components/tools/Dropzone'
import { Alert, ErrorList, Spinner } from '@/components/tools/Feedback'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { errorMessage, focusResult, readPdfFiles, type PdfItem } from '@/components/tools/pdfInput'
import { useInitialFiles } from '@/components/tools/useInitialFiles'
import { pdfBlob } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import { formatBytes } from '@/lib/limits'
import { isEncrypted, unlockPdf } from '@/lib/pdf/operations'

export default function UnlockTool() {
  const [item, setItem] = useState<PdfItem | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultFile | null>(null)

  const add = async (files: File[]) => {
    setErrors([])
    const { items, errors: errs } = await readPdfFiles(files.slice(0, 1))
    const it = items[0]
    if (it && !it.encrypted) errs.push(`“${it.name}” isn’t password-protected, so there’s nothing to unlock.`)
    setErrors(errs)
    setItem(it?.encrypted ? it : null)
  }

  useInitialFiles('unlock-pdf', add, (m) => setErrors([m]))

  const run = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item || !password) return
    setBusy(true)
    setError(null)
    try {
      const bytes = await unlockPdf({ name: item.name, bytes: item.bytes, password })
      // Never report success unless the output really has no encryption.
      if (await isEncrypted(bytes)) throw new Error('The PDF couldn’t be decrypted. Its encryption may not be supported.')
      setResult({ blob: pdfBlob(bytes), name: `${baseName(item.name)}_unlocked.pdf`, pageCount: item.pageCount })
      setPassword('')
      focusResult()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <ResultPanel
        title="Password removed"
        summary="The new copy opens without a password. Your original file is unchanged."
        files={[result]}
        source="unlock-pdf"
        resetLabel="Unlock another PDF"
        onReset={() => {
          setResult(null)
          setItem(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      {item ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
            <Lock aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">{item.name}</p>
            <p className="text-xs text-ink-muted">
              Password-protected · {item.pageCount} page{item.pageCount === 1 ? '' : 's'} · {formatBytes(item.size)}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setItem(null)}>
            <X aria-hidden className="h-4 w-4" />
            Change file
          </Button>
        </div>
      ) : (
        <Dropzone accept="pdf" onFiles={add} hint="Drop a password-protected PDF here, or choose one from your device." />
      )}
      <ErrorList errors={errors} onDismiss={() => setErrors([])} />

      {item && (
        <form onSubmit={run} className="panel max-w-lg p-5">
          <label htmlFor="unlock-password" className="field-label">
            Current password
          </label>
          <input
            id="unlock-password"
            type="password"
            autoComplete="off"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="unlock-hint"
          />
          <p id="unlock-hint" className="field-hint">
            You need the PDF’s password. Snap Scanner can’t remove a password you don’t know.
          </p>
          <Button type="submit" className="mt-5" disabled={!password || busy}>
            <KeyRound aria-hidden className="h-5 w-5" />
            Remove password
          </Button>
          {busy && <Spinner label="Decrypting…" className="ml-3" />}
          {error && (
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
          )}
        </form>
      )}
    </div>
  )
}
