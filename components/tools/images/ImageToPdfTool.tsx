'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Dropzone from '@/components/tools/Dropzone'
import { ErrorList, Progress, Spinner } from '@/components/tools/Feedback'
import PageEditor from '@/components/tools/images/PageEditor'
import PageGrid from '@/components/tools/images/PageGrid'
import PdfOutputOptions, { DEFAULT_OUTPUT, type OutputOptions } from '@/components/tools/images/PdfOutputOptions'
import { useImagePages } from '@/components/tools/images/useImagePages'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { useInitialFiles } from '@/components/tools/useInitialFiles'
import { pdfBlob } from '@/lib/browser/download'
import { safeFileName, sniff } from '@/lib/files/validate'
import type { ToolId } from '@/lib/tools'
import { exportPages, type ImagePage } from '@/lib/image/pages'
import { imagesToPdf } from '@/lib/pdf/operations'

const ONLY_LABEL = { jpeg: 'JPG', png: 'PNG', webp: 'WebP' } as const

export default function ImageToPdfTool({ tool = 'image-to-pdf', only }: { tool?: ToolId; only?: keyof typeof ONLY_LABEL }) {
  const { pages, setPages, adding, add, update, setFilterForAll, remove, clear } = useImagePages()
  const [errors, setErrors] = useState<string[]>([])
  const [editing, setEditing] = useState<ImagePage | null>(null)
  const [options, setOptions] = useState<OutputOptions>(DEFAULT_OUTPUT)
  const [fileName, setFileName] = useState('images')
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null)
  const [result, setResult] = useState<ResultFile | null>(null)

  const addFiles = async (files: File[]) => {
    const rejected: string[] = []
    let usable = files
    if (only) {
      // This variant takes one format; others are explained rather than silently accepted.
      const checked = await Promise.all(files.map(async (f) => ({ f, kind: sniff(new Uint8Array(await f.slice(0, 32).arrayBuffer())) })))
      usable = checked.filter((c) => c.kind === only).map((c) => c.f)
      for (const c of checked)
        if (c.kind !== only) rejected.push(`“${c.f.name}” isn’t a ${ONLY_LABEL[only]} image. Use Images to PDF for other formats.`)
    }
    const { errors: errs } = usable.length ? await add(usable, { detect: false }) : { errors: [] }
    setErrors([...rejected, ...errs])
  }

  useInitialFiles(tool, addFiles, (m) => setErrors([m]))

  const create = async () => {
    setErrors([])
    try {
      setProgress({ label: 'Preparing images', done: 0, total: pages.length })
      const images = await exportPages(pages, options.quality, (done, total) => setProgress({ label: 'Preparing images', done, total }))
      setProgress({ label: 'Building PDF', done: 0, total: images.length })
      const bytes = await imagesToPdf(images, { ...options, title: fileName }, (done, total) =>
        setProgress({ label: 'Building PDF', done, total })
      )
      setResult({ blob: pdfBlob(bytes), name: safeFileName(fileName, 'pdf'), pageCount: images.length })
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
        title="Your PDF is ready"
        summary={`${result.pageCount} image${result.pageCount === 1 ? '' : 's'} converted.`}
        files={[result]}
        source={tool}
        resetLabel="Convert more images"
        onReset={() => {
          setResult(null)
          clear()
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      {pages.length === 0 ? (
        <Dropzone accept="image" multiple onFiles={addFiles} disabled={adding} hint={only ? `Drop ${ONLY_LABEL[only]} images here, or choose them from your device.` : 'Drop JPG, PNG, WebP, GIF or BMP images here, or choose them from your device.'} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <section aria-labelledby="pages-heading" className="panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="pages-heading" className="font-bold text-ink">
                {pages.length} page{pages.length === 1 ? '' : 's'}
              </h2>
              <p className="text-sm text-ink-muted">Select a page to crop, rotate or filter it. Drag to reorder.</p>
            </div>
            <div className="mt-4">
              <PageGrid
                pages={pages}
                onReorder={setPages}
                onEdit={setEditing}
                onRotate={(p) => update(p.id, { rotation: (p.edits.rotation + 90) % 360 })}
                onRemove={(p) => remove(p.id)}
              />
            </div>
            <div className="mt-4">
              <Dropzone accept="image" multiple compact onFiles={addFiles} disabled={adding || !!progress} hint="Drop more images here." />
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="panel space-y-4 p-5">
              <h2 className="font-bold text-ink">PDF settings</h2>
              <PdfOutputOptions value={options} onChange={setOptions} />
              <div>
                <label htmlFor="pdf-name" className="field-label">
                  File name
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input id="pdf-name" className="field mt-0" value={fileName} onChange={(e) => setFileName(e.target.value)} />
                  <span className="text-sm text-ink-muted">.pdf</span>
                </div>
              </div>
              <Button className="w-full" onClick={create} disabled={pages.length === 0 || !!progress || adding}>
                <FileDown aria-hidden className="h-5 w-5" />
                Convert to PDF
              </Button>
            </div>
            {progress && <Progress label={progress.label} done={progress.done} total={progress.total} />}
          </aside>
        </div>
      )}
      {adding && <Spinner label="Reading images…" />}
      <ErrorList errors={errors} onDismiss={() => setErrors([])} />
      {editing && (
        <PageEditor
          page={editing}
          onClose={() => setEditing(null)}
          onSave={(edits, all) => {
            update(editing.id, edits)
            if (all) setFilterForAll(edits.filter)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
