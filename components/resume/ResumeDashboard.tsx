'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Copy, FileUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Alert, Spinner } from '@/components/tools/Feedback'
import { formatDate } from '@/lib/format'
import { RESUME_TEMPLATES, templateImage, TEMPLATE_IMAGE_SIZE, type ResumeCategory } from '@/lib/resume'
import { duplicateDraft, newDraft, parseImportedDraft } from '@/lib/resume/model'
import { deleteDraft, listDrafts, putDraft } from '@/lib/resume/store'
import type { ResumeDraft } from '@/lib/resume/types'
import { onStorageChange } from '@/lib/storage/db'
import { cn } from '@/lib/utils'

export function editHref(id: string) {
  return `/resume-builder/edit?id=${encodeURIComponent(id)}`
}

/** The visitor's saved drafts. */
export function DraftList() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<ResumeDraft[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<ResumeDraft | null>(null)
  const [name, setName] = useState('')
  const [deleting, setDeleting] = useState<ResumeDraft | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    listDrafts()
      .then(setDrafts)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Drafts couldn’t be loaded.'))
  }, [])

  useEffect(() => {
    load()
    return onStorageChange((s) => s === 'resumes' && load())
  }, [load])

  const create = async () => {
    try {
      const d = await putDraft(newDraft('classic_professional'), false)
      router.push(editHref(d.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The resume couldn’t be created.')
    }
  }

  const importJson = async (file: File) => {
    try {
      if (file.size > 5_000_000) throw new Error('That file is too large to be a resume export.')
      const d = await putDraft(parseImportedDraft(await file.text()), false)
      router.push(editHref(d.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The file couldn’t be imported.')
    }
  }

  return (
    <section aria-labelledby="drafts-title" className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="drafts-title" className="text-xl font-bold text-ink">
            Your resumes
          </h2>
          <p className="text-sm text-ink-muted">Saved in this browser. No account needed.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => importRef.current?.click()}>
            <FileUp aria-hidden className="h-4 w-4" />
            Import
          </Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void importJson(f)
            }}
          />
          <Button size="sm" onClick={create}>
            <Plus aria-hidden className="h-4 w-4" />
            New resume
          </Button>
        </div>
      </div>
      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}
      {drafts === null && !error ? (
        <Spinner label="Loading drafts…" className="mt-4" />
      ) : drafts && drafts.length === 0 ? (
        <p className="mt-4 rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-ink-muted">
          No resumes yet. Start with New resume, or pick a template below.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="draft-list">
          {drafts?.map((d) => (
            <li key={d.id} className="flex gap-3 rounded-xl border border-gray-200 p-3">
              <Image src={templateImage(d.templateId)} alt="" width={TEMPLATE_IMAGE_SIZE.width} height={TEMPLATE_IMAGE_SIZE.height} className="h-24 w-[68px] shrink-0 rounded border border-gray-200 object-cover object-top" sizes="68px" />
              <div className="flex min-w-0 flex-1 flex-col">
                <button type="button" onClick={() => router.push(editHref(d.id))} className="truncate text-left font-semibold text-ink hover:text-brand-700">
                  {d.name}
                </button>
                <p className="text-xs text-ink-muted">Edited {formatDate(d.updatedAt)}</p>
                <div className="mt-auto flex flex-wrap gap-1 pt-2">
                  <Button size="xs" onClick={() => router.push(editHref(d.id))}>
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Rename ${d.name}`}
                    onClick={() => {
                      setRenaming(d)
                      setName(d.name)
                    }}
                  >
                    <Pencil aria-hidden className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Duplicate ${d.name}`} onClick={() => void putDraft(duplicateDraft(d), false)}>
                    <Copy aria-hidden className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${d.name}`} onClick={() => setDeleting(d)}>
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {renaming && (
        <Dialog
          open
          onClose={() => setRenaming(null)}
          title="Rename resume"
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setRenaming(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!name.trim()}
                onClick={async () => {
                  await putDraft({ ...renaming, name: name.trim() })
                  setRenaming(null)
                }}
              >
                Save
              </Button>
            </>
          }
        >
          <label htmlFor="rename-draft" className="field-label">
            Name
          </label>
          <input id="rename-draft" className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Dialog>
      )}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete “${deleting?.name}”?`}
        description="The draft will be removed from this browser. This can’t be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          await deleteDraft(deleting!.id)
          setDeleting(null)
        }}
      />
    </section>
  )
}

const CATEGORIES: ('All' | ResumeCategory)[] = ['All', 'Professional', 'Modern', 'Creative', 'Academic']

/** All 20 templates. Choosing one creates a draft with example content. */
export function TemplateGallery() {
  const router = useRouter()
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('All')
  const [atsOnly, setAtsOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shown = RESUME_TEMPLATES.filter((t) => (cat === 'All' || t.categories.includes(cat)) && (!atsOnly || t.atsFriendly))

  const use = async (id: string) => {
    try {
      const d = await putDraft(newDraft(id), false)
      router.push(editHref(d.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The resume couldn’t be created.')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter templates">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
            className={cn('h-9 rounded-full border px-4 text-sm font-semibold', cat === c ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white text-ink-soft hover:border-gray-400')}
          >
            {c}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={atsOnly} onChange={(e) => setAtsOnly(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          ATS-friendly only
        </label>
      </div>
      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}
      <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((t) => (
          <li key={t.id} className="group">
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
              <Image src={templateImage(t.id)} alt={`${t.name} resume template preview`} width={TEMPLATE_IMAGE_SIZE.width} height={TEMPLATE_IMAGE_SIZE.height} className="w-full" sizes="(min-width: 1024px) 270px, 45vw" />
              <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-white via-white/90 to-transparent p-3 pt-10 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <Button size="sm" onClick={() => void use(t.id)} aria-label={`Use the ${t.name} template`}>
                  Use template
                </Button>
              </div>
            </div>
            <p className="mt-2 font-semibold text-ink">{t.name}</p>
            <p className="text-xs text-ink-muted">
              {t.categories.join(' · ')}
              {t.atsFriendly && ' · ATS-friendly'}
              {t.photo && ' · Photo'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
