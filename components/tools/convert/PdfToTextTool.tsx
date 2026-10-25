'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Progress } from '@/components/tools/Feedback'
import { SinglePdfInput, useSinglePdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { downloadBlob } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import { formatPageRanges } from '@/lib/pdf/ranges'
import { exportText, type ExportedText, type TextRun } from '@/lib/pdf/text-export'

export default function PdfToTextTool({ format }: { format: 'text' | 'markdown' }) {
  const tool = format === 'text' ? 'pdf-to-text' : 'pdf-to-markdown'
  const state = useSinglePdf(tool, { render: true, unlockEncrypted: true })
  const { pdf } = state
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExportedText | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const ext = format === 'text' ? 'txt' : 'md'
  const mime = format === 'text' ? 'text/plain' : 'text/markdown'

  const run = async () => {
    if (!pdf?.view) return
    setError(null)
    setProgress({ done: 0, total: pdf.pageCount })
    try {
      const pages: TextRun[][] = []
      for (let i = 1; i <= pdf.pageCount; i++) {
        const page = await pdf.view.getPage(i)
        const tc = await page.getTextContent()
        pages.push(tc.items.filter((it) => 'str' in it) as TextRun[])
        page.cleanup()
        setProgress({ done: i, total: pdf.pageCount })
      }
      setResult(exportText(pages))
      focusResult()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setProgress(null)
    }
  }

  if (result && pdf) {
    const content = format === 'text' ? result.text : result.markdown
    const name = `${baseName(pdf.name)}.${ext}`
    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const noText = result.characters === 0
    return (
      <section aria-labelledby="result-title" className="panel p-5 sm:p-6" data-testid="result">
        <h2 id="result-title" tabIndex={-1} className="text-xl font-bold text-ink focus:outline-none">
          {noText ? 'No text found' : `${result.characters.toLocaleString()} characters extracted`}
        </h2>
        {(noText || result.emptyPages.length > 0) && (
          <Alert tone="warning" className="mt-3">
            {noText ? 'This PDF has no text layer, which usually means it’s scanned.' : `Page${result.emptyPages.length === 1 ? '' : 's'} ${formatPageRanges(result.emptyPages)} had no text layer.`}{' '}
            Use{' '}
            <Link href="/tools/ocr-pdf" className="font-semibold underline">
              OCR PDF
            </Link>{' '}
            to recognize text in scanned pages.
          </Alert>
        )}
        {!noText && (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" data-testid="download" onClick={() => downloadBlob(blob, name)}>
                <Download aria-hidden className="h-4 w-4" />
                Download .{ext}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(content)
                    setNote('Copied to the clipboard.')
                  } catch {
                    setNote('Copying isn’t allowed here. Download the file instead.')
                  }
                }}
              >
                <Copy aria-hidden className="h-4 w-4" />
                Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResult(null)}>
                Back
              </Button>
            </div>
            {note && (
              <p className="mt-2 text-sm text-ink-muted" role="status">
                {note}
              </p>
            )}
            <label htmlFor="extracted" className="field-label mt-4">
              Preview
            </label>
            <textarea id="extracted" readOnly value={content} className="field h-96 font-mono text-sm" data-testid="text-output" />
            <p className="mt-2 text-xs text-ink-muted">
              {format === 'markdown'
                ? 'Headings and lists are inferred from font sizes and bullet characters. Tables, columns and images aren’t converted.'
                : 'Text is extracted in reading order where possible. Multi-column layouts may need tidying.'}
            </p>
          </>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <SinglePdfInput state={state} />
      {pdf && (
        <div className="panel max-w-xl p-5">
          <p className="text-sm text-ink-soft">
            Extracts the PDF’s existing text layer as {format === 'text' ? 'plain text' : 'Markdown'}. Nothing is added or rewritten.
          </p>
          <Button className="mt-4" onClick={run} disabled={!!progress}>
            <FileText aria-hidden className="h-5 w-5" />
            Convert to {format === 'text' ? 'text' : 'Markdown'}
          </Button>
          {progress && (
            <div className="mt-4">
              <Progress label="Reading text" done={progress.done} total={progress.total} />
            </div>
          )}
          {error && (
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}
