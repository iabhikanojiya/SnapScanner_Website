'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Check, Download, FileJson, ImagePlus, LayoutTemplate, Loader2, Plus, Printer, Save, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Alert, Spinner } from '@/components/tools/Feedback'
import SortableList, { moveItem } from '@/components/tools/SortableList'
import ResumeDocument, { PAGE_H, PAGE_W } from '@/components/resume/ResumeDocument'
import ZoomControl, { resolveZoom, type ZoomMode } from '@/components/tools/viewer/ZoomControl'
import { SectionEditor } from '@/components/resume/EntryEditor'
import { canShareFile, downloadBlob, pdfBlob, shareFile } from '@/lib/browser/download'
import { checkFile } from '@/lib/files/validate'
import { decodeImage, encodePixels } from '@/lib/image/browser'
import { RESUME_PALETTES, RESUME_TEMPLATES, templateImage, TEMPLATE_IMAGE_SIZE } from '@/lib/resume'
import { ADDABLE_SECTIONS, SECTION_SPECS, newSection } from '@/lib/resume/model'
import { exportResumePdf } from '@/lib/resume/pdf'
import { getDraft, putDraft } from '@/lib/resume/store'
import { templateStyle } from '@/lib/resume/templates'
import type { PersonalDetails, ResumeData, ResumeDraft } from '@/lib/resume/types'
import { saveFile } from '@/lib/storage/library'
import { cn } from '@/lib/utils'

type SaveState = 'saved' | 'pending' | 'saving' | 'error'

const PERSONAL_FIELDS: { key: Exclude<keyof PersonalDetails, 'photo'>; label: string; type?: string; autoComplete?: string }[] = [
  { key: 'fullName', label: 'Full name', autoComplete: 'name' },
  { key: 'jobTitle', label: 'Job title', autoComplete: 'organization-title' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { key: 'location', label: 'City and country', autoComplete: 'address-level2' },
  { key: 'website', label: 'Website', autoComplete: 'url' },
  { key: 'linkedin', label: 'LinkedIn' },
]

export default function ResumeEditor() {
  const [draft, setDraft] = useState<ResumeDraft | null>(null)
  const [missing, setMissing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id') ?? ''
    getDraft(id)
      .then((d) => (d ? setDraft(d) : setMissing(true)))
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'The resume couldn’t be loaded.'))
  }, [])

  if (loadError) return <Alert tone="error" title="The resume couldn’t be opened" className="m-6">{loadError}</Alert>
  if (missing)
    return (
      <div className="page-container py-16">
        <Alert tone="warning" title="Resume not found">
          This draft isn’t stored in this browser. It may have been deleted, or created in another browser or device.
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/resume-builder">Go to Resume Builder</Link>
        </Button>
      </div>
    )
  if (!draft) return <Spinner label="Opening resume…" className="m-8" />
  return <Editor initial={draft} />
}

function Editor({ initial }: { initial: ResumeDraft }) {
  const [draft, setDraft] = useState(initial)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [pages, setPages] = useState(1)
  const [exporting, setExporting] = useState<'pdf' | 'share' | 'library' | null>(null)
  const [exportNote, setExportNote] = useState<string | null>(null)
  const [zoom, setZoom] = useState<ZoomMode>('page')
  const [fit, setFit] = useState({ width: 0.6, page: 0.6 })
  const previewRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const latest = useRef(draft)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const style = templateStyle(draft.templateId)
  const template = RESUME_TEMPLATES.find((t) => t.id === draft.templateId)!

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setSaveState('saving')
    try {
      await putDraft(latest.current)
      setSaveState('saved')
      setSaveError(null)
    } catch (e) {
      setSaveState('error')
      setSaveError(e instanceof Error ? e.message : 'Saving failed.')
    }
  }, [])

  /** Applies a change and schedules an autosave. */
  const change = useCallback(
    (fn: (d: ResumeDraft) => ResumeDraft) => {
      setDraft((d) => {
        const next = fn(d)
        latest.current = next
        return next
      })
      setSaveState('pending')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void save(), 800)
    },
    [save]
  )
  const changeData = (fn: (d: ResumeData) => ResumeData) => change((d) => ({ ...d, data: fn(d.data) }))

  // Save before leaving; warn if a save is still pending.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (timer.current) {
        void save()
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      if (timer.current) void save()
    }
  }, [save])

  // Scales that fit the A4 preview to the column's width, or a whole page to the visible height.
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const fit = () => {
      const width = Math.max(0.2, (el.clientWidth - 32) / PAGE_W)
      // On phones the panel grows with its content, so use the window height there.
      const height = Math.min(el.clientHeight, window.innerHeight - el.getBoundingClientRect().top) - 110
      setFit({ width, page: Math.max(0.2, Math.min(width, height / PAGE_H)) })
    }
    fit()
    window.addEventListener('resize', fit)
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [view])
  const scale = resolveZoom(zoom, fit.width, fit.page)

  const setPhoto = async (file: File) => {
    try {
      await checkFile(file, 'image')
      const px = await decodeImage(file, file.name, 480)
      const blob = await encodePixels(px, 'image/jpeg', 0.86)
      const url = await new Promise<string>((ok, fail) => {
        const r = new FileReader()
        r.onload = () => ok(r.result as string)
        r.onerror = () => fail(new Error('The photo couldn’t be read.'))
        r.readAsDataURL(blob)
      })
      changeData((d) => ({ ...d, personal: { ...d.personal, photo: url } }))
    } catch (e) {
      setExportNote(e instanceof Error ? e.message : 'The photo couldn’t be used.')
    }
  }

  const fileName = `${(draft.data.personal.fullName || draft.name).replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'resume'} resume.pdf`

  const makePdf = async () => {
    if (!sheetRef.current) throw new Error('The preview isn’t ready yet.')
    const result = await exportResumePdf(sheetRef.current, { title: `${draft.data.personal.fullName || 'Resume'}`, author: draft.data.personal.fullName })
    if (result.replaced.length)
      setExportNote(
        `Some characters (${result.replaced.slice(0, 8).join(' ')}) can’t be written with the PDF’s built-in fonts and were replaced. Use Print → Save as PDF to keep them.`
      )
    return result
  }

  const exportPdf = async (target: 'pdf' | 'share' | 'library') => {
    setExporting(target)
    setExportNote(null)
    try {
      await save()
      const { bytes } = await makePdf()
      const blob = pdfBlob(bytes)
      if (target === 'pdf') downloadBlob(blob, fileName)
      if (target === 'library') {
        await saveFile(blob, { name: fileName, kind: 'pdf', source: 'resume-builder', pageCount: pages })
        setExportNote('Saved to My files in this browser.')
      }
      if (target === 'share') {
        const file = new File([blob], fileName, { type: 'application/pdf' })
        if (!canShareFile(file) || !(await shareFile(file))) setExportNote('Sharing files isn’t supported in this browser. Download the PDF instead.')
      }
    } catch (e) {
      setExportNote(e instanceof Error ? e.message : 'The PDF couldn’t be created.')
    } finally {
      setExporting(null)
    }
  }

  const print = () => {
    document.body.classList.add('printing-resume')
    const done = () => {
      document.body.classList.remove('printing-resume')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
    setTimeout(done, 1000)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ format: 'snap-scanner-resume', version: 1, ...draft }, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${draft.name}.json`)
  }

  const usedTypes = new Set(draft.data.sections.map((s) => s.type))

  return (
    <div className="flex min-h-[calc(100dvh-var(--header-height))] flex-col bg-gray-100">
      {/* Top bar */}
      <div className="no-print sticky top-[var(--header-height)] z-30 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Back to Resume Builder">
            <Link href="/resume-builder">
              <ArrowLeft aria-hidden className="h-4 w-4" />
            </Link>
          </Button>
          <label htmlFor="draft-name" className="sr-only">
            Resume name
          </label>
          <input
            id="draft-name"
            className="min-w-0 max-w-[14rem] flex-1 rounded-md border border-transparent px-2 py-1 font-bold text-ink hover:border-gray-200 focus-visible:border-brand-600"
            value={draft.name}
            onChange={(e) => change((d) => ({ ...d, name: e.target.value }))}
          />
          <span className="flex items-center gap-1 text-xs text-ink-muted" role="status" data-testid="save-state">
            {saveState === 'saved' && (
              <>
                <Check aria-hidden className="h-3.5 w-3.5 text-emerald-600" />
                Saved in this browser
              </>
            )}
            {saveState === 'pending' && 'Unsaved changes'}
            {saveState === 'saving' && (
              <>
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            )}
            {saveState === 'error' && <span className="text-brand-700">Not saved</span>}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="xs" onClick={() => void save()} disabled={saveState === 'saved' || saveState === 'saving'}>
              <Save aria-hidden className="h-4 w-4" />
              Save
            </Button>
            <Button variant="secondary" size="xs" onClick={() => setTemplatesOpen(true)}>
              <LayoutTemplate aria-hidden className="h-4 w-4" />
              Template
            </Button>
            <Button size="xs" onClick={() => void exportPdf('pdf')} disabled={!!exporting}>
              {exporting === 'pdf' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Download aria-hidden className="h-4 w-4" />}
              Download PDF
            </Button>
          </div>
        </div>
        <div className="flex border-t border-gray-100 lg:hidden" role="tablist" aria-label="Editor view">
          {(['edit', 'preview'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn('flex-1 py-2 text-sm font-semibold capitalize', view === v ? 'border-b-2 border-brand-600 text-ink' : 'text-ink-muted')}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {(saveError || exportNote) && (
        <div className="no-print space-y-2 px-4 pt-3">
          {saveError && <Alert tone="error" title="Your changes aren’t saved">{saveError}</Alert>}
          {exportNote && (
            <Alert tone="info">
              {exportNote}{' '}
              <button type="button" className="font-semibold underline" onClick={() => setExportNote(null)}>
                Dismiss
              </button>
            </Alert>
          )}
        </div>
      )}

      <div className="grid flex-1 lg:grid-cols-[minmax(0,34rem)_1fr]">
        {/* Form */}
        <div className={cn('no-print space-y-4 overflow-y-auto p-3 sm:p-4 lg:h-[calc(100dvh-var(--header-height)-3.25rem)]', view === 'preview' && 'hidden lg:block')}>
          <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="personal-heading">
            <h2 id="personal-heading" className="font-bold text-ink">
              Personal details
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                {draft.data.personal.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL chosen by the user
                  <img src={draft.data.personal.photo} alt="Profile photo" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus aria-hidden className="h-6 w-6 text-ink-muted" />
                )}
              </div>
              <div className="text-sm">
                <label className="inline-flex cursor-pointer items-center gap-1 font-semibold text-brand-700 hover:underline">
                  {draft.data.personal.photo ? 'Change photo' : 'Add photo (optional)'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (f) void setPhoto(f)
                    }}
                  />
                </label>
                {draft.data.personal.photo && (
                  <button type="button" className="ml-3 text-ink-muted hover:text-ink" onClick={() => changeData((d) => ({ ...d, personal: { ...d.personal, photo: undefined } }))}>
                    Remove
                  </button>
                )}
                <p className="text-xs text-ink-muted">
                  {style.photo ? 'Shown by this template.' : 'This template doesn’t show photos; it’s kept for templates that do.'}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {PERSONAL_FIELDS.map((f) => (
                <div key={f.key}>
                  <label htmlFor={`p-${f.key}`} className="field-label text-xs">
                    {f.label}
                  </label>
                  <input
                    id={`p-${f.key}`}
                    type={f.type ?? 'text'}
                    autoComplete={f.autoComplete}
                    className="field"
                    value={draft.data.personal[f.key]}
                    onChange={(e) => changeData((d) => ({ ...d, personal: { ...d.personal, [f.key]: e.target.value } }))}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="font-bold text-ink">
              <label htmlFor="summary">Professional summary</label>
            </h2>
            <p className="text-xs text-ink-muted">Two to four sentences about your experience and what you’re looking for.</p>
            <textarea id="summary" rows={5} className="field" value={draft.data.summary} onChange={(e) => changeData((d) => ({ ...d, summary: e.target.value }))} />
          </section>

          <SortableList
            items={draft.data.sections}
            getId={(s) => s.id}
            onReorder={(sections) => changeData((d) => ({ ...d, sections }))}
            handleLabel={(s) => `Reorder section ${s.title}`}
            className="space-y-3"
            renderItem={(section, i, handle) => (
              <SectionEditor
                section={section}
                index={i}
                count={draft.data.sections.length}
                handle={handle}
                onChange={(s) => changeData((d) => ({ ...d, sections: d.sections.map((x) => (x.id === s.id ? s : x)) }))}
                onMove={(delta) => changeData((d) => ({ ...d, sections: moveItem(d.sections, i, delta) }))}
                onDelete={() => changeData((d) => ({ ...d, sections: d.sections.filter((x) => x.id !== section.id) }))}
              />
            )}
          />
          {style.priority && (
            <p className="text-xs text-ink-muted">
              {template.name} places {style.priority.map((t) => SECTION_SPECS[t].label.toLowerCase()).join(' and ')} first on the page.
            </p>
          )}

          <section className="rounded-xl border border-dashed border-gray-300 bg-white p-4" aria-labelledby="add-heading">
            <h2 id="add-heading" className="font-bold text-ink">
              Add a section
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {ADDABLE_SECTIONS.map((type) => (
                <Button
                  key={type}
                  variant="secondary"
                  size="xs"
                  onClick={() => changeData((d) => ({ ...d, sections: [...d.sections, newSection(type)] }))}
                  disabled={type !== 'custom' && usedTypes.has(type)}
                >
                  <Plus aria-hidden className="h-3.5 w-3.5" />
                  {SECTION_SPECS[type].label}
                </Button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="export-heading">
            <h2 id="export-heading" className="font-bold text-ink">
              Export and share
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="xs" onClick={() => void exportPdf('pdf')} disabled={!!exporting}>
                <Download aria-hidden className="h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="secondary" size="xs" onClick={print}>
                <Printer aria-hidden className="h-4 w-4" />
                Print
              </Button>
              <Button variant="secondary" size="xs" onClick={() => void exportPdf('share')} disabled={!!exporting}>
                <Share2 aria-hidden className="h-4 w-4" />
                Share PDF
              </Button>
              <Button variant="secondary" size="xs" onClick={() => void exportPdf('library')} disabled={!!exporting}>
                Save PDF to My files
              </Button>
              <Button variant="ghost" size="xs" onClick={exportJson}>
                <FileJson aria-hidden className="h-4 w-4" />
                Export data (JSON)
              </Button>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Download PDF creates a text-based PDF that applicant tracking systems can read. Print uses your browser’s print dialog, where you can also
              choose Save as PDF.
            </p>
          </section>
        </div>

        {/* Preview */}
        <div ref={previewRef} className={cn('resume-print-host relative overflow-auto p-4 lg:h-[calc(100dvh-var(--header-height)-3.25rem)]', view === 'edit' && 'hidden lg:block')}>
          <div className="no-print mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{template.name}</span>
            {template.atsFriendly && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">ATS-friendly layout</span>}
            <span className="text-xs text-ink-muted" data-testid="page-count">
              {pages} page{pages === 1 ? '' : 's'}
            </span>
            {style.usesPalette && (
              <div className="ml-auto flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Colour palette">
                <button
                  type="button"
                  role="radio"
                  aria-checked={draft.paletteId === 'template'}
                  onClick={() => change((d) => ({ ...d, paletteId: 'template' }))}
                  className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', draft.paletteId === 'template' ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white text-ink-soft')}
                >
                  Original
                </button>
                {RESUME_PALETTES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={draft.paletteId === p.id}
                    aria-label={p.name}
                    title={p.name}
                    onClick={() => change((d) => ({ ...d, paletteId: p.id }))}
                    className={cn('h-6 w-6 rounded-full border-2', draft.paletteId === p.id ? 'border-ink' : 'border-white ring-1 ring-gray-300')}
                    style={{ background: p.primary }}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="no-print mb-3 flex justify-end">
            <ZoomControl mode={zoom} scale={scale} onChange={setZoom} />
          </div>
          <div style={{ width: PAGE_W * scale, height: pages * PAGE_H * scale }} className="mx-auto">
            <div className="resume-print-root relative origin-top-left shadow-lift" style={{ transform: `scale(${scale})`, width: PAGE_W }}>
              <ResumeDocument ref={sheetRef} data={draft.data} templateId={draft.templateId} paletteId={draft.paletteId} onPages={setPages} />
              {Array.from({ length: pages - 1 }, (_, i) => (
                <div
                  key={i}
                  aria-hidden
                  data-export-ignore
                  className="resume-page-gap pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-brand-300"
                  style={{ top: (i + 1) * PAGE_H }}
                >
                  <span className="absolute right-2 top-1 rounded bg-brand-50 px-2 text-xs font-semibold text-brand-700">Page {i + 2}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {templatesOpen && (
        <Dialog open onClose={() => setTemplatesOpen(false)} size="lg" title="Choose a template" description="Your content stays the same when you switch.">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RESUME_TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={draft.templateId === t.id}
                  onClick={() => {
                    change((d) => ({ ...d, templateId: t.id }))
                    setTemplatesOpen(false)
                  }}
                  className={cn('block w-full rounded-lg border-2 p-1 text-left', draft.templateId === t.id ? 'border-brand-600' : 'border-transparent hover:border-gray-300')}
                >
                  <Image src={templateImage(t.id)} alt="" width={TEMPLATE_IMAGE_SIZE.width} height={TEMPLATE_IMAGE_SIZE.height} className="w-full rounded border border-gray-200" sizes="180px" />
                  <span className="mt-1 block text-xs font-semibold text-ink">{t.name}</span>
                  {t.atsFriendly && <span className="block text-[11px] text-emerald-800">ATS-friendly</span>}
                </button>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
      <span className="sr-only" aria-live="polite">
        {exporting ? 'Creating PDF…' : ''}
      </span>
      {exporting && (
        <div className="no-print fixed bottom-4 right-4 z-40 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-lift">
          <Loader2 aria-hidden className="mr-2 inline h-4 w-4 animate-spin" />
          Creating PDF…
        </div>
      )}
    </div>
  )
}
