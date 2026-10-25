'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Download, FileText, RotateCcw, X } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { Alert, Progress, Spinner } from '@/components/tools/Feedback'
import { SinglePdfInput, useSinglePdf } from '@/components/tools/SinglePdf'
import { focusResult } from '@/components/tools/pdfInput'
import { downloadBlob } from '@/lib/browser/download'
import { baseName, safeFileName } from '@/lib/files/validate'
import { formatBytes } from '@/lib/limits'
import { OCR_LANGUAGES, type OcrLanguage } from '@/lib/ocr'
import { formatPageRanges } from '@/lib/pdf/ranges'
import { SCANNED_TEXT_CHARS, convertPdfToWord, friendlyError, type PdfToWordResult } from '@/lib/pdf/word/convert'

/** "page 3" or "pages 1-2, 5" for 0-based page indexes. */
const pages = (list: number[], capital = false) => `${capital ? 'P' : 'p'}age${list.length === 1 ? '' : 's'} ${formatPageRanges(list)}`

export default function PdfToWordTool() {
  const state = useSinglePdf('pdf-to-word', { render: true, unlockEncrypted: true })
  const { pdf } = state
  /** 0-based pages without a text layer, found when a file is opened. */
  const [scan, setScan] = useState<{ view: PDFDocumentProxy; empty: number[] } | null>(null)
  const noText = scan && scan.view === pdf?.view ? scan.empty : null
  /** The user's OCR choice; until they choose, OCR is on only for fully scanned PDFs. */
  const [ocrChoice, setOcr] = useState<boolean | null>(null)
  const ocr = ocrChoice ?? (!!noText && noText.length > 0 && noText.length === pdf?.pageCount)
  const [language, setLanguage] = useState<OcrLanguage>('eng')
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null)
  // Errors belong to the file they happened with, so choosing another file clears them.
  const [failure, setError] = useState<{ view?: PDFDocumentProxy; message: string } | null>(null)
  const error = failure && failure.view === pdf?.view ? failure.message : null
  const [result, setResult] = useState<(PdfToWordResult & { name: string }) | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)

  // Check which pages have no selectable text, so OCR can be offered up front.
  useEffect(() => {
    const view = pdf?.view
    if (!view) return
    let cancelled = false
    ;(async () => {
      const empty: number[] = []
      for (let i = 1; i <= view.numPages && !cancelled; i++) {
        try {
          const page = await view.getPage(i)
          const tc = await page.getTextContent()
          const chars = tc.items.reduce((n, it) => n + ('str' in it ? it.str.replace(/\s/g, '').length : 0), 0)
          if (chars < SCANNED_TEXT_CHARS) empty.push(i - 1)
        } catch {
          // A page that can't be read is reported by the conversion itself.
        }
      }
      if (!cancelled) setScan({ view, empty })
    })()
    return () => {
      cancelled = true
    }
  }, [pdf?.view])

  useEffect(() => () => abort.current?.abort(), [])

  const run = async () => {
    if (!pdf || progress) return
    setError(null)
    setDownloadError(null)
    const controller = new AbortController()
    abort.current = controller
    setProgress({ label: 'Starting', done: 0, total: pdf.pageCount })
    try {
      const out = await convertPdfToWord({
        bytes: pdf.bytes,
        password: pdf.password,
        title: baseName(pdf.name),
        ocr: ocr && noText?.length ? { language, pages: noText } : null,
        onProgress: (label, done, total) => setProgress({ label, done, total }),
        signal: controller.signal,
      })
      setResult({ ...out, name: safeFileName(pdf.name, 'docx') })
      focusResult()
    } catch (e) {
      setError({ view: pdf.view, message: controller.signal.aborted ? 'Conversion cancelled. Nothing was saved.' : friendlyError(e) })
    } finally {
      abort.current = null
      setProgress(null)
    }
  }

  const download = () => {
    if (!result) return
    try {
      downloadBlob(result.blob, result.name)
    } catch {
      setDownloadError('The download couldn’t start. Check that your browser allows downloads from this site and try again.')
    }
  }

  if (result && pdf) {
    const textPages = result.pageCount - result.imagePages.length - result.emptyPages.length
    return (
      <section aria-labelledby="result-title" className="panel p-5 sm:p-6" data-testid="result">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 aria-hidden className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 id="result-title" tabIndex={-1} className="text-xl font-bold text-ink focus:outline-none">
              Your Word document is ready
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Converted {result.pageCount} page{result.pageCount === 1 ? '' : 's'}
              {result.ocrPages.length > 0 && `, including ${result.ocrPages.length} recognized with OCR`}. Text is editable in Word, Google Docs, LibreOffice and Pages.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <FileText aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink" data-testid="result-file-name">
                {result.name}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {formatBytes(result.blob.size)} · {result.pageCount} page{result.pageCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <Button size="lg" className="mt-4 w-full text-base" onClick={download} data-testid="download">
            <Download aria-hidden className="h-5 w-5" />
            Download Word Document
          </Button>
          {downloadError && (
            <Alert tone="error" className="mt-3">
              {downloadError}
            </Alert>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {result.imagePages.length > 0 && (
            <Alert tone="warning" title="Some pages are pictures">
              {pages(result.imagePages, true)} had no selectable text, so {result.imagePages.length === 1 ? 'it was' : 'they were'} added as {result.imagePages.length === 1 ? 'a picture' : 'pictures'}. Turn on OCR and convert again to get editable text.
            </Alert>
          )}
          {result.emptyPages.length > 0 && (
            <Alert tone="info">
              {pages(result.emptyPages, true)} {result.emptyPages.length === 1 ? 'is' : 'are'} blank or only contain{result.emptyPages.length === 1 ? 's' : ''} drawings, which aren’t converted.
            </Alert>
          )}
          {result.ocrPages.length > 0 && <Alert tone="info">OCR can misread words, especially on low-quality scans or handwriting. Check the recognized text.</Alert>}
          {result.warnings.map((w) => (
            <Alert key={w} tone="info">
              {w}
            </Alert>
          ))}
          {textPages > 0 && (
            <p className="text-xs text-ink-muted">
              Paragraphs, headings, simple tables and two-column layouts are rebuilt from the text positions. Complex layouts, text colours and vector drawings may need tidying in Word.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setResult(null)
              setError(null)
              setOcr(null)
              state.reset()
            }}
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            Convert another PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
            Change options
          </Button>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <SinglePdfInput state={state} hint="Drop a PDF here, or choose one from your device. Up to 150 MB." />
      {pdf && (
        <div className="panel max-w-2xl space-y-4 p-5">
          {noText === null ? (
            <Spinner label="Checking the pages for text…" />
          ) : noText.length === 0 ? (
            <p className="text-sm text-ink-soft">All {pdf.pageCount} pages have selectable text, which will be converted into editable paragraphs, tables and images.</p>
          ) : (
            <div className="space-y-3">
              <Alert tone="warning" title={noText.length === pdf.pageCount ? 'This PDF looks scanned' : `${noText.length} page${noText.length === 1 ? ' has' : 's have'} no selectable text`}>
                {noText.length === pdf.pageCount ? 'None of its pages have a text layer' : `${pages(noText, true)} ${noText.length === 1 ? 'has' : 'have'} no text layer`}, so text can only be extracted with OCR (optical character recognition). Without OCR, scanned pages are added to the Word document as pictures.
              </Alert>
              <label className="flex items-start gap-3 text-sm text-ink">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={ocr} onChange={(e) => setOcr(e.target.checked)} disabled={!!progress} />
                <span>
                  <span className="font-semibold">Recognize text with OCR</span>
                  <span className="block text-ink-muted">Runs on your device. It can take a minute or more per page on slower devices.</span>
                </span>
              </label>
              {ocr && (
                <div>
                  <label htmlFor="ocr-lang" className="field-label">
                    Document language
                  </label>
                  <select id="ocr-lang" className="field" value={language} onChange={(e) => setLanguage(e.target.value as OcrLanguage)} disabled={!!progress}>
                    {OCR_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name} ({l.sizeMb} MB model)
                      </option>
                    ))}
                  </select>
                  <p className="field-hint">The language model downloads from this site the first time you use it.</p>
                </div>
              )}
            </div>
          )}
          <Button onClick={run} disabled={!!progress || noText === null} data-testid="convert">
            <FileText aria-hidden className="h-5 w-5" />
            Convert to Word
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
