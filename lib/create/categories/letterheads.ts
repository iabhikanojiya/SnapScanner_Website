// Letterhead Maker: 27 templates built from distinct headers and footers, with
// an optional letter (date, recipient, subject, body, sign-off and signature)
// that continues onto more pages when it's long.
import { T, mix, onColor, type El, type FontFamily } from '../engine'
import { cornerOrnament, dotGrid, wave } from '../decor'
import { MM, bgRect, fmtDate, img, logoOrMonogram, page, photo, str, type Content, type FieldDef, type Palette, type RenderCtx, type SizeOption, type TemplateDef } from '../kit'

export const LETTERHEAD_FIELDS: FieldDef[] = [
  { key: 'company', label: 'Company or organization', type: 'text', group: 'Letterhead', maxLength: 60 },
  { key: 'logo', label: 'Logo', type: 'image', group: 'Letterhead', imageKind: 'logo', hint: 'Without a logo, the initials are shown.' },
  { key: 'tagline', label: 'Tagline', type: 'text', group: 'Letterhead', maxLength: 80 },
  { key: 'address', label: 'Address', type: 'textarea', group: 'Contact details', maxLength: 160 },
  { key: 'phone', label: 'Phone', type: 'text', group: 'Contact details', maxLength: 30 },
  { key: 'email', label: 'Email', type: 'text', group: 'Contact details', maxLength: 60 },
  { key: 'website', label: 'Website', type: 'text', group: 'Contact details', maxLength: 60 },
  { key: 'footerNote', label: 'Footer note', type: 'text', group: 'Contact details', maxLength: 140, placeholder: 'Registration or tax number, legal note…' },
  { key: 'includeLetter', label: 'Include the letter below (turn off for a blank letterhead)', type: 'toggle', group: 'Letter' },
  { key: 'date', label: 'Date', type: 'date', group: 'Letter' },
  { key: 'recipient', label: 'Recipient', type: 'textarea', group: 'Letter', maxLength: 240, placeholder: 'Name\nCompany\nAddress' },
  { key: 'subject', label: 'Subject', type: 'text', group: 'Letter', maxLength: 120 },
  { key: 'body', label: 'Letter', type: 'textarea', group: 'Letter', maxLength: 8000, hint: 'Leave a blank line between paragraphs. Long letters continue on more pages.' },
  { key: 'closing', label: 'Sign-off', type: 'text', group: 'Letter', maxLength: 40, placeholder: 'Sincerely,' },
  { key: 'signature', label: 'Signature image', type: 'image', group: 'Letter', imageKind: 'signature', hint: 'A photo or scan of a signature on a light background.' },
  { key: 'senderName', label: 'Your name', type: 'text', group: 'Letter', maxLength: 60 },
  { key: 'senderTitle', label: 'Your title', type: 'text', group: 'Letter', maxLength: 80 },
]

export const LETTERHEAD_SAMPLE: Content = {
  company: 'Harborview Consulting',
  tagline: 'Strategy · Operations · Growth',
  address: '42 Quay Street, Suite 8\nBristol BS1 4DJ, United Kingdom',
  phone: '+44 117 496 0123',
  email: 'hello@harborview.example',
  website: 'harborview.example',
  footerNote: 'Harborview Consulting Ltd · Registered in England and Wales No. 01234567',
  includeLetter: true,
  date: '2026-10-24',
  recipient: 'Ms. Priya Raman\nOperations Director\nNorthwind Logistics\n15 Dock Road, Southampton SO14 3XA',
  subject: 'Proposal for the warehouse efficiency review',
  body: 'Dear Ms. Raman,\n\nThank you for meeting with us last week to discuss the challenges your team faces across the Southampton and Felixstowe sites. We enjoyed learning about your plans for the coming year.\n\nAs agreed, we propose a six-week review covering inbound scheduling, pick-path design and staffing patterns. We will share early findings after the second week, so your team can act on quick wins while the review continues.\n\nThe enclosed proposal sets out the scope, timeline and fees. We would be glad to walk you through it at a time that suits you.',
  closing: 'Kind regards,',
  senderName: 'Daniel Okafor',
  senderTitle: 'Managing Partner',
}

export const LETTERHEAD_SIZES: SizeOption[] = [
  { id: 'a4', label: 'A4 (210 × 297 mm)', w: 210 * MM, h: 297 * MM, orientation: 'portrait' },
  { id: 'letter', label: 'US Letter (8.5 × 11 in)', w: 612, h: 792, orientation: 'portrait' },
]

// ---------------------------------------------------------------------------
// Building blocks

interface Area {
  x: number
  w: number
}
type Header = (ctx: RenderCtx, m: number) => { els: El[]; bottom: number; area?: Area; /** Drawn on every page (e.g. a sidebar). */ base?: El[] }
type Footer = (ctx: RenderCtx, m: number) => { els: El[]; h: number }

const muted = (p: Palette) => mix(p.ink, p.paper, 0.4)
const contactList = (c: Content) => [str(c, 'phone'), str(c, 'email'), str(c, 'website')].filter((v) => v.trim())
const oneLineAddress = (c: Content) => str(c, 'address').split('\n').map((l) => l.trim()).filter(Boolean).join(', ')
const allContacts = (c: Content) => [oneLineAddress(c), ...contactList(c)].filter(Boolean)

/** Address lines and contacts stacked, aligned left or right. */
function contactStack(c: Content, x: number, y: number, w: number, size: number, color: string, align: 'left' | 'right'): { els: El[]; bottom: number } {
  const lines = [...str(c, 'address').split('\n').map((l) => l.trim()).filter(Boolean), ...contactList(c)]
  const els = lines.map((l, i) => T({ x, y: y + i * size * 1.45, text: l, size, color, align, w, fit: true }))
  return { els, bottom: y + Math.max(0, lines.length - 1) * size * 1.45 }
}

function companyName(ctx: RenderCtx, x: number, y: number, w: number, size: number, color: string, align: 'left' | 'center' | 'right' = 'left', opts: { upper?: boolean; ls?: number; font?: FontFamily; bold?: boolean } = {}) {
  return T({ x, y, text: str(ctx.c, 'company'), size, bold: opts.bold ?? true, color, align, w, fit: true, upper: opts.upper, ls: opts.ls, font: opts.font ?? ctx.f.head })
}

// ---------------------------------------------------------------------------
// Headers

const HEADERS: Record<string, Header> = {
  leftLogo: (ctx, m) => {
    const { W, p, c, f } = ctx
    const ls = 46
    const top = m * 0.75
    const cs = contactStack(c, W - m, top + 8, W * 0.36, 8.5, muted(p), 'right')
    const bottom = Math.max(top + ls, cs.bottom) + 14
    return {
      bottom: bottom + 6,
      els: [
        ...logoOrMonogram(c, 'logo', 'company', m, top, ls, p.primary, 'rounded', f.head),
        companyName(ctx, m + ls + 14, top + 22, W * 0.4, 19, p.ink),
        T({ x: m + ls + 14, y: top + 38, text: str(c, 'tagline'), size: 9, color: p.primary, w: W * 0.4, fit: true }),
        ...cs.els,
        { t: 'line', x1: m, y1: bottom, x2: W - m, y2: bottom, stroke: p.primary, sw: 1.6 },
        { t: 'line', x1: m, y1: bottom + 3.5, x2: m + 90, y2: bottom + 3.5, stroke: p.accent, sw: 1.6 },
      ],
    }
  },
  centered: (ctx, m) => {
    const { W, p, c, f } = ctx
    const top = m * 0.6
    const ls = 48
    const contacts = allContacts(c).join('   ·   ')
    return {
      bottom: top + ls + 92,
      els: [
        ...logoOrMonogram(c, 'logo', 'company', W / 2 - ls / 2, top, ls, p.primary, 'circle', f.head),
        companyName(ctx, W / 2, top + ls + 30, W * 0.7, 21, p.ink, 'center'),
        T({ x: W / 2, y: top + ls + 46, text: str(c, 'tagline'), size: 8.5, upper: true, ls: 2.2, color: p.primary, align: 'center', w: W * 0.7, fit: true }),
        { t: 'line', x1: m, y1: top + ls + 60, x2: W - m, y2: top + ls + 60, stroke: p.accent, sw: 0.8 },
        { t: 'line', x1: m, y1: top + ls + 63, x2: W - m, y2: top + ls + 63, stroke: p.accent, sw: 0.4 },
        T({ x: W / 2, y: top + ls + 77, text: contacts, size: 8, color: muted(p), align: 'center', w: W - 2 * m, fit: true }),
      ],
    }
  },
  band: (ctx, m) => {
    const { W, p, c, f } = ctx
    const bh = 112
    const on = onColor(p.primary)
    const cs = contactStack(c, W - m, 38, W * 0.34, 8.5, on, 'right')
    return {
      bottom: bh + 26,
      els: [
        { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: W + 2 * ctx.bleed, h: bh + ctx.bleed, fill: p.primary },
        { t: 'rect', x: -ctx.bleed, y: bh, w: W * 0.45 + ctx.bleed, h: 5, fill: p.accent },
        ...logoOrMonogram(c, 'logo', 'company', m, 32, 48, p.paper, 'rounded', f.head),
        companyName(ctx, m + 62, 56, W * 0.38, 20, on),
        T({ x: m + 62, y: 72, text: str(c, 'tagline'), size: 9, color: on, w: W * 0.38, fit: true, opacity: 0.85 }),
        ...cs.els,
      ],
    }
  },
  sidebar: (ctx, m) => {
    const { W, H, p, c, f } = ctx
    const sw = W * 0.27
    const on = onColor(p.primary)
    const x = m * 0.6
    const w = sw - m * 1.1
    const cs = contactStack(c, x, H * 0.72, w, 8, on, 'left')
    const base: El[] = [
      { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: sw + ctx.bleed, h: H + 2 * ctx.bleed, fill: p.primary },
      { t: 'rect', x: sw, y: -ctx.bleed, w: 4, h: H + 2 * ctx.bleed, fill: p.accent },
      ...logoOrMonogram(c, 'logo', 'company', x, m, 50, p.paper, 'rounded', f.head),
      T({ x, y: m + 78, text: str(c, 'company'), size: 15, bold: true, color: on, w, maxLines: 3, font: f.head }),
      T({ x, y: m + 132, text: str(c, 'tagline'), size: 8.5, color: on, w, maxLines: 4, opacity: 0.85 }),
      { t: 'line', x1: x, y1: H * 0.72 - 20, x2: x + 30, y2: H * 0.72 - 20, stroke: p.accent, sw: 1.5 },
      ...cs.els,
    ]
    return { base, els: [], bottom: m * 1.2, area: { x: sw + m * 0.75, w: W - sw - m * 1.6 } }
  },
  corner: (ctx, m) => {
    const { W, p, c, f } = ctx
    const b = ctx.bleed
    return {
      bottom: m * 0.75 + 104,
      els: [
        { t: 'path', d: `M${W * 0.58} ${-b}H${W + b}V${150}Z`, fill: p.primary },
        { t: 'path', d: `M${W * 0.78} ${-b}H${W + b}V${92}Z`, fill: p.accent, opacity: 0.9 },
        { t: 'path', d: `M${W * 0.5} ${-b}H${W * 0.56}L${W + b} ${170}V${185}Z`, fill: p.primary, opacity: 0.25 },
        companyName(ctx, m, m * 0.75 + 26, W * 0.5, 24, p.ink),
        T({ x: m, y: m * 0.75 + 44, text: str(c, 'tagline'), size: 9.5, color: p.primary, w: W * 0.5, fit: true }),
        T({ x: m, y: m * 0.75 + 72, text: oneLineAddress(c), size: 8.5, color: muted(p), w: W * 0.55, fit: true }),
        T({ x: m, y: m * 0.75 + 86, text: contactList(c).join('   ·   '), size: 8.5, color: muted(p), w: W * 0.55, fit: true }),
        ...logoOrMonogram(c, 'logo', 'company', W - m - 44, m * 0.6, 44, p.paper, 'circle', f.head),
      ],
    }
  },
  wave: (ctx, m) => {
    const { W, p, c, f } = ctx
    const b = ctx.bleed
    const on = onColor(p.primary)
    return {
      bottom: 150,
      els: [
        { t: 'path', d: wave(-b, W + b, 108, 10, 1.5, -b), fill: p.accent, opacity: 0.55 },
        { t: 'path', d: wave(-b, W + b, 96, 12, 1.2, -b), fill: p.primary },
        ...logoOrMonogram(c, 'logo', 'company', m, 26, 42, p.paper, 'circle', f.head),
        companyName(ctx, m + 54, 46, W * 0.45, 19, on),
        T({ x: m + 54, y: 61, text: str(c, 'tagline'), size: 8.5, color: on, w: W * 0.45, fit: true, opacity: 0.85 }),
        T({ x: W - m, y: 44, text: contactList(c)[0] ?? '', size: 8.5, color: on, align: 'right', w: W * 0.3, fit: true }),
        T({ x: W - m, y: 57, text: contactList(c)[1] ?? '', size: 8.5, color: on, align: 'right', w: W * 0.3, fit: true }),
        T({ x: W - m, y: 70, text: contactList(c)[2] ?? '', size: 8.5, color: on, align: 'right', w: W * 0.3, fit: true }),
      ],
    }
  },
  minimal: (ctx, m) => {
    const { W, p, c, f } = ctx
    const top = m * 0.8
    return {
      bottom: top + 74,
      els: [
        companyName(ctx, m, top + 26, W * 0.62, 28, p.ink, 'left', { bold: false }),
        ...logoOrMonogram(c, 'logo', 'company', W - m - 34, top, 34, p.primary, 'rounded', f.head),
        { t: 'line', x1: m, y1: top + 42, x2: W - m, y2: top + 42, stroke: p.ink, sw: 0.5 },
        T({ x: m, y: top + 58, text: allContacts(c).join('    '), size: 8, color: muted(p), w: W - 2 * m, fit: true }),
        { t: 'rect', x: W - m - 40, y: top + 40, w: 40, h: 4, fill: p.accent },
      ],
    }
  },
  split: (ctx, m) => {
    const { W, p, c, f } = ctx
    const bw = W * 0.4
    const bh = 120
    const on = onColor(p.primary)
    const cs = contactStack(c, W - m, 40, W - bw - m * 1.6, 8.5, muted(p), 'right')
    return {
      bottom: bh + 30,
      els: [
        { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: bw + ctx.bleed, h: bh + ctx.bleed, fill: p.primary },
        { t: 'rect', x: bw, y: -ctx.bleed, w: W - bw + ctx.bleed, h: bh + ctx.bleed, fill: p.secondary },
        ...logoOrMonogram(c, 'logo', 'company', m * 0.7, 26, 40, p.paper, 'rounded', f.head),
        T({ x: m * 0.7, y: 88, text: str(c, 'company'), size: 16, bold: true, color: on, w: bw - m * 1.2, fit: true, font: f.head }),
        T({ x: m * 0.7, y: 102, text: str(c, 'tagline'), size: 8, color: on, w: bw - m * 1.2, fit: true, opacity: 0.85 }),
        ...cs.els,
        { t: 'rect', x: bw, y: bh - 4, w: W - bw + ctx.bleed, h: 4, fill: p.accent },
      ],
    }
  },
  monogram: (ctx, m) => {
    const { W, p, c } = ctx
    const top = m * 0.6
    const d = 58
    return {
      bottom: top + d + 100,
      els: [
        { t: 'circle', cx: W / 2, cy: top + d / 2, r: d / 2 + 5, stroke: p.accent, sw: 0.8 },
        ...logoOrMonogram(c, 'logo', 'company', W / 2 - d / 2, top, d, p.primary, 'circle', 'serif'),
        companyName(ctx, W / 2, top + d + 32, W * 0.7, 15, p.ink, 'center', { upper: true, ls: 3.5, font: 'serif', bold: false }),
        { t: 'line', x1: W / 2 - 110, y1: top + d + 46, x2: W / 2 - 8, y2: top + d + 46, stroke: p.accent, sw: 0.7 },
        { t: 'path', d: `M${W / 2} ${top + d + 42}l4 4l-4 4l-4 -4z`, fill: p.accent },
        { t: 'line', x1: W / 2 + 8, y1: top + d + 46, x2: W / 2 + 110, y2: top + d + 46, stroke: p.accent, sw: 0.7 },
        T({ x: W / 2, y: top + d + 64, text: str(c, 'tagline'), size: 9, italic: true, color: p.primary, align: 'center', w: W * 0.7, fit: true, font: 'serif' }),
      ],
    }
  },
  stripe: (ctx, m) => {
    const { W, p, c, f } = ctx
    const top = 44
    const cs = contactStack(c, W - m, top + 10, W * 0.36, 8.5, muted(p), 'right')
    return {
      bottom: Math.max(top + 70, cs.bottom + 22),
      els: [
        { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: W + 2 * ctx.bleed, h: 12 + ctx.bleed, fill: p.primary },
        { t: 'rect', x: -ctx.bleed, y: 12, w: W + 2 * ctx.bleed, h: 4, fill: p.accent },
        ...logoOrMonogram(c, 'logo', 'company', m, top, 36, p.primary, 'circle', f.head),
        companyName(ctx, m + 46, top + 17, W * 0.42, 17, p.ink),
        T({ x: m + 46, y: top + 31, text: str(c, 'tagline'), size: 8.5, color: muted(p), w: W * 0.42, fit: true }),
        ...cs.els,
      ],
    }
  },
}

// ---------------------------------------------------------------------------
// Footers

const FOOTERS: Record<string, Footer> = {
  line: (ctx, m) => {
    const { W, H, p, c } = ctx
    return {
      h: 52,
      els: [
        { t: 'line', x1: m, y1: H - 46, x2: W - m, y2: H - 46, stroke: mix(p.ink, p.paper, 0.8), sw: 0.6 },
        T({ x: W / 2, y: H - 32, text: [str(c, 'website'), str(c, 'email')].filter(Boolean).join('   ·   '), size: 8, color: p.primary, align: 'center', w: W - 2 * m, fit: true }),
        T({ x: W / 2, y: H - 20, text: str(c, 'footerNote'), size: 7, color: muted(p), align: 'center', w: W - 2 * m, fit: true }),
      ],
    }
  },
  band: (ctx, m) => {
    const { W, H, p, c } = ctx
    const on = onColor(p.primary)
    return {
      h: 62,
      els: [
        { t: 'rect', x: -ctx.bleed, y: H - 44, w: W + 2 * ctx.bleed, h: 44 + ctx.bleed, fill: p.primary },
        { t: 'rect', x: W * 0.55, y: H - 48, w: W * 0.45 + ctx.bleed, h: 4, fill: p.accent },
        T({ x: W / 2, y: H - 27, text: allContacts(c).join('   ·   '), size: 7.5, color: on, align: 'center', w: W - 2 * m, fit: true }),
        T({ x: W / 2, y: H - 14, text: str(c, 'footerNote'), size: 6.5, color: on, align: 'center', w: W - 2 * m, fit: true, opacity: 0.8 }),
      ],
    }
  },
  wave: (ctx, m) => {
    const { W, H, p, c } = ctx
    const b = ctx.bleed
    return {
      h: 70,
      els: [
        { t: 'path', d: wave(-b, W + b, H - 34, 6, 1.5, H + b), fill: p.accent, opacity: 0.5 },
        { t: 'path', d: wave(-b, W + b, H - 26, 7, 1.2, H + b), fill: p.primary },
        T({ x: m, y: H - 48, text: str(c, 'footerNote'), size: 7, color: muted(p), w: W - 2 * m, fit: true }),
      ],
    }
  },
  dots: (ctx, m) => {
    const { W, H, p, c } = ctx
    return {
      h: 56,
      els: [
        { t: 'path', d: dotGrid(W - m - 96, H - 50, 96, 30, 8, 1.4), fill: p.primary, opacity: 0.45 },
        T({ x: m, y: H - 36, text: str(c, 'website'), size: 8.5, bold: true, color: p.primary, w: W * 0.5, fit: true }),
        T({ x: m, y: H - 23, text: str(c, 'footerNote'), size: 7, color: muted(p), w: W * 0.6, fit: true }),
      ],
    }
  },
  corner: (ctx, m) => {
    const { W, H, p, c } = ctx
    const b = ctx.bleed
    return {
      h: 60,
      els: [
        { t: 'path', d: `M${-b} ${H + b}V${H - 90}L${W * 0.28} ${H + b}Z`, fill: p.primary },
        { t: 'path', d: `M${-b} ${H + b}V${H - 46}L${W * 0.14} ${H + b}Z`, fill: p.accent, opacity: 0.9 },
        { t: 'path', d: cornerOrnament(W - m, H - m * 0.6, 18, -1, -1), stroke: p.accent, sw: 0.8 },
        T({ x: W - m - 26, y: H - 28, text: str(c, 'footerNote'), size: 7, color: muted(p), align: 'right', w: W * 0.6, fit: true }),
      ],
    }
  },
  none: (ctx, m) => {
    const { W, H, p, c } = ctx
    return { h: 40, els: [T({ x: m, y: H - 24, text: str(c, 'footerNote'), size: 7, color: muted(p), w: W - 2 * m, fit: true })] }
  },
}

// ---------------------------------------------------------------------------
// Letter and pagination

interface LetterDesign {
  header: keyof typeof HEADERS
  footer: keyof typeof FOOTERS
  /** A faint watermark of the initials behind the letter. */
  watermark?: boolean
}

function renderLetterhead(ctx: RenderCtx, d: LetterDesign) {
  const { W, H, p, c, f } = ctx
  const m = W * 0.09
  const head = HEADERS[d.header](ctx, m)
  const foot = FOOTERS[d.footer](ctx, m)
  const area = head.area ?? { x: m, w: W - 2 * m }
  const bottom = H - foot.h - 18
  const bodyFont: FontFamily = f.head === 'serif' ? 'serif' : 'sans'
  const size = 10.5
  const lh = size * 1.5
  const initials = str(c, 'company')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  const base = (): El[] => [
    bgRect(ctx, p.paper),
    ...(head.base ?? []),
    ...(d.watermark && initials ? [T({ x: area.x + area.w / 2, y: H * 0.62, text: initials, size: W * 0.38, bold: true, color: p.primary, align: 'center' as const, opacity: 0.05, font: f.head })] : []),
  ]
  const pages: El[][] = []
  let els: El[] = [...base(), ...head.els]
  let y = head.bottom + 22 + size

  const newPage = () => {
    els.push(...foot.els)
    pages.push(els)
    els = [
      ...base(),
      T({ x: area.x, y: 40, text: str(c, 'company'), size: 9, bold: true, color: p.primary, w: area.w * 0.6, fit: true }),
      T({ x: area.x + area.w, y: 40, text: `Page ${pages.length + 1}`, size: 8.5, color: muted(p), align: 'right' }),
      { t: 'line', x1: area.x, y1: 48, x2: area.x + area.w, y2: 48, stroke: mix(p.ink, p.paper, 0.85), sw: 0.6 },
    ]
    y = 74 + size
  }
  /** Places a block of wrapped text, continuing on a new page when the page is full. `y` is the next baseline. */
  const flow = (text: string, opts: { bold?: boolean; color?: string; gapAfter?: number }) => {
    const wrapped = T({ x: area.x, y: 0, text, size, bold: opts.bold, color: opts.color ?? p.ink, w: area.w, font: bodyFont })
    if (wrapped.t !== 'text') return
    let chunk: string[] = []
    let startY = y
    const flush = () => {
      if (chunk.length) els.push({ ...wrapped, y: startY, lines: chunk, lh })
      chunk = []
    }
    for (const line of wrapped.lines) {
      if (y > bottom) {
        flush()
        newPage()
      }
      if (!chunk.length) startY = y
      chunk.push(line)
      y += lh
    }
    flush()
    y += opts.gapAfter ?? 0
  }

  // The letter is included unless it has been turned off (blank letterhead).
  if (c.includeLetter !== false) {
    if (str(c, 'date')) flow(fmtDate(str(c, 'date'), true), { color: muted(p), gapAfter: lh * 0.8 })
    if (str(c, 'recipient').trim()) flow(str(c, 'recipient'), { gapAfter: lh * 0.8 })
    if (str(c, 'subject').trim()) flow(str(c, 'subject'), { bold: true, gapAfter: lh * 0.6 })
    if (str(c, 'body').trim()) flow(str(c, 'body'), { gapAfter: lh * 0.6 })
    // Keep the sign-off, signature and name together.
    const sigH = img(c, 'signature') ? 46 : 30
    if (y + lh + sigH + lh * 2 > bottom) newPage()
    if (str(c, 'closing').trim()) {
      els.push(T({ x: area.x, y, text: str(c, 'closing'), size, color: p.ink, font: bodyFont }))
      y += lh * 0.4
    }
    els.push(photo(c, 'signature', area.x, y, 150, sigH - 8, 'rect', 'signature'))
    y += sigH
    els.push(
      T({ x: area.x, y, text: str(c, 'senderName'), size, bold: true, color: p.ink, w: area.w * 0.6, fit: true, font: bodyFont }),
      T({ x: area.x, y: y + lh * 0.95, text: str(c, 'senderTitle'), size: size * 0.92, color: muted(p), w: area.w * 0.6, fit: true, font: bodyFont })
    )
  }
  els.push(...foot.els)
  pages.push(els)
  return pages.map((e, i) => page(e, pages.length > 1 ? `Page ${i + 1}` : undefined))
}

const P = (primary: string, secondary: string, accent: string, ink = '#111827', paper = '#FFFFFF'): Palette => ({ primary, secondary, accent, ink, paper })

function def(id: string, name: string, family: string, tags: string[], d: LetterDesign, palette: Palette, head: FontFamily = 'sans'): TemplateDef {
  return { id, name, family, tags, orientation: 'portrait', palette, fonts: { head, body: 'sans' }, render: (ctx) => renderLetterhead(ctx, d) }
}

export const LETTERHEAD_TEMPLATES: TemplateDef[] = [
  def('lh-classic-navy', 'Classic Navy', 'Corporate', ['business', 'consulting', 'corporate'], { header: 'leftLogo', footer: 'line' }, P('#1E3A5F', '#E8EEF5', '#F5A623')),
  def('lh-classic-green', 'Evergreen', 'Corporate', ['environment', 'energy', 'services'], { header: 'leftLogo', footer: 'dots' }, P('#166534', '#DCFCE7', '#84CC16')),
  def('lh-law-maroon', 'Chambers', 'Traditional', ['law', 'legal', 'notary'], { header: 'leftLogo', footer: 'band', watermark: true }, P('#7F1D1D', '#FEF2F2', '#B45309', '#1C1917', '#FFFDF8'), 'serif'),
  def('lh-centered-burgundy', 'Centered Serif', 'Elegant', ['law', 'academic', 'foundation'], { header: 'centered', footer: 'line' }, P('#881337', '#FFF1F2', '#B08D57', '#1C1917', '#FFFDF9'), 'serif'),
  def('lh-centered-gold', 'Gold Classic', 'Elegant', ['hotel', 'luxury', 'events'], { header: 'centered', footer: 'corner' }, P('#1C1917', '#F5F0E6', '#B08D57', '#1C1917', '#FFFDF8'), 'serif'),
  def('lh-centered-sky', 'Open Sky', 'Friendly', ['school', 'nonprofit', 'community'], { header: 'centered', footer: 'wave' }, P('#0369A1', '#E0F2FE', '#38BDF8')),
  def('lh-band-indigo', 'Indigo Band', 'Modern', ['startup', 'technology', 'agency'], { header: 'band', footer: 'band' }, P('#3730A3', '#E0E7FF', '#F472B6')),
  def('lh-band-teal', 'Teal Header', 'Modern', ['healthcare', 'clinic', 'wellness'], { header: 'band', footer: 'none' }, P('#0F766E', '#CCFBF1', '#F59E0B')),
  def('lh-band-mint', 'Mint Band', 'Friendly', ['food', 'cafe', 'retail'], { header: 'band', footer: 'dots', watermark: true }, P('#047857', '#D1FAE5', '#FBBF24')),
  def('lh-sidebar-slate', 'Slate Sidebar', 'Modern', ['architecture', 'engineering', 'design'], { header: 'sidebar', footer: 'none' }, P('#334155', '#F1F5F9', '#38BDF8')),
  def('lh-sidebar-coral', 'Coral Sidebar', 'Bold', ['creative', 'marketing', 'events'], { header: 'sidebar', footer: 'dots' }, P('#E85D4A', '#FFE4DE', '#1E293B')),
  def('lh-sidebar-gold', 'Forest & Gold', 'Elegant', ['estate', 'finance', 'heritage'], { header: 'sidebar', footer: 'corner' }, P('#14532D', '#ECFDF5', '#CA9A3B', '#1C1917', '#FFFEFA'), 'serif'),
  def('lh-corner-orange', 'Orange Corner', 'Geometric', ['construction', 'trades', 'logistics'], { header: 'corner', footer: 'corner' }, P('#C2410C', '#FFEDD5', '#1F2937')),
  def('lh-corner-violet', 'Violet Angle', 'Geometric', ['agency', 'media', 'studio'], { header: 'corner', footer: 'line' }, P('#6D28D9', '#EDE9FE', '#F472B6')),
  def('lh-corner-teal', 'Teal Angle', 'Geometric', ['technology', 'consulting', 'it'], { header: 'corner', footer: 'band' }, P('#0E7490', '#CFFAFE', '#F97316')),
  def('lh-wave-ocean', 'Ocean Wave', 'Friendly', ['travel', 'marine', 'tourism'], { header: 'wave', footer: 'wave' }, P('#0369A1', '#E0F2FE', '#22D3EE')),
  def('lh-wave-rose', 'Rose Wave', 'Friendly', ['beauty', 'wedding', 'florist'], { header: 'wave', footer: 'band' }, P('#BE185D', '#FCE7F3', '#FDA4AF')),
  def('lh-wave-sunset', 'Sunset Wave', 'Bold', ['events', 'music', 'hospitality'], { header: 'wave', footer: 'dots' }, P('#C2410C', '#FFEDD5', '#DB2777')),
  def('lh-minimal-mono', 'Minimal Mono', 'Minimal', ['freelancer', 'consultant', 'personal'], { header: 'minimal', footer: 'line' }, P('#111827', '#F3F4F6', '#111827')),
  def('lh-minimal-red', 'Red Accent', 'Minimal', ['design', 'photography', 'studio'], { header: 'minimal', footer: 'none' }, P('#111827', '#F3F4F6', '#E53935')),
  def('lh-minimal-serif', 'Quiet Serif', 'Minimal', ['writer', 'publisher', 'academic'], { header: 'minimal', footer: 'dots', watermark: true }, P('#78350F', '#FEF3C7', '#B45309', '#1C1917', '#FFFDF7'), 'serif'),
  def('lh-split-forest', 'Forest Split', 'Corporate', ['outdoors', 'landscaping', 'eco'], { header: 'split', footer: 'band' }, P('#14532D', '#F0FDF4', '#A3E635')),
  def('lh-split-charcoal', 'Charcoal Split', 'Modern', ['real estate', 'property', 'interior'], { header: 'split', footer: 'dots' }, P('#27272A', '#F4F4F5', '#F97316')),
  def('lh-monogram-navy', 'Navy Monogram', 'Elegant', ['law', 'private office', 'advisory'], { header: 'monogram', footer: 'line' }, P('#1E3A8A', '#EFF6FF', '#B08D57', '#1F2937', '#FFFEFB'), 'serif'),
  def('lh-monogram-plum', 'Plum Monogram', 'Elegant', ['boutique', 'jewellery', 'fashion'], { header: 'monogram', footer: 'corner' }, P('#6B2154', '#FAF0F6', '#C9A227', '#1F1A1D', '#FFFDFB'), 'serif'),
  def('lh-stripe-sky', 'Sky Stripe', 'Corporate', ['it services', 'software', 'consulting'], { header: 'stripe', footer: 'line' }, P('#0284C7', '#E0F2FE', '#FACC15')),
  def('lh-stripe-amber', 'Amber Stripe', 'Friendly', ['education', 'training', 'tutoring'], { header: 'stripe', footer: 'wave' }, P('#B45309', '#FEF3C7', '#0EA5E9')),
]
