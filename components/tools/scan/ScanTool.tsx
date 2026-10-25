'use client'

import { useRef, useState } from 'react'
import { Camera, FileDown, ImagePlus, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Dropzone from '@/components/tools/Dropzone'
import { Alert, ErrorList, Progress, Spinner } from '@/components/tools/Feedback'
import PageEditor from '@/components/tools/images/PageEditor'
import PageGrid from '@/components/tools/images/PageGrid'
import PdfOutputOptions, { DEFAULT_OUTPUT, type OutputOptions } from '@/components/tools/images/PdfOutputOptions'
import { useImagePages } from '@/components/tools/images/useImagePages'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import CameraCapture from '@/components/tools/scan/CameraCapture'
import PhoneScanPrompt, { useIsDesktop } from '@/components/tools/scan/PhoneScanPrompt'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { useInitialFiles } from '@/components/tools/useInitialFiles'
import { pdfBlob } from '@/lib/browser/download'
import { safeFileName } from '@/lib/files/validate'
import { FILTER_LABELS, SCAN_FILTERS, type ScanFilter } from '@/lib/image/filters'
import { exportPages, type ImagePage } from '@/lib/image/pages'
import { imagesToPdf } from '@/lib/pdf/operations'

function defaultName() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `Scan ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}.${pad(d.getMinutes())}`
}

export default function ScanTool() {
  const desktop = useIsDesktop()
  const { pages, setPages, adding, add, update, setFilterForAll, remove, clear } = useImagePages()
  const [errors, setErrors] = useState<string[]>([])
  const [camera, setCamera] = useState(false)
  const [editing, setEditing] = useState<ImagePage | null>(null)
  const [options, setOptions] = useState<OutputOptions>(DEFAULT_OUTPUT)
  const [fileName, setFileName] = useState(defaultName)
  const [defaultFilter, setDefaultFilter] = useState<ScanFilter>('enhance')
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null)
  const [result, setResult] = useState<ResultFile | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)

  const addFiles = async (files: File[]) => {
    // New scans start with the chosen default filter.
    const { errors: errs } = await add(files, { detect: true, filter: defaultFilter })
    setErrors(errs)
  }

  useInitialFiles('scan-pdf', addFiles, (m) => setErrors([m]))

  const create = async () => {
    setErrors([])
    try {
      setProgress({ label: 'Processing pages', done: 0, total: pages.length })
      const images = await exportPages(pages, options.quality, (done, total) => setProgress({ label: 'Processing pages', done, total }))
      setProgress({ label: 'Building PDF', done: 0, total: images.length })
      const bytes = await imagesToPdf(images, { ...options, title: fileName }, (done, total) => setProgress({ label: 'Building PDF', done, total }))
      setResult({ blob: pdfBlob(bytes), name: safeFileName(fileName, 'pdf'), pageCount: images.length })
      setCamera(false)
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
        title="Your scan is ready"
        summary={`${result.pageCount} page${result.pageCount === 1 ? '' : 's'} scanned to PDF.`}
        files={[result]}
        source="scan-pdf"
        resetLabel="New scan"
        onReset={() => {
          setResult(null)
          setFileName(defaultName())
          clear()
        }}
      />
    )
  }

  const undetected = pages.filter((p) => p.detected === false).length

  const sources = (
    <>
      <Button type="button" variant="dark" size={pages.length ? 'sm' : 'md'} onClick={() => setCamera(true)}>
        <Camera aria-hidden className="h-4 w-4" />
        Use camera
      </Button>
      {/* On phones this opens the native camera app, which works even where live preview isn't available. */}
      <Button type="button" variant="secondary" size={pages.length ? 'sm' : 'md'} onClick={() => photoInput.current?.click()} className="sm:hidden">
        <ImagePlus aria-hidden className="h-4 w-4" />
        Take photo
      </Button>
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(Array.from(e.target.files))
          e.target.value = ''
        }}
      />
    </>
  )

  return (
    <div className="space-y-5">
      {camera && <CameraCapture count={pages.length} onCapture={(f) => void addFiles([f])} onClose={() => setCamera(false)} />}

      {pages.length === 0 && !camera && <PhoneScanPrompt />}

      {pages.length === 0 ? (
        // On computers, scanning is done with the phone app (see the prompt above).
        !camera &&
        !desktop && (
          <Dropzone
            accept="image"
            multiple
            onFiles={addFiles}
            disabled={adding}
            title="Scan with your camera or upload photos"
            hint="Use your device camera, or choose photos of documents. Page edges are detected automatically where possible."
          >
            {sources}
          </Dropzone>
        )
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <section aria-labelledby="scan-pages" className="panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="scan-pages" className="font-bold text-ink">
                {pages.length} scanned page{pages.length === 1 ? '' : 's'}
              </h2>
              <div className="flex flex-wrap gap-2">{!camera && sources}</div>
            </div>
            {undetected > 0 && (
              <Alert tone="warning" className="mt-3">
                Page edges couldn’t be found automatically on {undetected === 1 ? 'one page' : `${undetected} pages`}. Select the page to crop it by
                hand. Detection works best with a light page on a darker, plain background.
              </Alert>
            )}
            <div className="mt-4">
              <PageGrid
                pages={pages}
                showDetection
                onReorder={setPages}
                onEdit={setEditing}
                onRotate={(p) => update(p.id, { rotation: (p.edits.rotation + 90) % 360 })}
                onRemove={(p) => remove(p.id)}
              />
            </div>
            <div className="mt-4">
              <Dropzone accept="image" multiple compact onFiles={addFiles} disabled={adding || !!progress} hint="Drop more photos here." />
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="panel space-y-4 p-5">
              <div>
                <label htmlFor="all-filter" className="field-label flex items-center gap-2">
                  <SlidersHorizontal aria-hidden className="h-4 w-4" />
                  Filter for all pages
                </label>
                <select
                  id="all-filter"
                  className="field"
                  value={defaultFilter}
                  onChange={(e) => {
                    const f = e.target.value as ScanFilter
                    setDefaultFilter(f)
                    setFilterForAll(f)
                  }}
                >
                  {SCAN_FILTERS.map((f) => (
                    <option key={f} value={f}>
                      {FILTER_LABELS[f]}
                    </option>
                  ))}
                </select>
                <p className="field-hint">Change a single page’s filter by selecting it.</p>
              </div>
              <PdfOutputOptions value={options} onChange={setOptions} />
              <div>
                <label htmlFor="scan-name" className="field-label">
                  File name
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input id="scan-name" className="field mt-0" value={fileName} onChange={(e) => setFileName(e.target.value)} />
                  <span className="text-sm text-ink-muted">.pdf</span>
                </div>
              </div>
              <Button className="w-full" onClick={create} disabled={!!progress || adding}>
                <FileDown aria-hidden className="h-5 w-5" />
                Save as PDF
              </Button>
            </div>
            {progress && <Progress label={progress.label} done={progress.done} total={progress.total} />}
          </aside>
        </div>
      )}
      {adding && <Spinner label="Reading pages and detecting edges…" />}
      <ErrorList errors={errors} onDismiss={() => setErrors([])} />
      {editing && (
        <PageEditor
          page={editing}
          onClose={() => setEditing(null)}
          onSave={(edits, all) => {
            update(editing.id, edits)
            if (all) {
              setFilterForAll(edits.filter)
              setDefaultFilter(edits.filter)
            }
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
