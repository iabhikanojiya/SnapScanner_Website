// Certificate Maker: 26 templates built from distinct frames, ornaments,
// seals and content arrangements. These are design templates; they don't make
// a certificate accredited or verifiable.
import { T, mix, onColor, textHeight, type El, type FontFamily } from '../engine'
import { chevrons, cornerOrnament, dotGrid, guilloche, laurel, polygon, ribbon, rings, rosette, seal, stripes, triangles, wave } from '../decor'
import { MM, bgRect, fmtDate, logoOrMonogram, mirrorEls, page, photo, qr, str, type Content, type FieldDef, type Palette, type RenderCtx, type SizeOption, type TemplateDef } from '../kit'

export const CERT_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Certificate title', type: 'text', group: 'Certificate', maxLength: 50 },
  { key: 'subtitle', label: 'Subtitle', type: 'text', group: 'Certificate', maxLength: 50, placeholder: 'of Achievement' },
  { key: 'presented', label: 'Presentation line', type: 'text', group: 'Certificate', maxLength: 60 },
  { key: 'recipient', label: 'Recipient name', type: 'text', group: 'Certificate', maxLength: 50 },
  { key: 'description', label: 'Description', type: 'textarea', group: 'Certificate', maxLength: 280 },
  { key: 'photo', label: 'Recipient photo', type: 'image', group: 'Certificate', imageKind: 'person', hint: 'Shown on the Photo Award and Photo Portrait templates.' },
  { key: 'org', label: 'Organization', type: 'text', group: 'Issuer', maxLength: 60 },
  { key: 'logo', label: 'Logo', type: 'image', group: 'Issuer', imageKind: 'logo', hint: 'Without a logo, the organization’s initials are shown.' },
  { key: 'date', label: 'Date', type: 'date', group: 'Issuer' },
  { key: 'location', label: 'Location', type: 'text', group: 'Issuer', maxLength: 50 },
  { key: 'sig1Name', label: 'Signatory 1 name', type: 'text', group: 'Signatures', maxLength: 40 },
  { key: 'sig1Title', label: 'Signatory 1 title', type: 'text', group: 'Signatures', maxLength: 50 },
  { key: 'sig1Image', label: 'Signature 1 image', type: 'image', group: 'Signatures', imageKind: 'signature', hint: 'A photo or scan of a signature on a light background.' },
  { key: 'sig2Name', label: 'Signatory 2 name', type: 'text', group: 'Signatures', maxLength: 40 },
  { key: 'sig2Title', label: 'Signatory 2 title', type: 'text', group: 'Signatures', maxLength: 50 },
  { key: 'sig2Image', label: 'Signature 2 image', type: 'image', group: 'Signatures', imageKind: 'signature' },
  { key: 'certId', label: 'Certificate ID', type: 'text', group: 'Verification', maxLength: 40 },
  { key: 'showQr', label: 'Show QR code', type: 'toggle', group: 'Verification' },
  { key: 'qrData', label: 'QR code content', type: 'text', group: 'Verification', maxLength: 300, hint: 'Generated on your device. Text or a link.' },
]

export const CERT_SAMPLE: Content = {
  title: 'Certificate',
  subtitle: 'of Achievement',
  presented: 'This certificate is proudly presented to',
  recipient: 'Maya Fernandes',
  description: 'For outstanding dedication and excellence in completing the Advanced Data Analytics program with distinction.',
  org: 'Lakeside Learning Institute',
  date: '2026-10-24',
  location: 'Bengaluru',
  sig1Name: 'Dr. Ravi Kumar',
  sig1Title: 'Program Director',
  sig2Name: 'Elena Brooks',
  sig2Title: 'Head of Academics',
  certId: 'LLI-2026-0412',
  showQr: false,
  qrData: 'LLI-2026-0412 · Maya Fernandes',
}

export const CERT_SIZES: SizeOption[] = [
  { id: 'a4-l', label: 'A4 landscape (297 × 210 mm)', w: 297 * MM, h: 210 * MM, orientation: 'landscape' },
  { id: 'letter-l', label: 'US Letter landscape (11 × 8.5 in)', w: 792, h: 612, orientation: 'landscape' },
  { id: 'a4-p', label: 'A4 portrait (210 × 297 mm)', w: 210 * MM, h: 297 * MM, orientation: 'portrait' },
  { id: 'letter-p', label: 'US Letter portrait (8.5 × 11 in)', w: 612, h: 792, orientation: 'portrait' },
]

// ---------------------------------------------------------------------------
// Shared content block

interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface BodyStyle {
  align: 'left' | 'center'
  /** Font for the recipient's name. */
  nameFont: FontFamily
  nameItalic?: boolean
  titleUpper?: boolean
  /** Title colour; defaults to primary. */
  titleColor?: string
  nameColor?: string
  inkColor?: string
  muted?: string
  /** Rule under the name. */
  nameRule?: 'line' | 'double' | 'none' | 'dots'
  /** Show the logo above the title. */
  logoTop?: boolean
  scale?: number
}

/** Places logo, title, recipient, description and signatures inside a box. */
function body(ctx: RenderCtx, box: Box, st: BodyStyle): El[] {
  const { c, p, f } = ctx
  const u = Math.min(ctx.W, ctx.H) / 100
  const k = st.scale ?? 1
  const center = st.align === 'center'
  const ax = center ? box.x + box.w / 2 : box.x
  const al = center ? 'center' : 'left'
  const ink = st.inkColor ?? p.ink
  const muted = st.muted ?? mix(ink, p.paper, 0.35)
  const els: El[] = []
  let y = box.y
  if (st.logoTop !== false) {
    const s = u * 9 * k
    els.push(...logoOrMonogram(c, 'logo', 'org', center ? ax - s / 2 : ax, y, s, p.primary, 'circle', f.head))
    y += s + u * 4 * k
  }
  const titleEl = T({ x: ax, y: y + u * 6 * k, text: str(c, 'title'), size: u * 8 * k, bold: true, upper: st.titleUpper, ls: st.titleUpper ? u * 0.8 : 0, color: st.titleColor ?? p.primary, align: al, font: f.head, w: box.w, fit: true })
  els.push(titleEl)
  y += u * 6 * k + u * 4 * k
  if (str(c, 'subtitle').trim()) {
    els.push(T({ x: ax, y: y + u * 1.5 * k, text: str(c, 'subtitle'), size: u * 3.6 * k, upper: true, ls: u * 0.5, color: p.accent, align: al, bold: true, w: box.w, fit: true }))
    y += u * 6 * k
  }
  if (str(c, 'presented').trim()) {
    els.push(T({ x: ax, y: y + u * 2 * k, text: str(c, 'presented'), size: u * 2.8 * k, italic: f.head === 'serif', color: muted, align: al, font: f.head === 'serif' ? 'serif' : 'sans', w: box.w, fit: true }))
    y += u * 5 * k
  }
  const nameSize = u * 9 * k
  els.push(T({ x: ax, y: y + nameSize * 0.9, text: str(c, 'recipient'), size: nameSize, color: st.nameColor ?? ink, align: al, font: st.nameFont, italic: st.nameItalic, bold: st.nameFont === 'sans', w: box.w * 0.92, fit: true, field: 'recipient' }))
  y += nameSize * 1.25
  const rw = Math.min(box.w * 0.7, u * 80)
  const rx = center ? ax - rw / 2 : ax
  if (st.nameRule === 'line' || st.nameRule === undefined) els.push({ t: 'line', x1: rx, y1: y, x2: rx + rw, y2: y, stroke: p.accent, sw: u * 0.25 })
  if (st.nameRule === 'double') els.push({ t: 'line', x1: rx, y1: y, x2: rx + rw, y2: y, stroke: p.accent, sw: u * 0.3 }, { t: 'line', x1: rx + rw * 0.1, y1: y + u * 0.9, x2: rx + rw * 0.9, y2: y + u * 0.9, stroke: p.accent, sw: u * 0.12 })
  if (st.nameRule === 'dots') els.push({ t: 'path', d: dotGrid(rx, y - u * 0.3, rw, u * 0.6, u * 1.6, u * 0.25), fill: p.accent })
  y += u * 4 * k
  const desc = T({ x: ax, y: y + u * 2.4 * k, text: str(c, 'description'), size: u * 2.7 * k, color: muted, align: al, w: Math.min(box.w, u * 110), maxLines: 4, leading: 1.4 })
  els.push(desc)
  y += u * 2.4 * k + textHeight(desc) + u * 3 * k

  // Signature row, aligned to the bottom of the box.
  const sigs = [1, 2].filter((i) => str(c, `sig${i}Name`).trim() || str(c, `sig${i}Title`).trim())
  const meta = [fmtDate(str(c, 'date'), true), str(c, 'location')].filter((s) => s.trim()).join(' · ')
  const blocks: { name: string; title: string; img?: string }[] = sigs.map((i) => ({ name: str(c, `sig${i}Name`), title: str(c, `sig${i}Title`), img: `sig${i}Image` }))
  if (meta) blocks.splice(blocks.length > 1 ? 1 : blocks.length, 0, { name: meta, title: 'Date' })
  const bw = Math.min(u * 50, box.w / Math.max(1, blocks.length))
  const by = Math.max(y + u * 8, box.y + box.h - u * 6)
  const total = bw * blocks.length
  const bx0 = center ? box.x + (box.w - total) / 2 : box.x
  blocks.forEach((b, i) => {
    const cx = bx0 + bw * i + bw / 2
    const lw = bw * 0.8
    if (b.img) els.push(photo(c, b.img, cx - lw / 2, by - u * 9, lw, u * 8, 'rect', 'signature'))
    els.push({ t: 'line', x1: cx - lw / 2, y1: by, x2: cx + lw / 2, y2: by, stroke: ink, sw: u * 0.15 })
    els.push(T({ x: cx, y: by + u * 3, text: b.name, size: u * 2.5 * k, bold: true, color: ink, align: 'center', w: lw, fit: true }))
    els.push(T({ x: cx, y: by + u * 6, text: b.title, size: u * 2.1 * k, color: muted, align: 'center', w: lw, fit: true }))
  })
  return els
}

/** Certificate ID and optional QR code in a corner. */
function verification(ctx: RenderCtx, x: number, y: number, align: 'left' | 'right', color: string): El[] {
  const { c } = ctx
  const u = Math.min(ctx.W, ctx.H) / 100
  const els: El[] = []
  const q = u * 12
  const hasQr = qr(c, 0, 0, q, color).length > 0
  if (hasQr) els.push(...qr(c, align === 'left' ? x : x - q, y - q - u * 4, q, color, '#FFFFFF'))
  if (str(c, 'certId').trim()) els.push(T({ x, y, text: `ID ${str(c, 'certId')}`, size: u * 1.9, color, align, opacity: 0.85 }))
  return els
}

/** Classic star-edged seal with optional ribbon tails. */
function sealEl(ctx: RenderCtx, cx: number, cy: number, r: number, style: 'star' | 'rosette' | 'polygon' | 'laurel' | 'ribbon'): El[] {
  const { p, c } = ctx
  const u = Math.min(ctx.W, ctx.H) / 100
  const els: El[] = []
  if (style === 'ribbon')
    els.push(
      { t: 'path', d: `M${cx - r * 0.55} ${cy} L${cx - r * 0.85} ${cy + r * 1.7} L${cx - r * 0.45} ${cy + r * 1.45} L${cx - r * 0.2} ${cy + r * 1.8} L${cx} ${cy}Z`, fill: p.primary },
      { t: 'path', d: `M${cx + r * 0.55} ${cy} L${cx + r * 0.85} ${cy + r * 1.7} L${cx + r * 0.45} ${cy + r * 1.45} L${cx + r * 0.2} ${cy + r * 1.8} L${cx} ${cy}Z`, fill: mix(p.primary, '#000000', 0.2) }
    )
  if (style === 'star' || style === 'ribbon') els.push({ t: 'path', d: seal(cx, cy, r, 28, 0.1), fill: p.accent })
  if (style === 'polygon') els.push({ t: 'path', d: polygon(cx, cy, r, 8, Math.PI / 8), fill: p.accent })
  if (style === 'rosette') els.push({ t: 'circle', cx, cy, r, fill: p.accent }, { t: 'path', d: rosette(cx, cy, r * 0.92, r * 0.35, 12), stroke: onColor(p.accent), sw: u * 0.1, opacity: 0.5 })
  if (style === 'laurel') els.push({ t: 'path', d: laurel(cx - r * 0.35, cy + r * 0.75, r * 1.5, true), fill: p.accent }, { t: 'path', d: laurel(cx + r * 0.35, cy + r * 0.75, r * 1.5, false), fill: p.accent }, { t: 'circle', cx, cy, r: r * 0.62, fill: p.primary })
  if (style !== 'laurel') els.push({ t: 'circle', cx, cy, r: r * 0.74, stroke: onColor(p.accent), sw: u * 0.2, opacity: 0.8 })
  const label = (str(c, 'org').split(/\s+/)[0] || 'Award').slice(0, 10)
  const on = style === 'laurel' ? onColor(p.primary) : onColor(p.accent)
  els.push(T({ x: cx, y: cy - r * 0.08, text: label, size: r * 0.26, bold: true, upper: true, color: on, align: 'center', w: r * 1.2, fit: true }))
  els.push(T({ x: cx, y: cy + r * 0.3, text: str(c, 'date').slice(0, 4) || 'Award', size: r * 0.24, color: on, align: 'center' }))
  return els
}

// ---------------------------------------------------------------------------
// Compositions

type SealStyle = 'star' | 'rosette' | 'polygon' | 'laurel' | 'ribbon' | 'none'
interface V {
  seal: SealStyle
  serifName?: boolean
  script?: boolean
  pattern?: 'none' | 'dots' | 'stripes' | 'guilloche' | 'chevrons' | 'triangles' | 'rings'
}
type Comp = (ctx: RenderCtx, v: V) => El[]

const unit = (ctx: RenderCtx) => Math.min(ctx.W, ctx.H) / 100
const nameFont = (v: V): FontFamily => (v.serifName || v.script ? 'serif' : 'sans')

function pattern(ctx: RenderCtx, kind: V['pattern'], box: Box, color: string, opacity = 0.18): El[] {
  const u = unit(ctx)
  switch (kind) {
    case 'dots':
      return [{ t: 'path', d: dotGrid(box.x, box.y, box.w, box.h, u * 3, u * 0.35), fill: color, opacity }]
    case 'stripes':
      return [{ t: 'path', d: stripes(box.x, box.y, box.w, box.h, u * 3, u * 0.8), fill: color, opacity }]
    case 'guilloche':
      return [{ t: 'path', d: guilloche(box.x, box.y, box.w, box.h, 8, 6), stroke: color, sw: u * 0.12, opacity: opacity * 2 }]
    case 'chevrons':
      return [{ t: 'path', d: chevrons(box.x, box.y, box.w, box.h, Math.round(box.w / (box.h * 1.2))), stroke: color, sw: u * 0.3, opacity: opacity * 2 }]
    case 'triangles':
      return [{ t: 'path', d: triangles(box.x, box.y, box.w, box.h, Math.max(4, Math.round(box.w / box.h))), fill: color, opacity }]
    case 'rings':
      return [{ t: 'path', d: rings(box.x + box.w, box.y, Math.min(box.w, box.h) * 0.3, u * 2, 6), stroke: color, sw: u * 0.15, opacity: opacity * 2 }]
    default:
      return []
  }
}

const classicFrame: Comp = (ctx, v) => {
  const { W, H, p } = ctx
  const u = unit(ctx)
  const m = u * 5
  const els: El[] = [
    bgRect(ctx, p.paper),
    { t: 'rect', x: m, y: m, w: W - 2 * m, h: H - 2 * m, stroke: p.primary, sw: u * 0.9 },
    { t: 'rect', x: m + u * 1.8, y: m + u * 1.8, w: W - 2 * m - u * 3.6, h: H - 2 * m - u * 3.6, stroke: p.accent, sw: u * 0.25 },
  ]
  for (const [x, y, dx, dy] of [
    [m + u * 3, m + u * 3, 1, 1],
    [W - m - u * 3, m + u * 3, -1, 1],
    [m + u * 3, H - m - u * 3, 1, -1],
    [W - m - u * 3, H - m - u * 3, -1, -1],
  ] as const)
    els.push({ t: 'path', d: cornerOrnament(x, y, u * 8, dx, dy), stroke: p.accent, sw: u * 0.35 })
  const box = { x: m + u * 10, y: m + u * 7, w: W - 2 * m - u * 20, h: H - 2 * m - u * 14 }
  els.push(...pattern(ctx, v.pattern, { x: m + u * 2, y: H - m - u * 6, w: W - 2 * m - u * 4, h: u * 4 }, p.primary))
  els.push(...body(ctx, box, { align: 'center', nameFont: nameFont(v), nameItalic: v.script, titleUpper: true }))
  if (v.seal !== 'none') els.push(...sealEl(ctx, W - m - u * 16, H - m - u * 18, u * 8, v.seal))
  els.push(...verification(ctx, m + u * 4, H - m - u * 3, 'left', p.ink))
  return els
}

const sidePanel: Comp = (ctx, v) => {
  const { W, H, p } = ctx
  const u = unit(ctx)
  const pw = W * 0.28
  const els: El[] = [bgRect(ctx, p.paper), { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: pw + ctx.bleed, h: H + 2 * ctx.bleed, fill: p.primary }]
  els.push(...pattern(ctx, v.pattern, { x: 0, y: 0, w: pw, h: H }, onColor(p.primary), 0.12))
  els.push({ t: 'rect', x: pw, y: 0, w: u * 1.2, h: H, fill: p.accent })
  if (v.seal !== 'none') els.push(...sealEl(ctx, pw / 2, H * 0.42, Math.min(pw * 0.3, u * 13), v.seal))
  els.push(...body(ctx, { x: pw + u * 9, y: u * 9, w: W - pw - u * 17, h: H - u * 18 }, { align: 'left', nameFont: nameFont(v), nameItalic: v.script, titleUpper: true, nameRule: 'line' }))
  els.push(...verification(ctx, u * 4, H - u * 4, 'left', onColor(p.primary)))
  return els
}

const topBand: Comp = (ctx, v) => {
  const { W, H, p } = ctx
  const u = unit(ctx)
  const bh = H * 0.2
  const els: El[] = [bgRect(ctx, p.paper), { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: W + 2 * ctx.bleed, h: bh + ctx.bleed, fill: p.primary }]
  els.push(...pattern(ctx, v.pattern, { x: 0, y: 0, w: W, h: bh }, onColor(p.primary), 0.14))
  els.push({ t: 'rect', x: 0, y: bh, w: W, h: u * 1, fill: p.accent }, { t: 'rect', x: 0, y: H - u * 3, w: W, h: u * 3, fill: p.primary })
  els.push(...body(ctx, { x: u * 12, y: bh * 0.18, w: W - u * 24, h: H - bh * 0.18 - u * 12 }, { align: 'center', nameFont: nameFont(v), nameItalic: v.script, titleUpper: true, titleColor: onColor(p.primary), logoTop: false, nameRule: 'double' }))
  if (v.seal !== 'none') els.push(...sealEl(ctx, W - u * 16, bh, u * 8, v.seal))
  els.push(...verification(ctx, W - u * 5, H - u * 5, 'right', p.ink))
  return els
}

const cornerRibbon: Comp = (ctx, v) => {
  const { W, H, p } = ctx
  const u = unit(ctx)
  const s = Math.min(W, H) * 0.32
  const els: El[] = [
    bgRect(ctx, p.paper),
    { t: 'path', d: `M0 0H${s}L0 ${s}Z`, fill: p.primary },
    { t: 'path', d: `M${s * 1.15} 0H${s * 1.35}L0 ${s * 1.35}V${s * 1.15}Z`, fill: p.accent },
    { t: 'path', d: `M${W} ${H}H${W - s * 0.8}L${W} ${H - s * 0.8}Z`, fill: p.primary },
  ]
  els.push(...pattern(ctx, v.pattern, { x: W - s * 1.4, y: u * 4, w: s * 1.2, h: u * 8 }, p.primary))
  els.push(...body(ctx, { x: u * 18, y: u * 10, w: W - u * 36, h: H - u * 20 }, { align: 'center', nameFont: nameFont(v), nameItalic: v.script, nameRule: 'line' }))
  if (v.seal !== 'none') els.push(...sealEl(ctx, u * 16, H - u * 20, u * 8, v.seal))
  els.push(...verification(ctx, W - u * 18, u * 8, 'left', p.ink))
  return els
}

const guillocheBorder: Comp = (ctx, v) => {
  const { W, H, p } = ctx
  const u = unit(ctx)
  const b = u * 7
  const els: El[] = [
    bgRect(ctx, mix(p.paper, p.secondary, 0.5)),
    { t: 'path', d: guilloche(0, 0, W, b, 6, 14), stroke: p.primary, sw: u * 0.12, opacity: 0.7 },
    { t: 'path', d: guilloche(0, H - b, W, b, 6, 14), stroke: p.primary, sw: u * 0.12, opacity: 0.7 },
    { t: 'rect', x: b, y: b, w: W - 2 * b, h: H - 2 * b, fill: p.paper, stroke: p.primary, sw: u * 0.3 },
    { t: 'path', d: rosette(W / 2, H / 2, Math.min(W, H) * 0.32, Math.min(W, H) * 0.12, 18), stroke: p.secondary, sw: u * 0.15, opacity: 0.6 },
  ]
  els.push(...body(ctx, { x: b + u * 8, y: b + u * 5, w: W - 2 * b - u * 16, h: H - 2 * b - u * 10 }, { align: 'center', nameFont: nameFont(v), nameItalic: v.script, titleUpper: true, nameRule: 'none' }))
  if (v.seal !== 'none') els.push(...sealEl(ctx, b + u * 14, H - b - u * 14, u * 8, v.seal))
  els.push(...verification(ctx, W - b - u * 3, H - b - u * 3, 'right', p.ink))
  void v
  return els
}

const minimal: Comp = (ctx, v) => {
  const { W, H, p } = ctx
  const u = unit(ctx)
  const els: El[] = [bgRect(ctx, p.paper), { t: 'line', x1: u * 10, y1: u * 8, x2: W - u * 10, y2: u * 8, stroke: p.ink, sw: u * 0.15 }, { t: 'line', x1: u * 10, y1: H - u * 8, x2: W - u * 10, y2: H - u * 8, stroke: p.ink, sw: u * 0.15 }]
  els.push(...pattern(ctx, v.pattern, { x: u * 10, y: u * 3, w: W - u * 20, h: u * 3.5 }, p.accent, 0.4))
  els.push(...body(ctx, { x: u * 14, y: u * 14, w: W - u * 28, h: H - u * 30 }, { align: 'left', nameFont: nameFont(v), nameItalic: v.script, titleColor: p.ink, nameColor: p.primary, nameRule: 'none', logoTop: true }))
  if (v.seal !== 'none') els.push(...sealEl(ctx, W - u * 22, u * 26, u * 9, v.seal))
  els.push(...verification(ctx, W - u * 10, H - u * 4, 'right', p.ink))
  return els
}

const laurelCrest: Comp = (ctx, v) => {
  const { W, H, p } = ctx
  const u = unit(ctx)
  const m = u * 4
  const els: El[] = [bgRect(ctx, p.paper), { t: 'rect', x: m, y: m, w: W - 2 * m, h: H - 2 * m, stroke: p.accent, sw: u * 0.4, r: u * 2 }]
  els.push({ t: 'path', d: laurel(W / 2 - u * 4, u * 24, u * 16, true), fill: p.accent }, { t: 'path', d: laurel(W / 2 + u * 4, u * 24, u * 16, false), fill: p.accent })
  els.push(...pattern(ctx, v.pattern, { x: m, y: H - m - u * 5, w: W - 2 * m, h: u * 5 }, p.primary))
  const s = u * 10
  els.push(...logoOrMonogram(ctx.c, 'logo', 'org', W / 2 - s / 2, u * 9, s, p.primary, 'circle', ctx.f.head))
  els.push(...body(ctx, { x: u * 14, y: u * 25, w: W - u * 28, h: H - u * 35 }, { align: 'center', nameFont: nameFont(v), nameItalic: v.script, titleUpper: true, logoTop: false, nameRule: 'dots' }))
  if (v.seal !== 'none') els.push(...sealEl(ctx, W - u * 18, H - u * 20, u * 7, v.seal))
  els.push(...verification(ctx, m + u * 4, H - m - u * 3, 'left', p.ink))
  return els
}

const geometric: Comp = (ctx, v) => {
  const { W, H, p } = ctx
  const u = unit(ctx)
  const els: El[] = [
    bgRect(ctx, p.paper),
    { t: 'path', d: triangles(0, 0, W, u * 7, 16), fill: p.primary },
    { t: 'path', d: triangles(0, H - u * 7, W, u * 7, 16), fill: p.accent },
    { t: 'path', d: polygon(W - u * 8, H / 2, u * 22, 6), fill: p.secondary, opacity: 0.7 },
    { t: 'path', d: polygon(u * 6, H * 0.3, u * 14, 6), fill: p.secondary, opacity: 0.5 },
  ]
  els.push(...pattern(ctx, v.pattern, { x: u * 4, y: H * 0.6, w: u * 18, h: u * 18 }, p.primary, 0.3))
  els.push(...body(ctx, { x: u * 18, y: u * 12, w: W - u * 36, h: H - u * 24 }, { align: 'center', nameFont: nameFont(v), nameItalic: v.script, titleUpper: true }))
  if (v.seal !== 'none') els.push(...sealEl(ctx, u * 18, H - u * 22, u * 7, v.seal))
  els.push(...verification(ctx, W - u * 6, H - u * 10, 'right', p.ink))
  return els
}

const waves: Comp = (ctx, v) => {
  const { W, H, p } = ctx
  const u = unit(ctx)
  const els: El[] = [
    bgRect(ctx, p.paper),
    { t: 'path', d: wave(-ctx.bleed, W + ctx.bleed, H - u * 12, u * 3, 2, H + ctx.bleed), fill: p.secondary },
    { t: 'path', d: wave(-ctx.bleed, W + ctx.bleed, H - u * 8, u * 2.5, 3, H + ctx.bleed), fill: p.primary },
    { t: 'path', d: wave(-ctx.bleed, W + ctx.bleed, H - u * 4, u * 1.5, 4, H + ctx.bleed), fill: p.accent },
  ]
  els.push(...pattern(ctx, v.pattern, { x: W - u * 30, y: u * 4, w: u * 26, h: u * 14 }, p.primary, 0.3))
  els.push(...body(ctx, { x: u * 14, y: u * 8, w: W - u * 28, h: H - u * 32 }, { align: 'center', nameFont: nameFont(v), nameItalic: v.script, nameRule: 'line' }))
  if (v.seal !== 'none') els.push(...sealEl(ctx, u * 14, u * 14, u * 7, v.seal))
  els.push(...verification(ctx, W - u * 5, u * 6, 'right', p.ink))
  return els
}

const badgeLeft: Comp = (ctx, v) => {
  const { W, H, p } = ctx
  const u = unit(ctx)
  const els: El[] = [bgRect(ctx, p.secondary), { t: 'rect', x: u * 4, y: u * 4, w: W - u * 8, h: H - u * 8, fill: p.paper, r: u * 3 }]
  const r = Math.min(W * 0.12, u * 16)
  els.push(...pattern(ctx, v.pattern, { x: u * 4, y: u * 4, w: W * 0.3, h: H - u * 8 }, p.primary, 0.12))
  els.push(...sealEl(ctx, u * 4 + W * 0.15, H * 0.42, r, v.seal === 'none' ? 'star' : v.seal))
  els.push({ t: 'line', x1: W * 0.32, y1: u * 12, x2: W * 0.32, y2: H - u * 12, stroke: p.accent, sw: u * 0.3 })
  els.push(...body(ctx, { x: W * 0.36, y: u * 10, w: W * 0.58, h: H - u * 20 }, { align: 'left', nameFont: nameFont(v), nameItalic: v.script, titleUpper: true, nameRule: 'none' }))
  els.push(...verification(ctx, u * 8, H - u * 8, 'left', p.ink))
  return els
}

const artDeco: Comp = (ctx, v) => {
  const { W, H, p } = ctx
  const u = unit(ctx)
  const ink = p.accent
  const els: El[] = [bgRect(ctx, p.primary)]
  const m = u * 5
  els.push({ t: 'rect', x: m, y: m, w: W - 2 * m, h: H - 2 * m, stroke: ink, sw: u * 0.5 }, { t: 'rect', x: m + u * 1.5, y: m + u * 1.5, w: W - 2 * m - u * 3, h: H - 2 * m - u * 3, stroke: ink, sw: u * 0.15 })
  for (const sx of [1, -1] as const) {
    const x = sx === 1 ? m : W - m
    for (let i = 0; i < 4; i++) els.push({ t: 'line', x1: x, y1: H / 2 - u * (8 - i * 2), x2: x + sx * u * (10 - i * 2), y2: H / 2, stroke: ink, sw: u * 0.2 }, { t: 'line', x1: x, y1: H / 2 + u * (8 - i * 2), x2: x + sx * u * (10 - i * 2), y2: H / 2, stroke: ink, sw: u * 0.2 })
  }
  els.push({ t: 'path', d: chevrons(W / 2 - u * 20, m + u * 3, u * 40, u * 3, 8), stroke: ink, sw: u * 0.25 })
  els.push(...pattern(ctx, v.pattern, { x: m + u * 2, y: H - m - u * 6, w: W - 2 * m - u * 4, h: u * 4 }, ink, 0.4))
  const on = onColor(p.primary)
  els.push(...body({ ...ctx, p: { ...p, ink: on, paper: p.primary, primary: p.accent } }, { x: u * 16, y: u * 11, w: W - u * 32, h: H - u * 22 }, { align: 'center', nameFont: nameFont(v), nameItalic: v.script, titleUpper: true, titleColor: ink, inkColor: on, muted: mix(on, p.primary, 0.3), nameRule: 'double' }))
  if (v.seal !== 'none') els.push(...sealEl({ ...ctx, p: { ...p, primary: mix(p.primary, '#000000', 0.3) } }, W - u * 18, H - u * 20, u * 7, v.seal))
  els.push(...verification(ctx, m + u * 4, H - m - u * 3, 'left', ink))
  return els
}

const ribbonBanner: Comp = (ctx, v) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const els: El[] = [bgRect(ctx, p.paper), { t: 'rect', x: u * 3, y: u * 3, w: W - u * 6, h: H - u * 6, stroke: p.primary, sw: u * 0.4, dash: [u * 1.5, u * 1] }]
  els.push(...pattern(ctx, v.pattern, { x: u * 3, y: u * 3, w: W - u * 6, h: u * 6 }, p.primary))
  const rw = Math.min(W * 0.5, u * 90)
  els.push({ t: 'path', d: ribbon(W / 2, u * 22, rw, u * 11), fill: p.primary })
  els.push(T({ x: W / 2, y: u * 29.5, text: str(c, 'title'), size: u * 5.5, bold: true, upper: true, ls: u * 0.6, color: onColor(p.primary), align: 'center', font: ctx.f.head, w: rw * 0.9, fit: true }))
  els.push(...logoOrMonogram(c, 'logo', 'org', W / 2 - u * 5, u * 8, u * 10, p.accent, 'circle', ctx.f.head))
  els.push(...body({ ...ctx, c: { ...c, title: '' } }, { x: u * 14, y: u * 30, w: W - u * 28, h: H - u * 40 }, { align: 'center', nameFont: nameFont(v), nameItalic: v.script, logoTop: false }))
  if (v.seal !== 'none') els.push(...sealEl(ctx, W - u * 16, u * 16, u * 7, v.seal))
  els.push(...verification(ctx, u * 8, H - u * 6, 'left', p.ink))
  return els
}

const photoAward: Comp = (ctx, v) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const els: El[] = [bgRect(ctx, p.paper), { t: 'rect', x: 0, y: 0, w: W, h: u * 2.5, fill: p.accent }]
  const r = u * 11
  els.push({ t: 'circle', cx: W / 2, cy: u * 16, r: r + u * 1.2, fill: p.primary })
  els.push(photo(c, 'photo', W / 2 - r, u * 16 - r, r * 2, r * 2, 'circle', 'person'))
  els.push(...pattern(ctx, v.pattern, { x: 0, y: H - u * 8, w: W, h: u * 8 }, p.primary, 0.25))
  els.push(...body(ctx, { x: u * 14, y: u * 30, w: W - u * 28, h: H - u * 38 }, { align: 'center', nameFont: nameFont(v), nameItalic: v.script, titleUpper: true, logoTop: false, scale: 0.85 }))
  els.push(...logoOrMonogram(c, 'logo', 'org', u * 6, u * 6, u * 9, p.primary, 'rounded', ctx.f.head))
  if (v.seal !== 'none') els.push(...sealEl(ctx, W - u * 14, u * 14, u * 7, v.seal))
  els.push(...verification(ctx, W - u * 5, H - u * 4, 'right', p.ink))
  return els
}

// ---------------------------------------------------------------------------
// Templates

function def(id: string, name: string, family: string, tags: string[], orientation: 'landscape' | 'portrait', comp: Comp, v: V & { mirror?: boolean }, palette: Palette, head: FontFamily = 'serif'): TemplateDef {
  return {
    id,
    name,
    family,
    tags,
    orientation,
    palette,
    fonts: { head, body: 'sans' },
    unused: comp === photoAward ? undefined : ['photo'],
    render: (ctx) => {
      const els = comp(ctx, v)
      return [page(v.mirror ? mirrorEls(els, ctx.W) : els)]
    },
  }
}

const P = (primary: string, secondary: string, accent: string, ink = '#1F2937', paper = '#FFFFFF'): Palette => ({ primary, secondary, accent, ink, paper })

export const CERT_TEMPLATES: TemplateDef[] = [
  def('cert-classic-gold', 'Classic Gold', 'Formal', ['achievement', 'academic', 'formal'], 'landscape', classicFrame, { seal: 'star', script: true }, P('#1E3A5F', '#F3EBD8', '#B08D57', '#1F2937', '#FFFDF7')),
  def('cert-classic-burgundy', 'Burgundy Formal', 'Formal', ['graduation', 'diploma style', 'academic'], 'landscape', classicFrame, { seal: 'ribbon', serifName: true, pattern: 'guilloche' }, P('#7F1D1D', '#FBEFEF', '#B45309', '#1C1917', '#FFFBF5')),
  def('cert-side-navy', 'Navy Panel', 'Modern', ['training', 'course completion', 'corporate'], 'landscape', sidePanel, { seal: 'rosette' }, P('#1E3A8A', '#DBEAFE', '#F59E0B'), 'sans'),
  def('cert-side-emerald', 'Emerald Panel', 'Modern', ['workshop', 'volunteer', 'appreciation'], 'landscape', sidePanel, { seal: 'polygon', serifName: true, pattern: 'dots', mirror: true }, P('#065F46', '#D1FAE5', '#FBBF24')),
  def('cert-band-royal', 'Royal Band', 'Corporate', ['employee of the month', 'recognition', 'corporate'], 'landscape', topBand, { seal: 'ribbon', script: true, pattern: 'stripes' }, P('#4338CA', '#EEF2FF', '#F59E0B'), 'sans'),
  def('cert-band-teal', 'Teal Header', 'Corporate', ['training', 'compliance', 'course'], 'landscape', topBand, { seal: 'none', pattern: 'chevrons' }, P('#0F766E', '#CCFBF1', '#F97316'), 'sans'),
  def('cert-ribbon-corner', 'Corner Ribbon', 'Modern', ['sports', 'competition', 'achievement'], 'landscape', cornerRibbon, { seal: 'star' }, P('#B91C1C', '#FEE2E2', '#1F2937'), 'sans'),
  def('cert-ribbon-corner-violet', 'Violet Corner', 'Playful', ['school', 'kids', 'participation'], 'landscape', cornerRibbon, { seal: 'rosette', script: true, pattern: 'dots', mirror: true }, P('#7C3AED', '#EDE9FE', '#F472B6')),
  def('cert-guilloche-green', 'Security Guilloche', 'Formal', ['membership', 'share style', 'formal'], 'landscape', guillocheBorder, { seal: 'polygon', serifName: true }, P('#14532D', '#DCFCE7', '#CA8A04', '#1F2937', '#FFFFFF')),
  def('cert-guilloche-blue', 'Blue Guilloche', 'Formal', ['license style', 'qualification', 'formal'], 'landscape', guillocheBorder, { seal: 'star', script: true, mirror: true }, P('#1E40AF', '#DBEAFE', '#B45309')),
  def('cert-minimal-black', 'Minimal Black', 'Minimal', ['design', 'conference', 'speaker'], 'landscape', minimal, { seal: 'none', pattern: 'stripes' }, P('#111827', '#F3F4F6', '#E53935'), 'sans'),
  def('cert-minimal-serif', 'Editorial Serif', 'Minimal', ['writing', 'arts', 'literature'], 'landscape', minimal, { seal: 'polygon', serifName: true, mirror: true }, P('#7C2D12', '#FFEDD5', '#EA580C', '#1C1917', '#FFFCF7')),
  def('cert-laurel-gold', 'Golden Laurel', 'Elegant', ['excellence', 'honor', 'award'], 'landscape', laurelCrest, { seal: 'none', script: true }, P('#1F2937', '#F5F0E6', '#B08D57', '#1F2937', '#FFFDF8')),
  def('cert-laurel-portrait', 'Laurel Portrait', 'Elegant', ['honor roll', 'academic', 'award'], 'portrait', laurelCrest, { seal: 'star', serifName: true, pattern: 'guilloche' }, P('#3730A3', '#E0E7FF', '#CA8A04')),
  def('cert-geo-blue', 'Geometric Blue', 'Geometric', ['hackathon', 'tech', 'bootcamp'], 'landscape', geometric, { seal: 'polygon', pattern: 'dots' }, P('#0369A1', '#E0F2FE', '#22C55E'), 'sans'),
  def('cert-geo-sunset', 'Sunset Mosaic', 'Geometric', ['creative', 'design', 'festival'], 'landscape', geometric, { seal: 'rosette', script: true, mirror: true }, P('#C2410C', '#FFEDD5', '#DB2777'), 'sans'),
  def('cert-wave-ocean', 'Ocean Waves', 'Friendly', ['swimming', 'camp', 'participation'], 'landscape', waves, { seal: 'star', pattern: 'rings' }, P('#0E7490', '#CFFAFE', '#F59E0B'), 'sans'),
  def('cert-wave-portrait', 'Wave Portrait', 'Friendly', ['volunteer', 'community', 'thank you'], 'portrait', waves, { seal: 'laurel', script: true }, P('#BE185D', '#FCE7F3', '#7C3AED')),
  def('cert-badge-left', 'Badge Left', 'Corporate', ['certification', 'professional', 'skills'], 'landscape', badgeLeft, { seal: 'ribbon' }, P('#1E3A5F', '#E2E8F0', '#D4A017'), 'sans'),
  def('cert-badge-laurel', 'Laurel Badge', 'Elegant', ['achievement', 'leadership', 'award'], 'landscape', badgeLeft, { seal: 'laurel', serifName: true, pattern: 'guilloche', mirror: true }, P('#14532D', '#ECFDF5', '#B08D57', '#1F2937', '#FFFEFA')),
  def('cert-deco-midnight', 'Art Deco Midnight', 'Luxury', ['gala', 'premium', 'award'], 'landscape', artDeco, { seal: 'polygon', serifName: true }, P('#0F172A', '#1E293B', '#D4AF37', '#FFFFFF', '#0F172A')),
  def('cert-deco-emerald', 'Art Deco Emerald', 'Luxury', ['anniversary', 'honor', 'premium'], 'portrait', artDeco, { seal: 'star', script: true, pattern: 'triangles' }, P('#064E3B', '#065F46', '#E5C07B', '#FFFFFF', '#064E3B')),
  def('cert-ribbon-banner', 'Ribbon Banner', 'Playful', ['school', 'kids', 'spelling bee'], 'landscape', ribbonBanner, { seal: 'star', pattern: 'triangles' }, P('#DC2626', '#FEE2E2', '#2563EB'), 'sans'),
  def('cert-ribbon-portrait', 'Ribbon Portrait', 'Playful', ['sports day', 'participation', 'kids'], 'portrait', ribbonBanner, { seal: 'rosette', serifName: true, pattern: 'dots' }, P('#15803D', '#DCFCE7', '#F59E0B')),
  def('cert-photo-award', 'Photo Award', 'Modern', ['employee of the month', 'student of the month', 'recognition'], 'landscape', photoAward, { seal: 'ribbon' }, P('#1D4ED8', '#DBEAFE', '#F59E0B'), 'sans'),
  def('cert-photo-portrait', 'Photo Portrait', 'Modern', ['star performer', 'athlete', 'recognition'], 'portrait', photoAward, { seal: 'none', script: true, pattern: 'chevrons' }, P('#9333EA', '#F3E8FF', '#F43F5E'), 'serif'),
]
