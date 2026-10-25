// IndexedDB schema for everything the website stores in the visitor's browser:
// library files (metadata and contents in separate stores, so listing files
// never reads their contents), folders, resume drafts and Create Studio
// projects. Nothing here is
// sent anywhere; it lives only in this browser profile.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CreateProject } from '@/lib/create/project'
import type { ResumeDraft } from '@/lib/resume/types'

export type LibraryKind = 'pdf' | 'image'

export interface LibraryFile {
  id: string
  name: string
  kind: LibraryKind
  mime: string
  size: number
  createdAt: number
  updatedAt: number
  folderId: string | null
  /** Tool that produced the file, if it was saved from a tool. */
  source?: string
  pageCount?: number
}

export interface LibraryFolder {
  id: string
  name: string
  createdAt: number
}

interface SnapDB extends DBSchema {
  files: { key: string; value: LibraryFile; indexes: { byFolder: string } }
  blobs: { key: string; value: Blob }
  folders: { key: string; value: LibraryFolder }
  resumes: { key: string; value: ResumeDraft; indexes: { byUpdated: number } }
  projects: { key: string; value: CreateProject; indexes: { byUpdated: number } }
}

export const DB_NAME = 'snap-scanner'
const DB_VERSION = 2

export class StorageUnavailableError extends Error {
  constructor(message = 'Browser storage isn’t available. Private browsing or blocked site data can prevent saving files.') {
    super(message)
    this.name = 'StorageUnavailableError'
  }
}

export class StorageFullError extends Error {
  constructor() {
    super('Your browser’s storage for this site is full. Delete some files from My files, or free up space on your device.')
    this.name = 'StorageFullError'
  }
}

let dbPromise: Promise<IDBPDatabase<SnapDB>> | null = null

export function db(): Promise<IDBPDatabase<SnapDB>> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new StorageUnavailableError())
  dbPromise ??= openDB<SnapDB>(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const files = database.createObjectStore('files', { keyPath: 'id' })
        files.createIndex('byFolder', 'folderId')
        database.createObjectStore('blobs')
        database.createObjectStore('folders', { keyPath: 'id' })
        const resumes = database.createObjectStore('resumes', { keyPath: 'id' })
        resumes.createIndex('byUpdated', 'updatedAt')
      }
      if (oldVersion < 2) {
        const projects = database.createObjectStore('projects', { keyPath: 'id' })
        projects.createIndex('byUpdated', 'updatedAt')
      }
    },
    blocking() {
      // Another tab is upgrading the schema: let it.
      void dbPromise?.then((d) => d.close())
      dbPromise = null
    },
  }).catch(() => {
    dbPromise = null
    throw new StorageUnavailableError()
  })
  return dbPromise
}

/** Maps quota errors (whose names differ across browsers) to StorageFullError. */
export function storageError(e: unknown): Error {
  if (e instanceof StorageFullError || e instanceof StorageUnavailableError) return e
  const name = e instanceof DOMException || e instanceof Error ? e.name : ''
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') return new StorageFullError()
  if (name === 'InvalidStateError' || name === 'SecurityError') return new StorageUnavailableError()
  return e instanceof Error ? e : new Error('Saving failed.')
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Notifies other components and tabs that stored data changed. */
const CHANNEL = 'snap-scanner-storage'
type ChangeScope = 'files' | 'resumes' | 'projects'
const listeners = new Set<(scope: ChangeScope) => void>()
let channel: BroadcastChannel | null = null

function getChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return channel
  channel = new BroadcastChannel(CHANNEL)
  channel.onmessage = (e) => listeners.forEach((l) => l(e.data as ChangeScope))
  return channel
}

export function notifyChange(scope: ChangeScope) {
  listeners.forEach((l) => l(scope))
  getChannel()?.postMessage(scope)
}

export function onStorageChange(listener: (scope: ChangeScope) => void) {
  getChannel()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Deletes the whole database: files, folders, resume drafts and projects. */
export async function clearAllData() {
  const d = await db()
  const tx = d.transaction(['files', 'blobs', 'folders', 'resumes', 'projects'], 'readwrite')
  await Promise.all([
    tx.objectStore('files').clear(),
    tx.objectStore('blobs').clear(),
    tx.objectStore('folders').clear(),
    tx.objectStore('resumes').clear(),
    tx.objectStore('projects').clear(),
    tx.done,
  ])
  notifyChange('files')
  notifyChange('resumes')
  notifyChange('projects')
}

export async function storageEstimate(): Promise<{ usage: number; quota: number; persisted: boolean } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  const [est, persisted] = await Promise.all([
    navigator.storage.estimate(),
    navigator.storage.persisted?.() ?? Promise.resolve(false),
  ])
  return { usage: est.usage ?? 0, quota: est.quota ?? 0, persisted }
}

/** Asks the browser not to evict this site's data under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
