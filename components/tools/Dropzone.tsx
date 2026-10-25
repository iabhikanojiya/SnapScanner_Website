'use client'

import { useId, useRef, useState } from 'react'
import { FileText, FolderOpen, ImageIcon, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import LibraryPicker from '@/components/tools/LibraryPicker'
import type { Accept } from '@/lib/files/validate'
import { cn } from '@/lib/utils'

/** Word documents aren't kept in My files, so they're accepted here but not in lib/files/validate. */
type DropAccept = Accept | 'docx'

const ACCEPT_ATTR: Record<DropAccept, string> = {
  docx: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf,.pdf',
  image: 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp',
  'pdf-or-image': 'application/pdf,.pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp',
}

interface DropzoneProps {
  accept: DropAccept
  multiple?: boolean
  onFiles: (files: File[]) => void
  title?: string
  hint?: string
  compact?: boolean
  disabled?: boolean
  /** Extra actions shown under the main button, e.g. "Use camera". */
  children?: React.ReactNode
}

/** File picker that also accepts drag-and-drop and files from the local library. */
export default function Dropzone({ accept, multiple, onFiles, title, hint, compact, disabled, children }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const hintId = useId()
  const Icon = accept === 'image' ? ImageIcon : accept === 'pdf' || accept === 'docx' ? FileText : Upload
  const noun =
    accept === 'image' ? (multiple ? 'images' : 'an image') : accept === 'pdf' ? (multiple ? 'PDF files' : 'a PDF') : accept === 'docx' ? (multiple ? 'Word documents' : 'a Word document') : 'files'

  const take = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const files = Array.from(list)
    onFiles(multiple ? files : files.slice(0, 1))
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) take(e.dataTransfer.files)
      }}
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-colors',
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12 sm:py-16',
        dragging ? 'border-brand-600 bg-brand-50' : 'border-gray-300 bg-gray-50'
      )}
    >
      {!compact && (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-card">
          <Icon aria-hidden className="h-7 w-7" />
        </span>
      )}
      {!compact && <p className="text-lg font-bold text-ink">{title ?? `Choose ${noun}`}</p>}
      <p id={hintId} className="max-w-md text-sm text-ink-muted">
        {hint ?? `Drop ${noun} here, or choose from your device.`}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          size={compact ? 'sm' : 'md'}
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          aria-describedby={hintId}
        >
          <Upload aria-hidden className="h-4 w-4" />
          {compact ? `Add ${multiple ? 'more' : 'file'}` : `Select ${multiple ? 'files' : 'file'}`}
        </Button>
        {accept !== 'docx' && (
          <Button type="button" variant="secondary" size={compact ? 'sm' : 'md'} onClick={() => setPickerOpen(true)} disabled={disabled}>
            <FolderOpen aria-hidden className="h-4 w-4" />
            From My files
          </Button>
        )}
        {children}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR[accept]}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
      <LibraryPicker
        open={pickerOpen && accept !== 'docx'}
        onClose={() => setPickerOpen(false)}
        kind={accept === 'pdf' ? 'pdf' : accept === 'image' ? 'image' : undefined}
        multiple={multiple}
        onPick={(files) => {
          setPickerOpen(false)
          onFiles(files)
        }}
      />
    </div>
  )
}
