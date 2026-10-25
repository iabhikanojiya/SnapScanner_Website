'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import SortableList, { moveItem } from '@/components/tools/SortableList'
import { SECTION_SPECS, emptyEntry } from '@/lib/resume/model'
import type { ResumeEntry, ResumeSection } from '@/lib/resume/types'
import { cn } from '@/lib/utils'

interface SectionEditorProps {
  section: ResumeSection
  index: number
  count: number
  handle: React.ReactNode
  onChange: (s: ResumeSection) => void
  onMove: (delta: -1 | 1) => void
  onDelete: () => void
}

export function SectionEditor({ section, index, count, handle, onChange, onMove, onDelete }: SectionEditorProps) {
  const spec = SECTION_SPECS[section.type]
  const [open, setOpen] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const setEntries = (entries: ResumeEntry[]) => onChange({ ...section, entries })
  const updateEntry = (id: string, patch: Partial<ResumeEntry>) => setEntries(section.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  return (
    <div className={cn('rounded-xl border bg-white', section.hidden ? 'border-dashed border-gray-300' : 'border-gray-200')} data-testid="section-editor">
      <div className="flex items-center gap-1 p-2">
        {handle}
        <label className="sr-only" htmlFor={`title-${section.id}`}>
          Section title
        </label>
        <input
          id={`title-${section.id}`}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 font-bold text-ink hover:border-gray-200 focus-visible:border-brand-600"
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
        />
        <Button variant="ghost" size="icon-sm" aria-label={`Move ${section.title} up`} disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp aria-hidden className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Move ${section.title} down`} disabled={index === count - 1} onClick={() => onMove(1)}>
          <ArrowDown aria-hidden className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={section.hidden ? `Show ${section.title} on the resume` : `Hide ${section.title} from the resume`}
          aria-pressed={!!section.hidden}
          onClick={() => onChange({ ...section, hidden: !section.hidden })}
        >
          {section.hidden ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${section.title}`} onClick={() => setConfirm(true)}>
          <Trash2 aria-hidden className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-expanded={open} aria-label={open ? `Collapse ${section.title}` : `Expand ${section.title}`} onClick={() => setOpen((o) => !o)}>
          <ChevronDown aria-hidden className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </Button>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-3">
          {spec.compact ? (
            <ul className="space-y-2">
              {section.entries.map((e, i) => (
                <li key={e.id} className="flex items-end gap-2">
                  {spec.fields.map((f) => (
                    <div key={f.key} className="min-w-0 flex-1">
                      <label className={cn('field-label text-xs', i > 0 && 'sr-only')} htmlFor={`${e.id}-${f.key}`}>
                        {f.label}
                      </label>
                      <input id={`${e.id}-${f.key}`} className="field mt-1 py-1.5" placeholder={f.placeholder} value={e[f.key]} onChange={(ev) => updateEntry(e.id, { [f.key]: ev.target.value })} />
                    </div>
                  ))}
                  <Button variant="ghost" size="icon-sm" aria-label={`Remove ${e.title || spec.itemLabel}`} onClick={() => setEntries(section.entries.filter((x) => x.id !== e.id))}>
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <SortableList
              items={section.entries}
              getId={(e) => e.id}
              onReorder={setEntries}
              handleLabel={(e) => `Reorder ${e.title || spec.itemLabel}`}
              className="space-y-2"
              renderItem={(entry, i, entryHandle) => (
                <EntryCard
                  entry={entry}
                  spec={spec}
                  handle={entryHandle}
                  first={i === 0}
                  last={i === section.entries.length - 1}
                  onChange={(patch) => updateEntry(entry.id, patch)}
                  onMove={(d) => setEntries(moveItem(section.entries, i, d))}
                  onDelete={() => setEntries(section.entries.filter((x) => x.id !== entry.id))}
                />
              )}
            />
          )}
          <Button variant="ghost" size="sm" className="mt-2 text-brand-700" onClick={() => setEntries([...section.entries, emptyEntry()])}>
            <Plus aria-hidden className="h-4 w-4" />
            Add {spec.itemLabel}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        title={`Delete “${section.title}”?`}
        description="The section and everything in it will be removed from this resume."
        confirmLabel="Delete section"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false)
          onDelete()
        }}
      />
    </div>
  )
}

function EntryCard({
  entry,
  spec,
  handle,
  first,
  last,
  onChange,
  onMove,
  onDelete,
}: {
  entry: ResumeEntry
  spec: (typeof SECTION_SPECS)[keyof typeof SECTION_SPECS]
  handle: React.ReactNode
  first: boolean
  last: boolean
  onChange: (patch: Partial<ResumeEntry>) => void
  onMove: (d: -1 | 1) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(!entry.title)
  const label = [entry.title, entry.subtitle].filter(Boolean).join(' · ') || `New ${spec.itemLabel}`
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-center gap-1 p-1.5">
        {handle}
        <button type="button" className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-ink" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {label}
        </button>
        <Button variant="ghost" size="icon-sm" aria-label={`Move ${label} up`} disabled={first} onClick={() => onMove(-1)}>
          <ArrowUp aria-hidden className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Move ${label} down`} disabled={last} onClick={() => onMove(1)}>
          <ArrowDown aria-hidden className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${label}`} onClick={onDelete}>
          <Trash2 aria-hidden className="h-4 w-4" />
        </Button>
      </div>
      {open && (
        <div className="grid gap-3 border-t border-gray-200 bg-white p-3 sm:grid-cols-2">
          {spec.fields.map((f) => (
            <div key={f.key} className={cn(f.multiline || f.key === 'title' || f.key === 'subtitle' ? 'sm:col-span-2' : '')}>
              <label className="field-label text-xs" htmlFor={`${entry.id}-${f.key}`}>
                {f.label}
              </label>
              {f.multiline ? (
                <textarea id={`${entry.id}-${f.key}`} rows={4} className="field" placeholder={f.placeholder} value={entry[f.key]} onChange={(e) => onChange({ [f.key]: e.target.value })} />
              ) : (
                <input id={`${entry.id}-${f.key}`} className="field" placeholder={f.placeholder} value={entry[f.key]} onChange={(e) => onChange({ [f.key]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
