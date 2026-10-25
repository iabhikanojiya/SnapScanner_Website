'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Check, CheckCircle2, Download, FileText, FolderPlus, RotateCcw, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/tools/Feedback'
import ResultPreview from '@/components/tools/ResultPreview'
import { canShareFile, downloadBlob, shareFile } from '@/lib/browser/download'
import { safeFileName } from '@/lib/files/validate'
import { handOff } from '@/lib/handoff'
import { formatBytes } from '@/lib/limits'
import { saveFile } from '@/lib/storage/library'
import type { ToolId } from '@/lib/tools'

export interface ResultFile {
  blob: Blob
  /** Suggested name including extension. */
  name: string
  pageCount?: number
}

interface ResultPanelProps {
  title: string
  summary?: React.ReactNode
  files: ResultFile[]
  source: ToolId
  onReset: () => void
  resetLabel?: string
  /** Offer renaming before download (single file only). */
  renamable?: boolean
  /** Download all as ZIP (multi-file results). */
  onDownloadAll?: () => void
  /** Show thumbnails of a single PDF result. */
  preview?: boolean
  children?: React.ReactNode
}

export default function ResultPanel({
  title,
  summary,
  files,
  source,
  onReset,
  resetLabel = 'Start over',
  renamable = true,
  onDownloadAll,
  preview = true,
  children,
}: ResultPanelProps) {
  return (
    <section aria-labelledby="result-title" className="panel p-5 sm:p-6" data-testid="result">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <CheckCircle2 aria-hidden className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h2 id="result-title" tabIndex={-1} className="text-xl font-bold text-ink focus:outline-none">
            {title}
          </h2>
          {summary && <div className="mt-1 text-sm text-ink-soft">{summary}</div>}
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {files.map((f, i) => (
          <ResultRow key={`${f.name}-${i}`} file={f} source={source} renamable={renamable && files.length === 1} featured={files.length === 1 && f.blob.type === 'application/pdf'} />
        ))}
      </ul>
      {preview && files.length === 1 && files[0].blob.type === 'application/pdf' && <ResultPreview blob={files[0].blob} />}

      {children}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
        {onDownloadAll && (
          <Button onClick={onDownloadAll} size="sm">
            <Download aria-hidden className="h-4 w-4" />
            Download all as ZIP
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw aria-hidden className="h-4 w-4" />
          {resetLabel}
        </Button>
      </div>
    </section>
  )
}

function ResultRow({ file, source, renamable, featured }: { file: ResultFile; source: ToolId; renamable: boolean; featured: boolean }) {
  const router = useRouter()
  const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'pdf'
  const [name, setName] = useState(file.name.replace(/\.[a-z0-9]+$/i, ''))
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const finalName = safeFileName(name, ext)
  const asFile = useMemo(() => new File([file.blob], finalName, { type: file.blob.type }), [file.blob, finalName])
  const isPdf = file.blob.type === 'application/pdf'
  // Results only exist after a tool runs in the browser, so this never renders on the server.
  const canShare = useMemo(() => canShareFile(asFile), [asFile])

  const save = async () => {
    setError(null)
    setSaving(true)
    try {
      await saveFile(file.blob, { name: finalName, kind: isPdf ? 'pdf' : 'image', source, pageCount: file.pageCount })
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saving failed.')
    } finally {
      setSaving(false)
    }
  }

  const open = () => {
    handOff('pdf-reader', [asFile])
    router.push('/tools/pdf-reader')
  }

  /** Shares the file where the browser supports it; otherwise downloads it and says why. Cancelling does nothing. */
  const share = async () => {
    setNote(null)
    if (canShare) {
      await shareFile(asFile)
      return
    }
    downloadBlob(file.blob, finalName)
    setNote('This browser can’t share files directly, so the file was downloaded instead. You can share it from your downloads.')
  }

  const nameField = renamable ? (
    <>
      <label htmlFor="result-name" className="field-label">
        File name
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id="result-name"
          className="field mt-0 bg-white"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSaved(false)
          }}
        />
        <span className="text-sm text-ink-muted">.{ext}</span>
      </div>
    </>
  ) : (
    <p className="truncate font-semibold text-ink" data-testid="result-file-name">
      {finalName}
    </p>
  )
  const meta = (
    <p className="mt-1 text-xs text-ink-muted">
      {formatBytes(file.blob.size)}
      {file.pageCount ? ` · ${file.pageCount} page${file.pageCount === 1 ? '' : 's'}` : ''}
    </p>
  )
  const messages = (
    <>
      {saved && (
        <p className="mt-2 text-sm text-emerald-800" role="status">
          Saved to My files in this browser.{' '}
          <Link href="/files" className="font-semibold underline underline-offset-2">
            View My files
          </Link>
        </p>
      )}
      {note && (
        <p className="mt-2 text-sm text-ink-soft" role="status">
          {note}
        </p>
      )}
      {error && (
        <Alert tone="error" className="mt-2">
          {error}
        </Alert>
      )}
    </>
  )

  if (featured)
    return (
      <li className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <FileText aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            {nameField}
            {meta}
          </div>
        </div>
        <Button size="lg" className="mt-4 w-full text-base" onClick={() => downloadBlob(file.blob, finalName)} data-testid="download">
          <Download aria-hidden className="h-5 w-5" />
          Download PDF
        </Button>
        <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="More actions">
          <Button size="sm" variant="secondary" onClick={() => void save()} disabled={saved || saving}>
            {saved ? <Check aria-hidden className="h-4 w-4" /> : <FolderPlus aria-hidden className="h-4 w-4" />}
            <span className="truncate">{saved ? 'Saved' : 'Save to My Files'}</span>
          </Button>
          <Button size="sm" variant="secondary" onClick={open}>
            <BookOpen aria-hidden className="h-4 w-4" />
            Open
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void share()}>
            <Share2 aria-hidden className="h-4 w-4" />
            Share
          </Button>
        </div>
        {messages}
      </li>
    )

  return (
    <li className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          {nameField}
          {meta}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => downloadBlob(file.blob, finalName)} data-testid="download">
            <Download aria-hidden className="h-4 w-4" />
            Download
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void save()} disabled={saved || saving}>
            <FolderPlus aria-hidden className="h-4 w-4" />
            {saved ? 'Saved' : 'Save to My files'}
          </Button>
          {isPdf && (
            <Button size="sm" variant="secondary" onClick={open}>
              <BookOpen aria-hidden className="h-4 w-4" />
              Open
            </Button>
          )}
          {canShare && (
            <Button size="sm" variant="secondary" onClick={() => void shareFile(asFile)}>
              <Share2 aria-hidden className="h-4 w-4" />
              Share
            </Button>
          )}
        </div>
      </div>
      {messages}
    </li>
  )
}
