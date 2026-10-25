'use client'

import { useState } from 'react'
import { Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Dropzone from '@/components/tools/Dropzone'
import { Alert, ErrorList, Progress } from '@/components/tools/Feedback'
import ResultPanel, { type ResultFile } from '@/components/tools/ResultPanel'
import { errorMessage, focusResult } from '@/components/tools/pdfInput'
import { useInitialFiles } from '@/components/tools/useInitialFiles'
import { pdfBlob } from '@/lib/browser/download'
import { baseName, checkFiles } from '@/lib/files/validate'
import { formatBytes } from '@/lib/limits'
import { repairPdf } from '@/lib/pdf/edit'
import { imagesToPdf, PdfJobError } from '@/lib/pdf/operations'
import { openForView, ViewerPasswordError } from '@/lib/pdf/viewer'

interface Picked {
  name: string
  size: number
  bytes: Uint8Array
}

export default function RepairTool() {
  const [file, setFile] = useState<Picked | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [result, setResult] = useState<{ file: ResultFile; lossy: boolean } | null>(null)

  // Damaged files can't be inspected like normal PDFs, so only the header is checked.
  const add = async (files: File[]) => {
    setErrors([])
    setFailure(null)
    const { accepted, errors: errs } = await checkFiles(files.slice(0, 1), 'pdf')
    setErrors(errs)
    if (accepted[0]) setFile({ name: accepted[0].file.name, size: accepted[0].file.size, bytes: new Uint8Array(await accepted[0].file.arrayBuffer()) })
  }
  useInitialFiles('repair-pdf', add, (m) => setErrors([m]))

  const rebuild = async () => {
    if (!file) return
    setFailure(null)
    setProgress({ label: 'Rebuilding structure', done: 0, total: 0 })
    try {
      const r = await repairPdf({ name: file.name, bytes: file.bytes })
      setResult({ file: { blob: pdfBlob(r.bytes), name: `${baseName(file.name)}_repaired.pdf`, pageCount: r.pageCount }, lossy: false })
      focusResult()
    } catch (e) {
      setFailure(e instanceof PdfJobError ? e.message : 'The structure couldn’t be rebuilt.')
    } finally {
      setProgress(null)
    }
  }

  /** Last resort: render whatever pdf.js can read into image pages. */
  const recoverAsImages = async () => {
    if (!file) return
    setProgress({ label: 'Rendering readable pages', done: 0, total: 0 })
    try {
      const { doc, task } = await openForView(file.bytes)
      const images = []
      try {
        for (let i = 1; i <= doc.numPages; i++) {
          try {
            const page = await doc.getPage(i)
            const viewport = page.getViewport({ scale: 2 })
            const canvas = document.createElement('canvas')
            canvas.width = Math.floor(viewport.width)
            canvas.height = Math.floor(viewport.height)
            await page.render({ canvas, viewport }).promise
            const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9))
            canvas.width = canvas.height = 0
            if (blob) images.push({ bytes: new Uint8Array(await blob.arrayBuffer()), type: 'jpeg' as const, width: viewport.width / 1.5, height: viewport.height / 1.5 })
          } catch {
            // Skip unreadable pages.
          }
          setProgress({ label: 'Rendering readable pages', done: i, total: doc.numPages })
        }
      } finally {
        void task.destroy()
      }
      if (!images.length) throw new Error('No pages could be read.')
      const bytes = await imagesToPdf(images, { pageSize: 'fit', orientation: 'auto', margin: 'none' })
      setResult({ file: { blob: pdfBlob(bytes), name: `${baseName(file.name)}_recovered.pdf`, pageCount: images.length }, lossy: true })
      focusResult()
    } catch (e) {
      setFailure(e instanceof ViewerPasswordError ? 'This PDF is password-protected. Unlock it first.' : `Recovery failed: ${errorMessage(e)} The file may be too damaged to recover.`)
    } finally {
      setProgress(null)
    }
  }

  if (result)
    return (
      <ResultPanel
        title={result.lossy ? 'Pages recovered as images' : 'Your PDF is repaired'}
        summary={
          result.lossy
            ? 'Readable pages were saved as images. Text is no longer selectable, and links and forms are lost. Check every page.'
            : `${result.file.pageCount} page${result.file.pageCount === 1 ? '' : 's'} recovered with a rebuilt structure. Check that everything you need is there.`
        }
        files={[result.file]}
        source="repair-pdf"
        resetLabel="Repair another PDF"
        onReset={() => {
          setResult(null)
          setFile(null)
        }}
      />
    )

  return (
    <div className="space-y-5">
      {!file ? (
        <Dropzone accept="pdf" onFiles={add} hint="Drop a damaged PDF here, or choose it from your device." />
      ) : (
        <div className="panel max-w-xl space-y-4 p-5">
          <div>
            <p className="truncate font-semibold text-ink">{file.name}</p>
            <p className="text-xs text-ink-muted">{formatBytes(file.size)}</p>
          </div>
          <Button onClick={rebuild} disabled={!!progress}>
            <Wrench aria-hidden className="h-5 w-5" />
            Repair PDF
          </Button>
          {progress && <Progress label={progress.label} done={progress.done} total={progress.total} />}
          {failure && (
            <Alert tone="warning" title="Couldn’t rebuild the PDF">
              {failure}
              <div className="mt-2">
                <Button size="xs" variant="secondary" onClick={recoverAsImages} disabled={!!progress}>
                  Try recovering pages as images
                </Button>
              </div>
            </Alert>
          )}
          <Button variant="ghost" size="xs" onClick={() => setFile(null)}>
            Choose another file
          </Button>
        </div>
      )}
      <ErrorList errors={errors} onDismiss={() => setErrors([])} />
    </div>
  )
}
