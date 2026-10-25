// Resume drafts in IndexedDB. Drafts never leave the browser.
import { db, notifyChange, storageError } from '@/lib/storage/db'
import type { ResumeDraft } from './types'

export async function listDrafts(): Promise<ResumeDraft[]> {
  try {
    const all = await (await db()).getAll('resumes')
    return all.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch (e) {
    throw storageError(e)
  }
}

export async function getDraft(id: string): Promise<ResumeDraft | undefined> {
  try {
    return await (await db()).get('resumes', id)
  } catch (e) {
    throw storageError(e)
  }
}

export async function putDraft(draft: ResumeDraft, touch = true): Promise<ResumeDraft> {
  const saved = touch ? { ...draft, updatedAt: Date.now() } : draft
  try {
    await (await db()).put('resumes', saved)
  } catch (e) {
    throw storageError(e)
  }
  notifyChange('resumes')
  return saved
}

export async function deleteDraft(id: string) {
  try {
    await (await db()).delete('resumes', id)
  } catch (e) {
    throw storageError(e)
  }
  notifyChange('resumes')
}
