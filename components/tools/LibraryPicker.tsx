'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Alert, Spinner } from '@/components/tools/Feedback'
import { formatBytes } from '@/lib/limits'
import { useLibrary } from '@/lib/storage/hooks'
import { getFile, type LibraryKind } from '@/lib/storage/library'
import { queryFiles } from '@/lib/storage/query'
import { formatDate } from '@/lib/format'

interface LibraryPickerProps {
  open: boolean
  onClose: () => void
  kind?: LibraryKind
  multiple?: boolean
  onPick: (files: File[]) => void
}

export default function LibraryPicker({ open, onClose, kind, multiple, onPick }: LibraryPickerProps) {
  return open ? <PickerBody onClose={onClose} kind={kind} multiple={multiple} onPick={onPick} /> : null
}

function PickerBody({ onClose, kind, multiple, onPick }: Omit<LibraryPickerProps, 'open'>) {
  const { files, loading, error } = useLibrary()
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const shown = useMemo(() => queryFiles(files, { text, kind }), [files, text, kind])

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : multiple ? [...s, id] : [id]))

  const confirm = async () => {
    setBusy(true)
    try {
      const loaded = await Promise.all(selected.map((id) => getFile(id)))
      const ok = loaded.filter((x): x is NonNullable<typeof x> => !!x).map((x) => x.file)
      if (ok.length === 0) throw new Error('Those files are no longer in My files.')
      onPick(ok)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Files couldn’t be loaded.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title="Choose from My files"
      description="Files you’ve saved in this browser."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={confirm} disabled={selected.length === 0 || busy}>
            {selected.length > 1 ? `Use ${selected.length} files` : 'Use file'}
          </Button>
        </>
      }
    >
      <label className="field-label" htmlFor="picker-search">
        Search
      </label>
      <input
        id="picker-search"
        type="search"
        className="field"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="File name"
      />
      <div className="mt-4">
        {loading ? (
          <Spinner label="Loading your files" />
        ) : error ? (
          <Alert tone="error">{error}</Alert>
        ) : shown.length === 0 ? (
          <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-ink-muted">
            {files.length === 0 ? (
              <>
                No saved files yet. Files you save from a tool, or import in{' '}
                <Link href="/files" className="text-link">
                  My files
                </Link>
                , appear here.
              </>
            ) : (
              'No matching files.'
            )}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            {shown.map((f) => {
              const Icon = f.kind === 'pdf' ? FileText : ImageIcon
              return (
                <li key={f.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      name="library-pick"
                      checked={selected.includes(f.id)}
                      onChange={() => toggle(f.id)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    <Icon aria-hidden className="h-5 w-5 shrink-0 text-ink-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{f.name}</span>
                      <span className="block text-xs text-ink-muted">
                        {formatBytes(f.size)} · {formatDate(f.updatedAt)}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
        {loadError && (
          <Alert tone="error" className="mt-3">
            {loadError}
          </Alert>
        )}
      </div>
    </Dialog>
  )
}
