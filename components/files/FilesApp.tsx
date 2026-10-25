'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Combine,
  Download,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  ImageIcon,
  Inbox,
  Library,
  MoreHorizontal,
  Pencil,
  Search,
  Share2,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import Dropzone from '@/components/tools/Dropzone'
import { Alert, ErrorList, Spinner } from '@/components/tools/Feedback'
import { canShareFile, downloadBlob, shareFile, zipFiles } from '@/lib/browser/download'
import { formatDate } from '@/lib/format'
import { checkFiles } from '@/lib/files/validate'
import { toolHref } from '@/lib/handoff'
import { formatBytes } from '@/lib/limits'
import { pdfInfo } from '@/lib/pdf/operations'
import { clearAllData, requestPersistence } from '@/lib/storage/db'
import { useLibrary } from '@/lib/storage/hooks'
import {
  createFolder,
  deleteFiles,
  deleteFolder,
  getFile,
  moveFiles,
  renameFile,
  renameFolder,
  saveFile,
  type LibraryFile,
  type LibraryFolder,
} from '@/lib/storage/library'
import { SORT_LABELS, queryFiles, type SortKey } from '@/lib/storage/query'
import { cn } from '@/lib/utils'

type FolderFilter = 'all' | 'unfiled' | string

export default function FilesApp() {
  const router = useRouter()
  const { files, folders, loading, error } = useLibrary()
  const [folder, setFolder] = useState<FolderFilter>('all')
  const [text, setText] = useState('')
  const [kind, setKind] = useState<'all' | 'pdf' | 'image'>('all')
  const [sort, setSort] = useState<SortKey>('updated-desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  const [renaming, setRenaming] = useState<LibraryFile | null>(null)
  const [moving, setMoving] = useState<string[] | null>(null)
  const [deleting, setDeleting] = useState<string[] | null>(null)
  const [folderDialog, setFolderDialog] = useState<{ mode: 'create' } | { mode: 'rename'; folder: LibraryFolder } | null>(null)
  const [deletingFolder, setDeletingFolder] = useState<LibraryFolder | null>(null)
  const [clearing, setClearing] = useState(false)
  const [preview, setPreview] = useState<{ meta: LibraryFile; url: string } | null>(null)

  const shown = useMemo(
    () =>
      queryFiles(files, {
        text,
        kind: kind === 'all' ? undefined : kind,
        folderId: folder === 'all' ? undefined : folder === 'unfiled' ? null : folder,
        sort,
      }),
    [files, text, kind, folder, sort]
  )

  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview.url)
  }, [preview])

  const selectedFiles = shown.filter((f) => selected.has(f.id))
  const allPdfs = selectedFiles.length > 0 && selectedFiles.every((f) => f.kind === 'pdf')
  const allImages = selectedFiles.length > 0 && selectedFiles.every((f) => f.kind === 'image')

  const importFiles = async (list: File[]) => {
    setImporting(true)
    setErrors([])
    const { accepted, errors: errs } = await checkFiles(list, 'pdf-or-image')
    const targetFolder = folder !== 'all' && folder !== 'unfiled' ? folder : null
    let saved = 0
    for (const { file, kind: k } of accepted) {
      try {
        const isPdf = k === 'pdf'
        let pageCount: number | undefined
        if (isPdf) pageCount = (await pdfInfo(new Uint8Array(await file.arrayBuffer())).catch(() => undefined))?.pageCount
        await saveFile(file, { name: file.name, kind: isPdf ? 'pdf' : 'image', folderId: targetFolder, pageCount })
        saved++
      } catch (e) {
        errs.push(e instanceof Error ? e.message : `“${file.name}” couldn’t be saved.`)
        // Storage full: stop trying the rest.
        if (e instanceof Error && e.name === 'StorageFullError') break
      }
    }
    if (saved) {
      setNotice(`${saved} file${saved === 1 ? '' : 's'} added.`)
      void requestPersistence()
    }
    setErrors(errs)
    setImporting(false)
  }

  const open = async (f: LibraryFile) => {
    if (f.kind === 'pdf') return router.push(toolHref('/tools/pdf-reader', [f.id]))
    const loaded = await getFile(f.id)
    if (loaded) setPreview({ meta: f, url: URL.createObjectURL(loaded.file) })
  }

  const download = async (ids: string[]) => {
    const loaded = (await Promise.all(ids.map((id) => getFile(id)))).filter((x): x is NonNullable<typeof x> => !!x)
    if (loaded.length === 1) return downloadBlob(loaded[0].file, loaded[0].meta.name)
    const entries = await Promise.all(loaded.map(async (l) => ({ name: l.meta.name, bytes: new Uint8Array(await l.file.arrayBuffer()) })))
    downloadBlob(zipFiles(entries), 'snap-scanner-files.zip')
  }

  const share = async (f: LibraryFile) => {
    const loaded = await getFile(f.id)
    if (!loaded) return
    if (!(await shareFile(loaded.file))) setNotice('Sharing isn’t available for this file in this browser. Download it instead.')
  }

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name

  const sidebarItem = (id: FolderFilter, label: string, icon: React.ReactNode, count: number, extra?: React.ReactNode) => (
    <li key={id} className="group flex items-center">
      <button
        type="button"
        onClick={() => setFolder(id)}
        aria-current={folder === id ? 'true' : undefined}
        className={cn(
          'flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold',
          folder === id ? 'bg-brand-50 text-brand-800' : 'text-ink-soft hover:bg-gray-100'
        )}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="text-xs font-normal text-ink-muted">{count}</span>
      </button>
      {extra}
    </li>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
      <aside className="space-y-4">
        <nav aria-label="Folders" className="panel p-2">
          <ul className="space-y-0.5">
            {sidebarItem('all', 'All files', <Library aria-hidden className="h-4 w-4" />, files.length)}
            {sidebarItem('unfiled', 'Not in a folder', <Inbox aria-hidden className="h-4 w-4" />, files.filter((f) => !f.folderId).length)}
          </ul>
          {folders.length > 0 && (
            <ul className="mt-2 space-y-0.5 border-t border-gray-100 pt-2">
              {folders.map((fd) =>
                sidebarItem(
                  fd.id,
                  fd.name,
                  <Folder aria-hidden className="h-4 w-4" />,
                  files.filter((f) => f.folderId === fd.id).length,
                  <FolderMenu onRename={() => setFolderDialog({ mode: 'rename', folder: fd })} onDelete={() => setDeletingFolder(fd)} name={fd.name} />
                )
              )}
            </ul>
          )}
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={() => setFolderDialog({ mode: 'create' })}>
            <FolderPlus aria-hidden className="h-4 w-4" />
            New folder
          </Button>
        </nav>
        <ClearDataAction onClear={() => setClearing(true)} />
      </aside>

      <section aria-labelledby="files-heading" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="files-heading" className="text-xl font-bold text-ink">
            {folder === 'all' ? 'All files' : folder === 'unfiled' ? 'Not in a folder' : folderName(folder)}
          </h2>
        </div>

        <Dropzone
          accept="pdf-or-image"
          multiple
          compact
          onFiles={importFiles}
          disabled={importing}
          hint={`Drop PDFs or images here to save them in this browser${folder !== 'all' && folder !== 'unfiled' ? ` in “${folderName(folder)}”` : ''}.`}
        />
        {importing && <Spinner label="Saving files…" />}
        <ErrorList errors={errors} onDismiss={() => setErrors([])} />
        {notice && (
          <Alert tone="success">
            {notice}{' '}
            <button type="button" className="font-semibold underline" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </Alert>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[12rem] flex-1">
            <label htmlFor="file-search" className="sr-only">
              Search files
            </label>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input id="file-search" type="search" className="field mt-0 pl-9" placeholder="Search by name" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div>
            <label htmlFor="file-kind" className="sr-only">
              File type
            </label>
            <select id="file-kind" className="field mt-0" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="all">All types</option>
              <option value="pdf">PDFs</option>
              <option value="image">Images</option>
            </select>
          </div>
          <div>
            <label htmlFor="file-sort" className="sr-only">
              Sort
            </label>
            <select id="file-sort" className="field mt-0" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {Object.entries(SORT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="sticky top-[calc(var(--header-height)+0.5rem)] z-10 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-lift" role="region" aria-label="Selected files">
            <span className="px-2 text-sm font-semibold text-ink">{selectedFiles.length} selected</span>
            {allPdfs && selectedFiles.length >= 2 && (
              <Button size="xs" onClick={() => router.push(toolHref('/tools/merge-pdf', selectedFiles.map((f) => f.id)))}>
                <Combine aria-hidden className="h-4 w-4" />
                Merge
              </Button>
            )}
            {allImages && (
              <Button size="xs" onClick={() => router.push(toolHref('/tools/image-to-pdf', selectedFiles.map((f) => f.id)))}>
                <FileText aria-hidden className="h-4 w-4" />
                Convert to PDF
              </Button>
            )}
            <Button variant="secondary" size="xs" onClick={() => setMoving(selectedFiles.map((f) => f.id))}>
              <FolderInput aria-hidden className="h-4 w-4" />
              Move
            </Button>
            <Button variant="secondary" size="xs" onClick={() => void download(selectedFiles.map((f) => f.id))}>
              <Download aria-hidden className="h-4 w-4" />
              Download
            </Button>
            <Button variant="danger" size="xs" onClick={() => setDeleting(selectedFiles.map((f) => f.id))}>
              <Trash2 aria-hidden className="h-4 w-4" />
              Delete
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setSelected(new Set())}>
              Clear selection
            </Button>
          </div>
        )}

        {loading ? (
          <Spinner label="Loading your files…" />
        ) : error ? (
          <Alert tone="error" title="Your files couldn’t be loaded">
            {error}
          </Alert>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-14 text-center">
            <Library aria-hidden className="mx-auto h-10 w-10 text-ink-muted" />
            <p className="mt-3 font-bold text-ink">{files.length === 0 ? 'No files yet' : 'No matching files'}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
              {files.length === 0
                ? 'Add PDFs and images above, or use Save to My files after any tool. Files are kept in this browser only.'
                : 'Try a different search, type or folder.'}
            </p>
            {files.length === 0 && (
              <Button asChild variant="secondary" size="sm" className="mt-4">
                <Link href="/tools">Browse tools</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-ink-muted">
              <input
                type="checkbox"
                aria-label="Select all shown files"
                className="h-4 w-4 accent-brand-600"
                checked={shown.length > 0 && selectedFiles.length === shown.length}
                onChange={(e) => setSelected(e.target.checked ? new Set(shown.map((f) => f.id)) : new Set())}
              />
              <span className="flex-1">Name</span>
              <span className="hidden w-24 sm:block">Size</span>
              <span className="hidden w-36 md:block">Modified</span>
              <span className="w-20 text-right">Actions</span>
            </div>
            <ul className="divide-y divide-gray-100" data-testid="file-list">
              {shown.map((f) => (
                <li key={f.id} className={cn('flex items-center gap-3 px-3 py-2.5', selected.has(f.id) && 'bg-brand-50/50')} data-testid="file-row">
                  <input type="checkbox" aria-label={`Select ${f.name}`} className="h-4 w-4 accent-brand-600" checked={selected.has(f.id)} onChange={() => toggle(f.id)} />
                  <button type="button" onClick={() => void open(f)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', f.kind === 'pdf' ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700')}>
                      {f.kind === 'pdf' ? <FileText aria-hidden className="h-4 w-4" /> : <ImageIcon aria-hidden className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink hover:text-brand-700">{f.name}</span>
                      <span className="block text-xs text-ink-muted">
                        {f.kind === 'pdf' ? `PDF${f.pageCount ? ` · ${f.pageCount} page${f.pageCount === 1 ? '' : 's'}` : ''}` : 'Image'}
                        {folder === 'all' && f.folderId && ` · ${folderName(f.folderId)}`}
                        <span className="sm:hidden"> · {formatBytes(f.size)}</span>
                      </span>
                    </span>
                  </button>
                  <span className="hidden w-24 text-sm text-ink-soft sm:block">{formatBytes(f.size)}</span>
                  <span className="hidden w-36 text-sm text-ink-soft md:block">{formatDate(f.updatedAt)}</span>
                  <span className="flex w-20 justify-end">
                    <FileMenu
                      file={f}
                      onOpen={() => void open(f)}
                      onRename={() => setRenaming(f)}
                      onMove={() => setMoving([f.id])}
                      onDownload={() => void download([f.id])}
                      onShare={() => void share(f)}
                      onDelete={() => setDeleting([f.id])}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {renaming && (
        <NameDialog
          title="Rename file"
          label="File name"
          initial={renaming.name}
          onClose={() => setRenaming(null)}
          onSubmit={async (name) => {
            await renameFile(renaming.id, name)
            setRenaming(null)
          }}
        />
      )}
      {folderDialog && (
        <NameDialog
          title={folderDialog.mode === 'create' ? 'New folder' : 'Rename folder'}
          label="Folder name"
          initial={folderDialog.mode === 'rename' ? folderDialog.folder.name : ''}
          onClose={() => setFolderDialog(null)}
          onSubmit={async (name) => {
            if (folderDialog.mode === 'create') setFolder((await createFolder(name)).id)
            else await renameFolder(folderDialog.folder.id, name)
            setFolderDialog(null)
          }}
        />
      )}
      {moving && (
        <MoveDialog
          folders={folders}
          count={moving.length}
          onClose={() => setMoving(null)}
          onMove={async (target) => {
            await moveFiles(moving, target)
            setMoving(null)
            setSelected(new Set())
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={deleting?.length === 1 ? 'Delete this file?' : `Delete ${deleting?.length} files?`}
        description="They’ll be removed from this browser. This can’t be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          await deleteFiles(deleting!)
          setDeleting(null)
          setSelected(new Set())
        }}
      />
      {deletingFolder && (
        <Dialog
          open
          onClose={() => setDeletingFolder(null)}
          title={`Delete “${deletingFolder.name}”?`}
          description="Choose what happens to the files inside it."
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setDeletingFolder(null)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await deleteFolder(deletingFolder.id, { deleteContents: false })
                  setFolder('all')
                  setDeletingFolder(null)
                }}
              >
                Keep files, delete folder
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  await deleteFolder(deletingFolder.id, { deleteContents: true })
                  setFolder('all')
                  setDeletingFolder(null)
                }}
              >
                Delete folder and files
              </Button>
            </>
          }
        />
      )}
      <ConfirmDialog
        open={clearing}
        title="Clear all local data?"
        description="This deletes every file, folder, resume draft and Create Studio project that Snap Scanner has stored in this browser. This can’t be undone."
        confirmLabel="Delete everything"
        destructive
        onCancel={() => setClearing(false)}
        onConfirm={async () => {
          await clearAllData()
          setClearing(false)
          setFolder('all')
          setNotice('All local data was deleted.')
        }}
      />
      {preview && (
        <Dialog
          open
          size="lg"
          onClose={() => setPreview(null)}
          title={preview.meta.name}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => router.push(toolHref('/tools/resize-image', [preview.meta.id]))}>
                Resize
              </Button>
              <Button size="sm" onClick={() => router.push(toolHref('/tools/image-to-pdf', [preview.meta.id]))}>
                Convert to PDF
              </Button>
            </>
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={preview.url} alt={preview.meta.name} className="mx-auto max-h-[60dvh] object-contain" />
        </Dialog>
      )}
    </div>
  )
}

function useMenu() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return [open, setOpen] as const
}

function MenuItem({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <li>
      <button
        type="button"
        role="menuitem"
        onClick={onClick}
        className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-gray-100', danger ? 'text-brand-700' : 'text-ink')}
      >
        {children}
      </button>
    </li>
  )
}

function FileMenu(props: {
  file: LibraryFile
  onOpen: () => void
  onRename: () => void
  onMove: () => void
  onDownload: () => void
  onShare: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useMenu()
  // The menu only renders in the browser, after the library loads.
  const canShare = useMemo(() => canShareFile(new File([new Blob()], props.file.name, { type: props.file.mime })), [props.file])
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Actions for ${props.file.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
      >
        <MoreHorizontal aria-hidden className="h-5 w-5" />
      </Button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lift">
          <MenuItem onClick={props.onOpen}>
            <BookOpen aria-hidden className="h-4 w-4" />
            Open
          </MenuItem>
          <MenuItem onClick={props.onRename}>
            <Pencil aria-hidden className="h-4 w-4" />
            Rename
          </MenuItem>
          <MenuItem onClick={props.onMove}>
            <FolderInput aria-hidden className="h-4 w-4" />
            Move to folder
          </MenuItem>
          <MenuItem onClick={props.onDownload}>
            <Download aria-hidden className="h-4 w-4" />
            Download
          </MenuItem>
          {canShare && (
            <MenuItem onClick={props.onShare}>
              <Share2 aria-hidden className="h-4 w-4" />
              Share
            </MenuItem>
          )}
          <MenuItem onClick={props.onDelete} danger>
            <Trash2 aria-hidden className="h-4 w-4" />
            Delete
          </MenuItem>
        </ul>
      )}
    </div>
  )
}

function FolderMenu({ name, onRename, onDelete }: { name: string; onRename: () => void; onDelete: () => void }) {
  const [open, setOpen] = useMenu()
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Actions for folder ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
      >
        <MoreHorizontal aria-hidden className="h-4 w-4" />
      </Button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-gray-200 bg-white p-1 shadow-lift">
          <MenuItem onClick={onRename}>
            <Pencil aria-hidden className="h-4 w-4" />
            Rename
          </MenuItem>
          <MenuItem onClick={onDelete} danger>
            <Trash2 aria-hidden className="h-4 w-4" />
            Delete
          </MenuItem>
        </ul>
      )}
    </div>
  )
}

function NameDialog({
  title,
  label,
  initial,
  onClose,
  onSubmit,
}: {
  title: string
  label: string
  initial: string
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const submit = async () => {
    try {
      await onSubmit(value)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t work.')
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={!value.trim()}>
            Save
          </Button>
        </>
      }
    >
      <label htmlFor="name-input" className="field-label">
        {label}
      </label>
      <input
        id="name-input"
        className="field"
        value={value}
        autoFocus
        maxLength={160}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && void submit()}
      />
      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}
    </Dialog>
  )
}

function MoveDialog({
  folders,
  count,
  onClose,
  onMove,
}: {
  folders: LibraryFolder[]
  count: number
  onClose: () => void
  onMove: (folderId: string | null) => Promise<void>
}) {
  const [target, setTarget] = useState<string>('')
  return (
    <Dialog
      open
      onClose={onClose}
      title={count === 1 ? 'Move file' : `Move ${count} files`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void onMove(target || null)}>
            Move
          </Button>
        </>
      }
    >
      <label htmlFor="move-target" className="field-label">
        Destination
      </label>
      <select id="move-target" className="field" value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">Not in a folder</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      {folders.length === 0 && <p className="field-hint">Create a folder first to organise files.</p>}
    </Dialog>
  )
}

/** The library's "Clear all local data" action (it opens a confirmation first). */
function ClearDataAction({ onClear }: { onClear: () => void }) {
  return (
    <div className="px-1">
      <Button variant="danger" size="xs" onClick={onClear}>
        <Trash2 aria-hidden className="h-4 w-4" />
        Clear all local data
      </Button>
    </div>
  )
}
