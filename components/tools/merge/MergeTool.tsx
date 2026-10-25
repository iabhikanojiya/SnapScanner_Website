'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Combine, Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Dropzone from '@/components/tools/Dropzone'
import { Alert, ErrorList, Progress } from '@/components/tools/Feedback'
import { PdfCover } from '@/components/tools/PdfThumbs'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import SortableList, { moveItem } from '@/components/tools/SortableList'
import { errorMessage, focusResult, readPdfFiles, type PdfItem } from '@/components/tools/pdfInput'
import { useInitialFiles } from '@/components/tools/useInitialFiles'
import { pdfBlob } from '@/lib/browser/download'
import { LIMITS, formatBytes } from '@/lib/limits'
import { mergePdfs } from '@/lib/pdf/operations'

type Item = PdfItem & { password: string }

export default function MergeTool() {
  const [items, setItems] = useState<Item[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<ResultFile | null>(null)

  const add = async (files: File[]) => {
    setLoading(true)
    const room = LIMITS.filesPerJob - items.length
    const { items: added, errors: errs } = await readPdfFiles(files.slice(0, Math.max(0, room)))
    if (files.length > room) errs.push(`You can merge up to ${LIMITS.filesPerJob} files at once.`)
    setItems((cur) => [...cur, ...added.map((i) => ({ ...i, password: '' }))])
    setErrors(errs)
    setLoading(false)
  }

  useInitialFiles('merge-pdf', add, (m) => setErrors([m]))

  const merge = async () => {
    setErrors([])
    setProgress({ done: 0, total: items.length })
    try {
      const bytes = await mergePdfs(
        items.map((i) => ({ name: i.name, bytes: i.bytes, password: i.password })),
        (done, total) => setProgress({ done, total })
      )
      const pageCount = items.reduce((n, i) => n + i.pageCount, 0)
      setResult({ blob: pdfBlob(bytes), name: 'merged.pdf', pageCount })
      focusResult()
    } catch (e) {
      setErrors([errorMessage(e)])
    } finally {
      setProgress(null)
    }
  }

  if (result) {
    return (
      <ResultPanel
        title="Your PDFs are merged"
        summary={`${items.length} files combined into one ${result.pageCount}-page PDF.`}
        files={[result]}
        source="merge-pdf"
        onReset={() => {
          setResult(null)
          setItems([])
        }}
      />
    )
  }

  const totalPages = items.reduce((n, i) => n + i.pageCount, 0)
  const needsPassword = items.some((i) => i.encrypted && !i.password)

  return (
    <div className="space-y-5">
      {items.length === 0 ? (
        <Dropzone accept="pdf" multiple onFiles={add} disabled={loading} hint="Drop two or more PDFs here, or choose them from your device." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-ink">
                {items.length} file{items.length === 1 ? '' : 's'} · {totalPages} pages
              </h2>
              <p className="hidden text-sm text-ink-muted sm:block">Drag to change the order</p>
            </div>
            <SortableList
              items={items}
              getId={(i) => i.id}
              onReorder={setItems}
              handleLabel={(i) => `Reorder ${i.name}`}
              className="mt-4 space-y-2"
              renderItem={(item, index, handle) => (
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 pr-3">
                  {handle}
                  <PdfCover bytes={item.bytes} className="w-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      <span className="mr-1 text-ink-muted">{index + 1}.</span>
                      {item.name}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {item.pageCount} page{item.pageCount === 1 ? '' : 's'} · {formatBytes(item.size)}
                    </p>
                    {item.encrypted && (
                      <div className="mt-2 flex items-center gap-2">
                        <Lock aria-hidden className="h-4 w-4 shrink-0 text-amber-700" />
                        <label className="sr-only" htmlFor={`pw-${item.id}`}>
                          Password for {item.name}
                        </label>
                        <input
                          id={`pw-${item.id}`}
                          type="password"
                          autoComplete="off"
                          placeholder="Password-protected: enter password"
                          className="field mt-0 h-9 py-1 text-sm"
                          value={item.password}
                          onChange={(e) =>
                            setItems((cur) => cur.map((x) => (x.id === item.id ? { ...x, password: e.target.value } : x)))
                          }
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${item.name} up`}
                      disabled={index === 0}
                      onClick={() => setItems((cur) => moveItem(cur, index, -1))}
                    >
                      <ArrowUp aria-hidden className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${item.name} down`}
                      disabled={index === items.length - 1}
                      onClick={() => setItems((cur) => moveItem(cur, index, 1))}
                    >
                      <ArrowDown aria-hidden className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => setItems((cur) => cur.filter((x) => x.id !== item.id))}
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            />
            <div className="mt-4">
              <Dropzone accept="pdf" multiple compact onFiles={add} disabled={loading || !!progress} hint="Drop more PDFs here." />
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="panel p-5">
              <h2 className="font-bold text-ink">Merge</h2>
              <p className="mt-1 text-sm text-ink-muted">Pages keep their order within each file. Files are combined top to bottom.</p>
              <Button className="mt-4 w-full" onClick={merge} disabled={items.length < 2 || !!progress || needsPassword}>
                <Combine aria-hidden className="h-5 w-5" />
                Merge {items.length} PDFs
              </Button>
              {items.length < 2 && <p className="mt-2 text-xs text-ink-muted">Add at least two PDFs.</p>}
              {needsPassword && <p className="mt-2 text-xs text-amber-800">Enter the password for each protected file.</p>}
            </div>
            {progress && <Progress label="Merging" done={progress.done} total={progress.total} />}
          </aside>
        </div>
      )}
      {loading && <Alert tone="info">Reading files…</Alert>}
      <ErrorList errors={errors} onDismiss={() => setErrors([])} />
    </div>
  )
}
