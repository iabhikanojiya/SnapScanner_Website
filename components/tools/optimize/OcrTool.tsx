'use client'

import { useState } from 'react'
import { Download, ScanText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Progress } from '@/components/tools/Feedback'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { SinglePdfInput, useSinglePdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { downloadBlob, pdfBlob } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import { OCR_LANGUAGES, createOcrEngine, type OcrLanguage } from '@/lib/ocr'
import { addOcrTextLayer, type OcrPage } from '@/lib/pdf/ocr-layer'
import { parsePageRanges } from '@/lib/pdf/ranges'

/** Pages are rendered at about 200 dpi, a good balance of accuracy and speed. */
const OCR_SCALE = 200 / 72
const MAX_PIXELS = 25_000_000

interface Outcome {
  pdf: ResultFile
  text: string
  added: number
  skipped: number
  confidence: number
}

export default function OcrTool() {
  const state = useSinglePdf('ocr-pdf', { render: true, unlockEncrypted: true })
  const { pdf } = state
  const [language, setLanguage] = useState<OcrLanguage>('eng')
  const [range, setRange] = useState('')
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const run = async () => {
    if (!pdf?.view) return
    setError(null)
    let pages: number[]
    try {
      pages = range.trim() ? [...new Set(parsePageRanges(range, pdf.pageCount).flat())].sort((a, b) => a - b) : Array.from({ length: pdf.pageCount }, (_, i) => i)
    } catch (e) {
      return setError(errorMessage(e))
    }
    const lang = OCR_LANGUAGES.find((l) => l.code === language)!
    setProgress({ label: `Loading the ${lang.name} language model`, done: 0, total: pages.length })
    let engine: Awaited<ReturnType<typeof createOcrEngine>> | null = null
    try {
      engine = await createOcrEngine(language, OCR_SCALE * 72)
      const results: OcrPage[] = Array.from({ length: pdf.pageCount }, () => ({ words: [] }))
      const texts: string[] = []
      let confidence = 0
      for (let k = 0; k < pages.length; k++) {
        setProgress({ label: `Recognizing page ${pages[k] + 1}`, done: k, total: pages.length })
        const page = await pdf.view.getPage(pages[k] + 1)
        const base = page.getViewport({ scale: 1 })
        let scale = OCR_SCALE
        if (base.width * base.height * scale * scale > MAX_PIXELS) scale = Math.sqrt(MAX_PIXELS / (base.width * base.height))
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        await page.render({ canvas, viewport, background: 'rgb(255,255,255)' }).promise
        const r = await engine.recognize(canvas)
        canvas.width = canvas.height = 0
        page.cleanup()
        results[pages[k]] = r.page
        texts.push(pages.length > 1 ? `--- Page ${pages[k] + 1} ---\n${r.text.trim()}` : r.text.trim())
        confidence += r.confidence
      }
      setProgress({ label: 'Adding the searchable text layer', done: pages.length, total: pages.length })
      const layer = await addOcrTextLayer({ name: pdf.name, bytes: pdf.bytes, password: pdf.password }, results)
      setOutcome({
        pdf: { blob: pdfBlob(layer.bytes), name: `${baseName(pdf.name)}_ocr.pdf`, pageCount: pdf.pageCount },
        text: texts.join('\n\n') + '\n',
        added: layer.wordsAdded,
        skipped: layer.wordsSkipped,
        confidence: pages.length ? confidence / pages.length : 0,
      })
      focusResult()
    } catch (e) {
      setError(`OCR failed: ${errorMessage(e)}`)
    } finally {
      await engine?.terminate()
      setProgress(null)
    }
  }

  if (outcome && pdf)
    return (
      <ResultPanel
        title={outcome.added || outcome.skipped ? `Recognized ${outcome.added + outcome.skipped} words` : 'No text was recognized'}
        summary={`Average confidence ${Math.round(outcome.confidence)}%. OCR can make mistakes, especially on low-quality scans, handwriting or unusual fonts; check the text before relying on it.`}
        files={[outcome.pdf]}
        source="ocr-pdf"
        resetLabel="Run OCR again"
        onReset={() => setOutcome(null)}
      >
        {outcome.skipped > 0 && (
          <Alert tone="warning" className="mt-4">
            {outcome.skipped} word{outcome.skipped === 1 ? '' : 's'} use characters the PDF’s built-in font can’t store (for example Devanagari), so they’re in the text file but not in the searchable PDF layer.
          </Alert>
        )}
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="ocr-text" className="field-label">
              Recognized text
            </label>
            <Button size="xs" variant="secondary" onClick={() => downloadBlob(new Blob([outcome.text], { type: 'text/plain;charset=utf-8' }), `${baseName(pdf.name)}_ocr.txt`)}>
              <Download aria-hidden className="h-4 w-4" />
              Download .txt
            </Button>
          </div>
          <textarea id="ocr-text" readOnly className="field h-64 font-mono text-sm" value={outcome.text} data-testid="ocr-text" />
        </div>
      </ResultPanel>
    )

  return (
    <div className="space-y-5">
      <SinglePdfInput state={state} />
      {pdf && (
        <div className="panel max-w-2xl space-y-4 p-5">
          <div>
            <label htmlFor="ocr-lang" className="field-label">
              Document language
            </label>
            <select id="ocr-lang" className="field" value={language} onChange={(e) => setLanguage(e.target.value as OcrLanguage)}>
              {OCR_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.sizeMb} MB model)
                </option>
              ))}
            </select>
            <p className="field-hint">The language model downloads from this site the first time you use it, then your browser may keep it.</p>
          </div>
          <div>
            <label htmlFor="ocr-pages" className="field-label">
              Pages (optional)
            </label>
            <input id="ocr-pages" className="field" placeholder={`All ${pdf.pageCount}, or e.g. 1-3`} value={range} onChange={(e) => setRange(e.target.value)} />
          </div>
          <Button onClick={run} disabled={!!progress}>
            <ScanText aria-hidden className="h-5 w-5" />
            Recognize text
          </Button>
          {progress && <Progress label={progress.label} done={progress.done} total={progress.total} />}
          {error && <Alert tone="error">{error}</Alert>}
          <p className="text-xs text-ink-muted">Recognition runs on your device. Large documents can take a minute or more per page on slower devices.</p>
        </div>
      )}
    </div>
  )
}
