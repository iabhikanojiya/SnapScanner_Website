'use client'

import { useState } from 'react'
import { FileArchive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Progress } from '@/components/tools/Feedback'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { SinglePdfInput, useSinglePdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { pdfBlob } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import { canvasRecoder } from '@/lib/image/browser'
import { formatBytes } from '@/lib/limits'
import { COMPRESSION_SETTINGS, compressPdf, type CompressResult, type CompressionLevel } from '@/lib/pdf/compress'

const LEVELS: { id: CompressionLevel; name: string }[] = [
  { id: 'high', name: 'High compression' },
  { id: 'medium', name: 'Medium compression' },
  { id: 'low', name: 'Low compression' },
]

export default function CompressTool() {
  const state = useSinglePdf('compress-pdf', { render: false, unlockEncrypted: true })
  const { pdf } = state
  const [level, setLevel] = useState<CompressionLevel>('medium')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ stats: CompressResult; file: ResultFile } | null>(null)

  const run = async () => {
    if (!pdf) return
    setError(null)
    setProgress({ done: 0, total: 0 })
    try {
      const stats = await compressPdf({ name: pdf.name, bytes: pdf.bytes, password: pdf.password }, level, canvasRecoder, (done, total) =>
        setProgress({ done, total })
      )
      setResult({ stats, file: { blob: pdfBlob(stats.bytes), name: `${baseName(pdf.name)}_compressed.pdf`, pageCount: pdf.pageCount } })
      focusResult()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setProgress(null)
    }
  }

  if (result && pdf) {
    const { stats } = result
    const saved = stats.originalSize - stats.size
    const pct = stats.originalSize ? Math.round((saved / stats.originalSize) * 1000) / 10 : 0
    if (!stats.reduced) {
      return (
        <div className="space-y-4" data-testid="result">
          <Alert tone="warning" title="This PDF couldn’t be made smaller">
            {stats.imagesFound === 0
              ? 'It contains no images to recompress; its text and graphics are already stored efficiently.'
              : 'Its images are already compressed, or recompressing them didn’t reduce the size.'}{' '}
            Your original file is unchanged ({formatBytes(stats.originalSize)}). Try High compression for a stronger
            setting.
          </Alert>
          <Button variant="secondary" onClick={() => setResult(null)}>
            Try another setting
          </Button>
        </div>
      )
    }
    return (
      <ResultPanel
        title={`Compressed by ${pct}%`}
        summary={
          <dl className="mt-2 grid max-w-md grid-cols-3 gap-3" data-testid="compress-stats">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs text-ink-muted">Original</dt>
              <dd className="font-bold text-ink">{formatBytes(stats.originalSize)}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-xs text-ink-muted">Compressed</dt>
              <dd className="font-bold text-ink">{formatBytes(stats.size)}</dd>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2">
              <dt className="text-xs text-emerald-900">Saved</dt>
              <dd className="font-bold text-emerald-900">{formatBytes(saved)}</dd>
            </div>
          </dl>
        }
        files={[result.file]}
        source="compress-pdf"
        resetLabel="Compress another PDF"
        onReset={() => {
          setResult(null)
          state.reset()
        }}
      >
        <p className="mt-3 text-xs text-ink-muted">
          {stats.imagesRecompressed} of {stats.imagesFound} images recompressed. Text and vector graphics were not changed.
        </p>
      </ResultPanel>
    )
  }

  return (
    <div className="space-y-5">
      <SinglePdfInput state={state} />
      {pdf && (
        <div className="panel max-w-2xl p-5">
          <fieldset>
            <legend className="font-bold text-ink">Compression level</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {LEVELS.map((l) => (
                <label key={l.id} className="choice h-auto flex-col items-start gap-0.5 px-4 py-3 text-left">
                  <input type="radio" name="level" className="sr-only" checked={level === l.id} onChange={() => setLevel(l.id)} />
                  <span>{l.name}</span>
                  <span className="text-xs font-normal text-ink-muted">{COMPRESSION_SETTINGS[l.id].label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Button className="mt-5" onClick={run} disabled={!!progress}>
            <FileArchive aria-hidden className="h-5 w-5" />
            Compress PDF
          </Button>
          {progress && (
            <div className="mt-4">
              <Progress label={progress.total ? 'Recompressing images' : 'Analysing PDF'} done={progress.done} total={progress.total} />
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
