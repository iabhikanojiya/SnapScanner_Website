'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, FileType2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Dropzone from '@/components/tools/Dropzone'
import { Alert, ErrorList, Progress } from '@/components/tools/Feedback'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { focusResult } from '@/components/tools/pdfInput'
import { pdfBlob } from '@/lib/browser/download'
import { convertWordInWorker, type Stage } from '@/lib/docx/browser'
import { sniffWordFile } from '@/lib/docx/parse'
import { safeFileName } from '@/lib/files/validate'
import { formatBytes } from '@/lib/limits'

/** Larger documents are refused up front; layout happens entirely in memory. */
const MAX_BYTES = 100 * 1024 * 1024

const STAGE_LABEL: Record<Stage, string> = {
  reading: 'Reading the document',
  fonts: 'Loading fonts',
  layout: 'Laying out pages',
  writing: 'Writing pages',
}

interface WordFile {
  name: string
  size: number
  bytes: Uint8Array
}

/** Checks a picked file is a .docx by its contents, not just its name. */
async function readWordFile(file: File): Promise<WordFile> {
  const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase()
  if (file.size === 0) throw new Error(`“${file.name}” is empty.`)
  if (ext === 'doc') throw new Error(`“${file.name}” is an older Word (.doc) file. Open it in Word and save it as .docx, then try again.`)
  if (ext && !['docx', 'docm', 'dotx'].includes(ext)) throw new Error(`“${file.name}” isn’t a Word document. Choose a .docx file.`)
  if (file.size > MAX_BYTES) throw new Error(`“${file.name}” is ${formatBytes(file.size)}. Word documents up to ${formatBytes(MAX_BYTES)} are supported.`)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const kind = sniffWordFile(bytes)
  if (kind === 'ole') throw new Error(`“${file.name}” is an older .doc file or is password-protected. Save it in Word as an unprotected .docx, then try again.`)
  if (kind !== 'docx') throw new Error(`“${file.name}” isn’t a valid Word document. It may be damaged, or it’s a different kind of file renamed to .docx.`)
  return { name: file.name, size: file.size, bytes }
}

export default function WordToPdfTool() {
  const [file, setFile] = useState<WordFile | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ file: ResultFile; warnings: string[] } | null>(null)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const addFiles = async (files: File[]) => {
    setErrors([])
    setError(null)
    try {
      setFile(await readWordFile(files[0]))
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'The file couldn’t be read.'])
    }
  }

  const run = async () => {
    if (!file || progress) return
    setError(null)
    const controller = new AbortController()
    abort.current = controller
    setProgress({ label: STAGE_LABEL.reading, done: 0, total: 0 })
    try {
      const out = await convertWordInWorker(
        file.bytes,
        (stage, done, total) => setProgress({ label: stage === 'writing' && total ? `Writing page ${Math.min(done + 1, total)} of ${total}` : STAGE_LABEL[stage], done, total }),
        controller.signal
      )
      setResult({ file: { blob: pdfBlob(out.bytes), name: safeFileName(file.name, 'pdf'), pageCount: out.pageCount }, warnings: out.warnings })
      focusResult()
    } catch (e) {
      setError(controller.signal.aborted ? 'Conversion cancelled. Nothing was saved.' : e instanceof Error ? e.message : 'The document couldn’t be converted.')
    } finally {
      abort.current = null
      setProgress(null)
    }
  }

  if (result)
    return (
      <ResultPanel
        title="Your PDF is ready"
        summary={`${result.file.pageCount} page${result.file.pageCount === 1 ? '' : 's'}, with selectable text. Check the preview before sharing it.`}
        files={[result.file]}
        source="word-to-pdf"
        resetLabel="Convert another document"
        onReset={() => {
          setResult(null)
          setFile(null)
        }}
      >
        {result.warnings.length > 0 && (
          <Alert tone="warning" title="Some content was approximated" className="mt-4">
            <ul className="list-disc space-y-1 pl-4">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Alert>
        )}
      </ResultPanel>
    )

  return (
    <div className="space-y-5">
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <FileType2 aria-hidden className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink" data-testid="file-name">
              {file.name}
            </p>
            <p className="text-xs text-ink-muted">Word document · {formatBytes(file.size)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={!!progress}>
            <X aria-hidden className="h-4 w-4" />
            Change file
          </Button>
        </div>
      ) : (
        <Dropzone accept="docx" onFiles={addFiles} title="Choose a Word document" hint="Drop a .docx file here, or choose one from your device. Up to 100 MB." />
      )}
      <ErrorList errors={errors} onDismiss={() => setErrors([])} />
      {file && (
        <div className="panel max-w-2xl space-y-4 p-5">
          <p className="text-sm text-ink-soft">The document is laid out into pages with its fonts, styles, lists, tables, images, headers and footers, and saved as a PDF with selectable text.</p>
          <Button onClick={run} disabled={!!progress} data-testid="convert">
            <FileText aria-hidden className="h-5 w-5" />
            Convert to PDF
          </Button>
          {progress && (
            <div className="space-y-2">
              <Progress label={progress.label} done={progress.done} total={progress.total} />
              <Button variant="ghost" size="sm" onClick={() => abort.current?.abort()}>
                <X aria-hidden className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
          {error && <Alert tone="error">{error}</Alert>}
          <p className="text-xs text-ink-muted">Your files are processed in your browser and are not uploaded to a server.</p>
        </div>
      )}
    </div>
  )
}
