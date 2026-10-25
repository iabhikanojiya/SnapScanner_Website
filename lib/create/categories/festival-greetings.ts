// Festival Greeting Maker: greeting cards and social posts for Diwali, New
// Year, Christmas, Holi, Eid, Raksha Bandhan and other festivals. Every motif
// (diyas, lanterns, rangoli, fireworks, kites…) is original generated geometry.
// Empty greeting, subline and message fields fall back to each template's own
// wording, so switching from a Diwali to a Christmas template changes the text too.
import { T, measure, mix, textHeight, type El, type FontFamily, type ImageValue } from '../engine'
import { blob, cornerOrnament, dotGrid, rings, seal, star } from '../decor'
import { MM, bgRect, bool, img, page, photo, str, type Content, type FieldDef, type Palette, type RenderCtx, type SizeOption, type TemplateDef } from '../kit'

export const GREETING_FIELDS: FieldDef[] = [
  { key: 'greeting', label: 'Greeting', type: 'text', group: 'Greeting', maxLength: 40, placeholder: 'The template’s greeting, e.g. Happy Diwali', hint: 'Leave blank to use the template’s own greeting.' },
  { key: 'subline', label: 'Subheading', type: 'text', group: 'Greeting', maxLength: 60, placeholder: 'The template’s subheading', hint: 'Leave blank to use the template’s own subheading.' },
  { key: 'showSubline', label: 'Show subheading', type: 'toggle', group: 'Greeting' },
  { key: 'message', label: 'Message', type: 'textarea', group: 'Greeting', maxLength: 220, placeholder: 'The template’s message', hint: 'Leave blank to use the template’s own wishes.' },
  { key: 'showMessage', label: 'Show message', type: 'toggle', group: 'Greeting' },
  { key: 'from', label: 'Sign-off', type: 'text', group: 'Greeting', maxLength: 60, placeholder: 'With love, the Sharma family' },
  { key: 'year', label: 'Year', type: 'text', group: 'Greeting', maxLength: 12, hint: 'Shown on New Year and Lunar New Year templates.' },
  { key: 'photo', label: 'Photo', type: 'image', group: 'Photo and branding', imageKind: 'photo', hint: 'Shown on the photo templates.' },
  { key: 'logo', label: 'Logo', type: 'image', group: 'Photo and branding', imageKind: 'logo', hint: 'Optional, for business greetings.' },
  { key: 'contact', label: 'Contact line', type: 'text', group: 'Photo and branding', maxLength: 70, placeholder: 'www.example.com · +91 98765 43210', hint: 'Optional, for business greetings.' },
]

export const GREETING_SAMPLE: Content = {
  greeting: '',
  subline: '',
  showSubline: true,
  message: '',
  showMessage: true,
  from: 'With love, the Sharma family',
  year: '2027',
  contact: '',
}

export const GREETING_SIZES: SizeOption[] = [
  { id: 'square', label: 'Square post (1080 × 1080 px)', w: 1080, h: 1080, orientation: 'square' },
  { id: 'portrait-45', label: 'Portrait post 4:5 (1080 × 1350 px)', w: 1080, h: 1350, orientation: 'portrait' },
  { id: 'story', label: 'Story / WhatsApp status 9:16 (1080 × 1920 px)', w: 1080, h: 1920, orientation: 'portrait' },
  { id: 'card-a5', label: 'Greeting card A5 (148 × 210 mm)', w: 148 * MM, h: 210 * MM, orientation: 'portrait' },
  { id: 'landscape-169', label: 'Banner 16:9 (1920 × 1080 px)', w: 1920, h: 1080, orientation: 'landscape' },
  { id: 'card-7x5', label: 'Greeting card 7 × 5 in, landscape', w: 7 * 72, h: 5 * 72, orientation: 'landscape' },
]

/** Sizes defined in pixels, exported at exactly that many pixels. */
export const GREETING_PIXEL_SIZES = ['square', 'portrait-45', 'story', 'landscape-169']

// ---------------------------------------------------------------------------
// Festivals and their default wording

interface Festival {
  greeting: string
  subline: string
  message: string
}

const FEST = {
  diwali: { greeting: 'Happy Diwali', subline: 'Festival of Lights', message: 'May the glow of a thousand diyas fill your home with joy, peace and prosperity.' },
  newYear: { greeting: 'Happy New Year', subline: 'Cheers to new beginnings', message: 'Wishing you twelve months of good health, happiness and success.' },
  christmas: { greeting: 'Merry Christmas', subline: 'Season’s Greetings', message: 'Wishing you a season full of warmth, laughter and the company of loved ones.' },
  holi: { greeting: 'Happy Holi', subline: 'Festival of Colours', message: 'May your life be as bright and colourful as the colours of Holi.' },
  eid: { greeting: 'Eid Mubarak', subline: 'Blessings to you and your family', message: 'May this Eid bring peace, happiness and prosperity to your home.' },
  ramadan: { greeting: 'Ramadan Kareem', subline: 'A blessed month to you', message: 'Wishing you a peaceful month of reflection, kindness and togetherness.' },
  rakhi: { greeting: 'Happy Raksha Bandhan', subline: 'A bond of love and protection', message: 'Celebrating the beautiful bond between brothers and sisters.' },
  ganesh: { greeting: 'Happy Ganesh Chaturthi', subline: 'Ganpati Bappa Morya', message: 'May this festival remove every obstacle and bring wisdom and good fortune.' },
  navratri: { greeting: 'Happy Navratri', subline: 'Nine nights of celebration', message: 'May the nine nights of dance and devotion fill your life with strength and joy.' },
  dussehra: { greeting: 'Happy Dussehra', subline: 'Victory of good over evil', message: 'May this Vijayadashami bring you courage, success and new victories.' },
  sankranti: { greeting: 'Happy Makar Sankranti', subline: 'Let your dreams fly high', message: 'Wishing you a sweet harvest season and skies full of colourful kites.' },
  pongal: { greeting: 'Happy Pongal', subline: 'A season of harvest and gratitude', message: 'May your home overflow with happiness, just like the Pongal pot.' },
  onam: { greeting: 'Happy Onam', subline: 'Celebrating harvest and home', message: 'May this Onam bring prosperity, good health and togetherness.' },
  lohri: { greeting: 'Happy Lohri', subline: 'Warmth, joy and togetherness', message: 'May the bonfire of Lohri bring warmth and happiness to your home.' },
  easter: { greeting: 'Happy Easter', subline: 'Joy, hope and new life', message: 'Wishing you a spring season filled with hope, joy and colour.' },
  thanksgiving: { greeting: 'Happy Thanksgiving', subline: 'Grateful for you', message: 'Wishing you a table full of good food and a heart full of gratitude.' },
  lunar: { greeting: 'Happy Lunar New Year', subline: 'Good fortune and prosperity', message: 'Wishing you luck, health and abundance in the year ahead.' },
  hanukkah: { greeting: 'Happy Hanukkah', subline: 'Eight nights of light', message: 'May the lights of Hanukkah bring warmth and joy to your home.' },
} satisfies Record<string, Festival>

type FestId = keyof typeof FEST

// ---------------------------------------------------------------------------
// Geometry helpers

const f = (n: number) => n.toFixed(2)
const unit = (ctx: RenderCtx) => Math.min(ctx.W, ctx.H) / 100

/** Deterministic pseudo-random numbers, so a template always looks the same. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const poly = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}Z`
const arcPts = (cx: number, cy: number, r: number, a0: number, a1: number, n = 32): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  })
const ellipse = (cx: number, cy: number, rx: number, ry: number) => poly(Array.from({ length: 48 }, (_, i) => [cx + Math.cos((i / 48) * Math.PI * 2) * rx, cy + Math.sin((i / 48) * Math.PI * 2) * ry]))

/** Four-pointed sparkle. */
function sparkle(cx: number, cy: number, r: number) {
  return `M${f(cx)} ${f(cy - r)} Q${f(cx)} ${f(cy)} ${f(cx + r)} ${f(cy)} Q${f(cx)} ${f(cy)} ${f(cx)} ${f(cy + r)} Q${f(cx)} ${f(cy)} ${f(cx - r)} ${f(cy)} Q${f(cx)} ${f(cy)} ${f(cx)} ${f(cy - r)}Z`
}

function flame(cx: number, bottom: number, w: number, h: number) {
  return `M${f(cx)} ${f(bottom - h)} C${f(cx + w * 0.75)} ${f(bottom - h * 0.45)} ${f(cx + w * 0.55)} ${f(bottom)} ${f(cx)} ${f(bottom)} C${f(cx - w * 0.55)} ${f(bottom)} ${f(cx - w * 0.75)} ${f(bottom - h * 0.45)} ${f(cx)} ${f(bottom - h)}Z`
}

/** A clay oil lamp with its flame. `y` is the bottom of the bowl. */
function diya(cx: number, y: number, s: number, bowl: string, flameColor: string, glow: string): El[] {
  const top = y - s * 0.5
  const body = `M${f(cx - s)} ${f(top)} L${f(cx + s * 1.3)} ${f(top - s * 0.2)} L${f(cx + s)} ${f(top + s * 0.1)} Q${f(cx + s * 0.6)} ${f(y)} ${f(cx)} ${f(y)} Q${f(cx - s * 0.6)} ${f(y)} ${f(cx - s)} ${f(top)}Z`
  return [
    { t: 'circle', cx, cy: top - s * 0.55, r: s * 0.95, fill: glow, opacity: 0.22 },
    { t: 'path', d: body, fill: bowl },
    { t: 'rect', x: cx - s, y: top - s * 0.06, w: s * 2, h: s * 0.14, r: s * 0.07, fill: mix(bowl, '#FFFFFF', 0.25) },
    { t: 'path', d: flame(cx + s * 0.05, top - s * 0.02, s * 0.42, s * 1.2), fill: flameColor },
    { t: 'path', d: flame(cx + s * 0.05, top - s * 0.04, s * 0.2, s * 0.6), fill: '#FFF7D6' },
  ]
}

/** Firework burst: rays and dots. */
function burst(cx: number, cy: number, r: number, rays: number, color: string, sw: number): El[] {
  let lines = ''
  let dots = ''
  for (let i = 0; i < rays; i++) {
    const a = (Math.PI * 2 * i) / rays
    const c = Math.cos(a)
    const s = Math.sin(a)
    lines += `M${f(cx + c * r * 0.3)} ${f(cy + s * r * 0.3)} L${f(cx + c * r * 0.85)} ${f(cy + s * r * 0.85)}`
    const dx = cx + c * r
    const dy = cy + s * r
    dots += `M${f(dx - sw)} ${f(dy)}a${f(sw)} ${f(sw)} 0 1 0 ${f(2 * sw)} 0a${f(sw)} ${f(sw)} 0 1 0 ${f(-2 * sw)} 0Z`
  }
  return [
    { t: 'path', d: lines, stroke: color, sw },
    { t: 'path', d: dots, fill: color },
  ]
}

function sparkles(n: number, seed: number, box: { x: number; y: number; w: number; h: number }, r: number, color: string): El {
  const rand = rng(seed)
  let d = ''
  for (let i = 0; i < n; i++) d += sparkle(box.x + rand() * box.w, box.y + rand() * box.h, r * (0.4 + rand() * 0.8))
  return { t: 'path', d, fill: color }
}

/** Layered rangoli made of petals, rings and dots. */
function rangoli(cx: number, cy: number, r: number, p: Palette): El[] {
  return [
    { t: 'path', d: seal(cx, cy, r, 16, 0.2), fill: p.accent },
    { t: 'circle', cx, cy, r: r * 0.78, fill: p.paper },
    { t: 'path', d: seal(cx, cy, r * 0.72, 8, 0.45), fill: p.primary },
    { t: 'circle', cx, cy, r: r * 0.36, fill: p.secondary },
    { t: 'path', d: seal(cx, cy, r * 0.3, 6, 0.5), fill: p.accent },
    { t: 'circle', cx, cy, r: r * 0.08, fill: p.paper },
    { t: 'path', d: rings(cx, cy, r * 1.08, r * 0.1, 2), stroke: p.primary, sw: r * 0.02 },
  ]
}

type LanternStyle = 'kandil' | 'fanous' | 'round'

/** A lantern hanging from the top edge on a string of length `drop`. */
function lantern(style: LanternStyle, cx: number, drop: number, w: number, p: Palette, sw: number): El[] {
  const h = w * (style === 'round' ? 0.85 : 1.35)
  const top = drop
  const els: El[] = [{ t: 'line', x1: cx, y1: 0, x2: cx, y2: top, stroke: p.accent, sw }]
  if (style === 'kandil') {
    els.push(
      { t: 'path', d: poly([[cx - w * 0.2, top], [cx + w * 0.2, top], [cx + w / 2, top + h * 0.3], [cx + w * 0.2, top + h * 0.62], [cx - w * 0.2, top + h * 0.62], [cx - w / 2, top + h * 0.3]]), fill: p.primary },
      { t: 'path', d: poly([[cx, top + h * 0.06], [cx + w * 0.22, top + h * 0.3], [cx, top + h * 0.55], [cx - w * 0.22, top + h * 0.3]]), fill: p.accent },
      { t: 'path', d: Array.from({ length: 5 }, (_, i) => `M${f(cx - w * 0.16 + (i * w * 0.32) / 4)} ${f(top + h * 0.62)} L${f(cx - w * 0.2 + (i * w * 0.4) / 4)} ${f(top + h)}`).join(''), stroke: p.secondary, sw: sw * 1.4 }
    )
  } else if (style === 'fanous') {
    els.push(
      { t: 'path', d: poly([...arcPts(cx, top + w * 0.3, w * 0.3, Math.PI, Math.PI * 2, 16), [cx + w * 0.3, top + w * 0.3]]), fill: p.primary },
      { t: 'path', d: poly([[cx - w * 0.38, top + w * 0.3], [cx + w * 0.38, top + w * 0.3], [cx + w * 0.3, top + h * 0.85], [cx - w * 0.3, top + h * 0.85]]), fill: p.primary },
      { t: 'path', d: poly([[cx - w * 0.22, top + w * 0.4], [cx + w * 0.22, top + w * 0.4], [cx + w * 0.17, top + h * 0.78], [cx - w * 0.17, top + h * 0.78]]), fill: p.accent, opacity: 0.85 },
      { t: 'path', d: flame(cx, top + h * 0.72, w * 0.08, w * 0.22), fill: p.paper },
      { t: 'rect', x: cx - w * 0.36, y: top + h * 0.85, w: w * 0.72, h: h * 0.08, fill: p.secondary },
      { t: 'path', d: poly([[cx - w * 0.06, top - w * 0.02], [cx + w * 0.06, top - w * 0.02], [cx, top - w * 0.14]]), fill: p.secondary }
    )
  } else {
    els.push(
      { t: 'rect', x: cx - w * 0.22, y: top, w: w * 0.44, h: h * 0.1, fill: p.accent },
      { t: 'path', d: ellipse(cx, top + h * 0.5, w / 2, h * 0.42), fill: p.primary },
      { t: 'path', d: [0.18, 0.36].map((k) => ellipse(cx, top + h * 0.5, w * k, h * 0.42)).join(''), stroke: p.accent, sw: sw * 0.8 },
      { t: 'rect', x: cx - w * 0.22, y: top + h * 0.9, w: w * 0.44, h: h * 0.1, fill: p.accent },
      { t: 'path', d: Array.from({ length: 3 }, (_, i) => `M${f(cx + (i - 1) * w * 0.08)} ${f(top + h)} L${f(cx + (i - 1) * w * 0.08)} ${f(top + h * 1.45)}`).join(''), stroke: p.accent, sw: sw * 1.2 }
    )
  }
  return els
}

/** Christmas tree of stacked triangles with baubles and a star. */
function tree(cx: number, top: number, h: number, p: Palette): El[] {
  const w = h * 0.62
  const tiers: string[] = []
  for (let i = 0; i < 3; i++) {
    const ty = top + h * 0.08 + i * h * 0.24
    const tw = w * (0.55 + i * 0.22)
    tiers.push(poly([[cx, ty], [cx + tw / 2, ty + h * 0.34], [cx - tw / 2, ty + h * 0.34]]))
  }
  const els: El[] = [
    { t: 'rect', x: cx - w * 0.07, y: top + h * 0.88, w: w * 0.14, h: h * 0.12, fill: p.secondary },
    { t: 'path', d: tiers.join(''), fill: p.primary },
    { t: 'path', d: star(cx, top + h * 0.06, h * 0.07), fill: p.accent },
  ]
  const rand = rng(7)
  for (let i = 0; i < 9; i++) {
    const t = 0.25 + rand() * 0.6
    const span = w * (0.2 + t * 0.6)
    els.push({ t: 'circle', cx: cx + (rand() - 0.5) * span, cy: top + h * t + h * 0.08, r: h * 0.025, fill: i % 2 ? p.accent : p.paper })
  }
  return els
}

function snowflake(cx: number, cy: number, r: number) {
  let d = ''
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * i) / 3
    const c = Math.cos(a)
    const s = Math.sin(a)
    d += `M${f(cx)} ${f(cy)} L${f(cx + c * r)} ${f(cy + s * r)}`
    const bx = cx + c * r * 0.6
    const by = cy + s * r * 0.6
    for (const side of [-1, 1]) {
      const b = a + (side * Math.PI) / 4
      d += `M${f(bx)} ${f(by)} L${f(bx + Math.cos(b) * r * 0.3)} ${f(by + Math.sin(b) * r * 0.3)}`
    }
  }
  return d
}

/** Crescent moon opening to the right, built from two circles' intersection. */
function crescent(cx: number, cy: number, r: number) {
  const d = r * 0.42
  const r2 = r * 0.82
  const cx2 = cx + d
  const cy2 = cy - r * 0.12
  const dx = cx2 - cx
  const dy = cy2 - cy
  const dist = Math.hypot(dx, dy)
  const a = (r * r - r2 * r2 + dist * dist) / (2 * dist)
  const hgt = Math.sqrt(Math.max(0, r * r - a * a))
  const mx = cx + (a * dx) / dist
  const my = cy + (a * dy) / dist
  const p1: [number, number] = [mx + (hgt * dy) / dist, my - (hgt * dx) / dist]
  const p2: [number, number] = [mx - (hgt * dy) / dist, my + (hgt * dx) / dist]
  const ang = (x: number, y: number, ox: number, oy: number) => Math.atan2(y - oy, x - ox)
  let o0 = ang(p1[0], p1[1], cx, cy)
  let o1 = ang(p2[0], p2[1], cx, cy)
  // Outer arc goes the long way round, through the left side.
  if (o1 < o0) o1 += Math.PI * 2
  if (o1 - o0 < Math.PI) [o0, o1] = [o1, o0 + Math.PI * 2]
  const outer = arcPts(cx, cy, r, o0, o1, 40)
  const start = outer[outer.length - 1]
  const end = outer[0]
  const i0 = ang(start[0], start[1], cx2, cy2)
  let i1 = ang(end[0], end[1], cx2, cy2)
  if (Math.abs(i1 - i0) > Math.PI) i1 += i1 < i0 ? Math.PI * 2 : -Math.PI * 2
  return poly([...outer, ...arcPts(cx2, cy2, r2, i0, i1, 40)])
}

/** Mosque skyline: domes and minarets along the bottom edge. */
function skyline(x: number, w: number, bottom: number, h: number) {
  const cx = x + w / 2
  const parts: string[] = []
  const dome = (dcx: number, base: number, r: number) => poly([[dcx - r, bottom], [dcx - r, base], ...arcPts(dcx, base, r, Math.PI, Math.PI * 2, 18), [dcx + r, bottom]])
  parts.push(dome(cx, bottom - h * 0.45, h * 0.28))
  parts.push(poly([[cx - h * 0.04, bottom - h * 0.73], [cx + h * 0.04, bottom - h * 0.73], [cx, bottom - h * 0.85]]))
  for (const side of [-1, 1]) {
    parts.push(dome(cx + side * h * 0.55, bottom - h * 0.25, h * 0.16))
    const mx = cx + side * h * 0.95
    parts.push(poly([[mx - h * 0.04, bottom], [mx - h * 0.04, bottom - h * 0.8], [mx, bottom - h], [mx + h * 0.04, bottom - h * 0.8], [mx + h * 0.04, bottom]]))
  }
  parts.push(poly([[x, bottom], [x, bottom - h * 0.12], [x + w, bottom - h * 0.12], [x + w, bottom]]))
  return parts.join('')
}

/** Garland of marigolds with mango leaves, sagging between two points. */
function toran(x0: number, x1: number, y: number, sag: number, flower: number, p: Palette, sw: number): El[] {
  const n = Math.max(6, Math.round((x1 - x0) / (flower * 2.4)))
  const pts: [number, number][] = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    return [x0 + (x1 - x0) * t, y + sag * 4 * t * (1 - t)]
  })
  const els: El[] = [{ t: 'path', d: `M${pts.map(([px, py]) => `${f(px)} ${f(py)}`).join(' L')}`, stroke: p.secondary, sw }]
  let leaves = ''
  pts.forEach(([px, py], i) => {
    if (i % 2 === 1) leaves += `M${f(px)} ${f(py)} Q${f(px + flower * 0.6)} ${f(py + flower * 1.3)} ${f(px)} ${f(py + flower * 2.4)} Q${f(px - flower * 0.6)} ${f(py + flower * 1.3)} ${f(px)} ${f(py)}Z`
  })
  els.push({ t: 'path', d: leaves, fill: p.secondary })
  pts.forEach(([px, py], i) => {
    els.push({ t: 'path', d: seal(px, py, flower, 12, 0.3), fill: i % 2 ? p.accent : p.primary })
    els.push({ t: 'circle', cx: px, cy: py, r: flower * 0.3, fill: mix(i % 2 ? p.accent : p.primary, '#000000', 0.2) })
  })
  return els
}

function kite(cx: number, cy: number, s: number, rot: number, fill: string, accent: string, sw: number): El {
  return {
    t: 'group',
    cx,
    cy,
    rot,
    children: [
      { t: 'path', d: poly([[cx, cy - s], [cx + s * 0.75, cy], [cx, cy + s * 1.1], [cx - s * 0.75, cy]]), fill },
      { t: 'path', d: poly([[cx, cy - s], [cx + s * 0.75, cy], [cx, cy]]), fill: accent, opacity: 0.6 },
      { t: 'path', d: `M${f(cx)} ${f(cy + s * 1.1)} Q${f(cx + s * 0.6)} ${f(cy + s * 1.8)} ${f(cx)} ${f(cy + s * 2.4)} Q${f(cx - s * 0.6)} ${f(cy + s * 3)} ${f(cx)} ${f(cy + s * 3.5)}`, stroke: accent, sw },
      { t: 'path', d: [1.8, 2.7].map((k) => poly([[cx - s * 0.18, cy + s * (k - 0.1)], [cx + s * 0.18, cy + s * (k + 0.1)], [cx + s * 0.18, cy + s * (k - 0.1)], [cx - s * 0.18, cy + s * (k + 0.1)]])).join(''), fill },
    ],
  }
}

function egg(cx: number, cy: number, rx: number, ry: number, p: Palette, k: number, sw: number): El[] {
  const shape = poly(Array.from({ length: 48 }, (_, i) => {
    const t = (i / 48) * Math.PI * 2
    const s = Math.sin(t)
    return [cx + Math.cos(t) * rx * (s < 0 ? 0.92 : 1), cy + s * ry * (s < 0 ? 1.12 : 0.88)]
  }))
  const colors = [p.primary, p.secondary, p.accent]
  const els: El[] = [{ t: 'path', d: shape, fill: colors[k % 3] }]
  for (const [dy, kind] of [[-0.25, 0], [0.2, 1]] as const) {
    const y = cy + dy * ry
    const hw = rx * Math.sqrt(Math.max(0, 1 - (dy / 1.1) ** 2)) * 0.88
    const zig = Array.from({ length: 9 }, (_, i): [number, number] => [cx - hw + (i * 2 * hw) / 8, y + (i % 2 ? -1 : 1) * ry * 0.06])
    els.push({ t: 'path', d: `M${zig.map(([x, yy]) => `${f(x)} ${f(yy)}`).join(' L')}`, stroke: kind ? p.paper : colors[(k + 1) % 3], sw })
  }
  return els
}

function leaf(cx: number, cy: number, s: number, rot: number, fill: string, vein: string, sw: number): El {
  return {
    t: 'group',
    cx,
    cy,
    rot,
    children: [
      { t: 'path', d: `M${f(cx)} ${f(cy - s)} Q${f(cx + s * 0.7)} ${f(cy - s * 0.1)} ${f(cx)} ${f(cy + s)} Q${f(cx - s * 0.7)} ${f(cy - s * 0.1)} ${f(cx)} ${f(cy - s)}Z`, fill },
      { t: 'line', x1: cx, y1: cy - s * 0.8, x2: cx, y2: cy + s * 1.3, stroke: vein, sw },
    ],
  }
}

/** Nine-branched menorah with candles and flames. */
function menorah(cx: number, base: number, w: number, p: Palette): El[] {
  const step = w / 8
  const armTop = base - w * 0.55
  const sw = w * 0.025
  let arms = ''
  for (let i = 1; i <= 4; i++) arms += `M${arcPts(cx, armTop, i * step, 0, Math.PI, 20).map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}`
  const els: El[] = [
    { t: 'rect', x: cx - w * 0.18, y: base - w * 0.04, w: w * 0.36, h: w * 0.04, r: w * 0.01, fill: p.accent },
    { t: 'line', x1: cx, y1: armTop - w * 0.04, x2: cx, y2: base - w * 0.04, stroke: p.accent, sw: sw * 1.4 },
    { t: 'path', d: arms, stroke: p.accent, sw },
  ]
  for (let i = -4; i <= 4; i++) {
    const x = cx + i * step
    const tall = i === 0 ? w * 0.06 : 0
    const ch = w * 0.12
    els.push({ t: 'rect', x: x - w * 0.015, y: armTop - ch - tall, w: w * 0.03, h: ch, fill: p.secondary })
    els.push({ t: 'path', d: flame(x, armTop - ch - tall - w * 0.005, w * 0.03, w * 0.07), fill: p.primary })
  }
  return els
}

// ---------------------------------------------------------------------------
// More motifs

/** A strand of fairy lights sagging between two points. */
function fairyLights(x0: number, x1: number, y: number, sag: number, bulb: number, colors: string[], wire: string, sw: number): El[] {
  const n = Math.max(6, Math.round((x1 - x0) / (bulb * 5)))
  const pts: [number, number][] = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    return [x0 + (x1 - x0) * t, y + sag * 4 * t * (1 - t)]
  })
  const els: El[] = [{ t: 'path', d: `M${pts.map(([px, py]) => `${f(px)} ${f(py)}`).join(' L')}`, stroke: wire, sw }]
  pts.slice(1, -1).forEach(([px, py], i) => {
    const c = colors[i % colors.length]
    els.push({ t: 'circle', cx: px, cy: py + bulb * 1.4, r: bulb * 1.6, fill: c, opacity: 0.2 })
    els.push({ t: 'rect', x: px - bulb * 0.35, y: py, w: bulb * 0.7, h: bulb * 0.5, fill: wire })
    els.push({ t: 'path', d: ellipse(px, py + bulb * 1.3, bulb * 0.55, bulb * 0.85), fill: c })
  })
  return els
}

/** A ring of leaves and berries. */
function wreath(cx: number, cy: number, r: number, leafS: number, p: Palette, sw: number): El[] {
  const els: El[] = []
  const n = Math.round((Math.PI * 2 * r) / (leafS * 0.9))
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n
    const rr = r + (i % 2 ? leafS * 0.35 : -leafS * 0.35)
    els.push(leaf(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, leafS, Math.round((a * 180) / Math.PI) + (i % 2 ? 40 : -40), i % 3 ? p.primary : mix(p.primary, '#000000', 0.25), mix(p.primary, '#000000', 0.4), sw))
  }
  let berries = ''
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10 + 0.3
    const bx = cx + Math.cos(a) * r
    const by = cy + Math.sin(a) * r
    const br = leafS * 0.22
    berries += `M${f(bx - br)} ${f(by)}a${f(br)} ${f(br)} 0 1 0 ${f(2 * br)} 0a${f(br)} ${f(br)} 0 1 0 ${f(-2 * br)} 0Z`
  }
  els.push({ t: 'path', d: berries, fill: p.accent })
  return els
}

/** Pointed (ogee-like) arch window with straight sides. */
function pointedArch(x: number, top: number, w: number, bottom: number) {
  const cx = x + w / 2
  const shoulder = top + w * 0.55
  return `M${f(x)} ${f(bottom)} L${f(x)} ${f(shoulder)} C${f(x)} ${f(top + w * 0.2)} ${f(cx - w * 0.08)} ${f(top + w * 0.12)} ${f(cx)} ${f(top)} C${f(cx + w * 0.08)} ${f(top + w * 0.12)} ${f(x + w)} ${f(top + w * 0.2)} ${f(x + w)} ${f(shoulder)} L${f(x + w)} ${f(bottom)}Z`
}

/** Round dome arch with a small finial. */
function domeArch(x: number, top: number, w: number, bottom: number) {
  const r = w / 2
  const cx = x + r
  const cy = top + r
  return `${poly([[x, bottom], [x, cy], ...arcPts(cx, cy, r, Math.PI, Math.PI * 2, 30), [x + w, bottom]])}${poly([[cx - r * 0.05, top + r * 0.02], [cx, top - r * 0.22], [cx + r * 0.05, top + r * 0.02]])}`
}

/** Ticket outline with semicircular notches where the stub tears off. */
function ticket(x: number, y: number, w: number, h: number, split: number, vertical: boolean, notch: number) {
  if (vertical) {
    const sx = x + split
    return poly([[x, y], [sx - notch, y], ...arcPts(sx, y, notch, Math.PI, 0, 12).slice(1, -1), [sx + notch, y], [x + w, y], [x + w, y + h], [sx + notch, y + h], ...arcPts(sx, y + h, notch, 0, -Math.PI, 12).slice(1, -1), [sx - notch, y + h], [x, y + h]])
  }
  const sy = y + split
  return poly([[x, y], [x + w, y], [x + w, sy - notch], ...arcPts(x + w, sy, notch, -Math.PI / 2, -Math.PI * 1.5, 12).slice(1, -1), [x + w, sy + notch], [x + w, y + h], [x, y + h], [x, sy + notch], ...arcPts(x, sy, notch, Math.PI / 2, -Math.PI / 2, 12).slice(1, -1), [x, sy - notch]])
}

/** Soft cloud of coloured powder (overlapping translucent circles). */
function powder(cx: number, cy: number, r: number, color: string, seed: number): El[] {
  const rand = rng(seed)
  return Array.from({ length: 9 }, (): El => ({ t: 'circle', cx: cx + (rand() - 0.5) * r * 1.4, cy: cy + (rand() - 0.5) * r, r: r * (0.3 + rand() * 0.35), fill: color, opacity: 0.35 + rand() * 0.25 }))
}

/** Concentric rings of dots (garba circles). */
function dotRings(cx: number, cy: number, r0: number, gap: number, count: number, dot: number) {
  let d = ''
  for (let k = 0; k < count; k++) {
    const r = r0 + k * gap
    const n = Math.max(8, Math.round((Math.PI * 2 * r) / (dot * 4)))
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n
      const x = cx + Math.cos(a) * r
      const y = cy + Math.sin(a) * r
      d += `M${f(x - dot)} ${f(y)}a${f(dot)} ${f(dot)} 0 1 0 ${f(2 * dot)} 0a${f(dot)} ${f(dot)} 0 1 0 ${f(-2 * dot)} 0Z`
    }
  }
  return d
}

/** Rolling hills from y to the bottom edge. */
function hills(W: number, H: number, y: number, amp: number, bleed: number) {
  let d = `M${f(-bleed)} ${f(H + bleed)} L${f(-bleed)} ${f(y)}`
  const steps = 4
  for (let i = 0; i < steps; i++) {
    const x0 = (W * i) / steps
    const x1 = (W * (i + 1)) / steps
    d += ` Q${f((x0 + x1) / 2)} ${f(y + (i % 2 ? amp : -amp))} ${f(x1)} ${f(y)}`
  }
  return `${d} L${f(W + bleed)} ${f(H + bleed)}Z`
}

// ---------------------------------------------------------------------------
// Typography

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** The template's wording, with the greeting split into a lead ("Happy") and the festival name. */
interface Words {
  greeting: string
  lead: string
  main: string
  subline: string
  message: string
  from: string
  year: string
  contact: string
  logo?: ImageValue
}

function words(c: Content, fest: Festival): Words {
  const greeting = str(c, 'greeting').trim() || fest.greeting
  const m = greeting.match(/^(happy|merry|shubh|joyous|blessed|warm|season['’]s)\s+(.+)$/i)
  return {
    greeting,
    lead: m ? m[1] : '',
    main: m ? m[2] : greeting,
    subline: bool(c, 'showSubline') ? str(c, 'subline').trim() || fest.subline : '',
    message: bool(c, 'showMessage') ? str(c, 'message').trim() || fest.message : '',
    from: str(c, 'from').trim(),
    year: str(c, 'year').trim(),
    contact: str(c, 'contact').trim(),
    logo: img(c, 'logo'),
  }
}

type Piece =
  | {
      t: 'text'
      text: string
      size: number
      color: string
      font?: FontFamily
      bold?: boolean
      italic?: boolean
      upper?: boolean
      /** Letter spacing as a fraction of the size. */
      track?: number
      maxLines?: number
      leading?: number
      /** Narrower measure for long text. */
      w?: number
      field?: string
      /** Thin rules either side (centred text only). */
      flank?: string
      /** One colour per letter, cycling (single line only). */
      letters?: string[]
      after: number
    }
  | { t: 'rule'; kind: 'line' | 'ornament' | 'bar' | 'dots'; w: number; sw: number; color: string; after: number }
  | { t: 'logo'; h: number; after: number }

type Align = 'left' | 'center' | 'right'

/** Largest size (up to `size`) at which every word, or the whole line, fits the width. */
function fitSize(text: string, size: number, w: number, font: FontFamily, bold: boolean, italic: boolean, track: number, whole: boolean) {
  const parts = whole ? [text] : text.split(/\s+/)
  const widest = Math.max(...parts.map((p) => measure(p, size, font, bold, italic, size * track)))
  return widest > w ? size * (w / widest) * 0.995 : size
}

function shift(els: El[], dy: number): El[] {
  if (!dy) return els
  return els.map((el): El => {
    switch (el.t) {
      case 'line':
        return { ...el, y1: el.y1 + dy, y2: el.y2 + dy }
      case 'circle':
        return { ...el, cy: el.cy + dy }
      case 'group':
        return { ...el, cy: el.cy + dy, children: shift(el.children, dy) }
      case 'path':
        // Stacks contain no paths.
        return el
      default:
        return { ...el, y: el.y + dy }
    }
  })
}

/**
 * Stacks pieces in a box on one alignment edge, shrinking everything evenly
 * until it fits the box's height, then places the stack top, centre or bottom.
 */
function stack(box: Box, align: Align, valign: 'top' | 'center' | 'bottom', build: (k: number) => Piece[], logo?: ImageValue): El[] {
  const ax = align === 'left' ? box.x : align === 'right' ? box.x + box.w : box.x + box.w / 2
  const layout = (k: number) => {
    const els: El[] = []
    let y = box.y
    for (const p of build(k)) {
      if (p.t === 'text') {
        if (!p.text.trim()) continue
        const font = p.font ?? 'sans'
        const text = p.upper ? p.text.toUpperCase() : p.text
        const w = Math.min(box.w, p.w ?? box.w)
        const size = fitSize(text, p.size, w, font, !!p.bold, !!p.italic, p.track ?? 0, !!p.letters)
        const ls = size * (p.track ?? 0)
        const base = y + size * 0.8
        if (p.letters) {
          const total = measure(text, size, font, p.bold, p.italic, ls)
          let x = align === 'left' ? ax : align === 'right' ? ax - total : ax - total / 2
          let i = 0
          for (const ch of text) {
            const cw = measure(ch, size, font, p.bold, p.italic, 0)
            if (ch.trim()) els.push(T({ x, y: base, text: ch, size, font, bold: p.bold, italic: p.italic, color: p.letters[i++ % p.letters.length], align: 'left' }))
            x += cw + ls
          }
          y = base + size * 0.3 + p.after * k
          continue
        }
        const el = T({ x: ax, y: base, text, size, font, bold: p.bold, italic: p.italic, ls, color: p.color, align, w, maxLines: p.maxLines ?? 3, leading: p.leading ?? 1.15, field: p.field })
        els.push(el)
        if (p.flank && align === 'center' && el.t === 'text' && el.lines.length === 1) {
          const tw = measure(el.lines[0], size, font, p.bold, p.italic, ls)
          const gap = size * 0.5
          const room = (box.w - tw) / 2 - gap
          if (room > size * 0.8) {
            const ly = base - size * 0.32
            const len = Math.min(room, size * 3)
            els.push({ t: 'line', x1: ax - tw / 2 - gap - len, y1: ly, x2: ax - tw / 2 - gap, y2: ly, stroke: p.flank, sw: Math.max(0.5, size * 0.04) }, { t: 'line', x1: ax + tw / 2 + gap, y1: ly, x2: ax + tw / 2 + gap + len, y2: ly, stroke: p.flank, sw: Math.max(0.5, size * 0.04) })
          }
        }
        y = base + textHeight(el) + p.after * k
      } else if (p.t === 'rule') {
        const w = Math.min(box.w, p.w)
        const x0 = align === 'left' ? ax : align === 'right' ? ax - w : ax - w / 2
        if (p.kind === 'line') els.push({ t: 'line', x1: x0, y1: y + p.sw / 2, x2: x0 + w, y2: y + p.sw / 2, stroke: p.color, sw: p.sw })
        else if (p.kind === 'bar') els.push({ t: 'rect', x: x0, y, w, h: p.sw, fill: p.color })
        else if (p.kind === 'dots') for (let i = 0; i < 3; i++) els.push({ t: 'circle', cx: x0 + (w * (i + 0.5)) / 3, cy: y + p.sw, r: p.sw, fill: p.color })
        else {
          const cy = y + p.sw * 2
          const mid = x0 + w / 2
          const d = p.sw * 2.2
          els.push({ t: 'line', x1: x0, y1: cy, x2: mid - d * 1.8, y2: cy, stroke: p.color, sw: p.sw * 0.5 }, { t: 'line', x1: mid + d * 1.8, y1: cy, x2: x0 + w, y2: cy, stroke: p.color, sw: p.sw * 0.5 }, { t: 'group', cx: mid, cy, rot: 45, children: [{ t: 'rect', x: mid - d / 2, y: cy - d / 2, w: d, h: d, fill: p.color }] })
        }
        y += (p.kind === 'ornament' || p.kind === 'dots' ? p.sw * 4 : p.sw) + p.after * k
      } else if (logo) {
        const h = p.h
        const x0 = align === 'left' ? ax : align === 'right' ? ax - h * 2 : ax - h
        els.push({ t: 'image', x: x0, y, w: h * 2, h, shape: 'rect', image: logo, fit: 'contain', field: 'logo' })
        y += h + p.after * k
      }
    }
    return { els, h: y - box.y }
  }
  let k = 1
  let out = layout(k)
  for (let i = 0; i < 5 && out.h > box.h; i++) {
    k *= Math.max(0.35, (box.h / out.h) * 0.98)
    out = layout(k)
  }
  const free = Math.max(0, box.h - out.h)
  return shift(out.els, valign === 'top' ? 0 : valign === 'bottom' ? free : free / 2)
}

/** Colours for a type system. */
interface Ink {
  head: string
  accent: string
  ink: string
  muted: string
  font: FontFamily
}

const ink = (p: Palette, font: FontFamily, o: Partial<Ink> = {}): Ink => ({ head: p.primary, accent: p.accent, ink: p.ink, muted: mix(p.ink, p.paper, 0.22), font, ...o })

/** The closing lines every style shares: message, sign-off, logo and contact. */
function closing(w: Words, c: Ink, u: number, k: number, opts: { serifMessage?: boolean; measure?: number } = {}): Piece[] {
  return [
    { t: 'text', text: w.message, size: u * 3.3 * k, color: c.muted, font: opts.serifMessage ? 'serif' : 'sans', italic: opts.serifMessage, w: (opts.measure ?? 74) * u, maxLines: 4, leading: 1.45, after: u * 3 },
    { t: 'text', text: w.from, size: u * 3.7 * k, color: c.ink, font: 'serif', italic: true, maxLines: 2, field: 'from', after: u * 2.4 },
    ...(w.logo ? [{ t: 'logo', h: u * 8 * k, after: u * 1.5 } as Piece] : []),
    { t: 'text', text: w.contact, size: u * 2.5 * k, color: c.muted, maxLines: 2, after: 0 },
  ]
}

/** Centred: kicker, greeting, ornament, message, sign-off. */
const classic =
  (w: Words, c: Ink, u: number) =>
  (k: number): Piece[] => [
    { t: 'text', text: w.subline, size: u * 2.9 * k, color: c.accent, bold: true, upper: true, track: 0.22, maxLines: 2, after: u * 2.5 },
    { t: 'text', text: w.greeting, size: u * 11 * k, color: c.head, font: c.font, bold: true, leading: 1.08, after: u * 2.5 },
    { t: 'rule', kind: 'ornament', w: u * 34 * k, sw: u * 0.45 * k, color: c.accent, after: u * 3 },
    ...closing(w, c, u, k),
  ]

/** Wordmark: italic lead word over a large, tracked festival name. */
const wordmark =
  (w: Words, c: Ink, u: number, letters?: string[]) =>
  (k: number): Piece[] => [
    { t: 'text', text: w.subline, size: u * 2.7 * k, color: c.muted, bold: true, upper: true, track: 0.3, maxLines: 2, after: u * 3.5 },
    { t: 'text', text: w.lead, size: u * 8 * k, color: c.accent, font: 'serif', italic: true, after: u * 0.5 },
    { t: 'text', text: w.main, size: u * 17 * k, color: c.head, font: c.font, bold: true, upper: true, track: 0.06, leading: 1.0, letters, after: u * 3 },
    { t: 'rule', kind: 'dots', w: u * 9 * k, sw: u * 0.7 * k, color: c.accent, after: u * 3 },
    ...closing(w, c, u, k),
  ]

/** Editorial, left aligned: accent bar, kicker, one word per line, short rule. */
const editorial =
  (w: Words, c: Ink, u: number) =>
  (k: number): Piece[] => [
    { t: 'rule', kind: 'bar', w: u * 10 * k, sw: u * 1 * k, color: c.accent, after: u * 3 },
    { t: 'text', text: w.subline, size: u * 2.8 * k, color: c.accent, bold: true, upper: true, track: 0.2, maxLines: 3, after: u * 2.5 },
    { t: 'text', text: w.greeting.split(/\s+/).join('\n'), size: u * 13 * k, color: c.head, font: c.font, bold: true, leading: 0.98, maxLines: 5, after: u * 4 },
    { t: 'rule', kind: 'line', w: u * 16 * k, sw: u * 0.35 * k, color: c.ink, after: u * 3.5 },
    ...closing(w, c, u, k, { measure: 62 }),
  ]

/** Wide-tracked capitals between hairlines, with the lead word above. */
const spaced =
  (w: Words, c: Ink, u: number) =>
  (k: number): Piece[] => [
    { t: 'text', text: w.lead, size: u * 4.6 * k, color: c.accent, font: 'serif', italic: true, after: u * 1.5 },
    { t: 'text', text: w.main, size: u * 9 * k, color: c.head, font: c.font, bold: true, upper: true, track: 0.38, flank: c.accent, maxLines: 3, leading: 1.2, after: u * 3 },
    { t: 'text', text: w.subline, size: u * 2.7 * k, color: c.accent, upper: true, track: 0.25, maxLines: 2, after: u * 4 },
    ...closing(w, c, u, k, { serifMessage: true }),
  ]

/** Formal invitation: italic lead, serif name, spaced subheading, ornament. */
const invitation =
  (w: Words, c: Ink, u: number) =>
  (k: number): Piece[] => [
    { t: 'text', text: w.lead, size: u * 8 * k, color: c.accent, font: 'serif', italic: true, after: u * 0.5 },
    { t: 'text', text: w.main, size: u * 12 * k, color: c.head, font: 'serif', bold: true, leading: 1.05, after: u * 2.5 },
    { t: 'text', text: w.subline, size: u * 2.6 * k, color: c.accent, upper: true, track: 0.32, maxLines: 2, after: u * 2 },
    { t: 'rule', kind: 'ornament', w: u * 40 * k, sw: u * 0.4 * k, color: c.accent, after: u * 3.5 },
    ...closing(w, c, u, k, { serifMessage: true }),
  ]

/** Big headline only (for magazine and band layouts). */
const headlineOnly =
  (w: Words, c: Ink, u: number, size = 15) =>
  (k: number): Piece[] => [
    { t: 'text', text: w.subline, size: u * 2.8 * k, color: c.accent, bold: true, upper: true, track: 0.2, maxLines: 2, after: u * 2 },
    { t: 'text', text: w.greeting.split(/\s+/).join('\n'), size: u * size * k, color: c.head, font: c.font, bold: true, upper: true, leading: 0.95, maxLines: 5, after: u * 3.5 },
  ]

const closingOnly =
  (w: Words, c: Ink, u: number, m = 70) =>
  (k: number): Piece[] =>
    closing(w, c, u, k, { measure: m })

// ---------------------------------------------------------------------------
// Compositions

type Comp = (ctx: RenderCtx, fest: Festival) => El[]

const isWide = (ctx: RenderCtx) => ctx.W > ctx.H * 1.15
const isTall = (ctx: RenderCtx) => ctx.H > ctx.W * 1.15

const diwaliWordmark: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const ground = H - u * 13
  const n = Math.max(5, Math.round(W / (u * 18)))
  const els: El[] = [bgRect(ctx, p.paper), sparkles(30, 3, { x: u * 4, y: u * 3, w: W - u * 8, h: H * 0.3 }, u * 1.4, p.accent)]
  els.push({ t: 'line', x1: u * 6, y1: ground, x2: W - u * 6, y2: ground, stroke: p.accent, sw: u * 0.3 })
  for (let i = 0; i < n; i++) els.push(...diya((W * (i + 0.5)) / n, ground, u * (i % 2 ? 3.2 : 4.4), p.secondary, p.accent, p.accent))
  els.push(...stack({ x: u * 10, y: u * 10, w: W - u * 20, h: ground - u * 18 - u * 10 }, 'center', 'center', wordmark(w, ink(p, ctx.f.head), u), w.logo))
  return els
}

const diwaliArch: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const m = u * 7
  const aw = W - m * 2
  const top = isWide(ctx) ? u * 6 : H * 0.06
  const els: El[] = [bgRect(ctx, p.secondary), { t: 'path', d: dotGrid(0, 0, W, H, u * 5, u * 0.35), fill: p.accent, opacity: 0.25 }]
  els.push({ t: 'path', d: pointedArch(m, top, aw, H - m), fill: p.paper }, { t: 'path', d: pointedArch(m + u * 2, top + u * 3, aw - u * 4, H - m - u * 2), stroke: p.accent, sw: u * 0.35 })
  const shoulder = top + Math.min(aw * 0.55, (H - m - top) * 0.45)
  els.push(...diya(W / 2, top + u * 3 + Math.min(aw * 0.32, u * 26), u * 4, p.primary, p.accent, p.accent))
  els.push(...stack({ x: m + u * 8, y: shoulder, w: aw - u * 16, h: H - m - u * 8 - shoulder }, 'center', 'center', invitation(w, ink(p, 'serif'), u), w.logo))
  return els
}

const diwaliEditorial: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const r = Math.min(W, H) * 0.42
  const els: El[] = [bgRect(ctx, p.paper)]
  if (isTall(ctx)) {
    els.push(...rangoli(W, 0, r, p))
    els.push(...stack({ x: u * 10, y: r * 0.9, w: W - u * 20, h: H - r * 0.9 - u * 10 }, 'left', 'center', editorial(w, ink(p, ctx.f.head), u), w.logo))
  } else {
    els.push(...rangoli(W, H / 2, r, p))
    els.push(...stack({ x: u * 10, y: u * 10, w: W - r - u * 20, h: H - u * 20 }, 'left', 'center', editorial(w, ink(p, ctx.f.head), u), w.logo))
  }
  return els
}

const diwaliLights: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const colors = [p.primary, p.accent, p.secondary]
  const els: El[] = [bgRect(ctx, p.paper)]
  els.push(...fairyLights(-u * 2, W * 0.62, u * 2, u * 9, u * 1.6, colors, p.accent, u * 0.25), ...fairyLights(W * 0.38, W + u * 2, u * 4, u * 7, u * 1.6, [...colors].reverse(), p.accent, u * 0.25))
  els.push(...fairyLights(-u * 2, W + u * 2, H - u * 6, -u * 6, u * 1.4, colors, p.accent, u * 0.25))
  els.push(...stack({ x: u * 10, y: u * 22, w: W - u * 20, h: H - u * 44 }, 'center', 'center', spaced(w, ink(p, ctx.f.head, { head: p.ink }), u), w.logo))
  return els
}

/** A tilted instant photo with the greeting below (or beside, on wide layouts). */
const polaroid =
  (motif: 'diwali' | 'christmas'): Comp =>
  (ctx, fest) => {
    const { W, H, p, c } = ctx
    const u = unit(ctx)
    const w = words(c, fest)
    const wide = isWide(ctx)
    const s = wide ? Math.min(H * 0.62, W * 0.36) : Math.min(W * 0.6, H * 0.42)
    const cx = wide ? W * 0.3 : W / 2
    const cy = wide ? H / 2 - s * 0.06 : u * 8 + s * 0.62
    const els: El[] = [bgRect(ctx, p.paper), { t: 'path', d: dotGrid(0, 0, W, H, u * 4, u * 0.3), fill: p.secondary, opacity: 0.35 }]
    const frame: El[] = [
      { t: 'rect', x: cx - s / 2 - u * 2.5, y: cy - s / 2 - u * 2.5, w: s + u * 5, h: s + u * 13, fill: '#FFFFFF', stroke: mix(p.ink, '#FFFFFF', 0.85), sw: u * 0.2 },
      photo(c, 'photo', cx - s / 2, cy - s / 2, s, s, 'rect', 'photo'),
    ]
    els.push({ t: 'group', cx, cy, rot: -4, children: frame })
    if (motif === 'diwali') els.push(...diya(cx + s * 0.5, cy + s * 0.5 + u * 9, u * 3.5, p.primary, p.accent, p.accent))
    else els.push({ t: 'path', d: snowflake(cx + s * 0.5, cy - s * 0.5, u * 5), stroke: p.primary, sw: u * 0.5 })
    const box = wide ? { x: W * 0.56, y: u * 10, w: W * 0.38, h: H - u * 20 } : { x: u * 10, y: cy + s / 2 + u * 16, w: W - u * 20, h: H - (cy + s / 2 + u * 16) - u * 7 }
    els.push(...stack(box, wide ? 'left' : 'center', 'center', wide ? editorial(w, ink(p, ctx.f.head), u) : classic(w, ink(p, ctx.f.head), u), w.logo))
    return els
  }

const nyTicket: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const m = u * 6
  const tw = W - m * 2
  const th = H - m * 2
  const vertical = W >= H
  const split = vertical ? tw * 0.7 : th * 0.72
  const els: El[] = [bgRect(ctx, p.secondary), sparkles(24, 77, { x: 0, y: 0, w: W, h: H }, u * 0.9, p.accent)]
  els.push({ t: 'path', d: ticket(m, m, tw, th, split, vertical, u * 4), fill: p.paper })
  els.push({ t: 'path', d: ticket(m + u * 2, m + u * 2, tw - u * 4, th - u * 4, split - u * 2, vertical, u * 3), stroke: p.accent, sw: u * 0.25 })
  if (vertical) {
    els.push({ t: 'line', x1: m + split, y1: m + u * 6, x2: m + split, y2: H - m - u * 6, stroke: p.ink, sw: u * 0.3, dash: [u, u] })
    els.push(...stack({ x: m + u * 8, y: m + u * 6, w: split - u * 14, h: th - u * 12 }, 'left', 'center', editorial(w, ink(p, ctx.f.head), u), w.logo))
    const sw = tw - split
    if (w.year) els.push(...stack({ x: m + split + u * 3, y: m + u * 6, w: sw - u * 6, h: th - u * 12 }, 'center', 'center', (k) => [
      { t: 'text', text: 'ADMIT ALL', size: u * 2.4 * k, color: p.ink, bold: true, track: 0.3, after: u * 3 },
      { t: 'text', text: w.year, size: u * 14 * k, color: p.primary, font: ctx.f.head, bold: true, maxLines: 2, after: u * 3 },
      { t: 'rule', kind: 'dots', w: u * 8, sw: u * 0.6 * k, color: p.accent, after: 0 },
    ]))
  } else {
    els.push({ t: 'line', x1: m + u * 6, y1: m + split, x2: W - m - u * 6, y2: m + split, stroke: p.ink, sw: u * 0.3, dash: [u, u] })
    els.push(...stack({ x: m + u * 8, y: m + u * 8, w: tw - u * 16, h: split - u * 12 }, 'left', 'center', editorial(w, ink(p, ctx.f.head), u), w.logo))
    if (w.year) els.push(...stack({ x: m + u * 8, y: m + split + u * 3, w: tw - u * 16, h: th - split - u * 6 }, 'center', 'center', (k) => [{ t: 'text', text: w.year, size: u * 14 * k, color: p.primary, font: ctx.f.head, bold: true, track: 0.1, after: 0 }]))
  }
  return els
}

const nyNumerals: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const rand = rng(29)
  const els: El[] = [bgRect(ctx, p.paper)]
  const wide = isWide(ctx)
  const numBox = wide ? { x: u * 8, y: u * 8, w: W * 0.5 - u * 10, h: H - u * 16 } : { x: u * 8, y: u * 8, w: W - u * 16, h: H * 0.38 }
  for (let i = 0; i < 40; i++) {
    const col = [p.primary, p.secondary, p.accent][i % 3]
    els.push({ t: 'group', cx: rand() * W, cy: rand() * H, rot: Math.round(rand() * 180), children: [{ t: 'rect', x: 0, y: 0, w: u * 0.9, h: u * 2.4, fill: col }] })
  }
  if (w.year) els.push(...stack(numBox, wide ? 'left' : 'center', 'center', (k) => [{ t: 'text', text: w.year, size: u * 60 * k, color: p.primary, font: 'sans', bold: true, track: -0.02, maxLines: 2, leading: 0.9, after: 0 }]))
  const box = wide ? { x: W * 0.55, y: u * 10, w: W * 0.4, h: H - u * 20 } : { x: u * 10, y: w.year ? H * 0.38 + u * 14 : u * 10, w: W - u * 20, h: H - (w.year ? H * 0.38 + u * 14 : u * 10) - u * 8 }
  els.push(...stack(box, 'left', 'center', editorial(w, ink(p, ctx.f.head, { head: p.ink }), u), w.logo))
  return els
}

const goldInvitation =
  (bursts: boolean): Comp =>
  (ctx, fest) => {
    const { W, H, p, c } = ctx
    const u = unit(ctx)
    const w = words(c, fest)
    const m = u * 5
    const o = m + u * 3
    const els: El[] = [bgRect(ctx, p.paper), { t: 'rect', x: m, y: m, w: W - 2 * m, h: H - 2 * m, stroke: p.accent, sw: u * 0.5 }, { t: 'rect', x: m + u * 1.6, y: m + u * 1.6, w: W - 2 * m - u * 3.2, h: H - 2 * m - u * 3.2, stroke: p.accent, sw: u * 0.15 }]
    els.push({ t: 'path', d: [cornerOrnament(o, o, u * 9, 1, 1), cornerOrnament(W - o, o, u * 9, -1, 1), cornerOrnament(o, H - o, u * 9, 1, -1), cornerOrnament(W - o, H - o, u * 9, -1, -1)].join(''), stroke: p.accent, sw: u * 0.3 })
    if (bursts) els.push(...burst(W / 2, u * 17, u * 6, 16, p.accent, u * 0.25))
    else els.push({ t: 'path', d: star(W / 2, u * 15, u * 3), fill: p.accent })
    const top = u * 25
    const pieces = bursts && w.year
      ? (k: number): Piece[] => [{ t: 'text', text: w.year, size: u * 9 * k, color: p.accent, font: 'serif', track: 0.25, after: u * 2 }, ...invitation(w, ink(p, 'serif', { head: p.ink }), u)(k)]
      : invitation(w, ink(p, 'serif', { head: p.ink }), u)
    els.push(...stack({ x: u * 16, y: top, w: W - u * 32, h: H - top - u * 14 }, 'center', 'center', pieces, w.logo))
    return els
  }

const fireworksMagazine: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const wide = isWide(ctx)
  const els: El[] = [bgRect(ctx, p.paper)]
  const spots: [number, number, number][] = wide ? [[0.62, 0.3, 16], [0.84, 0.62, 12], [0.7, 0.82, 8]] : [[0.28, 0.5, 13], [0.72, 0.42, 16], [0.5, 0.64, 9]]
  spots.forEach(([x, y, r], i) => els.push(...burst(W * x, H * y, u * r, 16 + i * 2, [p.primary, p.accent, p.secondary][i % 3], u * 0.35)))
  if (wide) {
    els.push(...stack({ x: u * 8, y: u * 8, w: W * 0.48, h: H * 0.62 }, 'left', 'top', headlineOnly(w, ink(p, ctx.f.head, { head: p.ink }), u, 16)))
    els.push({ t: 'rect', x: u * 8, y: H * 0.7, w: W * 0.4, h: u * 0.5, fill: p.ink })
    els.push(...stack({ x: u * 8, y: H * 0.7 + u * 3, w: W * 0.42, h: H * 0.3 - u * 9 }, 'left', 'top', closingOnly(w, ink(p, ctx.f.head), u), w.logo))
  } else {
    els.push(...stack({ x: u * 8, y: u * 8, w: W - u * 16, h: H * 0.34 }, 'left', 'top', headlineOnly(w, ink(p, ctx.f.head, { head: p.ink }), u, 16)))
    const ty = H * 0.76
    els.push({ t: 'rect', x: u * 8, y: ty, w: W - u * 16, h: u * 0.5, fill: p.ink })
    els.push(...stack({ x: u * 8, y: ty + u * 3, w: W - u * 16, h: H - ty - u * 9 }, 'left', 'top', closingOnly(w, ink(p, ctx.f.head), u, 90), w.logo))
  }
  return els
}

/** Text on one side of a coloured panel that carries the illustration. */
const splitPanel =
  (art: (ctx: RenderCtx, panel: Box) => El[], style: 'editorial' | 'classic'): Comp =>
  (ctx, fest) => {
    const { W, H, p, c } = ctx
    const u = unit(ctx)
    const w = words(c, fest)
    const tall = isTall(ctx)
    const panel: Box = tall ? { x: 0, y: 0, w: W, h: H * 0.44 } : { x: 0, y: 0, w: W * 0.44, h: H }
    const els: El[] = [bgRect(ctx, p.paper), { t: 'rect', x: -ctx.bleed, y: -ctx.bleed, w: panel.w + ctx.bleed, h: panel.h + ctx.bleed, fill: p.secondary }]
    els.push(...art(ctx, panel))
    const box = tall ? { x: u * 10, y: panel.h + u * 7, w: W - u * 20, h: H - panel.h - u * 14 } : { x: panel.w + u * 8, y: u * 9, w: W - panel.w - u * 15, h: H - u * 18 }
    const c2 = ink(p, ctx.f.head)
    els.push(...stack(box, style === 'editorial' || !tall ? 'left' : 'center', 'center', style === 'editorial' || !tall ? editorial(w, c2, u) : classic(w, c2, u), w.logo))
    return els
  }

const TRUNK = '#78350F'

const treeArt = (ctx: RenderCtx, b: Box): El[] => {
  const th = Math.min(b.h * 0.8, b.w * 1.25)
  return [...tree(b.x + b.w / 2, b.y + (b.h - th) / 2, th, { ...ctx.p, secondary: TRUNK }), sparkles(16, 5, b, unit(ctx) * 1, ctx.p.accent)]
}

const crescentArt = (ctx: RenderCtx, b: Box): El[] => {
  const r = Math.min(b.w, b.h) * 0.3
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const u = unit(ctx)
  let stars = ''
  const rand = rng(91)
  for (let i = 0; i < 14; i++) stars += star(b.x + rand() * b.w, b.y + rand() * b.h, u * (0.6 + rand()))
  return [{ t: 'path', d: stars, fill: ctx.p.accent, opacity: 0.7 }, { t: 'path', d: crescent(cx - r * 0.1, cy, r), fill: ctx.p.accent }, { t: 'path', d: star(cx + r * 0.65, cy - r * 0.2, r * 0.2), fill: ctx.p.accent }]
}

const potArt = (ctx: RenderCtx, b: Box): El[] => {
  const { p } = ctx
  const u = unit(ctx)
  const s = Math.min(b.w, b.h) / 100
  const cx = b.x + b.w / 2
  const base = b.y + b.h * 0.8
  const w = s * 34
  const h = s * 40
  const top = base - h
  const els: El[] = []
  for (const sx of [cx - w * 1.15, cx + w * 1.15]) {
    els.push({ t: 'rect', x: sx - s * 2, y: top - s * 30, w: s * 4, h: h + s * 30, fill: p.primary })
    els.push({ t: 'path', d: Array.from({ length: 6 }, (_, i) => `M${f(sx - s * 2)} ${f(top - s * 25 + i * s * 11)} L${f(sx + s * 2)} ${f(top - s * 25 + i * s * 11)}`).join(''), stroke: p.secondary, sw: u * 0.3 })
  }
  els.push({ t: 'path', d: `M${f(cx - w * 0.45)} ${f(top)} C${f(cx - w * 1.05)} ${f(top + h * 0.15)} ${f(cx - w * 1.05)} ${f(base)} ${f(cx)} ${f(base)} C${f(cx + w * 1.05)} ${f(base)} ${f(cx + w * 1.05)} ${f(top + h * 0.15)} ${f(cx + w * 0.45)} ${f(top)}Z`, fill: p.accent })
  els.push({ t: 'path', d: `M${f(cx - w * 0.8)} ${f(top + h * 0.45)} L${f(cx + w * 0.8)} ${f(top + h * 0.45)}`, stroke: p.paper, sw: s * 2 })
  els.push({ t: 'rect', x: cx - w * 0.5, y: top - s * 4, w, h: s * 5, r: s * 2, fill: mix(p.accent, '#000000', 0.2) })
  for (const [dx, r] of [[-0.3, 6], [0, 8], [0.3, 6.4]] as const) els.push({ t: 'circle', cx: cx + w * dx, cy: top - s * 6, r: s * r, fill: '#FFFFFF' })
  return els
}

const wreathMedallion =
  (kind: 'wreath' | 'pookalam'): Comp =>
  (ctx, fest) => {
    const { W, H, p, c } = ctx
    const u = unit(ctx)
    const w = words(c, fest)
    const R = Math.min(W, H) * (kind === 'wreath' ? 0.42 : 0.45)
    const cx = W / 2
    const cy = H / 2
    const els: El[] = [bgRect(ctx, kind === 'wreath' ? p.secondary : p.paper)]
    if (kind === 'wreath') {
      els.push(sparkles(20, 13, { x: 0, y: 0, w: W, h: H }, u * 0.9, '#FFFFFF'))
      els.push({ t: 'circle', cx, cy, r: R * 0.84, fill: p.paper })
      els.push(...wreath(cx, cy, R * 0.9, R * 0.1, p, u * 0.2))
      els.push({ t: 'path', d: `M${f(cx)} ${f(cy + R * 0.9)} L${f(cx - R * 0.16)} ${f(cy + R * 0.8)} L${f(cx - R * 0.16)} ${f(cy + R * 1.0)}Z M${f(cx)} ${f(cy + R * 0.9)} L${f(cx + R * 0.16)} ${f(cy + R * 0.8)} L${f(cx + R * 0.16)} ${f(cy + R * 1.0)}Z`, fill: p.accent })
    } else {
      const shades = [p.primary, p.accent, p.secondary, mix(p.primary, p.accent, 0.5)]
      els.push({ t: 'circle', cx, cy, r: R, fill: shades[0] }, { t: 'path', d: seal(cx, cy, R * 0.95, 32, 0.12), fill: shades[1] }, { t: 'path', d: seal(cx, cy, R * 0.88, 24, 0.14), fill: shades[2] }, { t: 'path', d: seal(cx, cy, R * 0.82, 16, 0.12), fill: shades[3] })
      els.push({ t: 'circle', cx, cy, r: R * 0.78, fill: p.paper })
      let ring = ''
      for (let i = 0; i < 28; i++) {
        const a = (Math.PI * 2 * i) / 28
        ring += seal(cx + Math.cos(a) * R * 1.08, cy + Math.sin(a) * R * 1.08, R * 0.04, 6, 0.4)
      }
      els.push({ t: 'path', d: ring, fill: p.secondary })
    }
    // The largest box that sits comfortably inside the inner circle.
    const ir = R * (kind === 'wreath' ? 0.78 : 0.75)
    els.push(...stack({ x: cx - ir * 0.8, y: cy - ir * 0.68, w: ir * 1.6, h: ir * 1.36 }, 'center', 'center', kind === 'wreath' ? invitation(w, ink(p, 'serif', { head: p.primary, ink: p.ink }), u) : classic(w, ink(p, ctx.f.head), u), w.logo))
    return els
  }

const hangingWordmark =
  (kind: 'baubles' | 'round'): Comp =>
  (ctx, fest) => {
    const { W, H, p, c } = ctx
    const u = unit(ctx)
    const w = words(c, fest)
    const n = Math.max(4, Math.round(W / (u * 17)))
    const els: El[] = [bgRect(ctx, p.paper)]
    let lowest = 0
    for (let i = 0; i < n; i++) {
      const cx = (W * (i + 0.5)) / n
      if (kind === 'baubles') {
        const len = u * (6 + ((i * 5) % 4) * 4)
        const r = u * (i % 2 ? 3.6 : 5)
        const col = [p.primary, p.accent, p.secondary][i % 3]
        els.push({ t: 'line', x1: cx, y1: 0, x2: cx, y2: len, stroke: p.accent, sw: u * 0.25 }, { t: 'rect', x: cx - r * 0.3, y: len, w: r * 0.6, h: r * 0.35, fill: p.accent }, { t: 'circle', cx, cy: len + r * 1.3, r, fill: col }, { t: 'circle', cx: cx - r * 0.35, cy: len + r, r: r * 0.2, fill: '#FFFFFF', opacity: 0.6 })
        lowest = Math.max(lowest, len + r * 2.4)
      } else {
        const lw = Math.min(u * 11, W / (n * 1.7))
        const drop = u * (3 + ((i * 7) % 3) * 3)
        els.push(...lantern('round', cx, drop, lw, p, u * 0.3))
        lowest = Math.max(lowest, drop + lw * 1.25)
      }
    }
    const top = lowest + u * 5
    const pieces = kind === 'round' && w.year ? (k: number): Piece[] => [...wordmark(w, ink(p, ctx.f.head), u)(k).slice(0, 3), { t: 'text', text: w.year, size: u * 10 * k, color: p.accent, font: ctx.f.head, bold: true, track: 0.2, after: u * 3 }, ...closing(w, ink(p, ctx.f.head), u, k)] : wordmark(w, ink(p, ctx.f.head), u)
    els.push(...stack({ x: u * 10, y: top, w: W - u * 20, h: H - top - u * 8 }, 'center', 'center', pieces, w.logo))
    return els
  }

/** A band across the bottom holds the text: headline left, sign-off right on wide layouts. */
const bottomBand =
  (art: (ctx: RenderCtx, bandTop: number) => El[], bandFill: 'paper' | 'secondary'): Comp =>
  (ctx, fest) => {
    const { W, H, p, c } = ctx
    const u = unit(ctx)
    const w = words(c, fest)
    const bandTop = H * (isWide(ctx) ? 0.5 : 0.52)
    const els: El[] = [bgRect(ctx, bandFill === 'paper' ? p.secondary : p.paper), ...art(ctx, bandTop)]
    const bg = bandFill === 'paper' ? p.paper : p.secondary
    els.push({ t: 'rect', x: -ctx.bleed, y: bandTop, w: W + 2 * ctx.bleed, h: H - bandTop + ctx.bleed, fill: bg })
    els.push({ t: 'rect', x: -ctx.bleed, y: bandTop, w: W + 2 * ctx.bleed, h: u * 1.2, fill: p.accent })
    const c2 = ink({ ...p, paper: bg }, ctx.f.head)
    if (W > H * 0.95) {
      const lw = (W - u * 26) * 0.5
      const dx = u * 13 + lw
      els.push(...stack({ x: u * 9, y: bandTop + u * 7, w: lw, h: H - bandTop - u * 14 }, 'left', 'center', headlineOnly(w, c2, u, 14)))
      els.push({ t: 'line', x1: dx, y1: bandTop + u * 8, x2: dx, y2: H - u * 8, stroke: c2.accent, sw: u * 0.3 })
      els.push(...stack({ x: dx + u * 4, y: bandTop + u * 7, w: W - dx - u * 13, h: H - bandTop - u * 14 }, 'left', 'center', closingOnly(w, c2, u), w.logo))
    } else els.push(...stack({ x: u * 9, y: bandTop + u * 7, w: W - u * 18, h: H - bandTop - u * 13 }, 'left', 'center', (k) => [...headlineOnly(w, c2, u, 12)(k), { t: 'rule', kind: 'line', w: u * 14, sw: u * 0.35 * k, color: c2.accent, after: u * 3 }, ...closing(w, c2, u, k)], w.logo))
    return els
  }

const sunriseArt = (ctx: RenderCtx, bandTop: number): El[] => {
  const { W, p } = ctx
  const u = unit(ctx)
  let rays = ''
  for (let i = 0; i < 20; i += 2) {
    const a0 = Math.PI + (Math.PI * i) / 20
    const a1 = Math.PI + (Math.PI * (i + 1)) / 20
    rays += poly([[W / 2, bandTop], [W / 2 + Math.cos(a0) * W, bandTop + Math.sin(a0) * W], [W / 2 + Math.cos(a1) * W, bandTop + Math.sin(a1) * W]])
  }
  return [{ t: 'path', d: rays, fill: p.accent, opacity: 0.18 }, { t: 'circle', cx: W / 2, cy: bandTop, r: u * 18, fill: p.primary }, ...toran(-u * 2, W + u * 2, u * 2, u * 5, u * 2.4, p, u * 0.4)]
}

const snowArt = (ctx: RenderCtx, bandTop: number): El[] => {
  const { W, H, p } = ctx
  const u = unit(ctx)
  const rand = rng(13)
  let d = ''
  for (let i = 0; i < 16; i++) d += snowflake(rand() * W, u * 6 + rand() * (bandTop - u * 18), u * (1.5 + rand() * 2.5))
  return [{ t: 'path', d, stroke: '#FFFFFF', sw: u * 0.3, opacity: 0.8 }, { t: 'path', d: hills(W, H, bandTop - u * 6, u * 4, ctx.bleed), fill: mix(p.paper, '#FFFFFF', 0.6) }, ...tree(W * 0.22, bandTop - u * 26, u * 22, { ...p, secondary: TRUNK }), ...tree(W * 0.78, bandTop - u * 20, u * 16, { ...p, secondary: TRUNK })]
}

const holiLetters: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const colors = [p.primary, p.secondary, p.accent, mix(p.primary, p.accent, 0.5)]
  const els: El[] = [bgRect(ctx, p.paper)]
  const corners: [number, number][] = [[0, 0], [W, 0], [0, H], [W, H]]
  corners.forEach(([x, y], i) => els.push({ t: 'path', d: blob(x, y, u * 22, i + 2), fill: colors[i], opacity: 0.85 }, ...powder(x + (x ? -u * 18 : u * 18), y + (y ? -u * 14 : u * 14), u * 10, colors[(i + 1) % 4], i * 7 + 1)))
  els.push(...stack({ x: u * 14, y: u * 16, w: W - u * 28, h: H - u * 32 }, 'center', 'center', wordmark(w, ink(p, 'sans', { head: p.ink, accent: p.primary }), u, colors), w.logo))
  return els
}

const holiEditorial: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const colors = [p.primary, p.secondary, p.accent]
  const els: El[] = [bgRect(ctx, p.paper)]
  colors.forEach((col, i) => els.push(...powder(W * (0.7 + i * 0.12), u * (10 + i * 8), u * 14, col, 40 + i)))
  colors.forEach((col, i) => els.push(...powder(W * (0.1 + i * 0.1), H - u * (6 + i * 4), u * 8, col, 60 + i)))
  const top = isTall(ctx) ? H * 0.28 : u * 10
  els.push(...stack({ x: u * 10, y: top, w: isTall(ctx) ? W - u * 20 : W * 0.6, h: H - top - u * 18 }, 'left', 'center', editorial(w, ink(p, ctx.f.head, { head: p.ink }), u), w.logo))
  return els
}

const eidArch: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const aw = Math.min(W - u * 16, isWide(ctx) ? H * 0.95 : W)
  const ax = (W - aw) / 2
  const top = u * 10
  const els: El[] = [bgRect(ctx, p.paper), { t: 'path', d: skyline(0, W, H + ctx.bleed, H * 0.16), fill: p.secondary, opacity: 0.5 }]
  els.push({ t: 'path', d: domeArch(ax, top, aw, H - u * 8), fill: p.secondary }, { t: 'path', d: domeArch(ax + u * 2, top + u * 2, aw - u * 4, H - u * 10), stroke: p.accent, sw: u * 0.3 })
  const r = aw * 0.12
  els.push({ t: 'path', d: crescent(W / 2 - r * 0.1, top + aw * 0.28, r), fill: p.accent }, { t: 'path', d: star(W / 2 + r * 0.65, top + aw * 0.28 - r * 0.2, r * 0.22), fill: p.accent })
  const y0 = top + aw * 0.28 + r + u * 5
  els.push(...stack({ x: ax + u * 9, y: y0, w: aw - u * 18, h: H - u * 16 - y0 }, 'center', 'center', invitation(w, ink(p, 'serif', { head: p.ink }), u), w.logo))
  return els
}

const eidLanterns: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const els: El[] = [bgRect(ctx, p.paper), sparkles(18, 11, { x: u * 4, y: u * 4, w: W - u * 8, h: H * 0.4 }, u * 1, p.accent)]
  const lw = u * (isWide(ctx) ? 8 : 11)
  let lowest = 0
  ;[0.14, 0.86, 0.32, 0.68].forEach((x, i) => {
    const drop = u * (i < 2 ? 14 : 5)
    els.push(...lantern('fanous', W * x, drop, i < 2 ? lw : lw * 0.75, p, u * 0.3))
    if (i >= 2) lowest = Math.max(lowest, drop + lw * 0.75 * 1.35)
  })
  const top = Math.max(lowest, u * 14) + u * 4
  els.push(...stack({ x: W * 0.22, y: top, w: W * 0.56, h: H - top - u * 10 }, 'center', 'center', spaced(w, ink(p, ctx.f.head, { head: p.ink }), u), w.logo))
  return els
}

const rakhiThread: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const y = u * 20
  let thread = `M${f(-ctx.bleed)} ${f(y)}`
  for (let x = 0; x <= W + ctx.bleed; x += u * 6) thread += ` Q${f(x + u * 1.5)} ${f(y + u * 1.6)} ${f(x + u * 3)} ${f(y)} T${f(x + u * 6)} ${f(y)}`
  const els: El[] = [bgRect(ctx, p.paper), { t: 'path', d: dotGrid(0, H - u * 18, W, u * 18, u * 4, u * 0.4), fill: p.accent, opacity: 0.35 }, { t: 'path', d: thread, stroke: p.secondary, sw: u * 0.8 }]
  let beads = ''
  for (const sx of [-1, 1]) for (let i = 1; i <= 3; i++) beads += seal(W / 2 + sx * u * (13 + i * 6), y, u * 1.4, 8, 0.25)
  els.push({ t: 'path', d: beads, fill: p.accent })
  els.push({ t: 'path', d: seal(W / 2, y, u * 12, 14, 0.25), fill: p.primary }, { t: 'path', d: seal(W / 2, y, u * 8.5, 10, 0.35), fill: p.accent }, { t: 'circle', cx: W / 2, cy: y, r: u * 4.2, fill: p.secondary }, { t: 'path', d: rings(W / 2, y, u * 2, u * 1, 2), stroke: p.paper, sw: u * 0.4 })
  els.push(...stack({ x: u * 10, y: y + u * 17, w: W - u * 20, h: H - y - u * 37 }, 'center', 'center', wordmark(w, ink(p, ctx.f.head), u), w.logo))
  return els
}

const toranInvitation: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const m = u * 9
  const els: El[] = [bgRect(ctx, p.secondary)]
  els.push({ t: 'rect', x: m, y: u * 14, w: W - 2 * m, h: H - u * 14 - m, r: u * 2, fill: p.paper }, { t: 'rect', x: m + u * 2, y: u * 16, w: W - 2 * m - u * 4, h: H - u * 18 - m, r: u * 1.5, stroke: p.primary, sw: u * 0.3, dash: [u * 1.2, u * 0.8] })
  els.push(...toran(-u * 2, W + u * 2, u * 3, u * 9, u * 2.8, { ...p, secondary: mix(p.secondary, '#000000', 0.35) }, u * 0.4))
  els.push({ t: 'path', d: dotRings(W / 2, H - m, u * 8, u * 4, 3, u * 0.45), fill: p.primary, opacity: 0.5 })
  els.push(...stack({ x: m + u * 8, y: u * 28, w: W - 2 * m - u * 16, h: H - u * 28 - m - u * 22 }, 'center', 'center', invitation(w, ink(p, 'serif'), u), w.logo))
  return els
}

const navratriEditorial: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const R = Math.min(W, H) * 0.5
  const cx = W
  const cy = H * 0.5
  const els: El[] = [bgRect(ctx, p.paper), { t: 'path', d: dotRings(cx, cy, R * 0.25, R * 0.14, 6, u * 0.5), fill: p.accent, opacity: 0.6 }]
  const stick = (rot: number): El => {
    const len = u * 30
    const sx = W - u * 22
    const sy = u * 22
    const children: El[] = [{ t: 'rect', x: sx - u, y: sy - len / 2, w: u * 2, h: len, r: u, fill: p.primary }]
    for (let i = 1; i < 6; i++) children.push({ t: 'rect', x: sx - u, y: sy - len / 2 + (len * i) / 6, w: u * 2, h: u * 1.2, fill: i % 2 ? p.accent : p.secondary })
    return { t: 'group', cx: sx, cy: sy, rot, children }
  }
  els.push(stick(-35), stick(35), { t: 'path', d: seal(W - u * 22, u * 22, u * 3, 10, 0.35), fill: p.accent })
  const tall = isTall(ctx)
  els.push(...stack({ x: u * 10, y: tall ? u * 44 : u * 10, w: tall ? W - u * 20 : W * 0.58, h: tall ? H - u * 54 : H - u * 20 }, 'left', 'center', editorial(w, ink(p, ctx.f.head), u), w.logo))
  return els
}

const kitesBottom: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const els: El[] = [bgRect(ctx, p.paper)]
  // Clouds.
  for (const [x, y, s] of [[0.12, 0.08, 1], [0.6, 0.16, 0.8], [0.9, 0.05, 0.7]] as const) els.push(...[-1, 0, 1].map((dx): El => ({ t: 'circle', cx: W * x + dx * u * 5 * s, cy: H * y + (dx ? u * 1.5 : 0), r: u * (dx ? 4 : 5.5) * s, fill: '#FFFFFF', opacity: 0.9 })))
  const tall = isTall(ctx)
  const kites: [number, number, number, number][] = tall ? [[0.25, 0.14, 8, -15], [0.72, 0.24, 7, 12], [0.48, 0.36, 5, -5]] : [[0.65, 0.2, 7, -12], [0.86, 0.42, 6, 10], [0.72, 0.66, 4.5, -4]]
  els.push({ t: 'path', d: kites.map(([x, y]) => `M${f(W * x)} ${f(H * y)} Q${f(W * x - u * 8)} ${f(H * 0.8)} ${f(W * 0.05)} ${f(H + ctx.bleed)}`).join(''), stroke: p.ink, sw: u * 0.18, opacity: 0.35 })
  kites.forEach(([x, y, s, rot], i) => els.push(kite(W * x, H * y, u * s, rot, [p.primary, p.secondary, p.accent][i], [p.accent, p.primary, p.secondary][i], u * 0.3)))
  const box = tall ? { x: u * 10, y: H * 0.52, w: W - u * 20, h: H * 0.48 - u * 10 } : { x: u * 10, y: u * 10, w: W * 0.5, h: H - u * 20 }
  els.push(...stack(box, 'left', tall ? 'bottom' : 'center', editorial(w, ink(p, ctx.f.head), u), w.logo))
  return els
}

const lohriPoster: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const tall = isTall(ctx)
  const cx = tall ? W / 2 : W * 0.72
  const base = H - u * 10
  const s = tall ? 1 : 0.85
  const els: El[] = [bgRect(ctx, p.paper), { t: 'circle', cx, cy: base - u * 12 * s, r: u * 28 * s, fill: p.accent, opacity: 0.12 }]
  els.push({ t: 'group', cx, cy: base, rot: 18, children: [{ t: 'rect', x: cx - u * 15 * s, y: base - u * 1.8, w: u * 30 * s, h: u * 3.6, r: u * 1.8, fill: p.secondary }] }, { t: 'group', cx, cy: base, rot: -18, children: [{ t: 'rect', x: cx - u * 15 * s, y: base - u * 1.8, w: u * 30 * s, h: u * 3.6, r: u * 1.8, fill: mix(p.secondary, '#000000', 0.2) }] })
  els.push({ t: 'path', d: flame(cx, base - u * 2, u * 12 * s, u * 28 * s), fill: p.primary }, { t: 'path', d: flame(cx - u * 7 * s, base - u * 2, u * 6 * s, u * 16 * s) + flame(cx + u * 7 * s, base - u * 2, u * 6 * s, u * 18 * s), fill: p.primary }, { t: 'path', d: flame(cx, base - u * 2, u * 6.5 * s, u * 17 * s), fill: p.accent }, { t: 'path', d: flame(cx, base - u * 2, u * 3 * s, u * 8 * s), fill: '#FFF7D6' })
  const rand = rng(61)
  let sparks = ''
  for (let i = 0; i < 26; i++) {
    const x = cx + (rand() - 0.5) * u * 40 * s
    const y = base - u * 30 * s - rand() * u * 14
    sparks += `M${f(x - u * 0.4)} ${f(y)}a${f(u * 0.4)} ${f(u * 0.4)} 0 1 0 ${f(u * 0.8)} 0a${f(u * 0.4)} ${f(u * 0.4)} 0 1 0 ${f(-u * 0.8)} 0Z`
  }
  els.push({ t: 'path', d: sparks, fill: p.accent })
  const box = tall ? { x: u * 10, y: u * 9, w: W - u * 20, h: base - u * 46 - u * 9 } : { x: u * 9, y: u * 9, w: W * 0.48, h: H - u * 18 }
  els.push(...stack(box, tall ? 'center' : 'left', tall ? 'top' : 'center', tall ? wordmark(w, ink(p, ctx.f.head, { head: p.accent, accent: p.primary }), u) : editorial(w, ink(p, ctx.f.head, { head: p.accent }), u), w.logo))
  return els
}

const easterFrame: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const els: El[] = [bgRect(ctx, p.paper), { t: 'path', d: hills(W, H, H - u * 10, u * 2, ctx.bleed), fill: p.secondary }]
  const n = Math.max(3, Math.round(W / (u * 22)))
  for (let i = 0; i < n; i++) els.push(...egg((W * (i + 0.5)) / n, H - u * 14, u * 6, u * 8, p, i, u * 0.5))
  // Daisies along the top.
  for (let i = 0; i < n + 1; i++) {
    const x = (W * i) / n
    els.push({ t: 'path', d: seal(x, u * 7, u * 4, 10, 0.45), fill: '#FFFFFF', stroke: mix(p.secondary, '#000000', 0.15), sw: u * 0.15 }, { t: 'circle', cx: x, cy: u * 7, r: u * 1.3, fill: p.accent })
  }
  els.push(...stack({ x: u * 12, y: u * 17, w: W - u * 24, h: H - u * 17 - u * 28 }, 'center', 'center', classic(w, ink(p, ctx.f.head), u), w.logo))
  return els
}

const harvestMagazine: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const colors = [p.primary, p.accent, p.secondary, mix(p.primary, p.accent, 0.5)]
  const els: El[] = [bgRect(ctx, p.paper)]
  const rand = rng(71)
  const wide = isWide(ctx)
  // A cascade of leaves down the right edge (or along the top on tall layouts).
  const art: Box = wide ? { x: W * 0.62, y: 0, w: W * 0.38, h: H } : { x: 0, y: 0, w: W, h: H * 0.3 }
  els.push({ t: 'circle', cx: art.x + art.w * 0.6, cy: art.y + art.h * 0.5, r: Math.min(art.w, art.h) * 0.42, fill: p.secondary, opacity: 0.18 })
  for (let i = 0; i < 22; i++) {
    const x = art.x + u * 4 + rand() * (art.w - u * 8)
    const y = art.y + u * 4 + rand() * (art.h - u * 8)
    els.push(leaf(x, y, u * (3.5 + rand() * 3), Math.round(rand() * 360), colors[i % 4], mix(colors[i % 4], '#000000', 0.3), u * 0.3))
  }
  const box = wide ? { x: u * 9, y: u * 9, w: W * 0.55 - u * 9, h: H - u * 18 } : { x: u * 9, y: H * 0.3 + u * 4, w: W - u * 18, h: H * 0.7 - u * 13 }
  els.push(...stack(box, 'left', 'center', (k) => [...headlineOnly(w, ink(p, ctx.f.head), u, 13)(k), { t: 'rule', kind: 'bar', w: u * 12, sw: u * 0.8 * k, color: p.primary, after: u * 3.5 }, ...closing(w, ink(p, ctx.f.head), u, k, { measure: 64 })], w.logo))
  return els
}

const menorahSpaced: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const els: El[] = [bgRect(ctx, p.paper), sparkles(24, 81, { x: u * 3, y: u * 3, w: W - u * 6, h: H - u * 6 }, u * 0.8, p.accent)]
  if (isWide(ctx)) {
    const mw = Math.min(W * 0.36, H * 1.1)
    els.push(...menorah(W * 0.26, H - u * 16, mw, p))
    els.push(...stack({ x: W * 0.5, y: u * 10, w: W * 0.44, h: H - u * 20 }, 'center', 'center', spaced(w, ink(p, ctx.f.head, { head: p.ink }), u), w.logo))
  } else {
    const mw = W * 0.56
    els.push(...menorah(W / 2, u * 8 + mw * 0.75, mw, p))
    els.push(...stack({ x: u * 10, y: u * 14 + mw * 0.75, w: W - u * 20, h: H - mw * 0.75 - u * 22 }, 'center', 'center', spaced(w, ink(p, ctx.f.head, { head: p.ink }), u), w.logo))
  }
  return els
}

const ganeshMarigold: Comp = (ctx, fest) => {
  const { W, H, p, c } = ctx
  const u = unit(ctx)
  const w = words(c, fest)
  const els: El[] = [bgRect(ctx, p.paper)]
  // Vertical marigold strings down both sides.
  for (const x of [u * 6, W - u * 6]) {
    const n = Math.round(H / (u * 5.5))
    els.push({ t: 'line', x1: x, y1: 0, x2: x, y2: H, stroke: p.secondary, sw: u * 0.3 })
    for (let i = 0; i < n; i++) els.push({ t: 'path', d: seal(x, u * 3 + i * u * 5.5, u * 2.4, 12, 0.3), fill: i % 2 ? p.accent : p.primary })
  }
  els.push({ t: 'path', d: dotRings(W / 2, u * 22, u * 4, u * 4, 3, u * 0.45), fill: p.primary, opacity: 0.6 }, { t: 'path', d: seal(W / 2, u * 22, u * 3.5, 8, 0.4), fill: p.accent })
  els.push(...stack({ x: u * 16, y: u * 38, w: W - u * 32, h: H - u * 48 }, 'center', 'center', wordmark(w, ink(p, ctx.f.head), u), w.logo))
  return els
}

const onamSplitPookalam = wreathMedallion('pookalam')

// ---------------------------------------------------------------------------
// Templates

const P = (primary: string, secondary: string, accent: string, ink2 = '#1F2937', paper = '#FFFFFF'): Palette => ({ primary, secondary, accent, ink: ink2, paper })

function def(id: string, name: string, family: string, tags: string[], orientation: TemplateDef['orientation'], comp: Comp, fest: FestId, palette: Palette, head: FontFamily, uses: { photo?: boolean; year?: boolean } = {}): TemplateDef {
  return {
    id,
    name,
    family,
    tags,
    orientation,
    palette,
    fonts: { head, body: 'sans' },
    unused: [...(uses.photo ? [] : ['photo']), ...(uses.year ? [] : ['year'])],
    render: (ctx) => [page(comp(ctx, FEST[fest]))],
  }
}

export const GREETING_TEMPLATES: TemplateDef[] = [
  def('fg-diwali-wordmark', 'Diwali Diya Wordmark', 'Diwali', ['deepavali', 'diya', 'lamps', 'wordmark'], 'square', diwaliWordmark, 'diwali', P('#FBBF24', '#B45309', '#F59E0B', '#F5E9FF', '#24082F'), 'serif'),
  def('fg-diwali-arch', 'Diwali Jharokha Arch', 'Diwali', ['deepavali', 'arch', 'window', 'elegant'], 'portrait', diwaliArch, 'diwali', P('#9F1239', '#7F1D1D', '#D97706', '#3B0A0A', '#FFF8EC'), 'serif'),
  def('fg-diwali-editorial', 'Diwali Rangoli Editorial', 'Diwali', ['deepavali', 'rangoli', 'modern', 'left aligned'], 'square', diwaliEditorial, 'diwali', P('#BE185D', '#F59E0B', '#7C3AED', '#2E1065', '#FFF7ED'), 'sans'),
  def('fg-diwali-lights', 'Diwali Fairy Lights', 'Diwali', ['deepavali', 'lights', 'banner', 'night'], 'landscape', diwaliLights, 'diwali', P('#F472B6', '#38BDF8', '#FCD34D', '#FFF7ED', '#111633'), 'serif'),
  def('fg-diwali-polaroid', 'Diwali Polaroid', 'Diwali', ['deepavali', 'family photo', 'photo', 'polaroid'], 'portrait', polaroid('diwali'), 'diwali', P('#C2410C', '#FDBA74', '#B45309', '#292524', '#FFF7ED'), 'serif', { photo: true }),
  def('fg-newyear-ticket', 'New Year Party Ticket', 'New Year', ['new year', 'ticket', 'party', 'invite'], 'landscape', nyTicket, 'newYear', P('#E11D48', '#1E1B4B', '#F59E0B', '#111827', '#FFF7E6'), 'sans', { year: true }),
  def('fg-newyear-numerals', 'New Year Big Numbers', 'New Year', ['new year', 'typography', 'confetti', 'bold'], 'portrait', nyNumerals, 'newYear', P('#4F46E5', '#F472B6', '#F59E0B', '#111827', '#F5F3FF'), 'sans', { year: true }),
  def('fg-newyear-invitation', 'New Year Gold Invitation', 'New Year', ['new year', 'gold', 'elegant', 'corporate'], 'square', goldInvitation(true), 'newYear', P('#D4AF37', '#1F2937', '#D4AF37', '#F9FAFB', '#0E0E10'), 'serif', { year: true }),
  def('fg-newyear-magazine', 'New Year Fireworks Cover', 'New Year', ['new year', 'fireworks', 'magazine', 'poster'], 'portrait', fireworksMagazine, 'newYear', P('#06B6D4', '#A855F7', '#F43F5E', '#0F172A', '#FAFAF9'), 'sans', { year: true }),
  def('fg-christmas-split', 'Christmas Tree Panel', 'Christmas', ['christmas', 'xmas', 'tree', 'banner'], 'landscape', splitPanel(treeArt, 'editorial'), 'christmas', P('#22C55E', '#14532D', '#FACC15', '#1F2937', '#FFFBF2'), 'serif'),
  def('fg-christmas-wreath', 'Christmas Wreath', 'Christmas', ['christmas', 'xmas', 'wreath', 'holiday'], 'square', wreathMedallion('wreath'), 'christmas', P('#166534', '#B91C1C', '#DC2626', '#1F2937', '#FFFBF5'), 'serif'),
  def('fg-christmas-baubles', 'Christmas Baubles Wordmark', 'Christmas', ['christmas', 'xmas', 'ornaments'], 'portrait', hangingWordmark('baubles'), 'christmas', P('#B91C1C', '#166534', '#CA8A04', '#1F2937', '#FDF8F3'), 'serif'),
  def('fg-christmas-snow', 'Christmas Snowy Night', 'Christmas', ['christmas', 'xmas', 'snow', 'winter', 'night'], 'square', bottomBand(snowArt, 'secondary'), 'christmas', P('#15803D', '#FFFFFF', '#DC2626', '#1F2937', '#1E3A5F'), 'serif'),
  def('fg-christmas-invitation', 'Season’s Greetings Invitation', 'Christmas', ['christmas', 'holiday', 'corporate', 'elegant'], 'portrait', goldInvitation(false), 'christmas', P('#C9A227', '#14532D', '#C9A227', '#F3F6F1', '#0F2E1D'), 'serif'),
  def('fg-holi-letters', 'Holi Colour Letters', 'Holi', ['holi', 'colours', 'gulal', 'playful'], 'square', holiLetters, 'holi', P('#EC4899', '#22C55E', '#F59E0B', '#1F2937', '#FFFFFF'), 'sans'),
  def('fg-holi-editorial', 'Holi Powder Clouds', 'Holi', ['holi', 'colours', 'rang', 'modern'], 'portrait', holiEditorial, 'holi', P('#8B5CF6', '#06B6D4', '#F43F5E', '#1F2937', '#FFFBF0'), 'sans'),
  def('fg-eid-arch', 'Eid Dome Arch', 'Eid', ['eid', 'eid al-fitr', 'eid al-adha', 'moon', 'arch'], 'portrait', eidArch, 'eid', P('#0F766E', '#134E4A', '#FCD34D', '#F0FDFA', '#042F2E'), 'serif'),
  def('fg-eid-lanterns', 'Eid Lantern Night', 'Eid', ['eid', 'fanous', 'lantern'], 'square', eidLanterns, 'eid', P('#B45309', '#1E3A8A', '#FDE68A', '#EFF6FF', '#172554'), 'serif'),
  def('fg-ramadan-split', 'Ramadan Crescent Panel', 'Eid', ['ramadan', 'ramzan', 'moon', 'banner'], 'landscape', splitPanel(crescentArt, 'editorial'), 'ramadan', P('#4338CA', '#1E1B4B', '#FBBF24', '#1F2937', '#FAF7F0'), 'serif'),
  def('fg-raksha-bandhan', 'Raksha Bandhan Thread', 'Raksha Bandhan', ['rakhi', 'raksha bandhan', 'brother', 'sister'], 'square', rakhiThread, 'rakhi', P('#E11D48', '#F59E0B', '#FB923C', '#4C0519', '#FFF1F2'), 'serif'),
  def('fg-ganesh-marigold', 'Ganesh Chaturthi Marigold', 'Ganesh Chaturthi', ['ganesh chaturthi', 'ganpati', 'vinayaka', 'marigold'], 'portrait', ganeshMarigold, 'ganesh', P('#EA580C', '#15803D', '#FACC15', '#431407', '#FFF7ED'), 'serif'),
  def('fg-navratri-garba', 'Navratri Garba Circles', 'Navratri', ['navratri', 'garba', 'dandiya', 'durga puja'], 'square', navratriEditorial, 'navratri', P('#FDE047', '#F97316', '#F472B6', '#FDF2F8', '#4A0D2C'), 'sans'),
  def('fg-dussehra-sunrise', 'Dussehra Sunrise', 'Dussehra', ['dussehra', 'vijayadashami', 'dasara', 'banner'], 'landscape', bottomBand(sunriseArt, 'paper'), 'dussehra', P('#EA580C', '#FFF3D6', '#B91C1C', '#431407', '#FFFBEB'), 'serif'),
  def('fg-durga-invitation', 'Festive Toran Invitation', 'Navratri', ['durga puja', 'navratri', 'toran', 'puja invitation'], 'portrait', toranInvitation, 'navratri', P('#B91C1C', '#FDE68A', '#D97706', '#3F0D0D', '#FFFDF7'), 'serif'),
  def('fg-sankranti-kites', 'Makar Sankranti Sky', 'Sankranti', ['makar sankranti', 'uttarayan', 'kites', 'harvest'], 'portrait', kitesBottom, 'sankranti', P('#E11D48', '#2563EB', '#F59E0B', '#0C4A6E', '#DFF2FD'), 'sans'),
  def('fg-pongal', 'Pongal Pot Panel', 'Pongal', ['pongal', 'harvest', 'tamil', 'sugarcane'], 'square', splitPanel(potArt, 'classic'), 'pongal', P('#65A30D', '#FDE68A', '#B45309', '#422006', '#FFFDF5'), 'serif'),
  def('fg-onam-pookalam', 'Onam Pookalam Medallion', 'Onam', ['onam', 'pookalam', 'kerala', 'harvest'], 'square', onamSplitPookalam, 'onam', P('#EA580C', '#16A34A', '#FACC15', '#14532D', '#FFFBEB'), 'serif'),
  def('fg-lohri-bonfire', 'Lohri Bonfire Poster', 'Lohri', ['lohri', 'bonfire', 'punjabi', 'harvest'], 'portrait', lohriPoster, 'lohri', P('#EA580C', '#78350F', '#FACC15', '#FFF7ED', '#1C0A00'), 'sans'),
  def('fg-easter-meadow', 'Easter Meadow', 'Easter', ['easter', 'eggs', 'spring', 'flowers'], 'square', easterFrame, 'easter', P('#EC4899', '#86EFAC', '#60A5FA', '#1F2937', '#FEFCE8'), 'sans'),
  def('fg-thanksgiving', 'Thanksgiving Harvest Cover', 'Thanksgiving', ['thanksgiving', 'autumn', 'fall', 'harvest'], 'landscape', harvestMagazine, 'thanksgiving', P('#C2410C', '#A16207', '#B91C1C', '#292524', '#FEF6E4'), 'serif'),
  def('fg-lunar-new-year', 'Lunar New Year Lanterns', 'Lunar New Year', ['lunar new year', 'chinese new year', 'spring festival', 'lantern'], 'portrait', hangingWordmark('round'), 'lunar', P('#FCD34D', '#991B1B', '#FBBF24', '#FEF2F2', '#8B1414'), 'serif', { year: true }),
  def('fg-hanukkah-menorah', 'Hanukkah Menorah', 'Hanukkah', ['hanukkah', 'chanukah', 'menorah', 'festival of lights'], 'landscape', menorahSpaced, 'hanukkah', P('#FCD34D', '#C7D2FE', '#93C5FD', '#EFF6FF', '#1E2A6B'), 'serif'),
]
