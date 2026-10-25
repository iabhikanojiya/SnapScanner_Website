'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Spinner } from '@/components/tools/Feedback'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { SinglePdfInput, useSinglePdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { pdfBlob } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import { MIN_PASSWORD_LENGTH, lockPdf } from '@/lib/pdf/operations'

export default function LockTool() {
  const state = useSinglePdf('lock-pdf', { render: false, unlockEncrypted: false })
  const { pdf } = state
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultFile | null>(null)

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH
  const mismatch = confirm.length > 0 && password !== confirm
  const ready = password.length >= MIN_PASSWORD_LENGTH && password === confirm

  const run = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pdf || !ready) return
    setBusy(true)
    setError(null)
    try {
      const bytes = await lockPdf({ name: pdf.name, bytes: pdf.bytes }, password)
      setResult({ blob: pdfBlob(bytes), name: `${baseName(pdf.name)}_protected.pdf`, pageCount: pdf.pageCount })
      setPassword('')
      setConfirm('')
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
        title="Your PDF is password-protected"
        summary="Encrypted with AES-256. The PDF can’t be opened without the password, so keep it somewhere safe: it can’t be recovered."
        files={[result]}
        source="lock-pdf"
        resetLabel="Protect another PDF"
        onReset={() => {
          setResult(null)
          state.reset()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <SinglePdfInput state={state} />
      {pdf && (
        <form onSubmit={run} className="panel max-w-lg p-5" noValidate>
          <h2 className="font-bold text-ink">Set a password</h2>
          <label htmlFor="new-password" className="field-label mt-4">
            Password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              className="field pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={tooShort}
              aria-describedby="new-password-hint"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:text-ink"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
            </button>
          </div>
          <p id="new-password-hint" className={tooShort ? 'mt-1 text-xs text-brand-700' : 'field-hint'}>
            At least {MIN_PASSWORD_LENGTH} characters. Longer passwords are much harder to guess.
          </p>
          <label htmlFor="confirm-password" className="field-label mt-4">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            className="field"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={mismatch}
            aria-describedby={mismatch ? 'confirm-error' : undefined}
          />
          {mismatch && (
            <p id="confirm-error" className="mt-1 text-xs text-brand-700">
              The passwords don’t match.
            </p>
          )}
          <Button type="submit" className="mt-5" disabled={!ready || busy}>
            <Lock aria-hidden className="h-5 w-5" />
            Protect PDF
          </Button>
          {busy && <Spinner label="Encrypting…" className="ml-3" />}
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
