// The local document library: files and folders saved in IndexedDB.
import { LIMITS, formatBytes } from '@/lib/limits'
import { db, newId, notifyChange, storageError, type LibraryFile, type LibraryFolder, type LibraryKind } from './db'

export type { LibraryFile, LibraryFolder, LibraryKind }

export interface SaveFileOptions {
  name: string
  kind: LibraryKind
  folderId?: string | null
  source?: string
  pageCount?: number
}

export async function listFiles(): Promise<LibraryFile[]> {
  try {
    return await (await db()).getAll('files')
  } catch (e) {
    throw storageError(e)
  }
}

export async function listFolders(): Promise<LibraryFolder[]> {
  try {
    const folders = await (await db()).getAll('folders')
    return folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  } catch (e) {
    throw storageError(e)
  }
}

export async function getFileMeta(id: string): Promise<LibraryFile | undefined> {
  return (await db()).get('files', id)
}

/** Returns the stored file as a File object, or undefined if it no longer exists. */
export async function getFile(id: string): Promise<{ meta: LibraryFile; file: File } | undefined> {
  const d = await db()
  const [meta, blob] = await Promise.all([d.get('files', id), d.get('blobs', id)])
  if (!meta || !blob) return undefined
  return { meta, file: new File([blob], meta.name, { type: meta.mime, lastModified: meta.updatedAt }) }
}

export async function saveFile(blob: Blob, opts: SaveFileOptions): Promise<LibraryFile> {
  if (blob.size > LIMITS.libraryFileBytes)
    throw new Error(`Files up to ${formatBytes(LIMITS.libraryFileBytes)} can be saved to My files.`)
  const now = Date.now()
  const meta: LibraryFile = {
    id: newId(),
    name: opts.name.trim() || 'Untitled',
    kind: opts.kind,
    mime: blob.type || (opts.kind === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
    size: blob.size,
    createdAt: now,
    updatedAt: now,
    folderId: opts.folderId ?? null,
    source: opts.source,
    pageCount: opts.pageCount,
  }
  try {
    const d = await db()
    const tx = d.transaction(['files', 'blobs'], 'readwrite')
    await Promise.all([tx.objectStore('blobs').put(blob, meta.id), tx.objectStore('files').put(meta), tx.done])
  } catch (e) {
    throw storageError(e)
  }
  notifyChange('files')
  return meta
}

async function updateMeta(id: string, patch: Partial<LibraryFile>) {
  try {
    const d = await db()
    const meta = await d.get('files', id)
    if (!meta) throw new Error('That file no longer exists.')
    await d.put('files', { ...meta, ...patch, updatedAt: Date.now() })
  } catch (e) {
    throw storageError(e)
  }
  notifyChange('files')
}

export async function renameFile(id: string, name: string) {
  const clean = name.trim()
  if (!clean) throw new Error('Enter a file name.')
  return updateMeta(id, { name: clean })
}

export async function moveFiles(ids: string[], folderId: string | null) {
  const d = await db()
  const tx = d.transaction('files', 'readwrite')
  for (const id of ids) {
    const meta = await tx.store.get(id)
    if (meta) await tx.store.put({ ...meta, folderId, updatedAt: Date.now() })
  }
  await tx.done
  notifyChange('files')
}

export async function deleteFiles(ids: string[]) {
  const d = await db()
  const tx = d.transaction(['files', 'blobs'], 'readwrite')
  await Promise.all([...ids.flatMap((id) => [tx.objectStore('files').delete(id), tx.objectStore('blobs').delete(id)]), tx.done])
  notifyChange('files')
}

export async function createFolder(name: string): Promise<LibraryFolder> {
  const clean = name.trim()
  if (!clean) throw new Error('Enter a folder name.')
  const folders = await listFolders()
  if (folders.some((f) => f.name.toLowerCase() === clean.toLowerCase())) throw new Error(`A folder named “${clean}” already exists.`)
  const folder: LibraryFolder = { id: newId(), name: clean, createdAt: Date.now() }
  try {
    await (await db()).put('folders', folder)
  } catch (e) {
    throw storageError(e)
  }
  notifyChange('files')
  return folder
}

export async function renameFolder(id: string, name: string) {
  const clean = name.trim()
  if (!clean) throw new Error('Enter a folder name.')
  const d = await db()
  const folder = await d.get('folders', id)
  if (!folder) throw new Error('That folder no longer exists.')
  await d.put('folders', { ...folder, name: clean })
  notifyChange('files')
}

/** Deletes a folder. Its files are deleted too, or moved out of the folder. */
export async function deleteFolder(id: string, { deleteContents }: { deleteContents: boolean }) {
  const d = await db()
  const ids = (await d.getAllKeysFromIndex('files', 'byFolder', id)) as string[]
  if (deleteContents) await deleteFiles(ids)
  else await moveFiles(ids, null)
  await d.delete('folders', id)
  notifyChange('files')
}
