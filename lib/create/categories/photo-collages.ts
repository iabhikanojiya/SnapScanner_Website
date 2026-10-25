// Photo Collage Maker: 26 templates built from distinct slot layouts, text
// placements and frame styles. Slots are defined as fractions of the photo
// area, so every layout adapts to the chosen canvas size.
import { T, mix, onColor, type El, type FontFamily } from '../engine'
import { dotGrid, heart, stripes, tape } from '../decor'
import { MM, bgRect, img, page, str, type Content, type FieldDef, type Palette, type RenderCtx, type SizeOption, type TemplateDef } from '../kit'

export const MAX_SLOTS = 9
export const slotKey = (i: number) => `photo${i + 1}`

export const COLLAGE_FIELDS: FieldDef[] = [
  { key: 'heading', label: 'Heading', type: 'text', group: 'Text', maxLength: 60 },
  { key: 'subheading', label: 'Subheading', type: 'text', group: 'Text', maxLength: 80 },
  { key: 'caption', label: 'Caption', type: 'textarea', group: 'Text', maxLength: 160 },
  { key: 'bgColor', label: 'Background color', type: 'color', group: 'Style', hint: 'Leave empty to use the template background.' },
  {
    key: 'spacing',
    label: 'Spacing',
    type: 'select',
    group: 'Style',
    options: [
      { value: 'none', label: 'None' },
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' },
    ],
  },
  {
    key: 'border',
    label: 'Photo border',
    type: 'select',
    group: 'Style',
    options: [
      { value: 'none', label: 'None' },
      { value: 'thin', label: 'Thin' },
      { value: 'thick', label: 'Thick' },
    ],
  },
  { key: 'borderColor', label: 'Border color', type: 'color', group: 'Style' },
  {
    key: 'corners',
    label: 'Corners',
    type: 'select',
    group: 'Style',
    options: [
      { value: 'square', label: 'Square' },
      { value: 'rounded', label: 'Rounded' },
      { value: 'round', label: 'Extra round' },
    ],
  },
]

export const COLLAGE_SAMPLE: Content = {
  heading: 'Summer 2026',
  subheading: 'Road trip along the coast',
  caption: 'Sunsets, salty air and the best company.',
  bgColor: '',
}

export const COLLAGE_SIZES: SizeOption[] = [
  { id: 'square', label: 'Square post (1080 × 1080 px)', w: 1080, h: 1080, orientation: 'square' },
  { id: 'portrait-45', label: 'Portrait post 4:5 (1080 × 1350 px)', w: 1080, h: 1350, orientation: 'portrait' },
  { id: 'story', label: 'Story 9:16 (1080 × 1920 px)', w: 1080, h: 1920, orientation: 'portrait' },
  { id: 'landscape-169', label: 'Landscape 16:9 (1920 × 1080 px)', w: 1920, h: 1080, orientation: 'landscape' },
  { id: 'print-4x6-l', label: 'Photo print 6 × 4 in, landscape', w: 6 * 72, h: 4 * 72, orientation: 'landscape' },
  { id: 'print-4x6-p', label: 'Photo print 4 × 6 in, portrait', w: 4 * 72, h: 6 * 72, orientation: 'portrait' },
  { id: 'a4-p', label: 'A4 portrait (210 × 297 mm)', w: 210 * MM, h: 297 * MM, orientation: 'portrait' },
  { id: 'a4-l', label: 'A4 landscape (297 × 210 mm)', w: 297 * MM, h: 210 * MM, orientation: 'landscape' },
]

// ---------------------------------------------------------------------------
// Layouts: [x, y, w, h] fractions of the photo area; optional rotation (deg).

type Slot = [number, number, number, number, number?]

const rows = (spec: number[], heights?: number[]): Slot[] => {
  const total = heights?.reduce((a, b) => a + b, 0) ?? spec.length
  const out: Slot[] = []
  let y = 0
  spec.forEach((n, r) => {
    const h = (heights?.[r] ?? 1) / total
    for (let i = 0; i < n; i++) out.push([i / n, y, 1 / n, h])
    y += h
  })
  return out
}
const cols = (spec: number[], widths?: number[]): Slot[] => rows(spec, widths).map(([x, y, w, h]) => [y, x, h, w])

export const LAYOUTS: Record<string, Slot[]> = {
  duo: cols([1, 1]),
  duoStack: rows([1, 1]),
  trioLeft: [
    [0, 0, 0.6, 1],
    [0.6, 0, 0.4, 0.5],
    [0.6, 0.5, 0.4, 0.5],
  ],
  trioColumns: cols([1, 1, 1]),
  trioTop: [
    [0, 0, 1, 0.6],
    [0, 0.6, 0.5, 0.4],
    [0.5, 0.6, 0.5, 0.4],
  ],
  quad: rows([2, 2]),
  quadFeature: [
    [0, 0, 1, 0.62],
    [0, 0.62, 1 / 3, 0.38],
    [1 / 3, 0.62, 1 / 3, 0.38],
    [2 / 3, 0.62, 1 / 3, 0.38],
  ],
  quadSide: [
    [0, 0, 0.66, 1],
    [0.66, 0, 0.34, 1 / 3],
    [0.66, 1 / 3, 0.34, 1 / 3],
    [0.66, 2 / 3, 0.34, 1 / 3],
  ],
  quadStrips: rows([1, 1, 1, 1]),
  five: rows([2, 3], [1.3, 1]),
  fiveMosaic: [
    [0, 0, 0.5, 0.6],
    [0.5, 0, 0.5, 0.35],
    [0.5, 0.35, 0.5, 0.25],
    [0, 0.6, 0.35, 0.4],
    [0.35, 0.6, 0.65, 0.4],
  ],
  fiveCenter: [
    [0.25, 0.25, 0.5, 0.5],
    [0, 0, 0.5, 0.25],
    [0.5, 0, 0.5, 0.25],
    [0, 0.75, 0.5, 0.25],
    [0.5, 0.75, 0.5, 0.25],
  ],
  six: rows([3, 3]),
  sixTall: rows([2, 2, 2]),
  sixMosaic: [
    [0, 0, 0.5, 0.5],
    [0.5, 0, 0.25, 0.25],
    [0.75, 0, 0.25, 0.25],
    [0.5, 0.25, 0.5, 0.25],
    [0, 0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5, 0.5],
  ],
  seven: [
    [0, 0, 0.5, 0.5],
    [0.5, 0, 0.5, 0.5],
    [0, 0.5, 0.25, 0.25],
    [0.25, 0.5, 0.25, 0.25],
    [0, 0.75, 0.5, 0.25],
    [0.5, 0.5, 0.5, 0.25],
    [0.5, 0.75, 0.5, 0.25],
  ],
  nine: rows([3, 3, 3]),
  scatter3: [
    [0.03, 0.08, 0.5, 0.52, -6],
    [0.46, 0.02, 0.5, 0.52, 5],
    [0.24, 0.44, 0.52, 0.54, -2],
  ],
  scatter4: [
    [0.02, 0.02, 0.48, 0.47, -5],
    [0.5, 0.04, 0.48, 0.47, 4],
    [0.03, 0.5, 0.48, 0.47, 3],
    [0.49, 0.51, 0.48, 0.47, -4],
  ],
  scatter5: [
    [0.02, 0.03, 0.42, 0.4, -7],
    [0.55, 0.02, 0.42, 0.4, 6],
    [0.29, 0.3, 0.42, 0.4, -1],
    [0.03, 0.57, 0.42, 0.4, 5],
    [0.55, 0.58, 0.42, 0.4, -5],
  ],
  film4: rows([1, 1, 1, 1]),
  circles: [
    [0.25, 0.22, 0.5, 0.56],
    [0, 0, 0.3, 0.33],
    [0.7, 0, 0.3, 0.33],
    [0, 0.67, 0.3, 0.33],
    [0.7, 0.67, 0.3, 0.33],
  ],
  heroTwo: [
    [0, 0, 1, 0.7],
    [0, 0.7, 0.5, 0.3],
    [0.5, 0.7, 0.5, 0.3],
  ],
  storyThree: rows([1, 1, 1], [1.2, 1, 1.2]),
  steps: [
    [0, 0, 0.4, 0.45],
    [0.3, 0.28, 0.4, 0.45],
    [0.6, 0.55, 0.4, 0.45],
  ],
}

// ---------------------------------------------------------------------------
// Rendering

type TextPos = 'top' | 'bottom' | 'overlay' | 'side' | 'none'
type Frame = 'plain' | 'polaroid' | 'film' | 'tape' | 'circle'
type Bg = 'solid' | 'dots' | 'stripes' | 'hearts' | 'split' | 'paper'

interface V {
  layout: keyof typeof LAYOUTS
  text: TextPos
  frame?: Frame
  bg?: Bg
  /** Default spacing, border and corners (overridden by the style fields). */
  spacing?: 'none' | 'small' | 'medium' | 'large'
  border?: 'none' | 'thin' | 'thick'
  corners?: 'square' | 'rounded' | 'round'
  headFont?: FontFamily
  headItalic?: boolean
  upper?: boolean
}

const SPACING = { none: 0, small: 0.012, medium: 0.025, large: 0.045 }
const BORDER = { none: 0, thin: 0.006, thick: 0.016 }
const RADIUS = { square: 0, rounded: 0.03, round: 0.08 }

function pick<T extends string>(c: Content, key: string, allowed: Record<T, unknown>, fallback: T): T {
  const v = str(c, key)
  return (v in allowed ? v : fallback) as T
}

function renderCollage(ctx: RenderCtx, v: V): El[] {
  const { W, H, p, c, f } = ctx
  const u = Math.min(W, H)
  const bg = /^#[0-9a-f]{6}$/i.test(str(c, 'bgColor')) ? str(c, 'bgColor') : p.paper
  const gap = SPACING[pick(c, 'spacing', SPACING, v.spacing ?? 'small')] * u
  const borderW = BORDER[pick(c, 'border', BORDER, v.border ?? 'none')] * u
  const borderColor = /^#[0-9a-f]{6}$/i.test(str(c, 'borderColor')) ? str(c, 'borderColor') : '#FFFFFF'
  const radius = RADIUS[pick(c, 'corners', RADIUS, v.corners ?? 'square')] * u
  const ink = onColor(bg, p.ink)
  const els: El[] = [bgRect(ctx, bg)]

  // Background decoration.
  if (v.bg === 'dots') els.push({ t: 'path', d: dotGrid(0, 0, W, H, u * 0.035, u * 0.004), fill: mix(bg, ink, 0.18) })
  if (v.bg === 'stripes') els.push({ t: 'path', d: stripes(0, 0, W, H, u * 0.06, u * 0.02), fill: mix(bg, p.secondary, 0.6) })
  if (v.bg === 'split') els.push({ t: 'rect', x: 0, y: H * 0.55, w: W, h: H * 0.45 + ctx.bleed, fill: p.primary })
  if (v.bg === 'paper') els.push({ t: 'rect', x: u * 0.02, y: u * 0.02, w: W - u * 0.04, h: H - u * 0.04, stroke: mix(bg, ink, 0.25), sw: u * 0.002, dash: [u * 0.012, u * 0.008] })
  if (v.bg === 'hearts')
    for (let i = 0; i < 14; i++) {
      const hx = ((i * 0.618) % 1) * W
      const hy = ((i * 0.381 + 0.13) % 1) * H
      els.push({ t: 'path', d: heart(hx, hy, u * (0.025 + (i % 3) * 0.01)), fill: p.accent, opacity: 0.25 })
    }

  // Text block and the remaining photo area.
  const outer = Math.max(gap, u * (v.frame === 'polaroid' || v.frame === 'tape' ? 0.04 : 0.02))
  let area = { x: outer, y: outer, w: W - 2 * outer, h: H - 2 * outer }
  const heading = str(c, 'heading')
  const sub = str(c, 'subheading')
  const caption = str(c, 'caption')
  const hasText = !!(heading.trim() || sub.trim() || caption.trim())
  const hs = u * 0.075
  const headColor = v.bg === 'split' && v.text === 'bottom' ? onColor(p.primary) : p.primary
  const textEls = (x: number, y: number, w: number, align: 'left' | 'center', color = headColor, sc = ink): { els: El[]; h: number } => {
    const out: El[] = []
    let yy = y
    if (heading.trim()) {
      out.push(T({ x, y: yy + hs * 0.85, text: heading, size: hs, bold: !v.headItalic, italic: v.headItalic, upper: v.upper, ls: v.upper ? hs * 0.06 : 0, font: v.headFont ?? f.head, color, align, w, fit: true, field: 'heading' }))
      yy += hs * 1.15
    }
    if (sub.trim()) {
      out.push(T({ x, y: yy + hs * 0.45, text: sub, size: hs * 0.42, color: sc, align, w, fit: true, opacity: 0.85 }))
      yy += hs * 0.65
    }
    if (caption.trim()) {
      const capEl = T({ x, y: yy + hs * 0.4, text: caption, size: hs * 0.34, color: sc, align, w, maxLines: 3, opacity: 0.8 })
      out.push(capEl)
      yy += hs * 0.4 + (capEl.t === 'text' ? (capEl.lines.length - 1) * capEl.lh : 0) + hs * 0.2
    }
    return { els: out, h: yy - y }
  }
  if (hasText && v.text === 'top') {
    const t = textEls(W / 2, outer, W - 2 * outer, 'center')
    els.push(...t.els)
    area = { ...area, y: outer + t.h + outer * 0.8, h: H - outer * 2.8 - t.h }
  } else if (hasText && v.text === 'bottom') {
    const probe = textEls(0, 0, W - 2 * outer, 'center')
    area = { ...area, h: H - outer * 2.8 - probe.h }
    els.push(...textEls(W / 2, area.y + area.h + outer * 0.8, W - 2 * outer, 'center').els)
  } else if (hasText && v.text === 'side') {
    const sw = W * 0.32
    area = { ...area, x: outer + sw + outer, w: W - sw - outer * 3 }
    const t = textEls(outer, 0, sw, 'left')
    els.push({ t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: outer + sw + outer * 0.5 + ctx.bleed, h: H + 2 * ctx.bleed, fill: p.primary })
    els.push(...textEls(outer, H / 2 - t.h / 2, sw - outer * 0.5, 'left', onColor(p.primary), onColor(p.primary)).els)
  }

  // Photo slots.
  const slots = LAYOUTS[v.layout]
  const pol = v.frame === 'polaroid'
  slots.forEach(([fx, fy, fw, fh, rot], i) => {
    const x = area.x + fx * area.w + gap / 2
    const y = area.y + fy * area.h + gap / 2
    const w = fw * area.w - gap
    const h = fh * area.h - gap
    const key = `photo${i + 1}`
    const group: El[] = []
    let ix = x
    let iy = y
    let iw = w
    let ih = h
    if (pol) {
      const pad = Math.min(w, h) * 0.05
      group.push({ t: 'rect', x: x + u * 0.004, y: y + u * 0.006, w, h, fill: '#000000', opacity: 0.12 }, { t: 'rect', x, y, w, h, fill: '#FFFFFF' })
      ix = x + pad
      iy = y + pad
      iw = w - 2 * pad
      ih = h - pad * 4.2
    } else if (v.frame === 'film') {
      group.push({ t: 'rect', x, y, w, h, fill: '#111111' })
      const hole = Math.min(w, h) * 0.05
      for (let k = 0; k < 12; k++) {
        const hx = x + ((k + 0.25) / 12) * w
        group.push({ t: 'rect', x: hx, y: y + hole * 0.5, w: hole, h: hole * 0.8, r: hole * 0.15, fill: '#F5F5F5' }, { t: 'rect', x: hx, y: y + h - hole * 1.3, w: hole, h: hole * 0.8, r: hole * 0.15, fill: '#F5F5F5' })
      }
      ix = x + hole * 0.6
      iy = y + hole * 2
      iw = w - hole * 1.2
      ih = h - hole * 4
    } else if (borderW > 0) {
      group.push({ t: 'rect', x, y, w, h, fill: borderColor, r: radius ? radius + borderW : 0 })
      ix = x + borderW
      iy = y + borderW
      iw = w - 2 * borderW
      ih = h - 2 * borderW
    }
    const circle = v.frame === 'circle'
    const shape = circle ? 'circle' : radius && !pol && v.frame !== 'film' ? 'rounded' : 'rect'
    if (circle && borderW > 0) {
      group.length = 0
      const r = Math.min(w, h) / 2
      group.push({ t: 'circle', cx: x + w / 2, cy: y + h / 2, r, fill: borderColor })
    }
    group.push({ t: 'image', x: ix, y: iy, w: Math.max(1, iw), h: Math.max(1, ih), shape, r: radius, image: img(c, key), placeholder: 'photo', fit: 'cover', field: key })
    if (v.frame === 'tape') group.push({ t: 'path', d: tape(x + w / 2, y + u * 0.004, Math.min(w * 0.35, u * 0.14), u * 0.035), fill: p.accent, opacity: 0.75 })
    if (rot) els.push({ t: 'group', cx: x + w / 2, cy: y + h / 2, rot, children: group })
    else els.push(...group)
  })

  if (hasText && v.text === 'overlay') {
    const bh = Math.max(hs * 2.2, textEls(0, 0, W, 'left').h + outer * 1.4)
    els.push({ t: 'rect', x: -ctx.bleed, y: H - bh - outer, w: W * 0.82 + ctx.bleed, h: bh, fill: p.primary, opacity: 0.92 })
    els.push(...textEls(outer * 1.6, H - bh - outer + outer * 0.7, W * 0.82 - outer * 2.6, 'left', onColor(p.primary), onColor(p.primary)).els)
  }
  return els
}

function def(id: string, name: string, family: string, tags: string[], orientation: 'landscape' | 'portrait' | 'square', v: V, palette: Palette, head: FontFamily = 'sans'): TemplateDef {
  return { id, name, family, tags, orientation, palette, fonts: { head, body: 'sans' }, slots: LAYOUTS[v.layout].length, unused: v.text === 'none' ? ['heading', 'subheading', 'caption'] : undefined, render: (ctx) => [page(renderCollage(ctx, v))] }
}

const P = (primary: string, secondary: string, accent: string, ink = '#111827', paper = '#FFFFFF'): Palette => ({ primary, secondary, accent, ink, paper })

export const COLLAGE_TEMPLATES: TemplateDef[] = [
  def('col-duo-side', 'Side by Side', 'Grid', ['before and after', 'comparison', 'couple'], 'landscape', { layout: 'duo', text: 'bottom', spacing: 'small' }, P('#111827', '#F3F4F6', '#E53935')),
  def('col-duo-stack', 'Stacked Pair', 'Grid', ['story', 'then and now', 'pair'], 'portrait', { layout: 'duoStack', text: 'overlay', spacing: 'none' }, P('#0F172A', '#E2E8F0', '#38BDF8')),
  def('col-trio-left', 'Feature Left', 'Editorial', ['travel', 'blog', 'feature'], 'landscape', { layout: 'trioLeft', text: 'top', spacing: 'medium', corners: 'rounded' }, P('#0E7490', '#ECFEFF', '#F97316', '#0F172A', '#F8FAFC'), 'serif'),
  def('col-trio-columns', 'Three Columns', 'Grid', ['triptych', 'product', 'portfolio'], 'landscape', { layout: 'trioColumns', text: 'bottom', spacing: 'large', bg: 'paper' }, P('#7C2D12', '#FFEDD5', '#EA580C', '#1C1917', '#FFF7ED'), 'serif'),
  def('col-trio-top', 'Hero and Two', 'Editorial', ['event', 'recap', 'party'], 'portrait', { layout: 'trioTop', text: 'top', spacing: 'small', upper: true }, P('#BE185D', '#FCE7F3', '#7C3AED')),
  def('col-quad-grid', 'Classic Grid', 'Grid', ['family', 'friends', 'memories'], 'square', { layout: 'quad', text: 'none', spacing: 'small', border: 'thin' }, P('#111827', '#F3F4F6', '#F59E0B', '#111827', '#F3F4F6')),
  def('col-quad-feature', 'Feature and Three', 'Editorial', ['real estate', 'product', 'listing'], 'portrait', { layout: 'quadFeature', text: 'bottom', spacing: 'small', bg: 'split' }, P('#1E3A5F', '#E2E8F0', '#F5A623')),
  def('col-quad-side', 'Feature Column', 'Editorial', ['fashion', 'lookbook', 'style'], 'landscape', { layout: 'quadSide', text: 'side', spacing: 'small', upper: true }, P('#18181B', '#F4F4F5', '#F43F5E')),
  def('col-quad-film', 'Film Strip', 'Retro', ['photobooth', 'retro', 'party'], 'portrait', { layout: 'film4', text: 'bottom', frame: 'film', spacing: 'none' }, P('#DC2626', '#FEE2E2', '#111827', '#111827', '#FAFAF9'), 'mono'),
  def('col-quad-strips', 'Panorama Strips', 'Grid', ['landscape', 'travel', 'nature'], 'portrait', { layout: 'quadStrips', text: 'top', spacing: 'medium', corners: 'round', bg: 'dots' }, P('#15803D', '#DCFCE7', '#84CC16', '#14532D', '#F7FEE7')),
  def('col-five-rows', 'Five Grid', 'Grid', ['team', 'class', 'group'], 'square', { layout: 'five', text: 'top', spacing: 'small', corners: 'rounded' }, P('#4338CA', '#EEF2FF', '#F472B6')),
  def('col-five-mosaic', 'Mosaic', 'Mosaic', ['travel', 'adventure', 'moodboard'], 'square', { layout: 'fiveMosaic', text: 'overlay', spacing: 'small' }, P('#0369A1', '#E0F2FE', '#22C55E')),
  def('col-five-center', 'Center Stage', 'Mosaic', ['birthday', 'celebration', 'portrait'], 'portrait', { layout: 'fiveCenter', text: 'none', spacing: 'medium', border: 'thick', bg: 'hearts' }, P('#DB2777', '#FCE7F3', '#F472B6', '#111827', '#FFF1F2')),
  def('col-six-grid', 'Six Grid', 'Grid', ['portfolio', 'gallery', 'products'], 'landscape', { layout: 'six', text: 'top', spacing: 'small' }, P('#111827', '#F3F4F6', '#2563EB', '#111827', '#FFFFFF'), 'serif'),
  def('col-six-tall', 'Tall Six', 'Grid', ['story', 'recipe', 'steps'], 'portrait', { layout: 'sixTall', text: 'bottom', spacing: 'medium', corners: 'rounded', bg: 'stripes' }, P('#B45309', '#FEF3C7', '#0EA5E9', '#1C1917', '#FFFBEB')),
  def('col-six-mosaic', 'Modern Mosaic', 'Mosaic', ['interior', 'architecture', 'design'], 'square', { layout: 'sixMosaic', text: 'none', spacing: 'none' }, P('#18181B', '#F4F4F5', '#A1A1AA')),
  def('col-seven', 'Busy Week', 'Mosaic', ['week', 'diary', 'highlights'], 'portrait', { layout: 'seven', text: 'top', spacing: 'small', upper: true }, P('#0F766E', '#CCFBF1', '#F59E0B')),
  def('col-nine', 'Nine Grid', 'Grid', ['instagram', 'gallery', 'year in review'], 'square', { layout: 'nine', text: 'none', spacing: 'small', border: 'none' }, P('#111827', '#F3F4F6', '#E53935', '#111827', '#FFFFFF')),
  def('col-nine-framed', 'Framed Nine', 'Grid', ['year in review', 'memories', 'family'], 'portrait', { layout: 'nine', text: 'bottom', spacing: 'medium', border: 'thin', corners: 'rounded', bg: 'paper' }, P('#7C3AED', '#EDE9FE', '#FBBF24', '#1F2937', '#FAF5FF'), 'serif'),
  def('col-polaroid-3', 'Polaroid Trio', 'Scrapbook', ['scrapbook', 'vacation', 'friends'], 'square', { layout: 'scatter3', text: 'bottom', frame: 'polaroid', bg: 'dots', headItalic: true }, P('#9A3412', '#FFEDD5', '#F97316', '#292524', '#FAF3E8'), 'serif'),
  def('col-polaroid-4', 'Polaroid Board', 'Scrapbook', ['moodboard', 'memories', 'wedding'], 'landscape', { layout: 'scatter4', text: 'none', frame: 'polaroid', bg: 'solid' }, P('#78350F', '#FEF3C7', '#D97706', '#1C1917', '#E7D8C4')),
  def('col-tape-5', 'Taped Memories', 'Scrapbook', ['journal', 'scrapbook', 'travel'], 'portrait', { layout: 'scatter5', text: 'top', frame: 'tape', bg: 'paper', headItalic: true }, P('#BE123C', '#FFE4E6', '#FDA4AF', '#1F2937', '#FFFBF5'), 'serif'),
  def('col-circles', 'Circle Bubbles', 'Playful', ['kids', 'baby', 'pets'], 'square', { layout: 'circles', text: 'none', frame: 'circle', border: 'thick', bg: 'dots' }, P('#2563EB', '#DBEAFE', '#FACC15', '#1E3A8A', '#EFF6FF')),
  def('col-hero-two', 'Big Moment', 'Editorial', ['wedding', 'graduation', 'announcement'], 'portrait', { layout: 'heroTwo', text: 'overlay', spacing: 'small', border: 'none' }, P('#111827', '#F3F4F6', '#D4AF37', '#111827', '#FFFFFF'), 'serif'),
  def('col-story-three', 'Story Trio', 'Story', ['story', 'social', 'highlights'], 'portrait', { layout: 'storyThree', text: 'top', spacing: 'large', corners: 'round', upper: true }, P('#F43F5E', '#FFE4E6', '#FB923C', '#FFFFFF', '#1F2937')),
  def('col-steps', 'Cascade', 'Playful', ['process', 'growth', 'journey'], 'landscape', { layout: 'steps', text: 'side', spacing: 'small', border: 'thick', corners: 'rounded' }, P('#065F46', '#D1FAE5', '#FBBF24', '#064E3B', '#ECFDF5')),
]
