// ID Card Maker: 25 templates built from distinct card compositions.
// These are design templates, not official or government identification.
import { T, luminance, mix, onColor, type El } from '../engine'
import { blob, chevrons, dotGrid, guilloche, polygon, rings, stripes, triangles, wave } from '../decor'
import { MM, bgRect, fmtDate, labelValue, logoOrMonogram, mirrorEls, page, photo, pill, qr, str, type Content, type FieldDef, type Palette, type RenderCtx, type SizeOption, type TemplateDef } from '../kit'

export const ID_FIELDS: FieldDef[] = [
  { key: 'org', label: 'Organization or institution', type: 'text', group: 'Organization', maxLength: 60 },
  { key: 'logo', label: 'Logo', type: 'image', group: 'Organization', imageKind: 'logo', hint: 'Without a logo, the organization’s initials are shown.' },
  { key: 'cardType', label: 'Card label', type: 'text', group: 'Organization', maxLength: 24, placeholder: 'Employee, Student, Visitor…' },
  { key: 'photo', label: 'Photo', type: 'image', group: 'Person', imageKind: 'person' },
  { key: 'name', label: 'Full name', type: 'text', group: 'Person', maxLength: 50 },
  { key: 'role', label: 'Role, title or class', type: 'text', group: 'Person', maxLength: 50 },
  { key: 'department', label: 'Department', type: 'text', group: 'Person', maxLength: 50 },
  { key: 'idNumber', label: 'ID number', type: 'text', group: 'Details', maxLength: 30 },
  { key: 'issueDate', label: 'Issue date', type: 'date', group: 'Details' },
  { key: 'expiryDate', label: 'Expiry date', type: 'date', group: 'Details' },
  { key: 'extraLabel', label: 'Extra field label', type: 'text', group: 'Details', maxLength: 20, placeholder: 'Blood group' },
  { key: 'extraValue', label: 'Extra field value', type: 'text', group: 'Details', maxLength: 30 },
  { key: 'phone', label: 'Phone', type: 'text', group: 'Contact', maxLength: 30 },
  { key: 'email', label: 'Email', type: 'text', group: 'Contact', maxLength: 60 },
  { key: 'address', label: 'Address', type: 'textarea', group: 'Contact', maxLength: 140 },
  { key: 'backNote', label: 'Back of card note', type: 'textarea', group: 'Back', maxLength: 200 },
  { key: 'showQr', label: 'Show QR code', type: 'toggle', group: 'Back' },
  { key: 'qrData', label: 'QR code content', type: 'text', group: 'Back', maxLength: 300, hint: 'Generated on your device. Text or a link.' },
]

export const ID_SAMPLE: Content = {
  org: 'Northwind Labs',
  cardType: 'Employee',
  name: 'Aarav Mehta',
  role: 'Senior Product Designer',
  department: 'Design & Research',
  idNumber: 'NWL-02817',
  issueDate: '2026-01-15',
  expiryDate: '2028-01-14',
  extraLabel: 'Blood group',
  extraValue: 'B+',
  phone: '+1 555 0142',
  email: 'aarav.mehta@example.com',
  address: '120 Market Street, Suite 400, Springfield',
  backNote: 'This card remains the property of the organization. If found, please return it to the address above.',
  showQr: true,
  qrData: 'NWL-02817 · Aarav Mehta · Northwind Labs',
}

export const ID_SIZES: SizeOption[] = [
  { id: 'cr80-l', label: 'Standard card (85.6 × 54 mm), landscape', w: 85.6 * MM, h: 54 * MM, orientation: 'landscape' },
  { id: 'cr80-p', label: 'Standard card (54 × 85.6 mm), portrait', w: 54 * MM, h: 85.6 * MM, orientation: 'portrait' },
  { id: 'badge-p', label: 'Event badge (4 × 6 in), portrait', w: 4 * 72, h: 6 * 72, orientation: 'portrait' },
  { id: 'badge-l', label: 'Event badge (4 × 3 in), landscape', w: 4 * 72, h: 3 * 72, orientation: 'landscape' },
]

type Deco = 'none' | 'dots' | 'waves' | 'stripes' | 'triangles' | 'rings' | 'chevrons' | 'blobs' | 'guilloche' | 'hex'
type Shape = 'circle' | 'rounded' | 'rect'

interface V {
  deco: Deco
  shape: Shape
  serif?: boolean
}

/** A decoration confined to a box. */
function deco(kind: Deco, x: number, y: number, w: number, h: number, color: string, opacity = 0.22): El[] {
  const u = Math.min(w, h)
  switch (kind) {
    case 'none':
      return []
    case 'dots':
      return [{ t: 'path', d: dotGrid(x, y, w, h, u * 0.09, u * 0.018), fill: color, opacity }]
    case 'waves':
      return [{ t: 'path', d: wave(x, x + w, y + h * 0.55, h * 0.12, 3, y + h), fill: color, opacity }]
    case 'stripes':
      return [{ t: 'path', d: stripes(x, y, w, h, u * 0.14, u * 0.05), fill: color, opacity }]
    case 'triangles':
      return [{ t: 'path', d: triangles(x, y, w, Math.min(h, u * 0.3), 10), fill: color, opacity }]
    case 'rings':
      return [{ t: 'path', d: rings(x + w * 0.9, y + h * 0.15, u * 0.12, u * 0.08, 5), stroke: color, sw: u * 0.012, opacity }]
    case 'chevrons':
      return [{ t: 'path', d: chevrons(x + w * 0.05, y + h * 0.4, w * 0.9, u * 0.12, 7), fill: color, opacity }]
    case 'blobs':
      return [
        { t: 'path', d: blob(x + w * 0.85, y + h * 0.1, u * 0.35, 2), fill: color, opacity },
        { t: 'path', d: blob(x + w * 0.05, y + h * 0.95, u * 0.25, 5), fill: color, opacity: opacity * 0.7 },
      ]
    case 'guilloche':
      return [{ t: 'path', d: guilloche(x, y, w, h, 7, 3), stroke: color, sw: u * 0.006, opacity }]
    case 'hex': {
      let d = ''
      const r = u * 0.09
      for (let row = 0; row < 6; row++) for (let col = 0; col < 10; col++) d += polygon(x + col * r * 1.75 + (row % 2) * r * 0.87, y + row * r * 1.5, r * 0.8, 6, Math.PI / 6)
      return [{ t: 'path', d, stroke: color, sw: u * 0.006, opacity }]
    }
  }
}

/** Details block shared by most layouts. */
function details(ctx: RenderCtx, x: number, y: number, w: number, size: number, labelColor: string, color: string, keys: string[] = ['idNumber', 'expiryDate', 'extra']) {
  const { c } = ctx
  const els: El[] = []
  const items = keys
    .map((k) =>
      k === 'extra'
        ? { label: str(c, 'extraLabel'), value: str(c, 'extraValue') }
        : { label: { idNumber: 'ID No.', issueDate: 'Issued', expiryDate: 'Valid until', phone: 'Phone', email: 'Email', department: 'Department' }[k] ?? k, value: k.endsWith('Date') ? fmtDate(str(c, k)) : str(c, k) }
    )
    .filter((i) => i.value.trim() && i.label.trim())
  const cols = Math.min(items.length, 3) || 1
  const colW = w / cols
  items.slice(0, 6).forEach((it, i) => {
    const r = labelValue({ x: x + (i % cols) * colW, y: y + Math.floor(i / cols) * size * 3, label: it.label, value: it.value, w: colW - size, size, labelColor, color, fit: true })
    els.push(...r.els)
  })
  return els
}

function nameBlock(ctx: RenderCtx, x: number, y: number, w: number, size: number, color: string, sub: string, align: 'left' | 'center' = 'left', serif = false) {
  const { c, f } = ctx
  const font = serif ? 'serif' : f.head
  const name = T({ x, y, text: str(c, 'name'), size, bold: true, color, w, fit: true, align, font, field: 'name' })
  const role = T({ x, y: y + size * 1.15, text: str(c, 'role'), size: size * 0.55, color: sub, w, maxLines: 2, align, font: f.body, field: 'role' })
  return [name, role]
}

// ---------------------------------------------------------------------------
// Landscape compositions

function sidebar(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const bw = W * 0.3
  const s = H * 0.42
  return [
    bgRect(ctx, p.paper),
    { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: bw + ctx.bleed, h: H + 2 * ctx.bleed, fill: p.primary },
    ...deco(v.deco, 0, 0, bw, H, onColor(p.primary)),
    ...logoOrMonogram(c, 'logo', 'org', bw / 2 - H * 0.11, H * 0.08, H * 0.22, p.accent, 'circle'),
    T({ x: bw / 2, y: H * 0.42, text: str(c, 'org'), size: H * 0.065, bold: true, color: onColor(p.primary), w: bw * 0.86, maxLines: 2, align: 'center', font: ctx.f.head }),
    photo(c, 'photo', bw / 2 - s * 0.42, H * 0.56, s * 0.84, s * 0.84 * 1.12 > H * 0.42 ? H * 0.4 : s * 0.84 * 1.12, v.shape),
    ...pill(bw + W * 0.05, H * 0.1, str(c, 'cardType'), H * 0.045, p.accent, onColor(p.accent)),
    ...nameBlock(ctx, bw + W * 0.05, H * 0.36, W - bw - W * 0.1, H * 0.1, p.ink, mix(p.ink, p.paper, 0.4), 'left', v.serif),
    ...details(ctx, bw + W * 0.05, H * 0.6, W - bw - W * 0.1, H * 0.05, p.primary, p.ink),
  ]
}

function headerBand(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const hh = H * 0.27
  const s = H * 0.5
  return [
    bgRect(ctx, p.paper),
    { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: W + 2 * ctx.bleed, h: hh + ctx.bleed, fill: p.primary },
    ...deco(v.deco, 0, 0, W, hh, onColor(p.primary)),
    ...logoOrMonogram(c, 'logo', 'org', W * 0.04, hh * 0.18, hh * 0.64, p.paper, 'rounded'),
    T({ x: W * 0.04 + hh * 0.8, y: hh * 0.62, text: str(c, 'org'), size: hh * 0.3, bold: true, color: onColor(p.primary), w: W * 0.55, fit: true, font: ctx.f.head }),
    T({ x: W * 0.96, y: hh * 0.62, text: str(c, 'cardType'), size: hh * 0.22, bold: true, upper: true, ls: 1, color: onColor(p.primary), align: 'right', opacity: 0.9 }),
    photo(c, 'photo', W * 0.05, hh + H * 0.1, s * 0.86, s, v.shape),
    ...nameBlock(ctx, W * 0.05 + s, hh + H * 0.2, W * 0.95 - s - W * 0.07, H * 0.1, p.ink, p.primary, 'left', v.serif),
    ...details(ctx, W * 0.05 + s, hh + H * 0.43, W * 0.88 - s, H * 0.048, mix(p.ink, p.paper, 0.45), p.ink),
    { t: 'rect', x: -ctx.bleed, y: H - H * 0.04, w: W + 2 * ctx.bleed, h: H * 0.04 + ctx.bleed, fill: p.accent },
  ]
}

function split(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const half = W * 0.42
  return [
    bgRect(ctx, p.paper),
    { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: half + ctx.bleed, h: H + 2 * ctx.bleed, fill: p.secondary },
    photo(c, 'photo', 0, 0, half, H, 'rect'),
    ...deco(v.deco, half - W * 0.06, 0, W * 0.12, H, p.primary, 0.9),
    ...logoOrMonogram(c, 'logo', 'org', half + W * 0.06, H * 0.08, H * 0.16, p.primary, 'rounded'),
    T({ x: half + W * 0.06 + H * 0.2, y: H * 0.19, text: str(c, 'org'), size: H * 0.06, bold: true, color: p.ink, w: W - half - W * 0.12 - H * 0.2, fit: true, font: ctx.f.head }),
    T({ x: half + W * 0.06, y: H * 0.42, text: str(c, 'cardType'), size: H * 0.045, bold: true, upper: true, ls: 1.4, color: p.accent }),
    ...nameBlock(ctx, half + W * 0.06, H * 0.55, W - half - W * 0.1, H * 0.095, p.ink, mix(p.ink, p.paper, 0.4), 'left', v.serif),
    ...details(ctx, half + W * 0.06, H * 0.74, W - half - W * 0.1, H * 0.045, p.primary, p.ink, ['idNumber', 'expiryDate']),
  ]
}

function minimal(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const s = H * 0.56
  return [
    bgRect(ctx, p.paper),
    ...deco(v.deco, W * 0.55, 0, W * 0.45, H, p.primary, 0.08),
    { t: 'line', x1: W * 0.06, y1: H * 0.24, x2: W * 0.06 + W * 0.12, y2: H * 0.24, stroke: p.accent, sw: H * 0.014 },
    ...logoOrMonogram(c, 'logo', 'org', W * 0.06, H * 0.07, H * 0.12, p.primary, 'rounded'),
    T({ x: W * 0.06 + H * 0.16, y: H * 0.155, text: str(c, 'org'), size: H * 0.055, bold: true, color: p.ink, w: W * 0.5, fit: true, font: ctx.f.head }),
    ...nameBlock(ctx, W * 0.06, H * 0.45, W * 0.56, H * 0.105, p.ink, mix(p.ink, p.paper, 0.45), 'left', v.serif),
    T({ x: W * 0.06, y: H * 0.7, text: str(c, 'department'), size: H * 0.05, color: p.primary, bold: true }),
    T({ x: W * 0.06, y: H * 0.88, text: `${str(c, 'idNumber')}${str(c, 'expiryDate') ? `  ·  Valid until ${fmtDate(str(c, 'expiryDate'))}` : ''}`, size: H * 0.042, color: mix(p.ink, p.paper, 0.4), font: 'mono' }),
    photo(c, 'photo', W * 0.94 - s * 0.82, H * 0.22, s * 0.82, s, v.shape),
  ]
}

function geometric(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const r = H * 0.25
  return [
    bgRect(ctx, p.paper),
    { t: 'path', d: `M${W * 0.55} ${-ctx.bleed} L${W + ctx.bleed} ${-ctx.bleed} L${W + ctx.bleed} ${H + ctx.bleed} L${W * 0.78} ${H + ctx.bleed} Z`, fill: p.primary },
    { t: 'path', d: `M${W * 0.7} ${-ctx.bleed} L${W * 0.82} ${-ctx.bleed} L${W * 0.6} ${H * 0.55} Z`, fill: p.accent },
    ...deco(v.deco, W * 0.62, 0, W * 0.38, H, onColor(p.primary)),
    { t: 'circle', cx: W * 0.74, cy: H * 0.52, r: r + H * 0.025, fill: p.paper },
    photo(c, 'photo', W * 0.74 - r, H * 0.52 - r, r * 2, r * 2, 'circle'),
    ...logoOrMonogram(c, 'logo', 'org', W * 0.06, H * 0.08, H * 0.14, p.accent, 'circle'),
    T({ x: W * 0.06 + H * 0.18, y: H * 0.17, text: str(c, 'org'), size: H * 0.06, bold: true, color: p.ink, w: W * 0.4, fit: true, font: ctx.f.head }),
    ...nameBlock(ctx, W * 0.06, H * 0.47, W * 0.48, H * 0.1, p.ink, p.primary, 'left', v.serif),
    ...details(ctx, W * 0.06, H * 0.7, W * 0.46, H * 0.045, mix(p.ink, p.paper, 0.45), p.ink, ['idNumber', 'expiryDate']),
  ]
}

function footerBand(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const fh = H * 0.24
  const s = H * 0.5
  // Barcode-style bars generated from the ID number (decorative only).
  const idn = str(c, 'idNumber') || '0000'
  let bars = ''
  let x = W * 0.58
  for (let i = 0; x < W * 0.95; i++) {
    const wbar = (((idn.charCodeAt(i % idn.length) * (i + 3)) % 4) + 1) * H * 0.006
    bars += `M${x} ${H - fh * 0.8}h${wbar}v${fh * 0.6}h${-wbar}Z`
    x += wbar + H * 0.008
  }
  return [
    bgRect(ctx, p.paper),
    ...deco(v.deco, 0, 0, W, H - fh, p.secondary, 0.25),
    ...logoOrMonogram(c, 'logo', 'org', W * 0.05, H * 0.08, H * 0.13, p.primary, 'rounded'),
    T({ x: W * 0.05 + H * 0.17, y: H * 0.165, text: str(c, 'org'), size: H * 0.055, bold: true, color: p.ink, w: W * 0.6, fit: true, font: ctx.f.head }),
    photo(c, 'photo', W * 0.95 - s * 0.8, H * 0.08, s * 0.8, s * 0.95, v.shape),
    ...pill(W * 0.05, H * 0.3, str(c, 'cardType'), H * 0.04, p.secondary, onColor(p.secondary)),
    ...nameBlock(ctx, W * 0.05, H * 0.52, W * 0.55, H * 0.1, p.ink, mix(p.ink, p.paper, 0.45), 'left', v.serif),
    { t: 'rect', x: -ctx.bleed, y: H - fh, w: W + 2 * ctx.bleed, h: fh + ctx.bleed, fill: p.primary },
    T({ x: W * 0.05, y: H - fh * 0.55, text: 'ID No.', size: fh * 0.16, upper: true, ls: 1, bold: true, color: onColor(p.primary), opacity: 0.8 }),
    T({ x: W * 0.05, y: H - fh * 0.22, text: idn, size: fh * 0.28, bold: true, color: onColor(p.primary), font: 'mono' }),
    { t: 'path', d: bars, fill: onColor(p.primary), opacity: 0.85 },
  ]
}

function academic(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const s = H * 0.48
  return [
    bgRect(ctx, p.paper),
    { t: 'rect', x: W * 0.025, y: H * 0.04, w: W * 0.95, h: H * 0.92, stroke: p.primary, sw: H * 0.008, r: H * 0.03 },
    ...deco(v.deco, W * 0.025, H * 0.04, W * 0.95, H * 0.92, p.primary, 0.07),
    ...logoOrMonogram(c, 'logo', 'org', W / 2 - H * 0.08, H * 0.08, H * 0.16, p.primary, 'circle', 'serif'),
    T({ x: W / 2, y: H * 0.33, text: str(c, 'org'), size: H * 0.07, bold: true, color: p.primary, align: 'center', w: W * 0.8, fit: true, font: 'serif' }),
    T({ x: W / 2, y: H * 0.41, text: str(c, 'cardType'), size: H * 0.04, upper: true, ls: 2, color: p.accent, align: 'center', bold: true }),
    { t: 'line', x1: W * 0.08, y1: H * 0.46, x2: W * 0.92, y2: H * 0.46, stroke: p.accent, sw: 0.6 },
    photo(c, 'photo', W * 0.08, H * 0.5, s * 0.8, s * 0.88, v.shape),
    T({ x: W * 0.08 + s * 0.9, y: H * 0.6, text: str(c, 'name'), size: H * 0.085, bold: true, color: p.ink, w: W * 0.84 - s * 0.9, fit: true, font: 'serif', field: 'name' }),
    T({ x: W * 0.08 + s * 0.9, y: H * 0.69, text: [str(c, 'role'), str(c, 'department')].filter(Boolean).join(' · '), size: H * 0.045, color: mix(p.ink, p.paper, 0.35), w: W * 0.84 - s * 0.9, maxLines: 2, font: 'serif', field: 'role' }),
    ...details(ctx, W * 0.08 + s * 0.9, H * 0.76, W * 0.84 - s * 0.9, H * 0.04, p.primary, p.ink, ['idNumber', 'expiryDate', 'extra']),
  ]
}

// ---------------------------------------------------------------------------
// Portrait compositions

function topPhoto(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const hh = H * 0.32
  const r = W * 0.24
  return [
    bgRect(ctx, p.paper),
    { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: W + 2 * ctx.bleed, h: hh + ctx.bleed, fill: p.primary },
    ...deco(v.deco, 0, 0, W, hh, onColor(p.primary)),
    ...logoOrMonogram(c, 'logo', 'org', W * 0.08, H * 0.04, W * 0.14, p.paper, 'circle'),
    T({ x: W * 0.08 + W * 0.18, y: H * 0.08, text: str(c, 'org'), size: W * 0.065, bold: true, color: onColor(p.primary), w: W * 0.64, fit: true, font: ctx.f.head }),
    { t: 'circle', cx: W / 2, cy: hh, r: r + W * 0.03, fill: p.paper },
    photo(c, 'photo', W / 2 - r, hh - r, r * 2, r * 2, v.shape === 'rect' ? 'rounded' : v.shape),
    ...nameBlock(ctx, W / 2, hh + r + H * 0.075, W * 0.86, W * 0.085, p.ink, p.primary, 'center', v.serif),
    ...pill(W / 2, hh + r + H * 0.16, str(c, 'cardType'), W * 0.038, p.accent, onColor(p.accent), 'center'),
    ...details(ctx, W * 0.1, H * 0.76, W * 0.84, W * 0.04, mix(p.ink, p.paper, 0.45), p.ink, ['idNumber', 'expiryDate']),
    { t: 'rect', x: -ctx.bleed, y: H - H * 0.035, w: W + 2 * ctx.bleed, h: H * 0.035 + ctx.bleed, fill: p.primary },
  ]
}

function lanyard(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  return [
    bgRect(ctx, p.primary),
    ...deco(v.deco, 0, H * 0.55, W, H * 0.45, onColor(p.primary), 0.18),
    { t: 'rect', x: W / 2 - W * 0.12, y: H * 0.035, w: W * 0.24, h: H * 0.022, r: H * 0.011, fill: mix(p.primary, '#000000', 0.35) },
    T({ x: W / 2, y: H * 0.13, text: str(c, 'org'), size: W * 0.06, bold: true, upper: true, ls: 1.5, color: onColor(p.primary), align: 'center', w: W * 0.86, fit: true }),
    { t: 'rect', x: W * 0.07, y: H * 0.18, w: W * 0.86, h: H * 0.62, r: W * 0.05, fill: p.paper },
    photo(c, 'photo', W / 2 - W * 0.19, H * 0.22, W * 0.38, W * 0.38, v.shape),
    T({ x: W / 2, y: H * 0.22 + W * 0.38 + H * 0.07, text: str(c, 'name'), size: W * 0.095, bold: true, color: p.ink, align: 'center', w: W * 0.78, fit: true, font: ctx.f.head, field: 'name' }),
    T({ x: W / 2, y: H * 0.22 + W * 0.38 + H * 0.115, text: str(c, 'role'), size: W * 0.048, color: mix(p.ink, p.paper, 0.4), align: 'center', w: W * 0.78, maxLines: 2, field: 'role' }),
    ...qr(c, W / 2 - W * 0.09, H * 0.66, W * 0.18, p.ink),
    T({ x: W / 2, y: H * 0.9, text: str(c, 'cardType'), size: W * 0.11, bold: true, upper: true, ls: 2, color: onColor(p.primary), align: 'center', w: W * 0.9, fit: true }),
  ]
}

function colorBlock(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const top = H * 0.55
  return [
    bgRect(ctx, p.paper),
    { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: W + 2 * ctx.bleed, h: top + ctx.bleed, fill: p.secondary },
    ...deco(v.deco, 0, 0, W, top, p.primary, 0.35),
    photo(c, 'photo', W * 0.18, H * 0.1, W * 0.64, top - H * 0.06, v.shape === 'circle' ? 'rounded' : v.shape),
    { t: 'rect', x: -ctx.bleed, y: top, w: W * 0.36 + ctx.bleed, h: H * 0.012, fill: p.accent },
    ...nameBlock(ctx, W * 0.08, top + H * 0.1, W * 0.84, W * 0.09, p.ink, mix(p.ink, p.paper, 0.4), 'left', v.serif),
    ...logoOrMonogram(c, 'logo', 'org', W * 0.08, H * 0.86, W * 0.1, p.primary, 'rounded'),
    T({ x: W * 0.21, y: H * 0.9, text: str(c, 'org'), size: W * 0.045, bold: true, color: p.ink, w: W * 0.5, fit: true }),
    T({ x: W * 0.92, y: H * 0.9, text: str(c, 'idNumber'), size: W * 0.04, color: p.primary, align: 'right', font: 'mono' }),
  ]
}

function sideStripe(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const sw = W * 0.2
  return [
    bgRect(ctx, p.paper),
    { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: sw + ctx.bleed, h: H + 2 * ctx.bleed, fill: p.primary },
    ...deco(v.deco, 0, 0, sw, H, onColor(p.primary)),
    { t: 'group', cx: sw / 2, cy: H / 2, rot: -90, children: [T({ x: sw / 2, y: H / 2 + sw * 0.13, text: str(c, 'org'), size: sw * 0.34, bold: true, upper: true, ls: 2, color: onColor(p.primary), align: 'center', w: H * 0.86, fit: true })] },
    photo(c, 'photo', sw + W * 0.1, H * 0.08, W * 0.6, W * 0.6 * 1.15, v.shape),
    ...nameBlock(ctx, sw + W * 0.1, H * 0.08 + W * 0.69 + H * 0.06, W * 0.66, W * 0.085, p.ink, p.primary, 'left', v.serif),
    ...pill(sw + W * 0.1, H * 0.66, str(c, 'cardType'), W * 0.036, p.accent, onColor(p.accent)),
    ...details(ctx, sw + W * 0.1, H * 0.74, W * 0.66, W * 0.04, mix(p.ink, p.paper, 0.45), p.ink, ['idNumber', 'expiryDate']),
    ...logoOrMonogram(c, 'logo', 'org', W - W * 0.17, H * 0.02 + H * 0.005, W * 0.13, p.accent, 'circle'),
  ]
}

function visitor(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  return [
    bgRect(ctx, p.paper),
    { t: 'rect', x: -ctx.bleed, y: H * 0.62, w: W + 2 * ctx.bleed, h: H * 0.38 + ctx.bleed, fill: p.primary },
    ...deco(v.deco, 0, H * 0.62, W, H * 0.38, onColor(p.primary)),
    ...logoOrMonogram(c, 'logo', 'org', W / 2 - W * 0.09, H * 0.05, W * 0.18, p.primary, 'circle'),
    T({ x: W / 2, y: H * 0.23, text: str(c, 'org'), size: W * 0.06, bold: true, color: p.ink, align: 'center', w: W * 0.86, fit: true }),
    photo(c, 'photo', W / 2 - W * 0.16, H * 0.27, W * 0.32, W * 0.32, v.shape),
    T({ x: W / 2, y: H * 0.27 + W * 0.32 + H * 0.06, text: str(c, 'name'), size: W * 0.085, bold: true, color: p.ink, align: 'center', w: W * 0.86, fit: true, font: ctx.f.head, field: 'name' }),
    T({ x: W / 2, y: H * 0.27 + W * 0.32 + H * 0.1, text: str(c, 'role'), size: W * 0.045, color: mix(p.ink, p.paper, 0.4), align: 'center', w: W * 0.86, maxLines: 1, field: 'role' }),
    T({ x: W / 2, y: H * 0.78, text: str(c, 'cardType') || 'Visitor', size: W * 0.16, bold: true, upper: true, ls: 2, color: onColor(p.primary), align: 'center', w: W * 0.9, fit: true }),
    T({ x: W / 2, y: H * 0.88, text: [str(c, 'issueDate') && fmtDate(str(c, 'issueDate')), str(c, 'idNumber')].filter(Boolean).join('  ·  '), size: W * 0.042, color: onColor(p.primary), align: 'center', font: 'mono' }),
  ]
}

function minimalPortrait(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  return [
    bgRect(ctx, p.paper),
    ...deco(v.deco, 0, 0, W, H * 0.4, p.primary, 0.08),
    ...logoOrMonogram(c, 'logo', 'org', W * 0.1, H * 0.06, W * 0.12, p.ink, 'rounded'),
    T({ x: W * 0.9, y: H * 0.1, text: str(c, 'cardType'), size: W * 0.04, upper: true, ls: 1.5, bold: true, color: p.accent, align: 'right' }),
    photo(c, 'photo', W * 0.1, H * 0.2, W * 0.8, W * 0.8 * 0.95, v.shape),
    T({ x: W * 0.1, y: H * 0.2 + W * 0.76 + H * 0.09, text: str(c, 'name'), size: W * 0.09, bold: !v.serif, color: p.ink, w: W * 0.8, fit: true, font: v.serif ? 'serif' : ctx.f.head, field: 'name' }),
    T({ x: W * 0.1, y: H * 0.2 + W * 0.76 + H * 0.14, text: str(c, 'role'), size: W * 0.045, color: mix(p.ink, p.paper, 0.45), w: W * 0.8, maxLines: 2, field: 'role' }),
    { t: 'line', x1: W * 0.1, y1: H * 0.86, x2: W * 0.9, y2: H * 0.86, stroke: mix(p.ink, p.paper, 0.8), sw: 0.6 },
    T({ x: W * 0.1, y: H * 0.92, text: str(c, 'org'), size: W * 0.04, bold: true, color: p.ink, w: W * 0.5, fit: true }),
    T({ x: W * 0.9, y: H * 0.92, text: str(c, 'idNumber'), size: W * 0.04, color: mix(p.ink, p.paper, 0.4), align: 'right', font: 'mono' }),
  ]
}

function conference(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  return [
    bgRect(ctx, p.paper),
    { t: 'path', d: wave(-ctx.bleed, W + ctx.bleed, H * 0.24, H * 0.03, 2, -ctx.bleed), fill: p.primary },
    { t: 'path', d: wave(-ctx.bleed, W + ctx.bleed, H * 0.2, H * 0.025, 3, -ctx.bleed), fill: p.accent, opacity: 0.55 },
    ...deco(v.deco, 0, 0, W, H * 0.18, onColor(p.primary)),
    T({ x: W * 0.08, y: H * 0.09, text: str(c, 'org'), size: W * 0.065, bold: true, color: onColor(p.primary), w: W * 0.84, fit: true, font: ctx.f.head }),
    T({ x: W * 0.08, y: H * 0.14, text: str(c, 'department'), size: W * 0.04, color: onColor(p.primary), w: W * 0.84, maxLines: 1, opacity: 0.85 }),
    photo(c, 'photo', W * 0.08, H * 0.32, W * 0.3, W * 0.3, v.shape),
    T({ x: W * 0.08, y: H * 0.32 + W * 0.3 + H * 0.08, text: str(c, 'name'), size: W * 0.11, bold: true, color: p.ink, w: W * 0.84, fit: true, font: ctx.f.head, field: 'name' }),
    T({ x: W * 0.08, y: H * 0.32 + W * 0.3 + H * 0.13, text: str(c, 'role'), size: W * 0.05, color: p.primary, w: W * 0.84, maxLines: 2, bold: true, field: 'role' }),
    ...qr(c, W * 0.62, H * 0.32, W * 0.3, p.ink),
    { t: 'rect', x: -ctx.bleed, y: H * 0.86, w: W + 2 * ctx.bleed, h: H * 0.14 + ctx.bleed, fill: p.secondary },
    T({ x: W / 2, y: H * 0.945, text: str(c, 'cardType'), size: W * 0.065, bold: true, upper: true, ls: 2, color: onColor(p.secondary), align: 'center', w: W * 0.9, fit: true }),
  ]
}

function membership(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const landscape = W > H
  const u = Math.min(W, H)
  return [
    bgRect(ctx, p.primary),
    ...deco(v.deco, 0, 0, W, H, onColor(p.primary), 0.16),
    { t: 'rect', x: W * 0.05, y: H * 0.07, w: W * 0.9, h: H * 0.86, r: u * 0.05, stroke: p.accent, sw: u * 0.008 },
    ...logoOrMonogram(c, 'logo', 'org', W * 0.09, H * 0.13, u * 0.16, p.accent, 'circle', v.serif ? 'serif' : 'sans'),
    T({ x: W * 0.09 + u * 0.2, y: H * 0.13 + u * 0.11, text: str(c, 'org'), size: u * 0.07, bold: true, color: onColor(p.primary), w: W * 0.6, fit: true, font: v.serif ? 'serif' : ctx.f.head }),
    T({ x: W * 0.09, y: H * (landscape ? 0.48 : 0.42), text: str(c, 'cardType') || 'Member', size: u * 0.05, upper: true, ls: 3, bold: true, color: p.accent }),
    T({ x: W * 0.09, y: H * (landscape ? 0.62 : 0.52), text: str(c, 'name'), size: u * 0.1, bold: true, color: onColor(p.primary), w: W * 0.58, fit: true, font: v.serif ? 'serif' : ctx.f.head, field: 'name' }),
    T({ x: W * 0.09, y: H * (landscape ? 0.84 : 0.88), text: str(c, 'idNumber'), size: u * 0.06, color: onColor(p.primary), font: 'mono', ls: 1.5, w: landscape ? W * 0.45 : W * 0.82, fit: true }),
    // Landscape: validity on the right of the ID number; portrait: stacked above it (the card is too narrow for both).
    T({
      x: landscape ? W * 0.91 : W * 0.09,
      y: H * (landscape ? 0.84 : 0.82),
      text: str(c, 'expiryDate') ? `Valid ${fmtDate(str(c, 'expiryDate'))}` : '',
      size: u * 0.045,
      color: onColor(p.primary),
      align: landscape ? 'right' : 'left',
      w: landscape ? W * 0.36 : W * 0.82,
      fit: true,
      opacity: 0.85,
    }),
    photo(c, 'photo', W * 0.91 - u * 0.3, H * (landscape ? 0.3 : 0.58), u * 0.3, u * (landscape ? 0.36 : 0.22) , v.shape),
  ]
}

// ---------------------------------------------------------------------------
// More compositions

/** Portrait: curved header, round photo overlapping the curve. */
function arcHeader(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const hh = H * 0.3
  const r = W * 0.2
  const b = ctx.bleed
  return [
    bgRect(ctx, p.paper),
    { t: 'path', d: `M${-b} ${-b}H${W + b}V${hh - H * 0.04}Q${W / 2} ${hh + H * 0.1} ${-b} ${hh - H * 0.04}Z`, fill: p.primary },
    ...deco(v.deco, 0, 0, W, hh * 0.8, onColor(p.primary), 0.18),
    ...logoOrMonogram(c, 'logo', 'org', W / 2 - W * 0.07, H * 0.035, W * 0.14, p.accent, 'circle'),
    T({ x: W / 2, y: H * 0.035 + W * 0.21, text: str(c, 'org'), size: W * 0.055, bold: true, color: onColor(p.primary), align: 'center', w: W * 0.8, fit: true, font: ctx.f.head }),
    { t: 'circle', cx: W / 2, cy: hh + H * 0.06, r: r + W * 0.025, fill: p.paper },
    { t: 'circle', cx: W / 2, cy: hh + H * 0.06, r: r + W * 0.012, stroke: p.accent, sw: W * 0.01 },
    photo(c, 'photo', W / 2 - r, hh + H * 0.06 - r, r * 2, r * 2, 'circle'),
    ...nameBlock(ctx, W / 2, hh + H * 0.06 + r + H * 0.08, W * 0.84, W * 0.08, p.ink, p.primary, 'center', v.serif),
    ...pill(W / 2, H * 0.665, str(c, 'cardType'), W * 0.036, p.primary, onColor(p.primary), 'center'),
    ...details(ctx, W * 0.14, H * 0.77, W * 0.76, W * 0.038, mix(p.ink, p.paper, 0.45), p.ink, ['idNumber', 'expiryDate']),
    { t: 'rect', x: -ctx.bleed, y: H * 0.93, w: W + 2 * ctx.bleed, h: H * 0.07 + ctx.bleed, fill: p.primary },
    { t: 'rect', x: -ctx.bleed, y: H * 0.93 - H * 0.012, w: W * 0.4 + ctx.bleed, h: H * 0.012, fill: p.accent },
  ]
}

/** Landscape: dark card, rounded photo left, light text right. */
function darkPanel(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const on = onColor(p.primary)
  const px = W * 0.06
  const pw = W * 0.27
  const x = px + pw + W * 0.06
  return [
    bgRect(ctx, p.primary),
    ...deco(v.deco, W * 0.45, 0, W * 0.55, H, on, 0.08),
    { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: W + 2 * ctx.bleed, h: H * 0.035 + ctx.bleed, fill: p.accent },
    photo(c, 'photo', px, H * 0.2, pw, H * 0.64, v.shape === 'circle' ? 'rounded' : v.shape, 'person', W * 0.03),
    ...logoOrMonogram(c, 'logo', 'org', x, H * 0.16, H * 0.12, p.accent, 'rounded'),
    T({ x: x + H * 0.16, y: H * 0.16 + H * 0.085, text: str(c, 'org'), size: H * 0.055, bold: true, upper: true, ls: 1, color: p.accent, w: W - x - H * 0.16 - W * 0.05, fit: true }),
    ...nameBlock(ctx, x, H * 0.5, W - x - W * 0.06, H * 0.1, on, mix(on, p.primary, 0.35), 'left', v.serif),
    ...details(ctx, x, H * 0.7, W - x - W * 0.06, H * 0.045, p.accent, on, ['idNumber', 'expiryDate']),
  ]
}

/** Portrait: corner ribbon, framed square photo, footer with organization. */
function ribbonCorner(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const b = ctx.bleed
  const ph = W * 0.5
  return [
    bgRect(ctx, p.paper),
    { t: 'path', d: `M${-b} ${H * 0.16}L${W * 0.36} ${-b}H${W * 0.52}L${-b} ${H * 0.26}Z`, fill: p.primary },
    { t: 'path', d: `M${W + b} ${H * 0.74}L${W * 0.64} ${H + b}H${W * 0.48}L${W + b} ${H * 0.84}Z`, fill: p.accent, opacity: 0.85 },
    ...pill(W * 0.92 - W * 0.36, H * 0.05, str(c, 'cardType'), W * 0.036, p.primary, onColor(p.primary)),
    { t: 'rect', x: W / 2 - ph / 2 - W * 0.02, y: H * 0.14 - W * 0.02, w: ph + W * 0.04, h: ph * 1.15 + W * 0.04, r: W * 0.03, fill: p.secondary },
    photo(c, 'photo', W / 2 - ph / 2, H * 0.14, ph, ph * 1.15, v.shape === 'circle' ? 'rounded' : v.shape),
    ...nameBlock(ctx, W / 2, H * 0.14 + ph * 1.15 + H * 0.08, W * 0.84, W * 0.08, p.ink, p.primary, 'center', v.serif),
    ...details(ctx, W * 0.12, H * 0.69, W * 0.8, W * 0.037, mix(p.ink, p.paper, 0.45), p.ink, ['idNumber', 'expiryDate']),
    ...logoOrMonogram(c, 'logo', 'org', W * 0.08, H * 0.87, W * 0.1, p.primary, 'rounded'),
    T({ x: W * 0.08 + W * 0.13, y: H * 0.87 + W * 0.065, text: str(c, 'org'), size: W * 0.045, bold: true, color: p.ink, w: W * 0.4, fit: true }),
  ]
}

/** Landscape: pill-shaped photo on the right, details grid on the left. */
function pillPhoto(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const pw = W * 0.26
  const ph = H * 0.72
  return [
    bgRect(ctx, p.secondary),
    ...deco(v.deco, 0, 0, W, H, p.primary, 0.12),
    { t: 'rect', x: W * 0.04, y: H * 0.06, w: W * 0.92, h: H * 0.88, r: H * 0.06, fill: p.paper },
    { t: 'rect', x: W * 0.92 - pw - W * 0.012, y: H * 0.14 - W * 0.012, w: pw + W * 0.024, h: ph + W * 0.024, r: pw / 2 + W * 0.012, fill: p.primary },
    photo(c, 'photo', W * 0.92 - pw, H * 0.14, pw, ph, 'rounded', 'person', pw / 2),
    ...logoOrMonogram(c, 'logo', 'org', W * 0.09, H * 0.14, H * 0.13, p.primary, 'circle'),
    T({ x: W * 0.09 + H * 0.17, y: H * 0.14 + H * 0.09, text: str(c, 'org'), size: H * 0.06, bold: true, color: p.primary, w: W * 0.4, fit: true }),
    ...nameBlock(ctx, W * 0.09, H * 0.46, W * 0.5, H * 0.095, p.ink, mix(p.ink, p.paper, 0.4), 'left', v.serif),
    ...details(ctx, W * 0.09, H * 0.66, W * 0.52, H * 0.043, p.primary, p.ink, ['idNumber', 'expiryDate', 'extra']),
  ]
}

/** Landscape: colour band across the middle carrying the name, round photo on the band. */
function stripeBand(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const by = H * 0.34
  const bh = H * 0.3
  const r = H * 0.22
  const cx = W * 0.2
  const on = onColor(p.primary)
  return [
    bgRect(ctx, p.paper),
    { t: 'rect', x: -ctx.bleed, y: by, w: W + 2 * ctx.bleed, h: bh, fill: p.primary },
    ...deco(v.deco, W * 0.4, by, W * 0.6, bh, on, 0.14),
    ...logoOrMonogram(c, 'logo', 'org', W * 0.06, H * 0.08, H * 0.14, p.primary, 'rounded'),
    T({ x: W * 0.06 + H * 0.19, y: H * 0.08 + H * 0.095, text: str(c, 'org'), size: H * 0.06, bold: true, color: p.ink, w: W * 0.5, fit: true, font: ctx.f.head }),
    ...pill(W * 0.94 - W * 0.22, H * 0.09, str(c, 'cardType'), H * 0.04, p.accent, onColor(p.accent)),
    { t: 'circle', cx, cy: by + bh / 2, r: r + H * 0.025, fill: p.paper },
    photo(c, 'photo', cx - r, by + bh / 2 - r, r * 2, r * 2, 'circle'),
    T({ x: cx + r + W * 0.06, y: by + bh * 0.52, text: str(c, 'name'), size: H * 0.1, bold: true, color: on, w: W * 0.58, fit: true, font: v.serif ? 'serif' : ctx.f.head, field: 'name' }),
    T({ x: cx + r + W * 0.06, y: by + bh * 0.52 + H * 0.085, text: str(c, 'role'), size: H * 0.05, color: on, w: W * 0.58, fit: true, opacity: 0.85, field: 'role' }),
    ...details(ctx, cx + r + W * 0.06, H * 0.74, W * 0.58, H * 0.042, mix(p.ink, p.paper, 0.45), p.ink, ['idNumber', 'expiryDate']),
  ]
}

/** Portrait: bold card type set large in a top band, like a press or staff pass. */
function pressPass(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const bh = H * 0.2
  const on = onColor(p.primary)
  const pw = W * 0.48
  return [
    bgRect(ctx, p.paper),
    { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: W + 2 * ctx.bleed, h: bh + ctx.bleed, fill: p.primary },
    ...deco(v.deco, 0, 0, W, bh, on, 0.14),
    T({ x: W * 0.08, y: bh * 0.4, text: str(c, 'org'), size: W * 0.045, bold: true, upper: true, ls: 1, color: on, w: W * 0.84, fit: true, opacity: 0.85 }),
    T({ x: W * 0.08, y: bh * 0.82, text: str(c, 'cardType') || 'Staff', size: W * 0.13, bold: true, upper: true, ls: 2, color: on, w: W * 0.84, fit: true, font: ctx.f.head }),
    { t: 'rect', x: -ctx.bleed, y: bh, w: W + 2 * ctx.bleed, h: H * 0.012, fill: p.accent },
    photo(c, 'photo', W * 0.08, bh + H * 0.06, pw, pw * 1.2, v.shape === 'circle' ? 'rounded' : v.shape),
    ...logoOrMonogram(c, 'logo', 'org', W * 0.92 - W * 0.2, bh + H * 0.06, W * 0.2, p.primary, 'rounded'),
    ...nameBlock(ctx, W * 0.08, bh + H * 0.06 + pw * 1.2 + H * 0.075, W * 0.84, W * 0.08, p.ink, p.primary, 'left', v.serif),
    ...details(ctx, W * 0.08, H * 0.82, W * 0.84, W * 0.037, mix(p.ink, p.paper, 0.45), p.ink, ['idNumber', 'expiryDate']),
  ]
}

/** Landscape: diagonal two-tone split with the photo on the seam. */
function diagonalSplit(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c } = ctx
  const b = ctx.bleed
  const r = H * 0.25
  const cx = W * 0.3
  const cy = H * 0.5
  const on = onColor(p.primary)
  return [
    bgRect(ctx, p.paper),
    { t: 'path', d: `M${-b} ${-b}H${W * 0.42}L${W * 0.2} ${H + b}H${-b}Z`, fill: p.primary },
    ...deco(v.deco, 0, 0, W * 0.32, H, on, 0.16),
    ...logoOrMonogram(c, 'logo', 'org', W * 0.05, H * 0.08, H * 0.13, p.paper, 'circle'),
    { t: 'circle', cx, cy, r: r + H * 0.025, fill: p.accent },
    photo(c, 'photo', cx - r, cy - r, r * 2, r * 2, 'circle'),
    T({ x: W * 0.94, y: H * 0.16, text: str(c, 'org'), size: H * 0.055, bold: true, upper: true, ls: 1, color: p.primary, align: 'right', w: W * 0.4, fit: true }),
    ...nameBlock(ctx, cx + r + W * 0.06, H * 0.44, W * 0.94 - cx - r - W * 0.06, H * 0.095, p.ink, p.primary, 'left', v.serif),
    ...details(ctx, cx + r + W * 0.06, H * 0.68, W * 0.94 - cx - r - W * 0.06, H * 0.042, mix(p.ink, p.paper, 0.45), p.ink, ['idNumber', 'expiryDate']),
  ]
}

/** WCAG contrast ratio between two colours. */
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

// ---------------------------------------------------------------------------
// Back of card

function back(ctx: RenderCtx, style: 'plain' | 'band' | 'qr-center' | 'framed'): El[] {
  const { W, H, p, c } = ctx
  const u = Math.min(W, H)
  const portrait = H > W
  const qrSize = u * (style === 'qr-center' ? 0.42 : 0.3)
  const els: El[] = [bgRect(ctx, style === 'band' ? p.paper : mix(p.paper, p.primary, 0.04))]
  if (style === 'band') els.push({ t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: W + 2 * ctx.bleed, h: H * 0.16 + ctx.bleed, fill: p.primary })
  if (style === 'framed') els.push({ t: 'rect', x: u * 0.05, y: u * 0.05, w: W - u * 0.1, h: H - u * 0.1, stroke: p.primary, sw: u * 0.006, r: u * 0.03 })
  const top = style === 'band' ? H * 0.24 : u * 0.12
  // Labels use the main colour unless it would vanish into the background (dark cards).
  const backBg = style === 'band' ? p.paper : mix(p.paper, p.primary, 0.04)
  const labelColor = contrast(p.primary, backBg) >= 3 ? p.primary : p.accent
  // Landscape backs put the QR code beside the text; portrait backs put it below.
  const textW = portrait ? W * 0.84 : W * 0.84 - qrSize - u * 0.06
  let y = top
  for (const [label, key] of [
    ['Address', 'address'],
    ['Phone', 'phone'],
    ['Email', 'email'],
    ['Issued', 'issueDate'],
  ] as const) {
    const value = key === 'issueDate' ? fmtDate(str(c, key)) : str(c, key)
    const r = labelValue({ x: W * 0.08, y, label, value, w: textW, size: u * 0.045, labelColor, color: p.ink })
    els.push(...r.els)
    y = r.next
  }
  const note = str(c, 'backNote')
  if (note) els.push(T({ x: W * 0.08, y: y + u * 0.05, text: note, size: u * 0.038, color: mix(p.ink, p.paper, 0.4), w: textW, maxLines: 4, italic: true }))
  const qx = portrait ? W / 2 - qrSize / 2 : W * 0.92 - qrSize
  const qy = portrait ? H - qrSize - u * 0.1 : (style === 'qr-center' ? H * 0.46 : H / 2) - qrSize / 2
  // Always dark on white, so the code scans whatever the card colours are.
  els.push(...qr(c, qx, qy, qrSize, '#111827', '#FFFFFF'))
  els.push(T({ x: W / 2, y: H - u * 0.04, text: 'Design template · not an official document', size: u * 0.028, color: mix(p.ink, p.paper, 0.6), align: 'center' }))
  return els
}

// ---------------------------------------------------------------------------
// Templates

const P = (primary: string, secondary: string, accent: string, ink = '#111827', paper = '#FFFFFF'): Palette => ({ primary, secondary, accent, ink, paper })

type Comp = (ctx: RenderCtx, v: V) => El[]

function def(
  id: string,
  name: string,
  family: string,
  tags: string[],
  orientation: 'landscape' | 'portrait',
  comp: Comp,
  v: V & { mirror?: boolean },
  palette: Palette,
  backStyle: 'plain' | 'band' | 'qr-center' | 'framed',
  head: 'sans' | 'serif' = 'sans'
): TemplateDef {
  return {
    id,
    name,
    family,
    tags,
    orientation,
    palette,
    fonts: { head, body: 'sans' },
    render: (ctx) => {
      const front = comp(ctx, v)
      return [page(v.mirror ? mirrorEls(front, ctx.W) : front, 'Front'), page(back(ctx, backStyle), 'Back')]
    },
  }
}

export const ID_TEMPLATES: TemplateDef[] = [
  def('id-corporate-sidebar', 'Corporate Sidebar', 'Minimal corporate', ['employee', 'corporate', 'staff'], 'landscape', sidebar, { deco: 'none', shape: 'rounded' }, P('#1E3A5F', '#E8EEF5', '#F5A623'), 'band'),
  def('id-tech-sidebar', 'Tech Dots', 'Modern geometric', ['employee', 'startup', 'tech'], 'landscape', sidebar, { mirror: true, deco: 'dots', shape: 'circle' }, P('#111827', '#E5E7EB', '#10B981'), 'qr-center'),
  def('id-header-band', 'Classic Header', 'Minimal corporate', ['employee', 'staff', 'professional'], 'landscape', headerBand, { deco: 'none', shape: 'rect' }, P('#0F4C81', '#DCE8F5', '#E53935'), 'plain'),
  def('id-header-stripes', 'Striped Header', 'Bold color-block', ['employee', 'retail', 'staff'], 'landscape', headerBand, { mirror: true, deco: 'stripes', shape: 'rounded' }, P('#B91C1C', '#FEE2E2', '#111827'), 'band'),
  def('id-split-photo', 'Photo Split', 'Photo-focused', ['employee', 'creative', 'professional'], 'landscape', split, { deco: 'triangles', shape: 'rect' }, P('#7C3AED', '#EDE9FE', '#F59E0B'), 'framed'),
  def('id-split-wave', 'Wave Split', 'Photo-focused', ['volunteer', 'club', 'membership'], 'landscape', split, { mirror: true, deco: 'waves', shape: 'rect' }, P('#0E7490', '#CFFAFE', '#F97316'), 'qr-center'),
  def('id-minimal-line', 'Minimal Line', 'Modern minimal', ['employee', 'professional', 'minimal'], 'landscape', minimal, { deco: 'none', shape: 'rounded' }, P('#111827', '#F3F4F6', '#E53935'), 'plain'),
  def('id-minimal-serif', 'Quiet Serif', 'Elegant professional', ['professional', 'law', 'consulting'], 'landscape', minimal, { mirror: true, deco: 'guilloche', shape: 'rect', serif: true }, P('#3F2A1E', '#F5EFE6', '#B08D57', '#1F1A17', '#FFFDF8'), 'framed', 'serif'),
  def('id-geo-diagonal', 'Diagonal Geometry', 'Modern geometric', ['employee', 'startup', 'event'], 'landscape', geometric, { deco: 'dots', shape: 'circle' }, P('#2563EB', '#DBEAFE', '#FACC15'), 'qr-center'),
  def('id-geo-hex', 'Hex Grid', 'Modern geometric', ['tech', 'engineering', 'staff'], 'landscape', geometric, { mirror: true, deco: 'hex', shape: 'circle' }, P('#065F46', '#D1FAE5', '#34D399'), 'band'),
  def('id-footer-barcode', 'Barcode Footer', 'Bold color-block', ['employee', 'warehouse', 'retail'], 'landscape', footerBand, { deco: 'none', shape: 'rect' }, P('#1F2937', '#F59E0B', '#F59E0B'), 'plain'),
  def('id-footer-rings', 'Rings Footer', 'Bold color-block', ['membership', 'club', 'gym'], 'landscape', footerBand, { mirror: true, deco: 'rings', shape: 'rounded' }, P('#9D174D', '#FBCFE8', '#F472B6'), 'framed'),
  def('id-academic-crest', 'Academic Crest', 'Academic', ['student', 'school', 'university'], 'landscape', academic, { deco: 'none', shape: 'rect', serif: true }, P('#7F1D1D', '#FEF2F2', '#B45309', '#1C1917', '#FFFBF5'), 'framed', 'serif'),
  def('id-academic-guilloche', 'University Guilloché', 'Academic', ['university', 'student', 'faculty'], 'landscape', academic, { mirror: true, deco: 'guilloche', shape: 'rounded', serif: true }, P('#1E3A8A', '#EFF6FF', '#CA8A04'), 'plain', 'serif'),
  def('id-portrait-top', 'Portrait Classic', 'Minimal corporate', ['employee', 'hospital', 'staff'], 'portrait', topPhoto, { deco: 'none', shape: 'circle' }, P('#0369A1', '#E0F2FE', '#22C55E'), 'band'),
  def('id-portrait-chevron', 'Chevron Portrait', 'Bold color-block', ['student', 'school', 'sports'], 'portrait', topPhoto, { mirror: true, deco: 'chevrons', shape: 'circle' }, P('#EA580C', '#FFEDD5', '#1D4ED8'), 'qr-center'),
  def('id-lanyard-event', 'Event Lanyard', 'Event badge', ['event', 'conference', 'badge'], 'portrait', lanyard, { deco: 'waves', shape: 'circle' }, P('#4338CA', '#E0E7FF', '#F472B6'), 'qr-center'),
  def('id-lanyard-volunteer', 'Volunteer Badge', 'Event badge', ['volunteer', 'event', 'charity'], 'portrait', lanyard, { mirror: true, deco: 'blobs', shape: 'rounded' }, P('#15803D', '#DCFCE7', '#FDE047'), 'plain'),
  def('id-color-block', 'Color Block', 'Bold color-block', ['creative', 'agency', 'staff'], 'portrait', colorBlock, { deco: 'blobs', shape: 'rect' }, P('#DB2777', '#FCE7F3', '#0F172A'), 'framed'),
  def('id-color-block-tri', 'Mosaic Portrait', 'Photo-focused', ['student', 'college', 'club'], 'portrait', colorBlock, { mirror: true, deco: 'triangles', shape: 'rounded' }, P('#0D9488', '#99F6E4', '#F59E0B'), 'band'),
  def('id-side-stripe', 'Vertical Stripe', 'Modern geometric', ['employee', 'corporate', 'security'], 'portrait', sideStripe, { deco: 'none', shape: 'rect' }, P('#111827', '#E5E7EB', '#EF4444'), 'plain'),
  def('id-visitor', 'Visitor Pass', 'Visitor', ['visitor', 'guest', 'contractor'], 'portrait', visitor, { deco: 'stripes', shape: 'circle' }, P('#DC2626', '#FEE2E2', '#111827'), 'plain'),
  def('id-minimal-portrait', 'Gallery Minimal', 'Modern minimal', ['creative', 'museum', 'professional'], 'portrait', minimalPortrait, { deco: 'none', shape: 'rect', serif: true }, P('#111827', '#F9FAFB', '#E53935'), 'framed', 'serif'),
  def('id-conference', 'Conference Pass', 'Event badge', ['conference', 'event', 'speaker'], 'portrait', conference, { deco: 'dots', shape: 'rounded' }, P('#1D4ED8', '#0F172A', '#38BDF8'), 'qr-center'),
  def('id-membership-gold', 'Premium Member', 'Elegant professional', ['membership', 'club', 'premium'], 'landscape', membership, { deco: 'guilloche', shape: 'circle', serif: true }, P('#0B1F33', '#13293D', '#D4AF37', '#F8F5EC', '#0B1F33'), 'framed', 'serif'),
  def('id-membership-gym', 'Club Card', 'Bold color-block', ['gym', 'club', 'membership'], 'portrait', membership, { mirror: true, deco: 'chevrons', shape: 'rounded' }, P('#18181B', '#27272A', '#A3E635', '#FAFAFA', '#18181B'), 'band'),
  def('id-arc-blue', 'Arc Header', 'Modern geometric', ['employee', 'hospital', 'staff'], 'portrait', arcHeader, { deco: 'dots', shape: 'circle' }, P('#1D4ED8', '#DBEAFE', '#F59E0B'), 'plain'),
  def('id-arc-plum', 'Plum Arc', 'Elegant professional', ['school', 'faculty', 'student'], 'portrait', arcHeader, { mirror: true, deco: 'none', shape: 'circle', serif: true }, P('#6B21A8', '#F3E8FF', '#F0ABFC'), 'framed', 'serif'),
  def('id-dark-teal', 'Night Shift', 'Bold color-block', ['security', 'operations', 'staff'], 'landscape', darkPanel, { deco: 'hex', shape: 'rounded' }, P('#0F172A', '#1E293B', '#2DD4BF'), 'band'),
  def('id-dark-crimson', 'Crimson Night', 'Bold color-block', ['events', 'crew', 'backstage'], 'landscape', darkPanel, { mirror: true, deco: 'stripes', shape: 'rect' }, P('#1C1917', '#292524', '#F43F5E'), 'plain'),
  def('id-ribbon-coral', 'Coral Ribbon', 'Modern geometric', ['volunteer', 'nonprofit', 'event'], 'portrait', ribbonCorner, { deco: 'none', shape: 'rounded' }, P('#E85D4A', '#FFE4DE', '#F6B93B'), 'qr-center'),
  def('id-ribbon-navy', 'Navy Ribbon', 'Minimal corporate', ['employee', 'bank', 'corporate'], 'portrait', ribbonCorner, { mirror: true, deco: 'none', shape: 'rect' }, P('#1E3A5F', '#E2E8F0', '#38BDF8'), 'band'),
  def('id-pill-lilac', 'Lilac Pill', 'Photo-focused', ['creative', 'design', 'studio'], 'landscape', pillPhoto, { deco: 'dots', shape: 'rounded' }, P('#7C3AED', '#EDE9FE', '#F472B6'), 'framed'),
  def('id-pill-sage', 'Sage Pill', 'Photo-focused', ['wellness', 'clinic', 'care'], 'landscape', pillPhoto, { mirror: true, deco: 'blobs', shape: 'rounded', serif: true }, P('#3F6212', '#ECFCCB', '#CA8A04', '#1A2E05', '#FFFFFF'), 'plain', 'serif'),
  def('id-band-ocean', 'Ocean Band', 'Bold color-block', ['employee', 'logistics', 'retail'], 'landscape', stripeBand, { deco: 'waves', shape: 'circle' }, P('#0369A1', '#E0F2FE', '#FACC15'), 'qr-center'),
  def('id-band-rust', 'Rust Band', 'Bold color-block', ['factory', 'workshop', 'trades'], 'landscape', stripeBand, { mirror: true, deco: 'chevrons', shape: 'circle' }, P('#9A3412', '#FFEDD5', '#1E293B'), 'band'),
  def('id-press-black', 'Press Pass', 'Event badge', ['press', 'media', 'event'], 'portrait', pressPass, { deco: 'none', shape: 'rect' }, P('#111827', '#F3F4F6', '#EF4444'), 'plain'),
  def('id-press-violet', 'Crew Pass', 'Event badge', ['crew', 'festival', 'production'], 'portrait', pressPass, { mirror: true, deco: 'triangles', shape: 'rounded' }, P('#5B21B6', '#EDE9FE', '#22D3EE'), 'qr-center'),
  def('id-seam-green', 'Diagonal Seam', 'Modern geometric', ['student', 'university', 'campus'], 'landscape', diagonalSplit, { deco: 'dots', shape: 'circle' }, P('#15803D', '#DCFCE7', '#FACC15'), 'band'),
  def('id-seam-magenta', 'Magenta Seam', 'Modern geometric', ['startup', 'agency', 'creative'], 'landscape', diagonalSplit, { mirror: true, deco: 'rings', shape: 'circle' }, P('#BE185D', '#FCE7F3', '#1E293B'), 'framed'),
]
