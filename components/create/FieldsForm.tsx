'use client'

import ImageField from '@/components/create/ImageField'
import type { ImageValue } from '@/lib/create/engine'
import { img, str, type Content, type FieldDef } from '@/lib/create/kit'
import { cn } from '@/lib/utils'

interface Props {
  fields: FieldDef[]
  content: Content
  /** Fields the current template doesn't show. */
  unused?: string[]
  onChange: (key: string, value: unknown, coalesce?: string) => void
  onError: (message: string) => void
}

/** The category's fields, grouped, generated from its field definitions. */
export default function FieldsForm({ fields, content, unused = [], onChange, onError }: Props) {
  const groups = Array.from(new Set(fields.map((f) => f.group)))
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <fieldset key={g} className="rounded-xl border border-gray-200 bg-white p-4">
          <legend className="px-1 text-sm font-bold text-ink">{g}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields
              .filter((f) => f.group === g)
              .map((f) => (
                <Field key={f.key} field={f} content={content} unused={unused.includes(f.key)} onChange={onChange} onError={onError} />
              ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}

function Field({ field: f, content, unused, onChange, onError }: { field: FieldDef; content: Content; unused: boolean; onChange: Props['onChange']; onError: Props['onError'] }) {
  const id = `f-${f.key}`
  const wide = f.type === 'textarea' || f.type === 'image'
  const note = unused ? 'Not shown by this template.' : f.hint
  if (f.type === 'image')
    return (
      <ImageField
        className="sm:col-span-2"
        label={f.label}
        kind={f.imageKind ?? 'photo'}
        value={img(content, f.key)}
        onChange={(v: ImageValue | undefined, coalesce) => onChange(f.key, v, coalesce)}
        onError={onError}
        hint={note}
        crop={f.imageKind !== 'signature' && f.imageKind !== 'logo'}
      />
    )
  if (f.type === 'toggle')
    return (
      <label className="flex items-center gap-2 self-end text-sm font-semibold text-ink sm:col-span-2">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={content[f.key] === true} onChange={(e) => onChange(f.key, e.target.checked)} />
        {f.label}
      </label>
    )
  const value = str(content, f.key)
  return (
    <div className={cn(wide && 'sm:col-span-2')}>
      <label htmlFor={id} className="field-label text-xs">
        {f.label}
      </label>
      {f.type === 'textarea' ? (
        <textarea id={id} rows={3} className="field" value={value} maxLength={f.maxLength} placeholder={f.placeholder} onChange={(e) => onChange(f.key, e.target.value, id)} />
      ) : f.type === 'select' ? (
        <select id={id} className="field" value={value} onChange={(e) => onChange(f.key, e.target.value)}>
          {f.key !== 'currency' && <option value="">Template default</option>}
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : f.type === 'color' ? (
        <div className="mt-1 flex items-center gap-2">
          <input id={id} type="color" className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={(e) => onChange(f.key, e.target.value, id)} />
          {value && (
            <button type="button" className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => onChange(f.key, '')}>
              Use template color
            </button>
          )}
        </div>
      ) : (
        <input id={id} type={f.type === 'date' ? 'date' : 'text'} className="field" value={value} maxLength={f.maxLength} placeholder={f.placeholder} onChange={(e) => onChange(f.key, e.target.value, id)} />
      )}
      {note && <p className="mt-1 text-xs text-ink-muted">{note}</p>}
      {f.maxLength && f.type !== 'date' && value.length > f.maxLength * 0.9 && (
        <p className="mt-1 text-xs text-amber-800">
          {value.length}/{f.maxLength} characters
        </p>
      )}
    </div>
  )
}
