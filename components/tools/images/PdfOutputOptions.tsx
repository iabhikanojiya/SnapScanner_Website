'use client'

import type { ExportQuality } from '@/lib/image/pages'
import type { MarginOption, OrientationOption, PageSizeOption } from '@/lib/pdf/operations'

export interface OutputOptions {
  pageSize: PageSizeOption
  orientation: OrientationOption
  margin: MarginOption
  quality: ExportQuality
}

export const DEFAULT_OUTPUT: OutputOptions = { pageSize: 'a4', orientation: 'auto', margin: 'none', quality: 'standard' }

function Choice<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  disabled,
}: {
  legend: string
  name: string
  value: T
  options: [T, string][]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled} className="disabled:opacity-50">
      <legend className="field-label">{legend}</legend>
      <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(([v, label]) => (
          <label key={v} className="choice px-2">
            <input type="radio" name={name} className="sr-only" checked={value === v} onChange={() => onChange(v)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function PdfOutputOptions({ value, onChange }: { value: OutputOptions; onChange: (v: OutputOptions) => void }) {
  const set = <K extends keyof OutputOptions>(k: K, v: OutputOptions[K]) => onChange({ ...value, [k]: v })
  return (
    <div className="space-y-4">
      <Choice
        legend="Page size"
        name="page-size"
        value={value.pageSize}
        options={[
          ['a4', 'A4'],
          ['letter', 'Letter'],
          ['fit', 'Fit image'],
        ]}
        onChange={(v) => set('pageSize', v)}
      />
      <Choice
        legend="Orientation"
        name="orientation"
        value={value.orientation}
        disabled={value.pageSize === 'fit'}
        options={[
          ['auto', 'Auto'],
          ['portrait', 'Portrait'],
          ['landscape', 'Landscape'],
        ]}
        onChange={(v) => set('orientation', v)}
      />
      <Choice
        legend="Margins"
        name="margin"
        value={value.margin}
        options={[
          ['none', 'None'],
          ['small', 'Small'],
          ['large', 'Large'],
        ]}
        onChange={(v) => set('margin', v)}
      />
      <Choice
        legend="Image quality"
        name="quality"
        value={value.quality}
        options={[
          ['standard', 'Standard'],
          ['high', 'High'],
        ]}
        onChange={(v) => set('quality', v)}
      />
    </div>
  )
}
