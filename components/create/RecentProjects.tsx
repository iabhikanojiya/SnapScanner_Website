'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/tools/Feedback'
import TemplateThumb from '@/components/create/TemplateThumb'
import { editHref, useStartProject } from '@/components/create/CreateGallery'
import { editHref as resumeHref } from '@/components/resume/ResumeDashboard'
import { formatDate } from '@/lib/format'
import { listProjects } from '@/lib/create/project'
import { getCategory, getTemplate, type CategoryId } from '@/lib/create/registry'
import { templateImage, TEMPLATE_IMAGE_SIZE } from '@/lib/resume'
import { listDrafts } from '@/lib/resume/store'
import { onStorageChange } from '@/lib/storage/db'

type Recent =
  | { kind: 'project'; id: string; name: string; updatedAt: number; category: CategoryId; templateId: string; node: React.ReactNode }
  | { kind: 'resume'; id: string; name: string; updatedAt: number; templateId: string }

/** Recently edited Create Studio projects and resume drafts from this browser. */
export default function RecentProjects() {
  const router = useRouter()
  const [items, setItems] = useState<Recent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    Promise.all([listProjects(), listDrafts()])
      .then(([projects, drafts]) => {
        const all: Recent[] = [
          ...projects.map((p): Recent => {
            const cat = getCategory(p.category)!
            const tpl = getTemplate(cat, p.templateId) ?? cat.templates[0]
            return { kind: 'project', id: p.id, name: p.name, updatedAt: p.updatedAt, category: p.category, templateId: tpl.id, node: <TemplateThumb categoryId={cat.id} templateId={tpl.id} content={p.content} options={p.options} /> }
          }),
          ...drafts.map((d): Recent => ({ kind: 'resume', id: d.id, name: d.name, updatedAt: d.updatedAt, templateId: d.templateId })),
        ]
        setItems(all.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8))
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Recent projects couldn’t be loaded.'))
  }, [])

  useEffect(() => {
    load()
    return onStorageChange((s) => (s === 'projects' || s === 'resumes') && load())
  }, [load])

  if (error) return <Alert tone="info">{error}</Alert>
  if (!items)
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Loading recent projects…
      </p>
    )
  if (!items.length) return <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-ink-muted">Nothing here yet. Projects you create are saved in this browser and listed here.</p>
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="recent-projects">
      {items.map((it) => {
        const href = it.kind === 'resume' ? resumeHref(it.id) : editHref(it.category, it.id)
        const type = it.kind === 'resume' ? 'Resume' : getCategory(it.category)!.name.replace(' Maker', '')
        return (
          <li key={`${it.kind}-${it.id}`}>
            <button type="button" onClick={() => router.push(href)} className="group flex w-full gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-gray-300 hover:shadow-card">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-50">
                {it.kind === 'resume' ? (
                  <Image src={templateImage(it.templateId)} alt="" width={TEMPLATE_IMAGE_SIZE.width} height={TEMPLATE_IMAGE_SIZE.height} className="h-20 w-auto" sizes="60px" />
                ) : (
                  <span className="w-full">{it.node}</span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink group-hover:text-brand-700">{it.name}</span>
                <span className="block text-xs text-ink-muted">{type}</span>
                <span className="block text-xs text-ink-muted">Edited {formatDate(it.updatedAt)}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Creates a project with the category's first template and opens the editor. */
export function StartButton({ categoryId, label, size = 'sm' }: { categoryId: CategoryId; label: string; size?: 'xs' | 'sm' }) {
  const { start, error } = useStartProject(categoryId)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <Button
        size={size}
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await start()
          setBusy(false)
        }}
        aria-label={label}
      >
        {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Plus aria-hidden className="h-4 w-4" />}
        Start creating
      </Button>
      {error && (
        <p role="alert" className="basis-full text-xs text-brand-700">
          {error}
        </p>
      )}
    </>
  )
}

export function ResumeStart({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
  return (
    <Button asChild size={size}>
      <Link href="/resume-builder#templates">
        <Plus aria-hidden className="h-4 w-4" />
        Start creating
      </Link>
    </Button>
  )
}
