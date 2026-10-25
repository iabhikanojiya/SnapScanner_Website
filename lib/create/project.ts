// Create Studio projects, saved in this browser's IndexedDB. Projects never
// leave the device and aren't synced anywhere.
import { db, newId, notifyChange, storageError } from '@/lib/storage/db'
import type { Content, ProjectOptions } from './kit'
import { defaultSizeId, getCategory, getTemplate, type Category, type CategoryId } from './registry'

export interface CreateProject {
  id: string
  version: 1
  category: CategoryId
  templateId: string
  name: string
  content: Content
  options: ProjectOptions
  createdAt: number
  updatedAt: number
}

export function newProject(cat: Category, templateId: string, name?: string): CreateProject {
  const tpl = getTemplate(cat, templateId) ?? cat.templates[0]
  const now = Date.now()
  return {
    id: newId(),
    version: 1,
    category: cat.id,
    templateId: tpl.id,
    name: name ?? `Untitled ${cat.noun}`,
    content: structuredClone(cat.sample),
    options: { sizeId: defaultSizeId(cat, tpl), print: !!cat.print },
    createdAt: now,
    updatedAt: now,
  }
}

/** True if a stored value is a usable project (stored data is treated as untrusted). */
export function isProject(v: unknown): v is CreateProject {
  if (!v || typeof v !== 'object') return false
  const p = v as Partial<CreateProject>
  const cat = typeof p.category === 'string' ? getCategory(p.category) : undefined
  return !!cat && typeof p.id === 'string' && typeof p.templateId === 'string' && typeof p.name === 'string' && !!p.content && typeof p.content === 'object' && !!p.options && typeof p.options === 'object'
}

export async function listProjects(category?: CategoryId): Promise<CreateProject[]> {
  try {
    const all = (await (await db()).getAll('projects')).filter(isProject)
    return all.filter((p) => !category || p.category === category).sort((a, b) => b.updatedAt - a.updatedAt)
  } catch (e) {
    throw storageError(e)
  }
}

export async function getProject(id: string): Promise<CreateProject | undefined> {
  try {
    const p = await (await db()).get('projects', id)
    return isProject(p) ? p : undefined
  } catch (e) {
    throw storageError(e)
  }
}

export async function putProject(project: CreateProject, touch = true): Promise<CreateProject> {
  const saved = touch ? { ...project, updatedAt: Date.now() } : project
  try {
    await (await db()).put('projects', saved)
  } catch (e) {
    throw storageError(e)
  }
  notifyChange('projects')
  return saved
}

export async function deleteProject(id: string) {
  try {
    await (await db()).delete('projects', id)
  } catch (e) {
    throw storageError(e)
  }
  notifyChange('projects')
}

export async function duplicateProject(project: CreateProject): Promise<CreateProject> {
  const now = Date.now()
  return putProject({ ...structuredClone(project), id: newId(), name: `${project.name} (copy)`, createdAt: now, updatedAt: now }, false)
}

/** A file name without characters that are unsafe on common file systems. */
export function safeFileName(name: string, fallback: string, ext: string) {
  const base =
    name
      .normalize('NFKC')
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\.+/, '')
      .slice(0, 80) || fallback
  return `${base}.${ext}`
}
