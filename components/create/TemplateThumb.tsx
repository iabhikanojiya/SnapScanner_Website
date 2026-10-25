'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Content, ProjectOptions } from '@/lib/create/kit'
import { buildDesign, defaultSizeId, getCategory, getTemplate, resolveSize, slotCount, type CategoryId } from '@/lib/create/registry'
import { DesignPageSvg } from '@/lib/create/render-svg'
import { previewContent } from '@/lib/create/samples'
import { cn } from '@/lib/utils'

interface Props {
  categoryId: CategoryId
  templateId: string
  /** Project content; defaults to the category's example content. */
  content?: Content
  options?: ProjectOptions
  page?: number
  className?: string
  /** Accessible name; omit for decorative thumbnails. */
  title?: string
  /** Render immediately instead of when scrolled into view. */
  eager?: boolean
}

/**
 * A template rendered with real content (example photos fill empty photo
 * frames). Rendered in the browser when it scrolls into view, so galleries
 * with dozens of designs stay light.
 */
export default function TemplateThumb({ categoryId, templateId, content, options, page = 0, className, title, eager }: Props) {
  const cat = getCategory(categoryId)!
  const tpl = getTemplate(cat, templateId) ?? cat.templates[0]
  const opts = useMemo(() => options ?? { sizeId: defaultSizeId(cat, tpl) }, [options, cat, tpl])
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const show = eager || visible

  useEffect(() => {
    if (show) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [show])

  const design = useMemo(() => {
    if (!show) return null
    const c = previewContent(content ?? cat.sample, cat.fields, slotCount(tpl))
    return buildDesign(cat, tpl, c, opts)
  }, [show, cat, tpl, content, opts])

  if (!design) {
    const { w, h } = resolveSize(cat, tpl, opts)
    return <div ref={ref} role={title ? 'img' : undefined} aria-label={title} className={cn('w-full bg-gray-100', className)} style={{ aspectRatio: `${w} / ${h}` }} />
  }
  const p = design.pages[Math.min(page, design.pages.length - 1)]
  return <DesignPageSvg design={design} page={p} mode="thumb" width="100%" className={cn('h-auto w-full', className)} title={title} />
}
