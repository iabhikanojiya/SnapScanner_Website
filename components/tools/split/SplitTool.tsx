'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Progress } from '@/components/tools/Feedback'
import { PageThumbnail } from '@/components/tools/PdfThumbs'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { SinglePdfInput, useSinglePdf } from '@/components/tools/SinglePdf'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { downloadBlob, pdfBlob, zipFiles } from '@/lib/browser/download'
import { baseName } from '@/lib/files/validate'
import { splitPdf } from '@/lib/pdf/operations'
import { consecutiveGroups, formatPageRanges, parsePageRanges } from '@/lib/pdf/ranges'
import { cn } from '@/lib/utils'

type Mode = 'ranges' | 'select'
type SelectOutput = 'one' | 'each'

export default function SplitTool({ variant = 'split' }: { variant?: 'split' | 'extract' }) {
  const toolId = variant === 'extract' ? 'extract-pages' : 'split-pdf'
  const state = useSinglePdf(toolId, { render: true, unlockEncrypted: true })
  const { pdf } = state
  const [mode, setMode] = useState<Mode>(variant === 'extract' ? 'select' : 'ranges')
  const [rangeText, setRangeText] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectOutput, setSelectOutput] = useState<SelectOutput>('one')

  // Ranges can be passed in the URL, e.g. by Snap Assistant: ?pages=2-5
  useEffect(() => {
    const pages = new URLSearchParams(window.location.search).get('pages')
    if (!pages || !/^[\d\s,\-–]+$/.test(pages)) return
    const t = setTimeout(() => {
      setRangeText(pages)
      setMode('ranges')
    }, 0)
    return () => clearTimeout(t)
  }, [])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ResultFile[] | null>(null)

  const plan = useMemo((): { groups: number[][] } | { error: string } | null => {
    if (!pdf) return null
    if (mode === 'ranges') {
      if (!rangeText.trim()) return null
      try {
        return { groups: parsePageRanges(rangeText, pdf.pageCount) }
      } catch (e) {
        return { error: errorMessage(e) }
      }
    }
    if (selected.size === 0) return null
    const sorted = [...selected].sort((a, b) => a - b)
    return { groups: selectOutput === 'one' ? [sorted] : sorted.map((p) => [p]) }
  }, [pdf, mode, rangeText, selected, selectOutput])

  const toggle = (index: number) =>
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  const run = async () => {
    if (!pdf || !plan || 'error' in plan) return
    setError(null)
    setProgress({ done: 0, total: plan.groups.length })
    try {
      const outputs = await splitPdf({ name: pdf.name, bytes: pdf.bytes, password: pdf.password }, plan.groups, (done, total) =>
        setProgress({ done, total })
      )
      const base = baseName(pdf.name)
      setResults(
        outputs.map((bytes, i) => {
          const pages = plan.groups[i]
          const label = consecutiveGroups(pages).length === 1 && pages.length > 1 ? `${pages[0] + 1}-${pages[pages.length - 1] + 1}` : formatPageRanges(pages).replace(/, /g, '_')
          return { blob: pdfBlob(bytes), name: `${base}_pages_${label}.pdf`, pageCount: pages.length }
        })
      )
      focusResult()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setProgress(null)
    }
  }

  if (results && pdf) {
    return (
      <ResultPanel
        title={results.length === 1 ? 'Your pages are extracted' : `${variant === 'extract' ? 'Extracted' : 'Split into'} ${results.length} PDFs`}
        summary={pdf.encrypted ? 'The new files aren’t password-protected.' : undefined}
        files={results}
        source={toolId}
        renamable={results.length === 1}
        onDownloadAll={
          results.length > 1
            ? async () => {
                const files = await Promise.all(results.map(async (r) => ({ name: r.name, bytes: new Uint8Array(await r.blob.arrayBuffer()) })))
                downloadBlob(zipFiles(files), `${baseName(pdf.name)}_split.zip`)
              }
            : undefined
        }
        resetLabel={variant === 'extract' ? 'Extract more pages' : 'Split again'}
        onReset={() => setResults(null)}
      />
    )
  }

  return (
    <div className="space-y-5">
      <SinglePdfInput state={state} />
      {pdf?.view && (
        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <section aria-labelledby="pages-title" className="panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="pages-title" className="font-bold text-ink">
                Pages
              </h2>
              {mode === 'select' && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="xs" onClick={() => setSelected(new Set(Array.from({ length: pdf.pageCount }, (_, i) => i)))}>
                    Select all
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {mode === 'select' ? 'Select the pages to extract.' : 'Page numbers are shown under each thumbnail.'}
            </p>
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: pdf.pageCount }, (_, i) => {
                const on = selected.has(i)
                const thumb = <PageThumbnail doc={pdf.view!} pageNumber={i + 1} width={140} className="rounded-md border border-gray-200" />
                return (
                  <li key={i}>
                    {mode === 'select' ? (
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`Page ${i + 1}`}
                        onClick={() => toggle(i)}
                        className={cn(
                          'relative block w-full rounded-lg p-1.5 text-left ring-2 transition-colors',
                          on ? 'bg-brand-50 ring-brand-600' : 'ring-transparent hover:bg-gray-50'
                        )}
                      >
                        {thumb}
                        <span
                          className={cn(
                            'absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border-2',
                            on ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 bg-white'
                          )}
                        >
                          {on && <Check aria-hidden className="h-4 w-4" />}
                        </span>
                        <span className="mt-1 block text-center text-xs font-semibold text-ink-soft">{i + 1}</span>
                      </button>
                    ) : (
                      <div className="p-1.5">
                        {thumb}
                        <span className="mt-1 block text-center text-xs font-semibold text-ink-soft">{i + 1}</span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="panel p-5">
              <fieldset>
                <legend className="font-bold text-ink">{variant === 'extract' ? 'Choose pages by' : 'Split by'}</legend>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="choice">
                    <input type="radio" name="mode" className="sr-only" checked={mode === 'ranges'} onChange={() => setMode('ranges')} />
                    Custom ranges
                  </label>
                  <label className="choice">
                    <input type="radio" name="mode" className="sr-only" checked={mode === 'select'} onChange={() => setMode('select')} />
                    Select pages
                  </label>
                </div>
              </fieldset>

              {mode === 'ranges' ? (
                <div className="mt-4">
                  <label htmlFor="ranges" className="field-label">
                    Page ranges
                  </label>
                  <input
                    id="ranges"
                    className="field"
                    value={rangeText}
                    onChange={(e) => setRangeText(e.target.value)}
                    placeholder="e.g. 1-3, 5, 8-10"
                    aria-describedby="ranges-hint"
                    aria-invalid={!!plan && 'error' in plan}
                  />
                  <p id="ranges-hint" className="field-hint">
                    Each range becomes its own PDF. This file has {pdf.pageCount} pages.
                  </p>
                </div>
              ) : (
                <fieldset className="mt-4">
                  <legend className="field-label">Output</legend>
                  <div className="mt-2 space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="out" className="h-4 w-4 accent-brand-600" checked={selectOutput === 'one'} onChange={() => setSelectOutput('one')} />
                      One PDF with the selected pages
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="out" className="h-4 w-4 accent-brand-600" checked={selectOutput === 'each'} onChange={() => setSelectOutput('each')} />
                      A separate PDF for each page
                    </label>
                  </div>
                  <p className="field-hint mt-2">
                    {selected.size ? `Selected: ${formatPageRanges([...selected])}` : 'No pages selected yet.'}
                  </p>
                </fieldset>
              )}

              {plan && 'error' in plan && (
                <Alert tone="error" className="mt-3">
                  {plan.error}
                </Alert>
              )}

              <Button className="mt-4 w-full" onClick={run} disabled={!plan || 'error' in plan || !!progress}>
                <Scissors aria-hidden className="h-5 w-5" />
                {plan && 'groups' in plan && plan.groups.length > 1 ? `Create ${plan.groups.length} PDFs` : variant === 'extract' ? 'Extract pages' : 'Split PDF'}
              </Button>
            </div>
            {progress && <Progress label="Creating PDFs" done={progress.done} total={progress.total} />}
            {error && <Alert tone="error">{error}</Alert>}
          </aside>
        </div>
      )}
    </div>
  )
}
