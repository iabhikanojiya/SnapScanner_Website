'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ResumeDocument, { PAGE_W } from '@/components/resume/ResumeDocument'
import { RESUME_PALETTES, RESUME_TEMPLATES } from '@/lib/resume'
import { sampleResume } from '@/lib/resume/model'
import { cn } from '@/lib/utils'

const SHOWCASE = ['modern_sidebar', 'classic_professional', 'teal_modern', 'corporate_split']

/** A small, working version of the editor: type and watch the real template update. */
export default function ResumeShowcase() {
  const [data, setData] = useState(sampleResume)
  const [templateId, setTemplateId] = useState(SHOWCASE[0])
  const [paletteId, setPaletteId] = useState('template')
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.45)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const fit = () => setScale(el.clientWidth / PAGE_W)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const set = (key: 'fullName' | 'jobTitle', value: string) => setData((d) => ({ ...d, personal: { ...d.personal, [key]: value } }))

  return (
    <div className="grid gap-6 rounded-3xl border border-gray-200 bg-gray-50 p-4 sm:p-6 lg:grid-cols-[20rem_1fr]">
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-bold text-ink">Personal details</p>
          <label htmlFor="demo-name" className="field-label mt-3 text-xs">
            Full name
          </label>
          <input id="demo-name" className="field" value={data.personal.fullName} onChange={(e) => set('fullName', e.target.value)} />
          <label htmlFor="demo-title" className="field-label mt-3 text-xs">
            Job title
          </label>
          <input id="demo-title" className="field" value={data.personal.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
        </div>
        <fieldset className="rounded-xl border border-gray-200 bg-white p-4">
          <legend className="sr-only">Template</legend>
          <p className="text-sm font-bold text-ink" aria-hidden>
            Template
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {SHOWCASE.map((id) => (
              <label key={id} className="choice px-2 text-xs">
                <input type="radio" name="demo-template" className="sr-only" checked={templateId === id} onChange={() => setTemplateId(id)} />
                {RESUME_TEMPLATES.find((t) => t.id === id)!.name}
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm font-bold text-ink">Colour</p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Colour palette">
            {RESUME_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={paletteId === p.id}
                aria-label={p.name}
                onClick={() => setPaletteId(p.id)}
                className={cn('h-7 w-7 rounded-full border-2', paletteId === p.id ? 'border-ink' : 'border-white ring-1 ring-gray-300')}
                style={{ background: p.primary }}
              />
            ))}
          </div>
        </fieldset>
        <Button asChild className="w-full">
          <Link href="/resume-builder">
            Open the Resume Builder
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div ref={boxRef} className="relative overflow-hidden rounded-xl bg-white shadow-lift" style={{ height: 1123 * scale * 0.72 }} aria-label="Live resume preview" role="img">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: PAGE_W }} aria-hidden>
          <ResumeDocument data={data} templateId={templateId} paletteId={paletteId} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </div>
    </div>
  )
}
