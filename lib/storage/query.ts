// Searching, filtering and sorting library files. Pure, so the My files page
// and Snap Assistant share the same logic and it can be unit-tested.
import type { LibraryFile, LibraryKind } from './db'

export type SortKey = 'updated-desc' | 'updated-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'

export const SORT_LABELS: Record<SortKey, string> = {
  'updated-desc': 'Newest first',
  'updated-asc': 'Oldest first',
  'name-asc': 'Name A–Z',
  'name-desc': 'Name Z–A',
  'size-desc': 'Largest first',
  'size-asc': 'Smallest first',
}

export interface FileQuery {
  text?: string
  kind?: LibraryKind
  /** undefined = all folders; null = files not in a folder. */
  folderId?: string | null
  after?: number
  before?: number
  minSize?: number
  maxSize?: number
  sort?: SortKey
  limit?: number
}

const collator = typeof Intl !== 'undefined' ? new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }) : null

export function compareFiles(sort: SortKey) {
  return (a: LibraryFile, b: LibraryFile): number => {
    switch (sort) {
      case 'updated-desc':
        return b.updatedAt - a.updatedAt
      case 'updated-asc':
        return a.updatedAt - b.updatedAt
      case 'name-asc':
        return collator ? collator.compare(a.name, b.name) : a.name.localeCompare(b.name)
      case 'name-desc':
        return collator ? collator.compare(b.name, a.name) : b.name.localeCompare(a.name)
      case 'size-desc':
        return b.size - a.size
      case 'size-asc':
        return a.size - b.size
    }
  }
}

export function queryFiles(files: LibraryFile[], q: FileQuery): LibraryFile[] {
  const words = (q.text ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  const out = files.filter((f) => {
    if (q.kind && f.kind !== q.kind) return false
    if (q.folderId !== undefined && f.folderId !== q.folderId) return false
    if (q.after !== undefined && f.updatedAt < q.after) return false
    if (q.before !== undefined && f.updatedAt >= q.before) return false
    if (q.minSize !== undefined && f.size < q.minSize) return false
    if (q.maxSize !== undefined && f.size > q.maxSize) return false
    const name = f.name.toLowerCase()
    return words.every((w) => name.includes(w))
  })
  out.sort(compareFiles(q.sort ?? 'updated-desc'))
  return q.limit ? out.slice(0, q.limit) : out
}
