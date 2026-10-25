'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Copy, Download, FileImage, FileJson, FolderInput, LayoutTemplate, Loader2, Printer, Redo2, RotateCcw, Save, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Alert, Spinner } from '@/components/tools/Feedback'
import ZoomControl, { resolveZoom, type ZoomMode } from '@/components/tools/viewer/ZoomControl'
import CollagePanel from '@/components/create/CollagePanel'
import { TemplateGallery, editHref } from '@/components/create/CreateGallery'
import FieldsForm from '@/components/create/FieldsForm'
import InvoicePanel from '@/components/create/InvoicePanel'
import { downloadBlob, pdfBlob, zipFiles } from '@/lib/browser/download'
import { slotKey } from '@/lib/create/categories/photo-collages'
import { GREETING_PIXEL_SIZES } from '@/lib/create/categories/festival-greetings'
import type { FontFamily } from '@/lib/create/engine'
import { exportPdf, exportRaster } from '@/lib/create/export-browser'
import { MM, type Content, type ProjectOptions, type TemplateDef } from '@/lib/create/kit'
import { duplicateProject, getProject, putProject, safeFileName, type CreateProject } from '@/lib/create/project'
import { CUSTOM_LIMITS, CUSTOM_SIZE_ID, buildDesign, contentForTemplate, defaultSizeId, getCategory, getTemplate, paletteFor, resolveSize, slotCount, switchLosses, type Category, type CategoryId } from '@/lib/create/registry'
import { DesignPageSvg } from '@/lib/create/render-svg'
import { projectWarnings } from '@/lib/create/validate'
import { saveFile } from '@/lib/storage/library'
import { cn } from '@/lib/utils'

type SaveState = 'saved' | 'pending' | 'saving' | 'error'
type Snap = Pick<CreateProject, 'templateId' | 'content' | 'options'>
type Tab = 'content' | 'panel' | 'design'

const snap = (p: CreateProject): Snap => ({ templateId: p.templateId, content: p.content, options: p.options })

/** Pixels per point for image exports: social sizes are defined in pixels; print sizes export at 300 dpi. */
function rasterScale(cat: Category, options: ProjectOptions) {
  if (cat.id === 'photo-collages' && ['square', 'portrait-45', 'story', 'landscape-169'].includes(options.sizeId)) return 1
  return cat.id === 'festival-greetings' && GREETING_PIXEL_SIZES.includes(options.sizeId) ? 1 : 300 / 72
}

export default function StudioEditor({ categoryId }: { categoryId: CategoryId }) {
  return (
    <Suspense fallback={<Spinner label="Opening project…" className="m-8" />}>
      <ProjectLoader categoryId={categoryId} />
    </Suspense>
  )
}

/** Loads the project named in ?project=, again whenever it changes (e.g. after Duplicate). */
function ProjectLoader({ categoryId }: { categoryId: CategoryId }) {
  const id = useSearchParams().get('project') ?? ''
  const [loaded, setLoaded] = useState<{ id: string; project: CreateProject | null; error: string | null } | null>(null)
  const cat = getCategory(categoryId)!

  useEffect(() => {
    let live = true
    getProject(id)
      .then((p) => live && setLoaded({ id, project: p && p.category === categoryId ? p : null, error: null }))
      .catch((e: unknown) => live && setLoaded({ id, project: null, error: e instanceof Error ? e.message : 'The project couldn’t be loaded.' }))
    return () => {
      live = false
    }
  }, [id, categoryId])

  const current = loaded?.id === id ? loaded : null
  const project = current?.project
  const loadError = current?.error
  const missing = !!current && !project && !loadError

  if (loadError) return <Alert tone="error" title="The project couldn’t be opened" className="m-6">{loadError}</Alert>
  if (missing)
    return (
      <div className="page-container py-16">
        <Alert tone="warning" title="Project not found">
          This project isn’t stored in this browser. It may have been deleted, or created in another browser or on another device. Projects aren’t synced.
        </Alert>
        <Button asChild className="mt-4">
          <Link href={cat.href}>Go to {cat.name}</Link>
        </Button>
      </div>
    )
  if (!project) return <Spinner label="Opening project…" className="m-8" />
  return <Editor key={project.id} cat={cat} initial={project} />
}

function Editor({ cat, initial }: { cat: Category; initial: CreateProject }) {
  const router = useRouter()
  const [project, setProject] = useState(initial)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'info' | 'error' | 'success'; text: string } | null>(null)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [tab, setTab] = useState<Tab>(cat.panel ? 'panel' : 'content')
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [pendingSwitch, setPendingSwitch] = useState<{ tpl: TemplateDef; losses: string[] } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [slot, setSlot] = useState(0)
  const [zoom, setZoom] = useState<ZoomMode>('page')
  const [fit, setFit] = useState({ width: 1, page: 1 })
  const [printing, setPrinting] = useState(false)
  // Undo history lives in a ref (updated outside React state updaters); `history` mirrors it for rendering.
  const hist = useRef<{ past: Snap[]; future: Snap[] }>({ past: [], future: [] })
  const [history, setHistory] = useState<{ past: Snap[]; future: Snap[] }>({ past: [], future: [] })
  const latest = useRef(project)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const coalesce = useRef<{ key: string; at: number } | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const tpl = getTemplate(cat, project.templateId) ?? cat.templates[0]
  const design = useMemo(() => buildDesign(cat, tpl, project.content, project.options), [cat, tpl, project.content, project.options])
  const warnings = useMemo(() => projectWarnings(cat, tpl, project.content), [cat, tpl, project.content])
  const showGuides = !!cat.print && project.options.print !== false
  const slots = slotCount(tpl)

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setSaveState('saving')
    try {
      const saved = await putProject(latest.current)
      latest.current = { ...latest.current, updatedAt: saved.updatedAt }
      setSaveState('saved')
      setSaveError(null)
    } catch (e) {
      setSaveState('error')
      setSaveError(e instanceof Error ? e.message : 'Saving failed.')
    }
  }, [])

  const schedule = useCallback(() => {
    setSaveState('pending')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void save(), 800)
  }, [save])

  const apply = useCallback(
    (next: CreateProject) => {
      latest.current = next
      setProject(next)
      schedule()
    },
    [schedule]
  )

  /** A change to the design. Consecutive edits with the same key within 1.5 s form one undo step. */
  const change = useCallback(
    (fn: (s: Snap) => Partial<Snap>, key?: string) => {
      const cur = latest.current
      const now = Date.now()
      const merge = key && coalesce.current?.key === key && now - coalesce.current.at < 1500
      coalesce.current = key ? { key, at: now } : null
      if (!merge) {
        hist.current = { past: [...hist.current.past.slice(-79), snap(cur)], future: [] }
        setHistory(hist.current)
      }
      apply({ ...cur, ...fn(cur) })
    },
    [apply]
  )
  const setField = useCallback((key: string, value: unknown, co?: string) => change((s) => ({ content: { ...s.content, [key]: value } }), co), [change])
  const patchContent = useCallback((patch: Content, co?: string) => change((s) => ({ content: { ...s.content, ...patch } }), co), [change])
  const setOptions = (patch: Partial<ProjectOptions>, co?: string) => change((s) => ({ options: { ...s.options, ...patch } }), co)

  const undo = useCallback(() => {
    const h = hist.current
    const prev = h.past[h.past.length - 1]
    if (!prev) return
    const cur = latest.current
    hist.current = { past: h.past.slice(0, -1), future: [snap(cur), ...h.future] }
    setHistory(hist.current)
    coalesce.current = null
    apply({ ...cur, ...prev })
  }, [apply])
  const redo = useCallback(() => {
    const h = hist.current
    const next = h.future[0]
    if (!next) return
    const cur = latest.current
    hist.current = { past: [...h.past, snap(cur)], future: h.future.slice(1) }
    setHistory(hist.current)
    coalesce.current = null
    apply({ ...cur, ...next })
  }, [apply])

  // Keyboard undo/redo outside text fields (text fields keep their own undo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

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

  // Fit the preview to the panel's width, or a whole page to the visible height.
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const b = showGuides ? design.bleed * 2 : 0
    const W = design.width + b
    const H = design.height + b
    const measure = () => {
      const width = Math.max(0.1, (el.clientWidth - 32) / W)
      const height = Math.min(el.clientHeight, window.innerHeight - el.getBoundingClientRect().top) - 120
      setFit({ width: Math.min(width, 4), page: Math.max(0.1, Math.min(width, height / H, 4)) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [design.width, design.height, design.bleed, showGuides, view])
  const scale = resolveZoom(zoom, fit.width, fit.page)

  // Printing: render print-only pages, size the paper to the design, then open the dialog.
  useEffect(() => {
    if (!printing) return
    const style = document.createElement('style')
    style.textContent = `@page { size: ${design.width.toFixed(2)}pt ${design.height.toFixed(2)}pt; margin: 0 }`
    document.head.appendChild(style)
    document.body.classList.add('printing-create')
    const done = () => {
      document.body.classList.remove('printing-create')
      style.remove()
      window.removeEventListener('afterprint', done)
      setPrinting(false)
    }
    window.addEventListener('afterprint', done)
    const t = setTimeout(() => {
      window.print()
      setTimeout(done, 1000)
    }, 50)
    return () => clearTimeout(t)
  }, [printing, design.width, design.height])

  const baseName = project.name.trim() || `Untitled ${cat.noun}`
  const pageName = (i: number) => design.pages[i].label ?? `Page ${i + 1}`

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label)
    setNotice(null)
    try {
      await fn()
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof Error ? e.message : 'The export failed.' })
    } finally {
      setBusy(null)
    }
  }

  const pdf = () => exportPdf(design, baseName, showGuides)
  const downloadPdf = () =>
    run('Creating PDF…', async () => {
      downloadBlob(pdfBlob(await pdf()), safeFileName(baseName, cat.noun, 'pdf'))
    })
  const downloadRaster = (type: 'png' | 'jpg', pages: 'current' | 'all', pageIndex = 0) =>
    run(`Creating ${type.toUpperCase()}…`, async () => {
      const mime = type === 'png' ? 'image/png' : 'image/jpeg'
      const s = rasterScale(cat, project.options)
      if (pages === 'all' && design.pages.length > 1) {
        const files = []
        for (let i = 0; i < design.pages.length; i++) {
          const blob = await exportRaster(design, i, mime, s)
          files.push({ name: safeFileName(`${baseName} - ${pageName(i)}`, cat.noun, type), bytes: new Uint8Array(await blob.arrayBuffer()) })
        }
        downloadBlob(zipFiles(files), safeFileName(baseName, cat.noun, 'zip'))
      } else {
        const blob = await exportRaster(design, pageIndex, mime, s)
        const suffix = design.pages.length > 1 ? ` - ${pageName(pageIndex)}` : ''
        downloadBlob(blob, safeFileName(`${baseName}${suffix}`, cat.noun, type))
      }
    })
  const saveToLibrary = () =>
    run('Saving to My files…', async () => {
      const bytes = await pdf()
      await saveFile(pdfBlob(bytes), { name: safeFileName(baseName, cat.noun, 'pdf'), kind: 'pdf', source: `create-${cat.id}`, pageCount: design.pages.length })
      setNotice({ tone: 'success', text: 'Saved the PDF to My files in this browser.' })
    })
  const exportProject = () => {
    const blob = new Blob([JSON.stringify({ format: 'snap-scanner-create-project', ...latest.current }, null, 2)], { type: 'application/json' })
    downloadBlob(blob, safeFileName(baseName, cat.noun, 'json'))
  }

  const switchTemplate = (to: TemplateDef, confirmed = false) => {
    const losses = switchLosses(cat, tpl, to, project.content)
    if (losses.length && !confirmed) {
      setPendingSwitch({ tpl: to, losses })
      return
    }
    setPendingSwitch(null)
    setTemplatesOpen(false)
    const size = cat.sizes.find((s) => s.id === project.options.sizeId)
    const resize = size && size.orientation !== to.orientation
    change((s) => ({ templateId: to.id, content: contentForTemplate(cat, to, s.content), options: resize ? { ...s.options, sizeId: defaultSizeId(cat, to) } : s.options }))
    setSlot((i) => Math.min(i, Math.max(0, slotCount(to) - 1)))
    setNotice({ tone: 'info', text: `Switched to ${to.name}${resize ? ` and its ${to.orientation} size` : ''}. Your content was kept. Undo to go back.` })
  }

  const duplicate = () =>
    run('Duplicating…', async () => {
      await save()
      const copy = await duplicateProject(latest.current)
      router.push(editHref(cat, copy.id))
    })

  // Clicking or dropping files on a collage frame in the preview selects or fills it.
  const frameAt = (target: EventTarget | null) => {
    const field = (target as Element | null)?.closest?.('[data-field]')?.getAttribute('data-field') ?? ''
    const m = field.match(/^photo(\d)$/)
    return m ? Number(m[1]) - 1 : null
  }

  const palette = paletteFor(tpl, project.options)
  const size = resolveSize(cat, tpl, project.options)
  const tabs: { id: Tab; label: string }[] = [
    ...(cat.panel === 'invoice' ? [{ id: 'panel' as const, label: 'Items & totals' }] : []),
    ...(cat.panel === 'collage' ? [{ id: 'panel' as const, label: 'Photos' }] : []),
    { id: 'content', label: cat.panel === 'collage' ? 'Text & style' : 'Details' },
    { id: 'design', label: 'Design' },
  ]

  return (
    <div className="flex min-h-[calc(100dvh-var(--header-height))] flex-col bg-gray-100">
      <div className="no-print sticky top-[var(--header-height)] z-30 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
          <Button asChild variant="ghost" size="icon-sm" aria-label={`Back to ${cat.name}`}>
            <Link href={cat.href}>
              <ArrowLeft aria-hidden className="h-4 w-4" />
            </Link>
          </Button>
          <label htmlFor="project-name" className="sr-only">
            Project name
          </label>
          <input
            id="project-name"
            className="min-w-0 max-w-[14rem] flex-1 rounded-md border border-transparent px-2 py-1 font-bold text-ink hover:border-gray-200 focus-visible:border-brand-600"
            value={project.name}
            maxLength={100}
            onChange={(e) => apply({ ...latest.current, name: e.target.value })}
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
          <div className="ml-auto flex flex-wrap items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon-sm" aria-label="Undo" title="Undo" onClick={undo} disabled={!history.past.length}>
              <Undo2 aria-hidden className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Redo" title="Redo" onClick={redo} disabled={!history.future.length}>
              <Redo2 aria-hidden className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="xs" onClick={() => void save()} disabled={saveState === 'saved' || saveState === 'saving'}>
              <Save aria-hidden className="h-4 w-4" />
              Save
            </Button>
            <Button variant="secondary" size="xs" onClick={() => setTemplatesOpen(true)}>
              <LayoutTemplate aria-hidden className="h-4 w-4" />
              Template
            </Button>
            <Button size="xs" onClick={() => setExportOpen(true)} disabled={!!busy}>
              {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Download aria-hidden className="h-4 w-4" />}
              Download
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

      {(saveError || notice) && (
        <div className="no-print space-y-2 px-4 pt-3">
          {saveError && (
            <Alert tone="error" title="Your changes aren’t saved">
              {saveError}
            </Alert>
          )}
          {notice && (
            <Alert tone={notice.tone}>
              {notice.text}{' '}
              <button type="button" className="font-semibold underline" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </Alert>
          )}
        </div>
      )}

      <div className="grid flex-1 lg:grid-cols-[minmax(0,32rem)_1fr]">
        <div className={cn('no-print overflow-y-auto p-3 sm:p-4 lg:h-[calc(100dvh-var(--header-height)-3.25rem)]', view === 'preview' && 'hidden lg:block')}>
          <div className="mb-3 flex gap-1 rounded-xl bg-white p-1 shadow-card" role="tablist" aria-label="Editor sections">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn('flex-1 rounded-lg px-2 py-2 text-sm font-semibold', tab === t.id ? 'bg-ink text-white' : 'text-ink-soft hover:bg-gray-100')}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="space-y-4">
            {tab === 'panel' && cat.panel === 'invoice' && <InvoicePanel content={project.content} onChange={setField} />}
            {tab === 'panel' && cat.panel === 'collage' && (
              <CollagePanel content={project.content} slots={slots} selected={Math.min(slot, slots - 1)} onSelect={setSlot} onPatch={patchContent} onError={(t) => setNotice({ tone: 'error', text: t })} />
            )}
            {tab === 'content' && <FieldsForm fields={cat.fields} content={project.content} unused={tpl.unused} onChange={setField} onError={(t) => setNotice({ tone: 'error', text: t })} />}
            {tab === 'design' && (
              <DesignPanel
                cat={cat}
                tpl={tpl}
                options={project.options}
                palette={palette}
                sizeLabel={size.label}
                onOptions={setOptions}
                onTemplates={() => setTemplatesOpen(true)}
                onReset={() => setConfirmReset(true)}
                onDuplicate={() => void duplicate()}
              />
            )}
          </div>

          {warnings.length > 0 && (
            <div className="mt-4 space-y-2" data-testid="warnings">
              {warnings.map((w) => (
                <Alert key={w.text} tone={w.tone}>
                  {w.text}
                </Alert>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-ink-muted">{cat.disclaimer}</p>
        </div>

        <div ref={previewRef} className={cn('relative overflow-auto p-4 lg:h-[calc(100dvh-var(--header-height)-3.25rem)]', view === 'edit' && 'hidden lg:block')}>
          <div className="no-print mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{tpl.name}</span>
            <span className="text-xs text-ink-muted" data-testid="design-size">
              {size.label}
              {design.pages.length > 1 ? ` · ${design.pages.length} pages` : ''}
            </span>
            {showGuides && (
              <span className="flex items-center gap-2 text-xs text-ink-muted">
                <span className="inline-block h-0 w-4 border-t-2 border-dashed border-[#E53935]" aria-hidden /> Trim
                <span className="inline-block h-0 w-4 border-t-2 border-dashed border-[#2563EB]" aria-hidden /> Safe area
              </span>
            )}
            <ZoomControl mode={zoom} scale={scale} onChange={setZoom} className="ml-auto flex flex-wrap items-center gap-1" />
          </div>
          <div
            className="space-y-6"
            data-testid="design-preview"
            onClick={(e) => {
              const i = frameAt(e.target)
              if (i !== null) {
                setSlot(i)
                setTab('panel')
              }
            }}
            onDragOver={(e) => {
              if (cat.panel === 'collage' && e.dataTransfer.types.includes('Files')) e.preventDefault()
            }}
            onDrop={(e) => {
              if (cat.panel !== 'collage' || !e.dataTransfer.files.length) return
              e.preventDefault()
              const i = frameAt(document.elementFromPoint(e.clientX, e.clientY)) ?? frameAt(e.target)
              const f = e.dataTransfer.files[0]
              if (i === null) {
                setNotice({ tone: 'info', text: 'Drop the photo onto a frame, or use Add photos.' })
                return
              }
              setSlot(i)
              void import('@/lib/create/images').then(({ imageFromFile }) =>
                imageFromFile(f, 'photo')
                  .then((v) => patchContent({ [slotKey(i)]: v }))
                  .catch((err: unknown) => setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'The photo couldn’t be used.' }))
              )
            }}
          >
            {design.pages.map((p, i) => (
              <figure key={i} className="mx-auto" style={{ width: (design.width + (showGuides ? design.bleed * 2 : 0)) * scale }}>
                {design.pages.length > 1 && <figcaption className="mb-1 text-xs font-semibold text-ink-muted">{pageName(i)}</figcaption>}
                <div className={cn('bg-white shadow-lift', cat.panel === 'collage' && '[&_[data-field]]:cursor-pointer')}>
                  <DesignPageSvg design={design} page={p} mode="edit" width="100%" showGuides={showGuides} title={`${cat.noun} preview, ${pageName(i).toLowerCase()}`} />
                </div>
              </figure>
            ))}
          </div>
        </div>
      </div>

      {templatesOpen && (
        <Dialog open onClose={() => setTemplatesOpen(false)} size="lg" title="Choose a template" description="Your content is kept when you switch.">
          <TemplateGallery categoryId={cat.id} currentId={tpl.id} onPick={(t) => switchTemplate(t)} compact />
        </Dialog>
      )}
      <ConfirmDialog
        open={!!pendingSwitch}
        title={`Switch to ${pendingSwitch?.tpl.name}?`}
        description={`This layout has fewer photo frames, so ${pendingSwitch?.losses.join(', ')} will be removed. You can undo the switch.`}
        confirmLabel="Switch template"
        onCancel={() => setPendingSwitch(null)}
        onConfirm={() => pendingSwitch && switchTemplate(pendingSwitch.tpl, true)}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Reset to the template?"
        description="Your text, images and design changes are replaced with the template’s example content. You can undo this."
        confirmLabel="Reset"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false)
          change(() => ({ content: structuredClone(cat.sample), options: { sizeId: defaultSizeId(cat, tpl), print: !!cat.print } }))
        }}
      />
      {exportOpen && (
        <ExportDialog
          cat={cat}
          pages={design.pages.map((_, i) => pageName(i))}
          busy={busy}
          onClose={() => setExportOpen(false)}
          onPdf={downloadPdf}
          onRaster={downloadRaster}
          onPrint={() => {
            setExportOpen(false)
            setPrinting(true)
          }}
          onLibrary={saveToLibrary}
          onJson={exportProject}
          printNote={showGuides ? 'The PDF includes 1/8 in bleed around the trim for printing. Turn off print guides in Design to export at trim size.' : undefined}
        />
      )}
      {printing && (
        <div className="create-print-root" aria-hidden>
          {design.pages.map((p, i) => (
            <div key={i} className="create-print-page" style={{ width: `${design.width}pt`, height: `${design.height}pt` }}>
              <DesignPageSvg design={design} page={p} mode="export" width="100%" />
            </div>
          ))}
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {busy ?? ''}
      </span>
      {busy && (
        <div className="no-print fixed bottom-4 right-4 z-40 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-lift">
          <Loader2 aria-hidden className="mr-2 inline h-4 w-4 animate-spin" />
          {busy}
        </div>
      )}
    </div>
  )
}

const FONTS: { value: FontFamily; label: string }[] = [
  { value: 'sans', label: 'Sans serif (Helvetica)' },
  { value: 'serif', label: 'Serif (Times)' },
  { value: 'mono', label: 'Monospace (Courier)' },
]

function DesignPanel({
  cat,
  tpl,
  options,
  palette,
  sizeLabel,
  onOptions,
  onTemplates,
  onReset,
  onDuplicate,
}: {
  cat: Category
  tpl: TemplateDef
  options: ProjectOptions
  palette: { primary: string; secondary: string; accent: string }
  sizeLabel: string
  onOptions: (patch: Partial<ProjectOptions>, coalesce?: string) => void
  onTemplates: () => void
  onReset: () => void
  onDuplicate: () => void
}) {
  const custom = options.sizeId === CUSTOM_SIZE_ID
  const colours = [
    { key: 'primary' as const, label: 'Main color' },
    { key: 'secondary' as const, label: 'Secondary color' },
    { key: 'accent' as const, label: 'Accent color' },
  ]
  const recoloured = colours.some((c) => options[c.key])
  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="tpl-heading">
        <h2 id="tpl-heading" className="text-sm font-bold text-ink">
          Template
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {tpl.name} · {tpl.family}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="xs" onClick={onTemplates}>
            <LayoutTemplate aria-hidden className="h-4 w-4" />
            Change template
          </Button>
          <Button variant="secondary" size="xs" onClick={onDuplicate}>
            <Copy aria-hidden className="h-4 w-4" />
            Duplicate project
          </Button>
          <Button variant="ghost" size="xs" onClick={onReset}>
            <RotateCcw aria-hidden className="h-4 w-4" />
            Reset to template
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="size-heading">
        <h2 id="size-heading" className="text-sm font-bold text-ink">
          <label htmlFor="size-select">Size</label>
        </h2>
        <select id="size-select" className="field" value={options.sizeId} onChange={(e) => onOptions(e.target.value === CUSTOM_SIZE_ID ? { sizeId: CUSTOM_SIZE_ID, customW: options.customW ?? 100, customH: options.customH ?? 100 } : { sizeId: e.target.value })}>
          {cat.sizes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
          {cat.customSize && <option value={CUSTOM_SIZE_ID}>Custom size…</option>}
        </select>
        {custom && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(['customW', 'customH'] as const).map((k) => (
              <div key={k}>
                <label htmlFor={k} className="field-label text-xs">
                  {k === 'customW' ? 'Width' : 'Height'} (mm)
                </label>
                <input
                  id={k}
                  type="number"
                  min={CUSTOM_LIMITS.min}
                  max={CUSTOM_LIMITS.max}
                  step={0.5}
                  className="field"
                  value={options[k] ?? ''}
                  onChange={(e) => onOptions({ [k]: e.target.value === '' ? undefined : Number(e.target.value) }, k)}
                />
              </div>
            ))}
            <p className="col-span-2 text-xs text-ink-muted">
              {CUSTOM_LIMITS.min}–{CUSTOM_LIMITS.max} mm. Now {sizeLabel}. Layouts scale to the size; very different proportions may crowd some templates.
            </p>
          </div>
        )}
        {!custom && cat.sizes.find((s) => s.id === options.sizeId)?.orientation !== tpl.orientation && (
          <p className="mt-1 text-xs text-ink-muted">This template is designed for {tpl.orientation} sizes; it adapts to this one.</p>
        )}
        {cat.print && (
          <label className="mt-3 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={options.print !== false} onChange={(e) => onOptions({ print: e.target.checked })} />
            Print guides and bleed (1/8 in) in the PDF
          </label>
        )}
        {cat.print && <p className="mt-1 text-xs text-ink-muted">Keep text inside the blue safe area. Backgrounds extend to the outer edge so trimming leaves no white edges. {Math.round((cat.print.bleed / MM) * 10) / 10} mm bleed.</p>}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="colour-heading">
        <h2 id="colour-heading" className="text-sm font-bold text-ink">
          Colors and font
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {colours.map((c) => (
            <div key={c.key}>
              <label htmlFor={`colour-${c.key}`} className="field-label text-xs">
                {c.label}
              </label>
              <input id={`colour-${c.key}`} type="color" className="mt-1 h-10 w-full cursor-pointer rounded border border-gray-300 bg-white" value={palette[c.key].toLowerCase()} onChange={(e) => onOptions({ [c.key]: e.target.value }, `colour-${c.key}`)} />
            </div>
          ))}
        </div>
        {recoloured && (
          <button type="button" className="mt-2 text-xs font-semibold text-brand-700 hover:underline" onClick={() => onOptions({ primary: undefined, secondary: undefined, accent: undefined })}>
            Use the template’s colors
          </button>
        )}
        <label htmlFor="head-font" className="field-label mt-3 text-xs">
          Heading font
        </label>
        <select id="head-font" className="field" value={options.headFont ?? ''} onChange={(e) => onOptions({ headFont: (e.target.value || undefined) as FontFamily | undefined })}>
          <option value="">Template default ({FONTS.find((f) => f.value === tpl.fonts.head)?.label})</option>
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-muted">Fonts are the standard PDF fonts, so the preview, PNG and PDF match exactly.</p>
      </section>
    </>
  )
}

function ExportDialog({
  cat,
  pages,
  busy,
  onClose,
  onPdf,
  onRaster,
  onPrint,
  onLibrary,
  onJson,
  printNote,
}: {
  cat: Category
  pages: string[]
  busy: string | null
  onClose: () => void
  onPdf: () => Promise<void>
  onRaster: (type: 'png' | 'jpg', pages: 'current' | 'all', index?: number) => Promise<void>
  onPrint: () => void
  onLibrary: () => Promise<void>
  onJson: () => void
  printNote?: string
}) {
  const [page, setPage] = useState(0)
  const multi = pages.length > 1
  return (
    <Dialog open onClose={onClose} size="md" title="Download" description="Files are created on this device.">
      <div className="space-y-5">
        <section aria-labelledby="exp-pdf">
          <h3 id="exp-pdf" className="font-bold text-ink">
            PDF
          </h3>
          <p className="text-sm text-ink-muted">Vector shapes and selectable text{multi ? `, ${pages.length} pages` : ''}. Best for printing and sharing.</p>
          {printNote && <p className="mt-1 text-xs text-ink-muted">{printNote}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void onPdf()} disabled={!!busy}>
              <Download aria-hidden className="h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={onPrint} disabled={!!busy}>
              <Printer aria-hidden className="h-4 w-4" />
              Print
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void onLibrary()} disabled={!!busy}>
              <FolderInput aria-hidden className="h-4 w-4" />
              Save PDF to My files
            </Button>
          </div>
        </section>
        <section aria-labelledby="exp-img">
          <h3 id="exp-img" className="font-bold text-ink">
            Image
          </h3>
          <p className="text-sm text-ink-muted">{cat.id === 'photo-collages' || cat.id === 'festival-greetings' ? 'Social sizes export at their exact pixel size; print sizes at 300 dpi.' : 'High-resolution image at 300 dpi, trimmed to the design size.'}</p>
          {multi && (
            <div className="mt-2 max-w-xs">
              <label htmlFor="exp-page" className="field-label text-xs">
                Page
              </label>
              <select id="exp-page" className="field" value={page} onChange={(e) => setPage(Number(e.target.value))}>
                {pages.map((p, i) => (
                  <option key={p} value={i}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {(['png', 'jpg'] as const)
              .filter((t) => cat.formats.includes(t))
              .map((t) => (
                <Button key={t} variant={t === 'png' ? 'primary' : 'secondary'} size="sm" onClick={() => void onRaster(t, 'current', page)} disabled={!!busy}>
                  <FileImage aria-hidden className="h-4 w-4" />
                  {t.toUpperCase()}
                  {multi ? ` (${pages[page]})` : ''}
                </Button>
              ))}
            {multi && (
              <Button variant="secondary" size="sm" onClick={() => void onRaster('png', 'all')} disabled={!!busy}>
                All pages as PNG (ZIP)
              </Button>
            )}
          </div>
        </section>
        <section aria-labelledby="exp-json">
          <h3 id="exp-json" className="font-bold text-ink">
            Project backup
          </h3>
          <p className="text-sm text-ink-muted">A .json file with your content and images, to keep a copy or move the project to another browser.</p>
          <Button variant="ghost" size="sm" className="mt-1" onClick={onJson}>
            <FileJson aria-hidden className="h-4 w-4" />
            Export project file
          </Button>
        </section>
      </div>
    </Dialog>
  )
}
