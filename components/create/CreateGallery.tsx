'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Eye, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Alert, Spinner } from '@/components/tools/Feedback'
import TemplateThumb from '@/components/create/TemplateThumb'
import { formatDate } from '@/lib/format'
import type { TemplateDef } from '@/lib/create/kit'
import { deleteProject, duplicateProject, listProjects, newProject, putProject, type CreateProject } from '@/lib/create/project'
import { getCategory, getTemplate, type Category, type CategoryId } from '@/lib/create/registry'
import { onStorageChange } from '@/lib/storage/db'
import { cn } from '@/lib/utils'

export function editHref(cat: Category | CategoryId, id: string) {
  const c = typeof cat === 'string' ? cat : cat.id
  return `/create/${c}/edit?project=${encodeURIComponent(id)}`
}

/** Creates a project from a template and opens it. */
export function useStartProject(categoryId: CategoryId) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const start = useCallback(
    async (templateId?: string) => {
      const cat = getCategory(categoryId)!
      try {
        const p = await putProject(newProject(cat, templateId ?? cat.templates[0].id), false)
        router.push(editHref(cat, p.id))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The project couldn’t be created.')
      }
    },
    [categoryId, router]
  )
  return { start, error }
}

/** The visitor's saved projects in one category. */
export function ProjectList({ categoryId }: { categoryId: CategoryId }) {
  const cat = getCategory(categoryId)!
  const router = useRouter()
  const [projects, setProjects] = useState<CreateProject[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<CreateProject | null>(null)
  const [name, setName] = useState('')
  const [deleting, setDeleting] = useState<CreateProject | null>(null)
  const { start, error: startError } = useStartProject(categoryId)

  const load = useCallback(() => {
    listProjects(categoryId)
      .then(setProjects)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Projects couldn’t be loaded.'))
  }, [categoryId])

  useEffect(() => {
    load()
    return onStorageChange((s) => s === 'projects' && load())
  }, [load])

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t work.')
    }
  }

  return (
    <section aria-labelledby="projects-title" className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="projects-title" className="text-xl font-bold text-ink">
            Your {cat.plural}
          </h2>
          <p className="text-sm text-ink-muted">Saved in this browser on this device. No account needed.</p>
        </div>
        <Button size="sm" onClick={() => void start()}>
          <Plus aria-hidden className="h-4 w-4" />
          New {cat.noun}
        </Button>
      </div>
      {(error || startError) && (
        <Alert tone="error" className="mt-4">
          {error || startError}
        </Alert>
      )}
      {projects === null && !error ? (
        <Spinner label="Loading projects…" className="mt-4" />
      ) : projects && projects.length === 0 ? (
        <p className="mt-4 rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-ink-muted">No {cat.plural} yet. Pick a template below to start.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="project-list">
          {projects?.map((p) => {
            const tpl = getTemplate(cat, p.templateId) ?? cat.templates[0]
            return (
              <li key={p.id} className="flex gap-3 rounded-xl border border-gray-200 p-3">
                <div className="w-24 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50">
                  <TemplateThumb categoryId={cat.id} templateId={tpl.id} content={p.content} options={p.options} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <button type="button" onClick={() => router.push(editHref(cat, p.id))} className="truncate text-left font-semibold text-ink hover:text-brand-700">
                    {p.name}
                  </button>
                  <p className="text-xs text-ink-muted">
                    {tpl.name} · Edited {formatDate(p.updatedAt)}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1 pt-2">
                    <Button size="xs" onClick={() => router.push(editHref(cat, p.id))}>
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Rename ${p.name}`}
                      onClick={() => {
                        setRenaming(p)
                        setName(p.name)
                      }}
                    >
                      <Pencil aria-hidden className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Duplicate ${p.name}`} onClick={() => void act(() => duplicateProject(p))}>
                      <Copy aria-hidden className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}>
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {renaming && (
        <Dialog
          open
          onClose={() => setRenaming(null)}
          title={`Rename ${cat.noun}`}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setRenaming(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!name.trim()}
                onClick={() =>
                  void act(async () => {
                    await putProject({ ...renaming, name: name.trim().slice(0, 100) })
                    setRenaming(null)
                  })
                }
              >
                Save
              </Button>
            </>
          }
        >
          <label htmlFor="rename-project" className="field-label">
            Name
          </label>
          <input id="rename-project" className="field" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} autoFocus />
        </Dialog>
      )}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete “${deleting?.name}”?`}
        description="The project will be removed from this browser. Files you exported aren’t affected. This can’t be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          void act(async () => {
            await deleteProject(deleting!.id)
            setDeleting(null)
          })
        }
      />
    </section>
  )
}

function matches(t: TemplateDef, q: string) {
  if (!q) return true
  const hay = `${t.name} ${t.family} ${t.tags.join(' ')} ${t.orientation}`.toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}

/** Every template in a category with search, style and orientation filters, and a large preview. */
export function TemplateGallery({ categoryId, onPick, currentId, compact }: { categoryId: CategoryId; onPick?: (t: TemplateDef) => void; currentId?: string; compact?: boolean }) {
  const cat = getCategory(categoryId)!
  const { start, error } = useStartProject(categoryId)
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('All')
  const [orientation, setOrientation] = useState('Any')
  const [previewing, setPreviewing] = useState<TemplateDef | null>(null)
  const families = useMemo(() => ['All', ...Array.from(new Set(cat.templates.map((t) => t.family))).sort()], [cat])
  const orientations = useMemo(() => Array.from(new Set(cat.templates.map((t) => t.orientation))), [cat])
  const shown = cat.templates.filter((t) => (family === 'All' || t.family === family) && (orientation === 'Any' || t.orientation === orientation) && matches(t, query))
  const pick = (t: TemplateDef) => (onPick ? onPick(t) : void start(t.id))
  const label = onPick ? 'Switch to' : 'Use'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <label htmlFor={`search-${cat.id}`} className="sr-only">
            Search templates
          </label>
          <input id={`search-${cat.id}`} type="search" className="field !mt-0 pl-9" placeholder="Search templates" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {orientations.length > 1 && (
          <div>
            <label htmlFor={`orient-${cat.id}`} className="sr-only">
              Orientation
            </label>
            <select id={`orient-${cat.id}`} className="field !mt-0 w-auto" value={orientation} onChange={(e) => setOrientation(e.target.value)}>
              <option value="Any">Any orientation</option>
              {orientations.map((o) => (
                <option key={o} value={o}>
                  {o[0].toUpperCase() + o.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="text-sm text-ink-muted" role="status">
          {shown.length} of {cat.templates.length} templates
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by style">
        {families.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={family === f}
            onClick={() => setFamily(f)}
            className={cn('h-8 rounded-full border px-3 text-sm font-semibold', family === f ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white text-ink-soft hover:border-gray-400')}
          >
            {f}
          </button>
        ))}
      </div>
      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}
      {shown.length === 0 ? (
        <div className="mt-6 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-ink-muted">
          No templates match.{' '}
          <button
            type="button"
            className="font-semibold text-brand-700 underline"
            onClick={() => {
              setQuery('')
              setFamily('All')
              setOrientation('Any')
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className={cn('mt-6 grid gap-5', compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4')} data-testid="template-grid">
          {shown.map((t) => (
            <li key={t.id} className="group flex flex-col" data-template={t.id}>
              <div className={cn('relative flex flex-1 items-center justify-center rounded-xl border bg-gray-50 p-3', currentId === t.id ? 'border-brand-600 ring-2 ring-brand-600' : 'border-gray-200')}>
                <div className={cn('w-full overflow-hidden rounded shadow-card', t.orientation === 'portrait' && 'mx-auto max-w-[70%]')}>
                  <TemplateThumb categoryId={cat.id} templateId={t.id} title={`${t.name} ${cat.noun} template preview`} />
                </div>
              </div>
              <div className="mt-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{t.name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {t.family} · {t.tags.slice(0, 2).join(', ')}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={`Preview ${t.name}`} onClick={() => setPreviewing(t)}>
                  <Eye aria-hidden className="h-4 w-4" />
                </Button>
              </div>
              <Button size="xs" variant={currentId === t.id ? 'secondary' : 'primary'} className="mt-2" onClick={() => pick(t)} disabled={currentId === t.id} aria-label={`${label} the ${t.name} template`}>
                {currentId === t.id ? 'Current template' : `${label} template`}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {previewing && (
        <Dialog
          open
          onClose={() => setPreviewing(null)}
          size="lg"
          title={previewing.name}
          description={`${previewing.family} · ${previewing.tags.join(', ')}`}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setPreviewing(null)}>
                <X aria-hidden className="h-4 w-4" />
                Close
              </Button>
              {currentId !== previewing.id && (
                <Button
                  size="sm"
                  onClick={() => {
                    const t = previewing
                    setPreviewing(null)
                    pick(t)
                  }}
                >
                  {label} this template
                </Button>
              )}
            </>
          }
        >
          <PreviewPages category={cat} template={previewing} />
        </Dialog>
      )}
    </div>
  )
}

function PreviewPages({ category, template }: { category: Category; template: TemplateDef }) {
  const pages = category.id === 'id-cards' || category.id === 'business-cards' ? 2 : 1
  return (
    <div className={cn('grid gap-4', pages === 2 && 'sm:grid-cols-2')}>
      {Array.from({ length: pages }, (_, i) => (
        <figure key={i} className={cn('rounded-lg bg-gray-50 p-3', template.orientation === 'portrait' && 'mx-auto w-full max-w-sm')}>
          <div className="overflow-hidden rounded shadow-card">
            <TemplateThumb eager categoryId={category.id} templateId={template.id} page={i} title={`${template.name}, ${pages === 2 ? (i ? 'back' : 'front') : 'preview'}`} />
          </div>
          {pages === 2 && <figcaption className="mt-2 text-center text-xs text-ink-muted">{i ? 'Back' : 'Front'}</figcaption>}
        </figure>
      ))}
    </div>
  )
}
