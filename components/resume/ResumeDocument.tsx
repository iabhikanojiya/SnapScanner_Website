'use client'

import { forwardRef, useLayoutEffect, useRef, useState } from 'react'
import { palette as findPalette } from '@/lib/resume'
import { dateRange, orderedSections, parseDescription, SECTION_SPECS } from '@/lib/resume/model'
import { FONT_STACKS, templateStyle, type TemplateStyle } from '@/lib/resume/templates'
import type { ResumeData, ResumeEntry, ResumeSection } from '@/lib/resume/types'

/** A4 at 96 CSS px per inch. */
export const PAGE_W = 794
export const PAGE_H = 1123
const MARGIN = 48

const GOLD = '#A8864F'
const TEXT = '#1F2328'
const MUTED = '#4B5563'

interface Colors {
  primary: string
  accent: string
  tint: string
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** A light tint of a colour, mixed with white. */
function tint(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex)
  const m = (c: number) => Math.round(c + (255 - c) * amount)
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`
}

export function resolveColors(style: TemplateStyle, paletteId: string): Colors {
  if (!style.usesPalette) return { primary: '#111111', accent: '#333333', tint: '#F3F4F6' }
  const p = findPalette(paletteId === 'template' ? style.defaultPalette : paletteId) ?? findPalette(style.defaultPalette)!
  return { primary: p.primary, accent: p.accent, tint: tint(p.primary, 0.9) }
}

interface ResumeDocumentProps {
  data: ResumeData
  templateId: string
  paletteId: string
  onPages?: (pages: number) => void
}

/**
 * The resume at real A4 size. Blocks (entries, and section titles with their
 * first entry) that would cross a page boundary are pushed to the next page,
 * so the preview, print and PDF export all paginate the same way.
 */
const ResumeDocument = forwardRef<HTMLDivElement, ResumeDocumentProps>(function ResumeDocument({ data, templateId, paletteId, onPages }, ref) {
  const style = templateStyle(templateId)
  const colors = resolveColors(style, paletteId)
  const innerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState(1)
  const onPagesRef = useRef(onPages)
  useLayoutEffect(() => {
    onPagesRef.current = onPages
  })

  const setRefs = (el: HTMLDivElement | null) => {
    innerRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }

  useLayoutEffect(() => {
    const sheet = innerRef.current
    if (!sheet) return
    const paginate = () => {
      const blocks = Array.from(sheet.querySelectorAll<HTMLElement>('[data-block]'))
      blocks.forEach((b) => (b.style.paddingTop = ''))
      const sheetRect = sheet.getBoundingClientRect()
      // The preview may be CSS-scaled (zoom); measure in the sheet's own pixels.
      const k = sheetRect.width / sheet.offsetWidth || 1
      const y = (v: number) => (v - sheetRect.top) / k
      for (const b of blocks) {
        const r = b.getBoundingClientRect()
        const top = y(r.top)
        const bottom = y(r.bottom)
        const page = Math.floor(top / PAGE_H)
        const limit = (page + 1) * PAGE_H - MARGIN
        const inTopMargin = page > 0 && top - page * PAGE_H < MARGIN
        if (inTopMargin) b.style.paddingTop = `${page * PAGE_H + MARGIN - top}px`
        else if (bottom > limit && bottom - top < PAGE_H - 2 * MARGIN) b.style.paddingTop = `${(page + 1) * PAGE_H + MARGIN - top}px`
      }
      // Columns stretch to the sheet's height, so measure their content instead.
      const content = Math.max(0, ...Array.from(sheet.querySelectorAll<HTMLElement>('[data-column] > *')).map((c) => y(c.getBoundingClientRect().bottom)))
      const n = Math.max(1, Math.ceil((content + MARGIN / 2) / PAGE_H))
      setPages(n)
      onPagesRef.current?.(n)
    }
    paginate()
    void document.fonts?.ready.then(paginate)
  }, [data, templateId, paletteId])

  const font = FONT_STACKS[style.body]
  const sections = orderedSections(data, templateId)
  const sideTypes = style.layout === 'sidebar-left' || style.layout === 'sidebar-right' ? style.sidebarSections ?? [] : []
  const side = sections.filter((s) => sideTypes.includes(s.type))
  const main = sections.filter((s) => !sideTypes.includes(s.type))
  const pad = style.density === 'compact' ? 36 : style.density === 'airy' ? 56 : MARGIN
  const ctx: Ctx = { style, colors, onDark: false }

  const sidebarDark = style.sidebarTone === 'dark'
  const sidebar = (
    <aside
      data-column="side"
      style={{
        width: 250,
        flexShrink: 0,
        background: sidebarDark ? colors.primary : colors.tint,
        color: sidebarDark ? '#FFFFFF' : TEXT,
        padding: `${pad}px 26px`,
      }}
    >
      {style.header === 'sidebar' && <SidebarHeader data={data} ctx={{ ...ctx, onDark: sidebarDark }} />}
      {style.header !== 'sidebar' && style.header !== 'photo-hero' && <ContactList data={data} ctx={{ ...ctx, onDark: sidebarDark }} />}
      {side.map((s, i) => (
        <SectionView key={s.id} section={s} index={i} ctx={{ ...ctx, onDark: sidebarDark }} inSidebar />
      ))}
    </aside>
  )

  const mainColumn = (
    <div data-column="main" style={{ flex: 1, minWidth: 0, padding: style.layout === 'single' || style.layout === 'gutter' ? `0 ${pad}px ${pad}px` : `${pad}px ${pad - 8}px ${pad}px ${pad - 8}px` }}>
      {style.layout !== 'single' && style.layout !== 'gutter' && style.header === 'plain' && <PlainHeader data={data} ctx={ctx} withContact={false} />}
      {style.header === 'sidebar' && (
        <div style={{ marginBottom: 18 }}>
          <p data-name style={{ fontFamily: FONT_STACKS[style.heading], fontSize: 30, fontWeight: 700, lineHeight: 1.15, color: colors.primary, margin: 0 }}>{data.personal.fullName}</p>
          {data.personal.jobTitle && <p style={{ fontSize: 15, color: MUTED, margin: '4px 0 0' }}>{data.personal.jobTitle}</p>}
        </div>
      )}
      {data.summary.trim() && <Summary text={data.summary} ctx={ctx} />}
      {main.map((s, i) => (
        <SectionView key={s.id} section={s} index={i + (data.summary.trim() ? 1 : 0)} ctx={ctx} />
      ))}
    </div>
  )

  return (
    <div
      ref={setRefs}
      className="resume-sheet"
      data-testid="resume-sheet"
      style={{
        width: PAGE_W,
        minHeight: pages * PAGE_H,
        background: '#FFFFFF',
        color: TEXT,
        fontFamily: font,
        fontSize: style.density === 'compact' ? 11.5 : 12.5,
        lineHeight: 1.45,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'left',
      }}
    >
      {style.topEdge && <div style={{ height: 10, background: colors.primary, flexShrink: 0 }} />}
      {style.header === 'band' && <BandHeader data={data} ctx={ctx} />}
      {style.header === 'centered-band' && <CenteredBandHeader data={data} ctx={ctx} />}
      {style.header === 'photo-hero' && <PhotoHeroHeader data={data} ctx={ctx} />}
      {(style.layout === 'single' || style.layout === 'gutter') && style.header === 'plain' && (
        <div style={{ padding: `${pad}px ${pad}px 0` }}>
          <PlainHeader data={data} ctx={ctx} withContact />
        </div>
      )}
      {(style.layout === 'single' || style.layout === 'gutter') && style.header !== 'plain' && <div style={{ height: 24 }} />}

      <div style={{ display: 'flex', flex: 1, alignItems: 'stretch' }}>
        {style.layout === 'sidebar-left' && sidebar}
        {mainColumn}
        {style.layout === 'sidebar-right' && sidebar}
      </div>
    </div>
  )
})

export default ResumeDocument

interface Ctx {
  style: TemplateStyle
  colors: Colors
  onDark: boolean
}

function contactItems(data: ResumeData) {
  const p = data.personal
  return [p.email, p.phone, p.location, p.website, p.linkedin].map((s) => s.trim()).filter(Boolean)
}

function Photo({ src, size, round = true }: { src?: string; size: number; round?: boolean }) {
  if (!src) return null
  // eslint-disable-next-line @next/next/no-img-element -- data URL chosen by the user
  return <img src={src} alt="" data-photo={round ? 'round' : 'square'} style={{ width: size, height: size, objectFit: 'cover', borderRadius: round ? '50%' : 8, flexShrink: 0 }} />
}

function PlainHeader({ data, ctx, withContact }: { data: ResumeData; ctx: Ctx; withContact: boolean }) {
  const { style, colors } = ctx
  const p = data.personal
  const center = style.nameAlign === 'center'
  const nameParts = style.twoLineName ? p.fullName.trim().split(/\s+/) : [p.fullName]
  const contacts = contactItems(data)
  return (
    <header style={{ textAlign: center ? 'center' : 'left', marginBottom: 22 }}>
      <p
        data-name
        style={{
          fontFamily: FONT_STACKS[style.heading],
          fontSize: style.twoLineName ? 40 : style.spacedName ? 28 : 30,
          fontWeight: style.spacedName ? 400 : 700,
          letterSpacing: style.spacedName ? 6 : style.nameCase === 'upper' ? 1.5 : 0,
          textTransform: style.nameCase === 'upper' ? 'uppercase' : 'none',
          lineHeight: 1.1,
          color: style.usesPalette && !style.spacedName ? colors.primary : TEXT,
          margin: 0,
        }}
      >
        {style.twoLineName && nameParts.length > 1 ? (
          <>
            <span style={{ display: 'block' }}>{nameParts.slice(0, -1).join(' ')}</span>
            <span style={{ display: 'block', color: colors.accent }}>{nameParts[nameParts.length - 1]}</span>
          </>
        ) : (
          p.fullName
        )}
      </p>
      {p.jobTitle && (
        <p style={{ fontSize: 15, margin: '6px 0 0', color: style.goldRule ? GOLD : MUTED, letterSpacing: style.spacedName ? 3 : 0, textTransform: style.spacedName ? 'uppercase' : 'none' }}>
          {p.jobTitle}
        </p>
      )}
      {style.goldRule && <div style={{ width: center ? 80 : 64, height: 3, background: GOLD, margin: center ? '12px auto 0' : '12px 0 0' }} />}
      {withContact && contacts.length > 0 && (
        <p style={{ margin: '10px 0 0', color: MUTED, fontSize: 11.5 }}>{contacts.join('  |  ')}</p>
      )}
    </header>
  )
}

function BandHeader({ data, ctx }: { data: ResumeData; ctx: Ctx }) {
  const { style, colors } = ctx
  const p = data.personal
  const contacts = contactItems(data)
  return (
    <header style={{ background: colors.primary, color: '#FFFFFF', padding: '36px 48px', display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
      {style.photo && <Photo src={p.photo} size={92} />}
      <div style={{ minWidth: 0 }}>
        <p data-name style={{ fontFamily: FONT_STACKS[style.heading], fontSize: 32, fontWeight: 700, lineHeight: 1.1, margin: 0, color: '#FFFFFF' }}>{p.fullName}</p>
        {p.jobTitle && <p style={{ fontSize: 15, margin: '6px 0 0', color: '#FFFFFF', opacity: 0.9 }}>{p.jobTitle}</p>}
        {style.layout === 'single' && contacts.length > 0 && <p style={{ margin: '10px 0 0', fontSize: 11.5, color: '#FFFFFF', opacity: 0.9 }}>{contacts.join('  |  ')}</p>}
      </div>
    </header>
  )
}

function CenteredBandHeader({ data, ctx }: { data: ResumeData; ctx: Ctx }) {
  const { style, colors } = ctx
  const p = data.personal
  const contacts = contactItems(data)
  return (
    <header style={{ background: colors.primary, color: '#FFFFFF', padding: '34px 48px 28px', textAlign: 'center', flexShrink: 0 }}>
      <p data-name style={{ fontFamily: FONT_STACKS[style.heading], fontSize: 32, fontWeight: 700, letterSpacing: 1, lineHeight: 1.1, margin: 0, color: '#FFFFFF' }}>{p.fullName}</p>
      {p.jobTitle && <p style={{ fontSize: 14, margin: '6px 0 0', color: '#E9D8B4', textTransform: 'uppercase', letterSpacing: 2 }}>{p.jobTitle}</p>}
      <div style={{ width: 70, height: 2, background: GOLD, margin: '12px auto' }} />
      {contacts.length > 0 && <p style={{ margin: 0, fontSize: 11.5, color: '#FFFFFF', opacity: 0.92 }}>{contacts.join('  |  ')}</p>}
    </header>
  )
}

function PhotoHeroHeader({ data, ctx }: { data: ResumeData; ctx: Ctx }) {
  const { style, colors } = ctx
  const p = data.personal
  const contacts = contactItems(data)
  return (
    <header style={{ display: 'flex', gap: 28, alignItems: 'center', padding: '44px 48px 24px', borderBottom: `3px solid ${colors.primary}`, flexShrink: 0 }}>
      {style.photo && <Photo src={p.photo} size={120} round={false} />}
      <div style={{ minWidth: 0 }}>
        <p data-name style={{ fontFamily: FONT_STACKS[style.heading], fontSize: 34, fontWeight: 700, lineHeight: 1.1, margin: 0, color: colors.primary }}>{p.fullName}</p>
        {p.jobTitle && <p style={{ fontSize: 16, margin: '6px 0 0', color: MUTED }}>{p.jobTitle}</p>}
        {contacts.length > 0 && <p style={{ margin: '10px 0 0', fontSize: 11.5, color: MUTED }}>{contacts.join('  |  ')}</p>}
      </div>
    </header>
  )
}

function SidebarHeader({ data, ctx }: { data: ResumeData; ctx: Ctx }) {
  const p = data.personal
  return (
    <div style={{ marginBottom: 22 }}>
      {ctx.style.photo && p.photo && (
        <div style={{ marginBottom: 18 }}>
          <Photo src={p.photo} size={130} />
        </div>
      )}
      <ContactList data={data} ctx={ctx} />
    </div>
  )
}

function ContactList({ data, ctx }: { data: ResumeData; ctx: Ctx }) {
  const items = contactItems(data)
  if (!items.length) return null
  const labels = ['Email', 'Phone', 'Location', 'Website', 'LinkedIn']
  const p = data.personal
  const values = [p.email, p.phone, p.location, p.website, p.linkedin]
  return (
    <div data-block style={{ marginBottom: 22 }}>
      <SectionTitle title="Contact" index={-1} ctx={ctx} inSidebar />
      {values.map((v, i) =>
        v.trim() ? (
          <p key={i} style={{ margin: '0 0 7px', fontSize: 11.5, overflowWrap: 'anywhere' }}>
            <span style={{ display: 'block', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.75 }}>{labels[i]}</span>
            {v}
          </p>
        ) : null
      )}
    </div>
  )
}

function Summary({ text, ctx }: { text: string; ctx: Ctx }) {
  const gutter = ctx.style.layout === 'gutter'
  const body = (
    <div>
      {text
        .split(/\n+/)
        .filter((t) => t.trim())
        .map((t, i) => (
          <p key={i} style={{ margin: '0 0 6px' }}>
            {t}
          </p>
        ))}
    </div>
  )
  return (
    <section data-block style={{ marginBottom: ctx.style.density === 'compact' ? 12 : 18 }}>
      {gutter ? (
        <GutterRow label="Profile" ctx={ctx}>
          {body}
        </GutterRow>
      ) : (
        <>
          <SectionTitle title="Profile" index={0} ctx={ctx} />
          {body}
        </>
      )}
    </section>
  )
}

function GutterRow({ label, ctx, children }: { label: string; ctx: Ctx; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 20, borderTop: '1px solid #E5E7EB', paddingTop: 10 }}>
      <p style={{ width: 120, flexShrink: 0, margin: 0, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: ctx.colors.primary }}>{label}</p>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

function SectionTitle({ title, index, ctx, inSidebar }: { title: string; index: number; ctx: Ctx; inSidebar?: boolean }) {
  const { style, colors, onDark } = ctx
  const color = onDark ? '#FFFFFF' : style.usesPalette ? colors.primary : '#111111'
  const base: React.CSSProperties = { fontFamily: FONT_STACKS[style.heading], margin: '0 0 8px', color, lineHeight: 1.25 }
  if (inSidebar || style.sectionTitle === 'caps')
    return (
      <h2 style={{ ...base, fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.6, paddingBottom: 4, borderBottom: inSidebar ? `1px solid ${onDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.15)'}` : `2px solid ${style.goldRule ? GOLD : colors.accent}` }}>
        {title}
      </h2>
    )
  switch (style.sectionTitle) {
    case 'rule':
      return <h2 style={{ ...base, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, paddingBottom: 3, borderBottom: `1px solid ${colors.primary}`, textAlign: style.nameAlign === 'center' && style.body === 'serif' ? 'center' : 'left' }}>{title}</h2>
    case 'underline':
      return <h2 style={{ ...base, fontSize: 15, fontWeight: 700, paddingBottom: 3, borderBottom: `2px solid ${style.usesPalette ? colors.accent : '#111111'}` }}>{title}</h2>
    case 'bar':
      return <h2 style={{ ...base, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, background: colors.tint, padding: '5px 10px', borderLeft: `4px solid ${style.goldRule ? GOLD : colors.primary}` }}>{title}</h2>
    case 'label':
      return (
        <h2 style={{ ...base, margin: '0 0 10px' }}>
          <span style={{ display: 'inline-block', background: colors.primary, color: '#FFFFFF', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4, padding: '3px 10px', borderRadius: 3 }}>{title}</span>
        </h2>
      )
    case 'numbered':
      return (
        <h2 style={{ ...base, fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ color: colors.accent, fontSize: 13 }}>{String(index + 1).padStart(2, '0')}</span>
          <span>{title}</span>
        </h2>
      )
    case 'centered':
      return <h2 style={{ ...base, fontSize: 13, fontWeight: 400, textTransform: 'uppercase', letterSpacing: 4, textAlign: 'center', margin: '0 0 12px' }}>{title}</h2>
    default:
      return <h2 style={{ ...base, fontSize: 13, fontWeight: 700 }}>{title}</h2>
  }
}

function Description({ text, ctx }: { text: string; ctx: Ctx }) {
  const parts = parseDescription(text)
  if (!parts.length) return null
  return (
    <div style={{ marginTop: 3 }}>
      {parts.map((p, i) =>
        p.kind === 'li' ? (
          <p key={i} style={{ margin: '0 0 2px', paddingLeft: 14, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 2, color: ctx.onDark ? '#FFFFFF' : ctx.colors.accent }}>•</span>
            {p.text}
          </p>
        ) : (
          <p key={i} style={{ margin: '0 0 3px' }}>
            {p.text}
          </p>
        )
      )}
    </div>
  )
}

function EntryView({ entry, ctx }: { entry: ResumeEntry; ctx: Ctx }) {
  const { style, colors, onDark } = ctx
  const dates = dateRange(entry)
  const muted = onDark ? 'rgba(255,255,255,0.8)' : MUTED
  const meta = [entry.subtitle, entry.location].filter((v) => v.trim()).join(', ')
  const compact = style.density === 'compact'

  const titleLine = (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: compact ? 12 : 13, minWidth: 0 }}>
        {entry.title}
        {compact && meta && <span style={{ fontWeight: 400, color: muted }}> — {meta}</span>}
      </p>
      {!style.dateColumn && dates && <p style={{ margin: 0, flexShrink: 0, fontSize: 11, color: muted, fontFamily: style.monoDetails ? FONT_STACKS.mono : undefined }}>{dates}</p>}
    </div>
  )
  const body = (
    <div style={{ minWidth: 0, flex: 1 }}>
      {titleLine}
      {!compact && meta && <p style={{ margin: '1px 0 0', color: style.usesPalette && !onDark ? colors.accent : muted, fontWeight: 600, fontSize: 12 }}>{meta}</p>}
      {entry.link && <p style={{ margin: '1px 0 0', fontSize: 11, color: muted, fontFamily: style.monoDetails ? FONT_STACKS.mono : undefined, overflowWrap: 'anywhere' }}>{entry.link}</p>}
      {entry.description && <Description text={entry.description} ctx={ctx} />}
    </div>
  )

  if (style.dateColumn)
    return (
      <div style={{ display: 'flex', gap: 16 }}>
        <p style={{ width: 96, flexShrink: 0, margin: 0, fontSize: 11, color: muted, paddingTop: 1 }}>{dates}</p>
        {body}
      </div>
    )
  if (style.timeline)
    return (
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ width: 10, flexShrink: 0, position: 'relative', borderLeft: `2px solid ${colors.tint}`, marginLeft: 4 }}>
          <span style={{ position: 'absolute', left: -7, top: 3, width: 12, height: 12, borderRadius: '50%', background: colors.accent }} />
        </div>
        {body}
      </div>
    )
  return body
}

function CompactList({ section, ctx, inSidebar }: { section: ResumeSection; ctx: Ctx; inSidebar?: boolean }) {
  const { style, colors, onDark } = ctx
  const items = section.entries.filter((e) => e.title.trim())
  if (inSidebar)
    return (
      <div>
        {items.map((e) => (
          <p key={e.id} style={{ margin: '0 0 5px', fontSize: 12 }}>
            {e.title}
            {e.subtitle && <span style={{ opacity: 0.75 }}> — {e.subtitle}</span>}
          </p>
        ))}
      </div>
    )
  if (style.competencies && section.type === 'skills')
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: 4 }}>
        {items.map((e) => (
          <p key={e.id} style={{ width: '33.33%', margin: 0, paddingRight: 8 }}>
            <span style={{ color: colors.accent }}>• </span>
            {e.title}
          </p>
        ))}
      </div>
    )
  // ATS-oriented and dense templates use a plain comma-separated list.
  if (!style.usesPalette || style.density === 'compact' || style.monoDetails)
    return (
      <p style={{ margin: 0, fontFamily: style.monoDetails ? FONT_STACKS.mono : undefined, fontSize: style.monoDetails ? 11.5 : undefined }}>
        {items.map((e) => (e.subtitle ? `${e.title} (${e.subtitle})` : e.title)).join(', ')}
      </p>
    )
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((e) => (
        <span key={e.id} style={{ background: onDark ? 'rgba(255,255,255,0.15)' : colors.tint, color: onDark ? '#FFFFFF' : colors.primary, padding: '3px 9px', borderRadius: 4, fontSize: 11.5 }}>
          {e.title}
          {e.subtitle && ` · ${e.subtitle}`}
        </span>
      ))}
    </div>
  )
}

function SectionView({ section, index, ctx, inSidebar }: { section: ResumeSection; index: number; ctx: Ctx; inSidebar?: boolean }) {
  const { style } = ctx
  const spec = SECTION_SPECS[section.type]
  const entries = section.entries.filter((e) => [e.title, e.subtitle, e.description, e.start, e.end, e.link, e.location].some((v) => v.trim()))
  const gap = style.density === 'compact' ? 7 : style.density === 'airy' ? 14 : 10
  const mb = style.density === 'compact' ? 12 : style.density === 'airy' ? 24 : 18

  if (spec.compact) {
    const content = <CompactList section={section} ctx={ctx} inSidebar={inSidebar} />
    return (
      <section data-block style={{ marginBottom: mb }}>
        {style.layout === 'gutter' && !inSidebar ? (
          <GutterRow label={section.title} ctx={ctx}>
            {content}
          </GutterRow>
        ) : (
          <>
            <SectionTitle title={section.title} index={index} ctx={ctx} inSidebar={inSidebar} />
            {content}
          </>
        )}
      </section>
    )
  }

  if (style.layout === 'gutter' && !inSidebar)
    return (
      <section style={{ marginBottom: mb }}>
        {entries.map((e, i) => (
          <div key={e.id} data-block style={{ marginBottom: gap }}>
            {i === 0 ? (
              <GutterRow label={section.title} ctx={ctx}>
                <EntryView entry={e} ctx={ctx} />
              </GutterRow>
            ) : (
              <div style={{ marginLeft: 140 }}>
                <EntryView entry={e} ctx={ctx} />
              </div>
            )}
          </div>
        ))}
      </section>
    )

  return (
    <section style={{ marginBottom: mb }}>
      {entries.map((e, i) => (
        <div key={e.id} data-block style={{ marginBottom: gap }}>
          {i === 0 && <SectionTitle title={section.title} index={index} ctx={ctx} inSidebar={inSidebar} />}
          <EntryView entry={e} ctx={ctx} />
        </div>
      ))}
    </section>
  )
}
