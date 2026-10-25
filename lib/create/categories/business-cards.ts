// Business Card Maker: 25 two-sided templates. Bleed is 1/8 in (9 pt) and the
// safe area 1/8 in inside the trim, the common print-shop convention.
import { T, mix, onColor, type El } from '../engine'
import { blob, chevrons, cornerOrnament, dotGrid, polygon, rings, stripes, triangles, wave } from '../decor'
import { MM, bgRect, img, logoOrMonogram, mirrorEls, page, photo, qr, str, type Content, type FieldDef, type Palette, type RenderCtx, type SizeOption, type TemplateDef } from '../kit'

export const BC_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Full name', type: 'text', group: 'You', maxLength: 40 },
  { key: 'title', label: 'Job title', type: 'text', group: 'You', maxLength: 50 },
  { key: 'photo', label: 'Photo', type: 'image', group: 'You', imageKind: 'person' },
  { key: 'company', label: 'Company', type: 'text', group: 'Company', maxLength: 50 },
  { key: 'tagline', label: 'Tagline', type: 'text', group: 'Company', maxLength: 70 },
  { key: 'logo', label: 'Logo', type: 'image', group: 'Company', imageKind: 'logo' },
  { key: 'phone', label: 'Phone', type: 'text', group: 'Contact', maxLength: 30 },
  { key: 'email', label: 'Email', type: 'text', group: 'Contact', maxLength: 60 },
  { key: 'website', label: 'Website', type: 'text', group: 'Contact', maxLength: 60 },
  { key: 'address', label: 'Address', type: 'textarea', group: 'Contact', maxLength: 120 },
  { key: 'social', label: 'Social profile', type: 'text', group: 'Contact', maxLength: 60, placeholder: '@handle or profile link' },
  { key: 'showQr', label: 'Show QR code', type: 'toggle', group: 'QR code' },
  { key: 'qrData', label: 'QR code content', type: 'text', group: 'QR code', maxLength: 300, hint: 'Usually your website or a vCard link. Generated on your device.' },
]

export const BC_SAMPLE: Content = {
  name: 'Maya Fernandes',
  title: 'Brand & Product Designer',
  company: 'Studio Lumen',
  tagline: 'Design that people remember',
  phone: '+1 555 0198',
  email: 'maya@studiolumen.example',
  website: 'studiolumen.example',
  address: '48 Harbour Road, Lisbon',
  social: '@studiolumen',
  showQr: true,
  qrData: 'https://studiolumen.example',
}

export const BC_BLEED = 9
export const BC_SAFE = 9

export const BC_SIZES: SizeOption[] = [
  { id: 'us', label: 'US standard (3.5 × 2 in)', w: 252, h: 144, orientation: 'landscape' },
  { id: 'eu', label: 'Europe (85 × 55 mm)', w: 85 * MM, h: 55 * MM, orientation: 'landscape' },
  { id: 'in', label: 'India (3.5 × 2 in)', w: 252, h: 144, orientation: 'landscape' },
  { id: 'jp', label: 'Japan (91 × 55 mm)', w: 91 * MM, h: 55 * MM, orientation: 'landscape' },
  { id: 'us-v', label: 'US vertical (2 × 3.5 in)', w: 144, h: 252, orientation: 'portrait' },
  { id: 'eu-v', label: 'Europe vertical (55 × 85 mm)', w: 55 * MM, h: 85 * MM, orientation: 'portrait' },
  { id: 'square', label: 'Square (2.5 × 2.5 in)', w: 180, h: 180, orientation: 'square' },
]

const contactLines = (c: Content) =>
  [
    ['phone', str(c, 'phone')],
    ['email', str(c, 'email')],
    ['website', str(c, 'website')],
    ['social', str(c, 'social')],
    ['address', str(c, 'address').replace(/\n/g, ', ')],
  ].filter(([, v]) => v.trim())

/**
 * Contact list with optional small square bullets. With `maxBottom`, the list
 * moves up so its last line stays above that y (inside the safe area).
 */
function contacts(c: Content, x: number, y: number, w: number, size: number, color: string, bullet: string | null, align: 'left' | 'right' | 'center' = 'left', gap = 1.55, maxBottom?: number, limit?: number): El[] {
  const els: El[] = []
  const lines = contactLines(c).slice(0, limit)
  const y0 = maxBottom === undefined ? y : Math.min(y, maxBottom - size * 0.2 - (lines.length - 1) * size * gap)
  lines.forEach(([, v], i) => {
    const yy = y0 + i * size * gap
    if (bullet && align === 'left') els.push({ t: 'rect', x, y: yy - size * 0.62, w: size * 0.42, h: size * 0.42, fill: bullet, bulletFor: size * 0.85 })
    els.push(T({ x: bullet && align === 'left' ? x + size * 0.85 : x, y: yy, text: v, size, color, w: bullet ? w - size * 0.85 : w, fit: true, align }))
  })
  return els
}

type Comp = { front: (ctx: RenderCtx) => El[]; back: (ctx: RenderCtx) => El[] }
const u = (ctx: RenderCtx) => Math.min(ctx.W, ctx.H)

const C: Record<string, Comp> = {
  minimalLeft: {
    front: (ctx) => {
      const { W, H, p, c, f } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.paper),
        T({ x: W * 0.1, y: H * 0.34, text: str(c, 'name'), size: s * 0.13, bold: true, color: p.ink, w: W * 0.8, fit: true, font: f.head, field: 'name' }),
        T({ x: W * 0.1, y: H * 0.34 + s * 0.12, text: str(c, 'title'), size: s * 0.065, color: p.primary, w: W * 0.8, fit: true }),
        { t: 'line', x1: W * 0.1, y1: H * 0.56, x2: W * 0.22, y2: H * 0.56, stroke: p.accent, sw: s * 0.012 },
        ...contacts(c, W * 0.1, H * 0.68, W * 0.6, s * 0.046, mix(p.ink, p.paper, 0.3), null, 'left', 1.38, H - BC_SAFE - 2),
        ...qr(c, W * 0.9 - s * 0.26, H * 0.9 - s * 0.26, s * 0.26, p.ink),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.primary),
        ...logoOrMonogram(c, 'logo', 'company', W / 2 - s * 0.14, H / 2 - s * 0.26, s * 0.28, p.accent, 'circle'),
        T({ x: W / 2, y: H / 2 + s * 0.2, text: str(c, 'company'), size: s * 0.08, bold: true, color: onColor(p.primary), align: 'center', w: W * 0.8, fit: true, font: ctx.f.head }),
        T({ x: W / 2, y: H / 2 + s * 0.3, text: str(c, 'tagline'), size: s * 0.05, color: onColor(p.primary), align: 'center', w: W * 0.8, maxLines: 1, opacity: 0.8 }),
      ]
    },
  },
  splitBlock: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      const bw = W * 0.36
      return [
        bgRect(ctx, p.paper),
        { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: bw + ctx.bleed, h: H + 2 * ctx.bleed, fill: p.primary },
        ...logoOrMonogram(c, 'logo', 'company', bw / 2 - s * 0.15, H / 2 - s * 0.2, s * 0.3, p.paper, 'rounded'),
        T({ x: bw / 2, y: H / 2 + s * 0.24, text: str(c, 'company'), size: s * 0.055, bold: true, color: onColor(p.primary), align: 'center', w: bw * 0.86, fit: true }),
        T({ x: bw + W * 0.07, y: H * 0.3, text: str(c, 'name'), size: s * 0.11, bold: true, color: p.ink, w: W - bw - W * 0.12, fit: true, font: ctx.f.head, field: 'name' }),
        T({ x: bw + W * 0.07, y: H * 0.3 + s * 0.1, text: str(c, 'title'), size: s * 0.055, color: mix(p.ink, p.paper, 0.4), w: W - bw - W * 0.12, fit: true }),
        ...contacts(c, bw + W * 0.07, H * 0.6, W - bw - W * 0.12, s * 0.048, p.ink, p.accent),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.secondary),
        { t: 'path', d: stripes(-ctx.bleed, -ctx.bleed, W + 2 * ctx.bleed, H + 2 * ctx.bleed, s * 0.18, s * 0.05), fill: p.primary, opacity: 0.12 },
        T({ x: W / 2, y: H / 2 + s * 0.03, text: str(c, 'tagline'), size: s * 0.08, bold: true, color: onColor(p.secondary), align: 'center', w: W * 0.8, maxLines: 2, font: ctx.f.head }),
        ...qr(c, W / 2 - s * 0.11, H * 0.72, s * 0.22, p.ink, '#FFFFFF'),
      ]
    },
  },
  centeredMonogram: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.primary),
        { t: 'path', d: rings(W / 2, H / 2, s * 0.3, s * 0.08, 4), stroke: onColor(p.primary), sw: s * 0.005, opacity: 0.2 },
        ...logoOrMonogram(c, 'logo', 'company', W / 2 - s * 0.2, H / 2 - s * 0.28, s * 0.4, p.accent, 'circle', 'serif'),
        T({ x: W / 2, y: H / 2 + s * 0.3, text: str(c, 'company'), size: s * 0.07, upper: true, ls: s * 0.02, color: onColor(p.primary), align: 'center', w: W * 0.86, fit: true, font: 'serif' }),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.paper),
        T({ x: W / 2, y: H * 0.3, text: str(c, 'name'), size: s * 0.1, color: p.ink, align: 'center', w: W * 0.86, fit: true, font: 'serif', field: 'name' }),
        T({ x: W / 2, y: H * 0.3 + s * 0.09, text: str(c, 'title'), size: s * 0.048, upper: true, ls: s * 0.012, color: p.primary, align: 'center', w: W * 0.86, fit: true }),
        { t: 'line', x1: W / 2 - s * 0.1, y1: H * 0.5, x2: W / 2 + s * 0.1, y2: H * 0.5, stroke: p.accent, sw: 0.8 },
        ...contacts(c, W / 2, H * 0.63, W * 0.86, s * 0.047, mix(p.ink, p.paper, 0.3), null, 'center', 1.4),
      ]
    },
  },
  diagonal: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.paper),
        { t: 'path', d: `M${W * 0.67} ${-ctx.bleed}L${W + ctx.bleed} ${-ctx.bleed}L${W + ctx.bleed} ${H + ctx.bleed}L${W * 0.56} ${H + ctx.bleed}Z`, fill: p.primary },
        { t: 'path', d: `M${W * 0.61} ${-ctx.bleed}L${W * 0.645} ${-ctx.bleed}L${W * 0.535} ${H + ctx.bleed}L${W * 0.5} ${H + ctx.bleed}Z`, fill: p.accent },
        T({ x: W * 0.08, y: H * 0.36, text: str(c, 'name'), size: s * 0.11, bold: true, color: p.ink, w: W * 0.45, fit: true, font: ctx.f.head, field: 'name' }),
        T({ x: W * 0.08, y: H * 0.36 + s * 0.1, text: str(c, 'title'), size: s * 0.052, color: p.primary, w: W * 0.45, fit: true }),
        ...logoOrMonogram(c, 'logo', 'company', W * 0.92 - s * 0.24, H * 0.12, s * 0.24, p.paper, 'circle'),
        ...contacts(c, W * 0.93, H * 0.58, W * 0.31, s * 0.042, onColor(p.primary), null, 'right', 1.45, H - BC_SAFE - 2),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.primary),
        { t: 'path', d: `M${-ctx.bleed} ${H * 0.7}L${W + ctx.bleed} ${H * 0.35}L${W + ctx.bleed} ${H + ctx.bleed}L${-ctx.bleed} ${H + ctx.bleed}Z`, fill: p.accent, opacity: 0.9 },
        T({ x: W * 0.08, y: H * 0.35, text: str(c, 'company'), size: s * 0.12, bold: true, color: onColor(p.primary), w: W * 0.84, fit: true, font: ctx.f.head }),
        T({ x: W * 0.08, y: H * 0.35 + s * 0.1, text: str(c, 'tagline'), size: s * 0.05, color: onColor(p.primary), w: W * 0.6, maxLines: 2 }),
      ]
    },
  },
  topBand: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      const bh = H * 0.3
      return [
        bgRect(ctx, p.paper),
        { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: W + 2 * ctx.bleed, h: bh + ctx.bleed, fill: p.primary },
        { t: 'path', d: dotGrid(W * 0.55, 0, W * 0.45, bh, s * 0.05, s * 0.008), fill: onColor(p.primary), opacity: 0.3 },
        ...logoOrMonogram(c, 'logo', 'company', W * 0.07, bh * 0.2, bh * 0.6, p.paper, 'rounded'),
        T({ x: W * 0.07 + bh * 0.75, y: bh * 0.62, text: str(c, 'company'), size: s * 0.065, bold: true, color: onColor(p.primary), w: W * 0.5, fit: true }),
        T({ x: W * 0.07, y: bh + H * 0.2, text: str(c, 'name'), size: s * 0.1, bold: true, color: p.ink, w: W * 0.56, fit: true, font: ctx.f.head, field: 'name' }),
        T({ x: W * 0.07, y: bh + H * 0.2 + s * 0.085, text: str(c, 'title'), size: s * 0.05, color: mix(p.ink, p.paper, 0.4), w: W * 0.56, fit: true }),
        ...contacts(c, W * 0.07, H * 0.8, W * 0.86, s * 0.044, p.ink, null, 'left', 1.3, H - BC_SAFE - 2, 4),
        ...qr(c, W * 0.93 - s * 0.24, bh + H * 0.08, s * 0.24, p.ink),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [bgRect(ctx, p.primary), { t: 'path', d: dotGrid(-ctx.bleed, -ctx.bleed, W + 2 * ctx.bleed, H + 2 * ctx.bleed, s * 0.07, s * 0.01), fill: onColor(p.primary), opacity: 0.18 }, ...logoOrMonogram(c, 'logo', 'company', W / 2 - s * 0.18, H / 2 - s * 0.18, s * 0.36, p.paper, 'rounded')]
    },
  },
  terminal: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      const lines = [
        ['$ whoami', p.accent],
        [str(c, 'name'), p.paper],
        [`# ${str(c, 'title')}`, mix(p.paper, p.primary, 0.5)],
        [`> ${str(c, 'email')}`, p.paper],
        [`> ${str(c, 'website')}`, p.paper],
        [`> ${str(c, 'social')}`, p.paper],
      ].filter(([t]) => t.replace(/^[#>$] ?/, '').trim())
      return [
        bgRect(ctx, p.ink),
        { t: 'rect', x: W * 0.06, y: H * 0.08, w: W * 0.88, h: s * 0.07, r: s * 0.02, fill: mix(p.ink, p.paper, 0.12) },
        { t: 'circle', cx: W * 0.06 + s * 0.06, cy: H * 0.08 + s * 0.035, r: s * 0.016, fill: '#EF4444' },
        { t: 'circle', cx: W * 0.06 + s * 0.11, cy: H * 0.08 + s * 0.035, r: s * 0.016, fill: '#F59E0B' },
        { t: 'circle', cx: W * 0.06 + s * 0.16, cy: H * 0.08 + s * 0.035, r: s * 0.016, fill: '#22C55E' },
        ...lines.map(([t, col], i) => T({ x: W * 0.08, y: H * 0.32 + i * s * 0.1, text: t, size: i === 1 ? s * 0.08 : s * 0.05, font: 'mono', bold: i === 1, color: col, w: W * 0.84, fit: true, field: i === 1 ? 'name' : undefined })),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.primary),
        T({ x: W / 2, y: H * 0.42, text: `<${str(c, 'company') || 'dev'} />`, size: s * 0.1, font: 'mono', bold: true, color: onColor(p.primary), align: 'center', w: W * 0.86, fit: true }),
        T({ x: W / 2, y: H * 0.56, text: str(c, 'tagline'), size: s * 0.045, font: 'mono', color: onColor(p.primary), align: 'center', w: W * 0.86, maxLines: 1, opacity: 0.85 }),
        ...qr(c, W / 2 - s * 0.1, H * 0.66, s * 0.2, p.ink, '#FFFFFF'),
      ]
    },
  },
  photoProfile: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      const r = s * 0.3
      return [
        bgRect(ctx, p.paper),
        { t: 'path', d: blob(W * 0.05, H * 0.1, s * 0.45, 3), fill: p.secondary },
        photo(c, 'photo', W * 0.08, H / 2 - r, r * 2, r * 2, 'circle'),
        T({ x: W * 0.08 + r * 2 + W * 0.06, y: H * 0.36, text: str(c, 'name'), size: s * 0.1, bold: true, color: p.ink, w: W * 0.86 - r * 2 - W * 0.06, fit: true, font: ctx.f.head, field: 'name' }),
        T({ x: W * 0.08 + r * 2 + W * 0.06, y: H * 0.36 + s * 0.09, text: str(c, 'title'), size: s * 0.05, color: p.primary, w: W * 0.86 - r * 2 - W * 0.06, fit: true }),
        ...contacts(c, W * 0.08 + r * 2 + W * 0.06, H * 0.62, W * 0.86 - r * 2 - W * 0.06, s * 0.044, mix(p.ink, p.paper, 0.3), p.accent),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [bgRect(ctx, p.primary), ...logoOrMonogram(c, 'logo', 'company', W * 0.1, H / 2 - s * 0.15, s * 0.3, p.accent, 'circle'), T({ x: W * 0.1 + s * 0.38, y: H / 2 + s * 0.03, text: str(c, 'company'), size: s * 0.09, bold: true, color: onColor(p.primary), w: W * 0.8 - s * 0.38, fit: true }), ...qr(c, W * 0.9 - s * 0.22, H * 0.9 - s * 0.22, s * 0.22, p.ink, '#FFFFFF')]
    },
  },
  restaurant: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.paper),
        { t: 'rect', x: s * 0.06, y: s * 0.06, w: W - s * 0.12, h: H - s * 0.12, stroke: p.primary, sw: 0.8 },
        { t: 'rect', x: s * 0.085, y: s * 0.085, w: W - s * 0.17, h: H - s * 0.17, stroke: p.primary, sw: 0.4 },
        { t: 'path', d: [cornerOrnament(s * 0.11, s * 0.11, s * 0.08, 1, 1), cornerOrnament(W - s * 0.11, s * 0.11, s * 0.08, -1, 1), cornerOrnament(s * 0.11, H - s * 0.11, s * 0.08, 1, -1), cornerOrnament(W - s * 0.11, H - s * 0.11, s * 0.08, -1, -1)].join(''), stroke: p.accent, sw: 0.7 },
        T({ x: W / 2, y: H * 0.42, text: str(c, 'company'), size: s * 0.12, italic: true, color: p.primary, align: 'center', w: W * 0.76, fit: true, font: 'serif' }),
        T({ x: W / 2, y: H * 0.42 + s * 0.1, text: str(c, 'tagline'), size: s * 0.045, upper: true, ls: s * 0.012, color: p.accent, align: 'center', w: W * 0.76, fit: true }),
        T({ x: W / 2, y: H * 0.78, text: [str(c, 'phone'), str(c, 'website')].filter(Boolean).join('  ·  '), size: s * 0.045, color: p.ink, align: 'center', w: W * 0.76, fit: true, font: 'serif' }),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.primary),
        T({ x: W / 2, y: H * 0.38, text: str(c, 'name'), size: s * 0.09, color: onColor(p.primary), align: 'center', w: W * 0.8, fit: true, font: 'serif', italic: true, field: 'name' }),
        T({ x: W / 2, y: H * 0.38 + s * 0.08, text: str(c, 'title'), size: s * 0.042, upper: true, ls: s * 0.012, color: p.accent, align: 'center', w: W * 0.8, fit: true }),
        T({ x: W / 2, y: H * 0.7, text: str(c, 'address'), size: s * 0.042, color: onColor(p.primary), align: 'center', w: W * 0.8, maxLines: 2, font: 'serif' }),
      ]
    },
  },
  vertical: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.paper),
        { t: 'rect', x: -ctx.bleed, y: H * 0.62, w: W + 2 * ctx.bleed, h: H * 0.38 + ctx.bleed, fill: p.primary },
        { t: 'path', d: wave(-ctx.bleed, W + ctx.bleed, H * 0.62, H * 0.02, 2, H * 0.66), fill: p.accent },
        ...logoOrMonogram(c, 'logo', 'company', W / 2 - s * 0.16, H * 0.1, s * 0.32, p.primary, 'circle'),
        T({ x: W / 2, y: H * 0.1 + s * 0.42, text: str(c, 'name'), size: s * 0.13, bold: true, color: p.ink, align: 'center', w: W * 0.86, fit: true, font: ctx.f.head, field: 'name' }),
        T({ x: W / 2, y: H * 0.1 + s * 0.53, text: str(c, 'title'), size: s * 0.065, color: p.primary, align: 'center', w: W * 0.86, fit: true }),
        ...contacts(c, W / 2, H * 0.72, W * 0.86, s * 0.058, onColor(p.primary), null, 'center', 1.45),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [bgRect(ctx, p.primary), T({ x: W / 2, y: H * 0.35, text: str(c, 'company'), size: s * 0.12, bold: true, color: onColor(p.primary), align: 'center', w: W * 0.86, fit: true }), ...qr(c, W / 2 - s * 0.25, H * 0.48, s * 0.5, p.ink, '#FFFFFF')]
    },
  },
  patternPanel: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      let hex = ''
      const r = s * 0.08
      for (let row = -1; row < H / (r * 1.5) + 1; row++) for (let col = -1; col < W / (r * 1.75) + 1; col++) hex += polygon(col * r * 1.75 + (row % 2) * r * 0.87, row * r * 1.5, r * 0.9, 6, Math.PI / 6)
      return [
        bgRect(ctx, p.primary),
        { t: 'path', d: hex, stroke: onColor(p.primary), sw: 0.4, opacity: 0.25 },
        { t: 'rect', x: W * 0.08, y: H * 0.14, w: W * 0.84, h: H * 0.72, r: s * 0.04, fill: p.paper },
        T({ x: W * 0.14, y: H * 0.36, text: str(c, 'name'), size: s * 0.1, bold: true, color: p.ink, w: W * 0.72, fit: true, font: ctx.f.head, field: 'name' }),
        T({ x: W * 0.14, y: H * 0.36 + s * 0.08, text: str(c, 'title'), size: s * 0.048, color: p.primary, w: W * 0.72, fit: true }),
        ...contacts(c, W * 0.14, H * 0.6, W * 0.72, s * 0.042, p.ink, null, 'left', 1.55, H * 0.82, 3),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [bgRect(ctx, p.paper), ...logoOrMonogram(c, 'logo', 'company', W / 2 - s * 0.14, H * 0.22, s * 0.28, p.primary, 'rounded'), T({ x: W / 2, y: H * 0.78, text: str(c, 'company'), size: s * 0.075, bold: true, color: p.ink, align: 'center', w: W * 0.8, fit: true })]
    },
  },
  cornerAccent: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.paper),
        { t: 'path', d: `M${-ctx.bleed} ${-ctx.bleed}H${W * 0.35}V${s * 0.05}H${s * 0.05}V${H * 0.5}H${-ctx.bleed}Z`, fill: p.primary },
        { t: 'path', d: `M${W + ctx.bleed} ${H + ctx.bleed}H${W * 0.65}V${H - s * 0.05}H${W - s * 0.05}V${H * 0.5}H${W + ctx.bleed}Z`, fill: p.accent },
        T({ x: W * 0.12, y: H * 0.4, text: str(c, 'name'), size: s * 0.11, bold: true, color: p.ink, w: W * 0.76, fit: true, font: ctx.f.head, field: 'name' }),
        T({ x: W * 0.12, y: H * 0.4 + s * 0.09, text: str(c, 'title'), size: s * 0.05, color: mix(p.ink, p.paper, 0.4), w: W * 0.76, fit: true }),
        ...contacts(c, W * 0.12, H * 0.64, W * 0.6, s * 0.042, p.ink, p.primary, 'left', 1.5, H - BC_SAFE - 4, 4),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [bgRect(ctx, p.ink), { t: 'path', d: `M${-ctx.bleed} ${-ctx.bleed}H${W * 0.35}V${s * 0.05}H${s * 0.05}V${H * 0.5}H${-ctx.bleed}Z`, fill: p.primary }, T({ x: W / 2, y: H / 2 + s * 0.03, text: str(c, 'company'), size: s * 0.1, bold: true, color: onColor(p.ink), align: 'center', w: W * 0.8, fit: true }), ...qr(c, W * 0.9 - s * 0.2, H * 0.9 - s * 0.2, s * 0.2, p.ink, '#FFFFFF')]
    },
  },
  qrFirst: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      const q = s * 0.5
      return [
        bgRect(ctx, p.paper),
        { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: W * 0.42 + ctx.bleed, h: H + 2 * ctx.bleed, fill: p.secondary },
        { t: 'rect', x: W * 0.21 - q / 2 - s * 0.03, y: H / 2 - q / 2 - s * 0.03, w: q + s * 0.06, h: q + s * 0.06, r: s * 0.03, fill: '#FFFFFF' },
        ...(qr({ ...c, showQr: true, qrData: str(c, 'qrData') || str(c, 'website') || str(c, 'email') }, W * 0.21 - q / 2, H / 2 - q / 2, q, p.ink)),
        T({ x: W * 0.21, y: H * 0.93, text: 'Scan to connect', size: s * 0.04, color: onColor(p.secondary), align: 'center', w: W * 0.38, fit: true }),
        T({ x: W * 0.5, y: H * 0.32, text: str(c, 'name'), size: s * 0.1, bold: true, color: p.ink, w: W * 0.44, fit: true, font: ctx.f.head, field: 'name' }),
        T({ x: W * 0.5, y: H * 0.32 + s * 0.085, text: str(c, 'title'), size: s * 0.048, color: p.primary, w: W * 0.44, fit: true }),
        ...contacts(c, W * 0.5, H * 0.58, W * 0.44, s * 0.042, p.ink, null, 'left', 1.55, H - BC_SAFE - 2, 4),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [bgRect(ctx, p.primary), { t: 'path', d: chevrons(W * 0.1, H * 0.78, W * 0.8, s * 0.08, 9), fill: onColor(p.primary), opacity: 0.25 }, ...logoOrMonogram(c, 'logo', 'company', W / 2 - s * 0.13, H * 0.2, s * 0.26, p.paper, 'circle'), T({ x: W / 2, y: H * 0.68, text: str(c, 'company'), size: s * 0.08, bold: true, color: onColor(p.primary), align: 'center', w: W * 0.8, fit: true })]
    },
  },
  editorial: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      const first = str(c, 'name').split(' ')
      return [
        bgRect(ctx, p.paper),
        T({ x: W * 0.08, y: H * 0.36, text: first[0] ?? '', size: s * 0.17, color: p.ink, w: W * 0.84, fit: true, font: 'serif', field: 'name' }),
        T({ x: W * 0.08, y: H * 0.36 + s * 0.16, text: first.slice(1).join(' '), size: s * 0.17, italic: true, color: p.primary, w: W * 0.84, fit: true, font: 'serif' }),
        { t: 'line', x1: W * 0.08, y1: H * 0.7, x2: W * 0.92, y2: H * 0.7, stroke: p.ink, sw: 0.5 },
        T({ x: W * 0.08, y: H * 0.82, text: str(c, 'title'), size: s * 0.045, upper: true, ls: s * 0.012, color: p.ink, w: W * 0.42, fit: true }),
        T({ x: W * 0.92, y: H * 0.82, text: str(c, 'email'), size: s * 0.045, color: p.ink, align: 'right', w: W * 0.44, fit: true }),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [bgRect(ctx, p.primary), T({ x: W * 0.08, y: H * 0.3, text: str(c, 'company'), size: s * 0.09, italic: true, color: onColor(p.primary), w: W * 0.84, fit: true, font: 'serif' }), ...contacts(c, W * 0.08, H * 0.55, W * 0.84, s * 0.045, onColor(p.primary), null)]
    },
  },
  frameBorder: {
    front: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [
        bgRect(ctx, p.primary),
        { t: 'path', d: triangles(-ctx.bleed, -ctx.bleed, W + 2 * ctx.bleed, s * 0.09 + ctx.bleed, 14), fill: p.accent, opacity: 0.9 },
        { t: 'path', d: triangles(-ctx.bleed, H - s * 0.09, W + 2 * ctx.bleed, s * 0.09 + ctx.bleed, 14), fill: p.accent, opacity: 0.9 },
        T({ x: W / 2, y: H * 0.45, text: str(c, 'name'), size: s * 0.12, bold: true, color: onColor(p.primary), align: 'center', w: W * 0.84, fit: true, font: ctx.f.head, field: 'name' }),
        T({ x: W / 2, y: H * 0.45 + s * 0.1, text: str(c, 'title'), size: s * 0.05, color: onColor(p.primary), align: 'center', w: W * 0.84, fit: true, opacity: 0.85 }),
        T({ x: W / 2, y: H * 0.78, text: [str(c, 'phone'), str(c, 'email')].filter(Boolean).join('   '), size: s * 0.042, color: onColor(p.primary), align: 'center', w: W * 0.84, fit: true }),
      ]
    },
    back: (ctx) => {
      const { W, H, p, c } = ctx
      const s = u(ctx)
      return [bgRect(ctx, p.paper), { t: 'path', d: triangles(-ctx.bleed, -ctx.bleed, W + 2 * ctx.bleed, s * 0.09 + ctx.bleed, 14), fill: p.primary }, ...logoOrMonogram(c, 'logo', 'company', W / 2 - s * 0.12, H * 0.3, s * 0.24, p.accent, 'circle'), T({ x: W / 2, y: H * 0.8, text: str(c, 'company'), size: s * 0.07, bold: true, color: p.ink, align: 'center', w: W * 0.8, fit: true })]
    },
  },
}

// Real-estate style: big name over a property-style photo band.
C.realEstate = {
  front: (ctx) => {
    const { W, H, p, c } = ctx
    const s = u(ctx)
    const hasPhoto = !!img(c, 'photo')
    return [
      bgRect(ctx, p.paper),
      photo(c, 'photo', -ctx.bleed, -ctx.bleed, W * 0.45 + ctx.bleed, H + 2 * ctx.bleed, 'rect'),
      ...(hasPhoto ? [] : [{ t: 'rect' as const, x: -ctx.bleed, y: -ctx.bleed, w: W * 0.45 + ctx.bleed, h: H + 2 * ctx.bleed, fill: p.secondary, opacity: 0.6 }]),
      { t: 'rect', x: W * 0.45, y: -ctx.bleed, w: s * 0.03, h: H + 2 * ctx.bleed, fill: p.accent },
      T({ x: W * 0.53, y: H * 0.3, text: str(c, 'name'), size: s * 0.1, bold: true, color: p.ink, w: W * 0.42, fit: true, font: ctx.f.head, field: 'name' }),
      T({ x: W * 0.53, y: H * 0.3 + s * 0.085, text: str(c, 'title'), size: s * 0.048, color: p.primary, w: W * 0.42, fit: true }),
      ...contacts(c, W * 0.53, H * 0.56, W * 0.42, s * 0.042, p.ink, p.primary, 'left', 1.55, H - BC_SAFE - 2, 4),
    ]
  },
  back: (ctx) => {
    const { W, H, p, c } = ctx
    const s = u(ctx)
    return [bgRect(ctx, p.primary), { t: 'path', d: `M${W * 0.3} ${H * 0.62}L${W / 2} ${H * 0.4}L${W * 0.7} ${H * 0.62}V${H * 0.78}H${W * 0.3}Z`, stroke: onColor(p.primary), sw: s * 0.012, opacity: 0.5 }, T({ x: W / 2, y: H * 0.3, text: str(c, 'company'), size: s * 0.085, bold: true, color: onColor(p.primary), align: 'center', w: W * 0.8, fit: true }), T({ x: W / 2, y: H * 0.9, text: str(c, 'tagline'), size: s * 0.04, color: onColor(p.primary), align: 'center', w: W * 0.8, fit: true })]
  },
}

/** One contact value per cell, in two columns (phone/email | website/social). */
function contactGrid(c: Content, x: number, y: number, colW: number, size: number, color: string, rowGap: number): El[] {
  const left = [str(c, 'phone'), str(c, 'email')].filter((v) => v.trim())
  const right = [str(c, 'website'), str(c, 'social')].filter((v) => v.trim())
  return [
    ...left.map((v, i) => T({ x, y: y + i * rowGap, text: v, size, color, w: colW, fit: true })),
    ...right.map((v, i) => T({ x: x + colW + size * 1.2, y: y + i * rowGap, text: v, size, color, w: colW, fit: true })),
  ]
}

C.sideBar = {
  front: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    return [
      bgRect(ctx, p.paper),
      { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: W * 0.035 + ctx.bleed, h: H + 2 * ctx.bleed, fill: p.primary },
      { t: 'rect', x: -ctx.bleed, y: H * 0.14, w: W * 0.035 + ctx.bleed, h: H * 0.18, fill: p.accent },
      ...logoOrMonogram(c, 'logo', 'company', W * 0.09, H * 0.14, s * 0.18, p.primary, 'rounded', f.head),
      T({ x: W * 0.09 + s * 0.24, y: H * 0.14 + s * 0.115, text: str(c, 'company'), size: s * 0.05, bold: true, upper: true, ls: s * 0.008, color: p.primary, w: W * 0.6, fit: true }),
      T({ x: W * 0.09, y: H * 0.56, text: str(c, 'name'), size: s * 0.12, bold: true, color: p.ink, w: W * 0.82, fit: true, font: f.head, field: 'name' }),
      T({ x: W * 0.09, y: H * 0.56 + s * 0.085, text: str(c, 'title'), size: s * 0.05, color: mix(p.ink, p.paper, 0.35), w: W * 0.82, fit: true }),
      ...contactGrid(c, W * 0.09, H * 0.8, W * 0.4, s * 0.042, p.ink, s * 0.07),
    ]
  },
  back: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    return [
      bgRect(ctx, p.primary),
      { t: 'rect', x: W * 0.965, y: -ctx.bleed, w: W * 0.035 + ctx.bleed, h: H + 2 * ctx.bleed, fill: p.accent },
      T({ x: W * 0.09, y: H * 0.46, text: str(c, 'company'), size: s * 0.12, bold: true, color: onColor(p.primary), w: W * 0.52, fit: true, font: f.head }),
      T({ x: W * 0.09, y: H * 0.46 + s * 0.1, text: str(c, 'tagline'), size: s * 0.045, color: onColor(p.primary), w: W * 0.5, maxLines: 2, opacity: 0.85 }),
      ...qr(c, W * 0.88 - s * 0.32, H / 2 - s * 0.16, s * 0.32, p.ink, '#FFFFFF'),
    ]
  },
}

C.bottomStrip = {
  front: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    const top = H * 0.7
    const on = onColor(p.primary)
    return [
      bgRect(ctx, p.paper),
      { t: 'rect', x: -ctx.bleed, y: top, w: W + 2 * ctx.bleed, h: H - top + ctx.bleed, fill: p.primary },
      { t: 'rect', x: -ctx.bleed, y: top - s * 0.02, w: W * 0.3 + ctx.bleed, h: s * 0.02, fill: p.accent },
      ...logoOrMonogram(c, 'logo', 'company', W * 0.08, H * 0.14, s * 0.24, p.primary, 'circle', f.head),
      T({ x: W * 0.08 + s * 0.31, y: H * 0.14 + s * 0.1, text: str(c, 'name'), size: s * 0.1, bold: true, color: p.ink, w: W * 0.84 - s * 0.31, fit: true, font: f.head, field: 'name' }),
      T({ x: W * 0.08 + s * 0.31, y: H * 0.14 + s * 0.18, text: str(c, 'title'), size: s * 0.048, color: p.primary, w: W * 0.84 - s * 0.31, fit: true }),
      T({ x: W * 0.08, y: H * 0.58, text: str(c, 'address').replace(/\n/g, ', '), size: s * 0.04, color: mix(p.ink, p.paper, 0.4), w: W * 0.84, fit: true }),
      ...contactGrid(c, W * 0.08, top + s * 0.11, W * 0.41, s * 0.042, on, s * 0.075),
    ]
  },
  back: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    return [
      bgRect(ctx, p.paper),
      { t: 'path', d: dotGrid(-ctx.bleed, -ctx.bleed, W + 2 * ctx.bleed, H + 2 * ctx.bleed, s * 0.06, s * 0.008), fill: p.primary, opacity: 0.15 },
      ...logoOrMonogram(c, 'logo', 'company', W / 2 - s * 0.15, H * 0.2, s * 0.3, p.primary, 'circle', f.head),
      T({ x: W / 2, y: H * 0.2 + s * 0.44, text: str(c, 'company'), size: s * 0.08, bold: true, color: p.ink, align: 'center', w: W * 0.8, fit: true, font: f.head }),
      T({ x: W / 2, y: H * 0.2 + s * 0.54, text: str(c, 'website'), size: s * 0.045, color: p.primary, align: 'center', w: W * 0.8, fit: true }),
    ]
  },
}

C.circleCut = {
  front: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    const r = H * 0.62
    return [
      bgRect(ctx, p.paper),
      { t: 'circle', cx: W * 1.02, cy: H * 0.5, r, fill: p.primary },
      { t: 'circle', cx: W * 1.02, cy: H * 0.5, r: r * 0.8, stroke: onColor(p.primary), sw: s * 0.006, opacity: 0.3 },
      ...logoOrMonogram(c, 'logo', 'company', W * 0.84 - s * 0.13, H / 2 - s * 0.13, s * 0.26, p.paper, 'circle', f.head),
      T({ x: W * 0.08, y: H * 0.34, text: str(c, 'name'), size: s * 0.11, bold: true, color: p.ink, w: W * 0.52, fit: true, font: f.head, field: 'name' }),
      T({ x: W * 0.08, y: H * 0.34 + s * 0.085, text: str(c, 'title'), size: s * 0.05, color: p.primary, w: W * 0.52, fit: true }),
      ...contacts(c, W * 0.08, H * 0.58, W * 0.5, s * 0.042, p.ink, p.accent, 'left', 1.5, H - BC_SAFE - 2, 4),
    ]
  },
  back: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    return [
      bgRect(ctx, p.primary),
      { t: 'circle', cx: -W * 0.02, cy: H * 0.5, r: H * 0.62, fill: p.accent, opacity: 0.9 },
      T({ x: W * 0.92, y: H * 0.47, text: str(c, 'company'), size: s * 0.1, bold: true, color: onColor(p.primary), align: 'right', w: W * 0.5, fit: true, font: f.head }),
      T({ x: W * 0.92, y: H * 0.47 + s * 0.09, text: str(c, 'tagline'), size: s * 0.042, color: onColor(p.primary), align: 'right', w: W * 0.5, maxLines: 2, opacity: 0.85 }),
    ]
  },
}

C.luxeDark = {
  front: (ctx) => {
    const { W, H, p, c } = ctx
    const s = u(ctx)
    const on = onColor(p.primary)
    const m = s * 0.07
    const line = [str(c, 'phone'), str(c, 'email')].filter(Boolean).join('   ·   ')
    return [
      bgRect(ctx, p.primary),
      { t: 'rect', x: m, y: m, w: W - 2 * m, h: H - 2 * m, stroke: p.accent, sw: s * 0.006 },
      { t: 'rect', x: m + s * 0.022, y: m + s * 0.022, w: W - 2 * m - s * 0.044, h: H - 2 * m - s * 0.044, stroke: p.accent, sw: s * 0.0025 },
      T({ x: W / 2, y: H * 0.38, text: str(c, 'name'), size: s * 0.11, color: on, align: 'center', w: W * 0.74, fit: true, font: 'serif', field: 'name' }),
      T({ x: W / 2, y: H * 0.38 + s * 0.085, text: str(c, 'title'), size: s * 0.04, upper: true, ls: s * 0.014, color: p.accent, align: 'center', w: W * 0.74, fit: true }),
      { t: 'line', x1: W / 2 - s * 0.08, y1: H * 0.6, x2: W / 2 + s * 0.08, y2: H * 0.6, stroke: p.accent, sw: s * 0.004 },
      T({ x: W / 2, y: H * 0.72, text: line, size: s * 0.04, color: on, align: 'center', w: W * 0.74, fit: true, opacity: 0.9 }),
      T({ x: W / 2, y: H * 0.72 + s * 0.065, text: str(c, 'website'), size: s * 0.04, color: on, align: 'center', w: W * 0.74, fit: true, opacity: 0.9 }),
    ]
  },
  back: (ctx) => {
    const { W, H, p, c } = ctx
    const s = u(ctx)
    return [
      bgRect(ctx, p.primary),
      { t: 'circle', cx: W / 2, cy: H * 0.42, r: s * 0.17, stroke: p.accent, sw: s * 0.006 },
      { t: 'circle', cx: W / 2, cy: H * 0.42, r: s * 0.14, stroke: p.accent, sw: s * 0.0025 },
      ...logoOrMonogram(c, 'logo', 'company', W / 2 - s * 0.11, H * 0.42 - s * 0.11, s * 0.22, p.primary, 'circle', 'serif'),
      T({ x: W / 2, y: H * 0.8, text: str(c, 'company'), size: s * 0.055, upper: true, ls: s * 0.02, color: p.accent, align: 'center', w: W * 0.8, fit: true, font: 'serif' }),
    ]
  },
}

C.dividerColumns = {
  front: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    return [
      bgRect(ctx, p.paper),
      T({ x: W * 0.08, y: H * 0.42, text: str(c, 'name'), size: s * 0.1, bold: true, color: p.ink, w: W * 0.42, fit: true, font: f.head, field: 'name' }),
      T({ x: W * 0.08, y: H * 0.42 + s * 0.085, text: str(c, 'title'), size: s * 0.046, color: mix(p.ink, p.paper, 0.35), w: W * 0.42, fit: true }),
      T({ x: W * 0.08, y: H * 0.74, text: str(c, 'company'), size: s * 0.045, bold: true, upper: true, ls: s * 0.01, color: p.primary, w: W * 0.42, fit: true }),
      { t: 'line', x1: W * 0.55, y1: H * 0.18, x2: W * 0.55, y2: H * 0.82, stroke: p.primary, sw: s * 0.006 },
      ...contacts(c, W * 0.6, H * 0.3, W * 0.33, s * 0.04, p.ink, p.accent, 'left', 1.6, H * 0.82, 5),
    ]
  },
  back: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    return [
      bgRect(ctx, p.primary),
      { t: 'path', d: chevrons(W * 0.08, H * 0.82, W * 0.84, s * 0.05, 14), fill: p.accent, opacity: 0.5 },
      ...logoOrMonogram(c, 'logo', 'company', W / 2 - s * 0.13, H * 0.16, s * 0.26, p.paper, 'rounded', f.head),
      T({ x: W / 2, y: H * 0.16 + s * 0.4, text: str(c, 'company'), size: s * 0.075, bold: true, color: onColor(p.primary), align: 'center', w: W * 0.8, fit: true, font: f.head }),
      T({ x: W / 2, y: H * 0.16 + s * 0.49, text: str(c, 'tagline'), size: s * 0.04, color: onColor(p.primary), align: 'center', w: W * 0.8, maxLines: 1, opacity: 0.85 }),
    ]
  },
}

C.bigInitial = {
  front: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    const initial = (str(c, 'name').trim()[0] ?? 'A').toUpperCase()
    return [
      bgRect(ctx, p.secondary),
      T({ x: W * 0.97, y: H * 0.98, text: initial, size: H * 1.15, bold: true, color: p.primary, align: 'right', font: f.head, opacity: 0.14 }),
      { t: 'rect', x: W * 0.08, y: H * 0.18, w: s * 0.1, h: s * 0.025, fill: p.primary },
      T({ x: W * 0.08, y: H * 0.42, text: str(c, 'name'), size: s * 0.11, bold: true, color: p.ink, w: W * 0.66, fit: true, font: f.head, field: 'name' }),
      T({ x: W * 0.08, y: H * 0.42 + s * 0.085, text: str(c, 'title'), size: s * 0.05, color: p.primary, w: W * 0.66, fit: true }),
      ...contacts(c, W * 0.08, H * 0.66, W * 0.6, s * 0.042, p.ink, null, 'left', 1.5, H - BC_SAFE - 2, 4),
    ]
  },
  back: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    const initial = (str(c, 'company').trim()[0] ?? str(c, 'name').trim()[0] ?? 'A').toUpperCase()
    return [
      bgRect(ctx, p.primary),
      T({ x: W / 2, y: H * 0.62, text: initial, size: s * 0.5, bold: true, color: onColor(p.primary), align: 'center', font: f.head }),
      T({ x: W / 2, y: H * 0.84, text: str(c, 'company'), size: s * 0.05, upper: true, ls: s * 0.015, bold: true, color: p.accent, align: 'center', w: W * 0.8, fit: true }),
    ]
  },
}

C.waveTop = {
  front: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    const b = ctx.bleed
    return [
      bgRect(ctx, p.paper),
      { t: 'path', d: wave(-b, W + b, H * 0.24, H * 0.04, 2, -b), fill: p.accent, opacity: 0.6 },
      { t: 'path', d: wave(-b, W + b, H * 0.18, H * 0.05, 1.5, -b), fill: p.primary },
      T({ x: W * 0.08, y: H * 0.13, text: str(c, 'company'), size: s * 0.05, bold: true, color: onColor(p.primary), w: W * 0.6, fit: true }),
      T({ x: W * 0.08, y: H * 0.5, text: str(c, 'name'), size: s * 0.11, bold: true, color: p.ink, w: W * 0.6, fit: true, font: f.head, field: 'name' }),
      T({ x: W * 0.08, y: H * 0.5 + s * 0.085, text: str(c, 'title'), size: s * 0.048, color: p.primary, w: W * 0.6, fit: true }),
      ...contactGrid(c, W * 0.08, H * 0.8, W * 0.3, s * 0.04, mix(p.ink, p.paper, 0.2), s * 0.07),
      ...qr(c, W * 0.92 - s * 0.26, H * 0.42, s * 0.26, p.ink),
    ]
  },
  back: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    const b = ctx.bleed
    return [
      bgRect(ctx, p.primary),
      { t: 'path', d: wave(-b, W + b, H * 0.78, H * 0.05, 1.5, H + b), fill: p.accent, opacity: 0.8 },
      T({ x: W / 2, y: H * 0.45, text: str(c, 'company'), size: s * 0.11, bold: true, color: onColor(p.primary), align: 'center', w: W * 0.8, fit: true, font: f.head }),
      T({ x: W / 2, y: H * 0.45 + s * 0.09, text: str(c, 'tagline'), size: s * 0.045, color: onColor(p.primary), align: 'center', w: W * 0.8, maxLines: 1, opacity: 0.85 }),
    ]
  },
}

C.outlineFrame = {
  front: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    const m = s * 0.07
    return [
      bgRect(ctx, p.paper),
      { t: 'rect', x: m, y: m, w: W - 2 * m, h: H - 2 * m, r: s * 0.05, stroke: p.primary, sw: s * 0.008 },
      ...logoOrMonogram(c, 'logo', 'company', W * 0.12, H * 0.2, s * 0.15, p.primary, 'rounded', f.head),
      T({ x: W * 0.12 + s * 0.2, y: H * 0.2 + s * 0.1, text: str(c, 'company'), size: s * 0.048, bold: true, color: p.primary, w: W * 0.5, fit: true }),
      T({ x: W * 0.12, y: H * 0.66, text: str(c, 'name'), size: s * 0.1, bold: true, color: p.ink, w: W * 0.4, fit: true, font: f.head, field: 'name' }),
      T({ x: W * 0.12, y: H * 0.66 + s * 0.08, text: str(c, 'title'), size: s * 0.045, color: mix(p.ink, p.paper, 0.35), w: W * 0.4, fit: true }),
      ...contacts(c, W * 0.88, H * 0.42, W * 0.3, s * 0.04, p.ink, null, 'right', 1.55, H - m - s * 0.08, 4),
    ]
  },
  back: (ctx) => {
    const { W, H, p, c, f } = ctx
    const s = u(ctx)
    const m = s * 0.07
    return [
      bgRect(ctx, p.primary),
      { t: 'rect', x: m, y: m, w: W - 2 * m, h: H - 2 * m, r: s * 0.05, stroke: onColor(p.primary), sw: s * 0.006, opacity: 0.6 },
      T({ x: W / 2, y: H * 0.5, text: str(c, 'tagline') || str(c, 'company'), size: s * 0.07, color: onColor(p.primary), align: 'center', w: W * 0.72, maxLines: 2, font: f.head }),
      ...qr(c, W / 2 - s * 0.09, H * 0.6, s * 0.18, p.ink, '#FFFFFF'),
    ]
  },
}

const P = (primary: string, secondary: string, accent: string, ink = '#111827', paper = '#FFFFFF'): Palette => ({ primary, secondary, accent, ink, paper })

function def(id: string, name: string, family: string, tags: string[], orientation: 'landscape' | 'portrait', comp: keyof typeof C, palette: Palette, head: 'sans' | 'serif' | 'mono' = 'sans', mirror = false): TemplateDef {
  const m = (els: El[], W: number) => (mirror ? mirrorEls(els, W) : els)
  return { id, name, family, tags, orientation, palette, fonts: { head, body: 'sans' }, unused: comp === 'photoProfile' || comp === 'realEstate' ? undefined : ['photo'], render: (ctx) => [page(m(C[comp].front(ctx), ctx.W), 'Front'), page(m(C[comp].back(ctx), ctx.W), 'Back')] }
}

export const BC_TEMPLATES: TemplateDef[] = [
  def('bc-minimal-mono', 'Minimal Mono', 'Minimal', ['minimal', 'personal', 'consultant'], 'landscape', 'minimalLeft', P('#111827', '#F3F4F6', '#E53935')),
  def('bc-minimal-sage', 'Sage Minimal', 'Minimal', ['freelancer', 'wellness', 'personal'], 'landscape', 'minimalLeft', P('#4D6B53', '#E7EFE8', '#C8A96A'), 'serif', true),
  def('bc-split-navy', 'Corporate Split', 'Corporate', ['corporate', 'finance', 'consultant'], 'landscape', 'splitBlock', P('#1E3A5F', '#DCE6F2', '#F5A623')),
  def('bc-split-coral', 'Coral Split', 'Bold', ['creative', 'agency', 'retail'], 'landscape', 'splitBlock', P('#FF6F61', '#FFE7E4', '#2D2A32'), 'sans', true),
  def('bc-monogram-gold', 'Gold Monogram', 'Premium', ['premium', 'law', 'luxury'], 'landscape', 'centeredMonogram', P('#14213D', '#1F2E4D', '#D4AF37'), 'serif'),
  def('bc-monogram-blush', 'Blush Monogram', 'Elegant', ['boutique', 'beauty', 'wedding'], 'landscape', 'centeredMonogram', P('#B76E79', '#F6E4E6', '#FFFFFF'), 'serif', true),
  def('bc-diagonal-blue', 'Diagonal Blue', 'Geometric', ['startup', 'tech', 'corporate'], 'landscape', 'diagonal', P('#2563EB', '#DBEAFE', '#FACC15')),
  def('bc-diagonal-black', 'Diagonal Noir', 'Geometric', ['agency', 'creative', 'fashion'], 'landscape', 'diagonal', P('#111111', '#F5F5F5', '#E53935'), 'sans', true),
  def('bc-band-dots', 'Dotted Band', 'Corporate', ['small business', 'retail', 'service'], 'landscape', 'topBand', P('#0F766E', '#CCFBF1', '#F59E0B')),
  def('bc-band-purple', 'Violet Band', 'Corporate', ['education', 'coaching', 'service'], 'landscape', 'topBand', P('#6D28D9', '#EDE9FE', '#F472B6'), 'sans', true),
  def('bc-terminal-dark', 'Terminal', 'Developer', ['developer', 'engineer', 'tech'], 'landscape', 'terminal', P('#22C55E', '#052E16', '#22C55E', '#0B1020', '#E5E7EB'), 'mono'),
  def('bc-terminal-amber', 'Retro Console', 'Developer', ['developer', 'gaming', 'tech'], 'landscape', 'terminal', P('#B45309', '#1C1917', '#F59E0B', '#1C1917', '#FDE68A'), 'mono', true),
  def('bc-photo-profile', 'Photo Profile', 'Personal', ['photographer', 'coach', 'realtor'], 'landscape', 'photoProfile', P('#7C3AED', '#EDE9FE', '#F59E0B')),
  def('bc-photo-warm', 'Warm Portrait', 'Personal', ['therapist', 'consultant', 'freelancer'], 'landscape', 'photoProfile', P('#C2410C', '#FFEDD5', '#0F766E'), 'sans', true),
  def('bc-restaurant-classic', 'Bistro Classic', 'Hospitality', ['restaurant', 'cafe', 'hospitality'], 'landscape', 'restaurant', P('#7F1D1D', '#FEF2F2', '#B45309', '#1C1917', '#FFFBF0'), 'serif'),
  def('bc-restaurant-green', 'Garden Café', 'Hospitality', ['cafe', 'bakery', 'florist'], 'landscape', 'restaurant', P('#14532D', '#DCFCE7', '#A16207', '#1A2E05', '#FAFDF7'), 'serif', true),
  def('bc-vertical-wave', 'Vertical Wave', 'Modern', ['designer', 'creative', 'personal'], 'portrait', 'vertical', P('#0369A1', '#E0F2FE', '#FB7185')),
  def('bc-vertical-lime', 'Vertical Lime', 'Bold', ['fitness', 'sports', 'events'], 'portrait', 'vertical', P('#3F6212', '#ECFCCB', '#FACC15'), 'sans', true),
  def('bc-hex-panel', 'Hex Panel', 'Geometric', ['engineering', 'tech', 'architecture'], 'landscape', 'patternPanel', P('#1F2937', '#E5E7EB', '#38BDF8')),
  def('bc-hex-teal', 'Teal Pattern', 'Geometric', ['healthcare', 'science', 'research'], 'landscape', 'patternPanel', P('#0E7490', '#CFFAFE', '#F97316'), 'sans', true),
  def('bc-corner-red', 'Corner Accent', 'Modern', ['retail', 'small business', 'marketing'], 'landscape', 'cornerAccent', P('#E53935', '#FFEBEE', '#111827')),
  def('bc-qr-first', 'Scan & Connect', 'Modern', ['networking', 'events', 'startup'], 'landscape', 'qrFirst', P('#111827', '#4F46E5', '#A5B4FC')),
  def('bc-editorial', 'Editorial Serif', 'Premium', ['writer', 'architect', 'designer'], 'landscape', 'editorial', P('#9F1239', '#FFF1F2', '#111827', '#111827', '#FAF7F2'), 'serif'),
  def('bc-frame-triangles', 'Festival Frame', 'Bold', ['events', 'music', 'entertainment'], 'landscape', 'frameBorder', P('#312E81', '#E0E7FF', '#F472B6')),
  def('bc-real-estate', 'Property Pro', 'Corporate', ['real estate', 'realtor', 'property'], 'landscape', 'realEstate', P('#0C4A6E', '#BAE6FD', '#EAB308')),
  def('bc-real-estate-sand', 'Sandstone Realty', 'Elegant', ['real estate', 'interior', 'architect'], 'landscape', 'realEstate', P('#78350F', '#FDE68A', '#0F766E', '#1C1917', '#FFFBEB'), 'serif', true),
  def('bc-sidebar-ink', 'Ink Sidebar', 'Minimal', ['consultant', 'developer', 'personal'], 'landscape', 'sideBar', P('#111827', '#F3F4F6', '#22D3EE')),
  def('bc-sidebar-plum', 'Plum Sidebar', 'Elegant', ['stylist', 'beauty', 'boutique'], 'landscape', 'sideBar', P('#6B2154', '#F7E8F1', '#E0A458'), 'serif', true),
  def('bc-strip-ocean', 'Ocean Strip', 'Corporate', ['corporate', 'logistics', 'services'], 'landscape', 'bottomStrip', P('#075985', '#E0F2FE', '#FBBF24')),
  def('bc-strip-charcoal', 'Charcoal Strip', 'Modern', ['agency', 'studio', 'photography'], 'landscape', 'bottomStrip', P('#27272A', '#F4F4F5', '#F97316'), 'sans', true),
  def('bc-circle-mint', 'Mint Circle', 'Modern', ['wellness', 'clinic', 'yoga'], 'landscape', 'circleCut', P('#0F766E', '#CCFBF1', '#FDE68A')),
  def('bc-circle-berry', 'Berry Circle', 'Bold', ['bakery', 'events', 'creative'], 'landscape', 'circleCut', P('#9D174D', '#FCE7F3', '#FDBA74'), 'sans', true),
  def('bc-luxe-onyx', 'Onyx & Gold', 'Premium', ['luxury', 'jewellery', 'law'], 'landscape', 'luxeDark', P('#111111', '#1F1F1F', '#C9A227', '#F5F5F4', '#FFFFFF'), 'serif'),
  def('bc-luxe-emerald', 'Emerald Luxe', 'Premium', ['hotel', 'finance', 'premium'], 'landscape', 'luxeDark', P('#064E3B', '#065F46', '#E5C07B', '#F0FDF4', '#FFFFFF'), 'serif', true),
  def('bc-divider-slate', 'Slate Columns', 'Corporate', ['engineering', 'consulting', 'finance'], 'landscape', 'dividerColumns', P('#334155', '#F1F5F9', '#0EA5E9')),
  def('bc-divider-terracotta', 'Terracotta Columns', 'Elegant', ['architect', 'interior', 'craft'], 'landscape', 'dividerColumns', P('#9A3412', '#FFEDD5', '#0F766E', '#1C1917', '#FFFBF5'), 'serif', true),
  def('bc-initial-indigo', 'Big Initial', 'Bold', ['personal brand', 'creative', 'coach'], 'landscape', 'bigInitial', P('#4338CA', '#EEF2FF', '#F472B6')),
  def('bc-initial-sun', 'Sunny Initial', 'Playful', ['tutor', 'kids', 'education'], 'landscape', 'bigInitial', P('#B45309', '#FEF3C7', '#0EA5E9'), 'sans', true),
  def('bc-wave-sky', 'Sky Wave', 'Friendly', ['travel', 'tourism', 'services'], 'landscape', 'waveTop', P('#0284C7', '#E0F2FE', '#38BDF8')),
  def('bc-wave-rose', 'Rose Wave', 'Friendly', ['florist', 'wedding', 'events'], 'landscape', 'waveTop', P('#E11D48', '#FFE4E6', '#FB7185'), 'sans', true),
  def('bc-outline-forest', 'Forest Outline', 'Minimal', ['landscaping', 'outdoors', 'eco'], 'landscape', 'outlineFrame', P('#166534', '#DCFCE7', '#CA8A04')),
  def('bc-outline-navy', 'Navy Outline', 'Corporate', ['legal', 'accounting', 'insurance'], 'landscape', 'outlineFrame', P('#1E3A8A', '#DBEAFE', '#F59E0B'), 'serif', true),
]

