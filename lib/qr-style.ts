// Styled QR codes for the QR Code Generator templates: module shapes, corner
// "eye" styles, gradients and frames with a label. Everything is drawn as one
// SVG, which is also rasterized for PNG downloads, so preview and files match.
// Shapes keep each module's centre dark and the quiet zone clear, so codes
// stay scannable (each template is decoded in the end-to-end tests).

export type ModuleShape = 'square' | 'rounded' | 'dots' | 'tiny' | 'bars'
export type EyeShape = 'square' | 'rounded' | 'circle' | 'leaf'
export type FrameStyle = 'none' | 'label' | 'banner' | 'badge'

export interface QrStyle {
  modules: ModuleShape
  eyes: EyeShape
  /** Second colour for a diagonal gradient across the modules. */
  gradientTo?: string
  /** Colour of the corner eyes (defaults to the foreground). */
  eyeColor?: string
  frame: FrameStyle
  /** Frame colour (defaults to the foreground). */
  frameColor?: string
}

export interface QrTemplate {
  id: string
  name: string
  fg: string
  bg: string
  style: QrStyle
}

export const QR_TEMPLATES: QrTemplate[] = [
  { id: 'classic', name: 'Classic', fg: '#111827', bg: '#ffffff', style: { modules: 'square', eyes: 'square', frame: 'none' } },
  { id: 'rounded-ink', name: 'Rounded Ink', fg: '#1e3a8a', bg: '#ffffff', style: { modules: 'rounded', eyes: 'rounded', frame: 'none' } },
  { id: 'dotty', name: 'Dotty', fg: '#5b21b6', bg: '#ffffff', style: { modules: 'dots', eyes: 'circle', frame: 'none' } },
  { id: 'ocean', name: 'Ocean Gradient', fg: '#1d4ed8', bg: '#ffffff', style: { modules: 'rounded', eyes: 'rounded', gradientTo: '#0f766e', frame: 'none' } },
  { id: 'sunset', name: 'Sunset', fg: '#c2410c', bg: '#fffaf5', style: { modules: 'dots', eyes: 'leaf', gradientTo: '#be185d', frame: 'none' } },
  { id: 'brand-red', name: 'Red Eyes', fg: '#111827', bg: '#ffffff', style: { modules: 'tiny', eyes: 'rounded', eyeColor: '#d32f2f', frame: 'none' } },
  { id: 'forest-bars', name: 'Forest Bars', fg: '#14532d', bg: '#ffffff', style: { modules: 'bars', eyes: 'leaf', frame: 'none' } },
  { id: 'scan-me', name: 'Scan Me Card', fg: '#111827', bg: '#ffffff', style: { modules: 'square', eyes: 'square', frame: 'label' } },
  { id: 'banner', name: 'Indigo Banner', fg: '#312e81', bg: '#ffffff', style: { modules: 'rounded', eyes: 'circle', frame: 'banner', frameColor: '#4338ca' } },
  { id: 'coral-badge', name: 'Coral Badge', fg: '#1f2937', bg: '#ffffff', style: { modules: 'dots', eyes: 'rounded', eyeColor: '#e11d48', frame: 'badge', frameColor: '#fb7185' } },
  { id: 'soft-grey', name: 'Soft Grey', fg: '#1f2937', bg: '#f3f4f6', style: { modules: 'rounded', eyes: 'leaf', frame: 'none' } },
  { id: 'midnight-frame', name: 'Midnight Frame', fg: '#0f172a', bg: '#ffffff', style: { modules: 'tiny', eyes: 'circle', eyeColor: '#7c3aed', frame: 'badge', frameColor: '#0f172a' } },
]

export function getTemplate(id: string) {
  return QR_TEMPLATES.find((t) => t.id === id) ?? QR_TEMPLATES[0]
}

const f = (n: number) => +n.toFixed(3)

/** True for modules that belong to one of the three 7×7 corner eyes. */
export function inEye(r: number, c: number, n: number) {
  return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
}

function roundedRect(x: number, y: number, w: number, h: number, r: [number, number, number, number]) {
  // r: top-left, top-right, bottom-right, bottom-left
  const [tl, tr, br, bl] = r
  return `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}${tr ? `A${tr} ${tr} 0 0 1 ${f(x + w)} ${f(y + tr)}` : ''}V${f(y + h - br)}${br ? `A${br} ${br} 0 0 1 ${f(x + w - br)} ${f(y + h)}` : ''}H${f(x + bl)}${bl ? `A${bl} ${bl} 0 0 1 ${f(x)} ${f(y + h - bl)}` : ''}V${f(y + tl)}${tl ? `A${tl} ${tl} 0 0 1 ${f(x + tl)} ${f(y)}` : ''}Z`
}

/** Path for the data modules (not the eyes), in module units offset by `m`. */
export function modulesPath(matrix: boolean[][], shape: ModuleShape, m: number) {
  const n = matrix.length
  const dark = (r: number, c: number) => r >= 0 && c >= 0 && r < n && c < n && matrix[r][c] && !inEye(r, c, n)
  let d = ''
  if (shape === 'square') {
    for (let r = 0; r < n; r++) {
      let c = 0
      while (c < n) {
        if (!dark(r, c)) {
          c++
          continue
        }
        let e = c
        while (e < n && dark(r, e)) e++
        d += `M${c + m} ${r + m}h${e - c}v1h-${e - c}z`
        c = e
      }
    }
    return d
  }
  if (shape === 'bars') {
    // Vertical runs with rounded ends.
    for (let c = 0; c < n; c++) {
      let r = 0
      while (r < n) {
        if (!dark(r, c)) {
          r++
          continue
        }
        let e = r
        while (e < n && dark(e, c)) e++
        const rad = 0.4
        d += roundedRect(c + m + 0.1, r + m + 0.05, 0.8, e - r - 0.1, [rad, rad, rad, rad])
        r = e
      }
    }
    return d
  }
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (!dark(r, c)) continue
      const x = c + m
      const y = r + m
      if (shape === 'dots') d += `M${f(x + 0.5 + 0.44)} ${f(y + 0.5)}A0.44 0.44 0 1 1 ${f(x + 0.5 - 0.44)} ${f(y + 0.5)}A0.44 0.44 0 1 1 ${f(x + 0.5 + 0.44)} ${f(y + 0.5)}Z`
      else if (shape === 'tiny') d += `M${f(x + 0.1)} ${f(y + 0.1)}h0.8v0.8h-0.8z`
      else {
        // Rounded: corners are rounded only where the neighbour is light, so runs stay joined.
        const up = dark(r - 1, c)
        const down = dark(r + 1, c)
        const left = dark(r, c - 1)
        const right = dark(r, c + 1)
        const k = 0.45
        d += roundedRect(x, y, 1, 1, [!up && !left ? k : 0, !up && !right ? k : 0, !down && !right ? k : 0, !down && !left ? k : 0])
      }
    }
  return d
}

/** Outer ring and inner square of one eye at (x, y), in module units. */
function eyePaths(x: number, y: number, shape: EyeShape) {
  const outer = (rad: number[]) => roundedRect(x, y, 7, 7, rad as [number, number, number, number])
  const hole = (rad: number[]) => roundedRect(x + 1, y + 1, 5, 5, rad as [number, number, number, number])
  const inner = (rad: number[]) => roundedRect(x + 2, y + 2, 3, 3, rad as [number, number, number, number])
  switch (shape) {
    case 'square':
      return { ring: outer([0, 0, 0, 0]) + hole([0, 0, 0, 0]), pupil: inner([0, 0, 0, 0]) }
    case 'rounded':
      return { ring: outer([2, 2, 2, 2]) + hole([1.4, 1.4, 1.4, 1.4]), pupil: inner([0.9, 0.9, 0.9, 0.9]) }
    case 'circle':
      return { ring: outer([3.5, 3.5, 3.5, 3.5]) + hole([2.5, 2.5, 2.5, 2.5]), pupil: inner([1.5, 1.5, 1.5, 1.5]) }
    case 'leaf':
      return { ring: outer([3, 0, 3, 0]) + hole([2.2, 0, 2.2, 0]), pupil: inner([1.4, 0, 1.4, 0]) }
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface StyledQr {
  svg: string
  /** viewBox size in module units. */
  width: number
  height: number
}

/**
 * Builds the SVG for a styled QR code. `size` sets the width in pixels; framed
 * designs with a label are taller than wide.
 */
export function styledQrSvg(matrix: boolean[][], o: { fg: string; bg: string; margin: number; style: QrStyle; label?: string; size?: number }): StyledQr {
  const n = matrix.length
  const m = o.margin
  const code = n + 2 * m
  const st = o.style
  const frameColor = st.frameColor ?? o.fg
  const label = (o.label ?? 'SCAN ME').trim().slice(0, 24) || 'SCAN ME'
  const pad = st.frame === 'none' ? 0 : st.frame === 'badge' ? Math.max(2.5, code * 0.07) : Math.max(1.5, code * 0.04)
  const band = st.frame === 'none' ? 0 : Math.max(5, code * 0.16)
  const W = code + pad * 2
  const H = st.frame === 'none' ? code : code + pad * 2 + band
  // The code area: below the banner, or above the label.
  const ox = pad
  const oy = st.frame === 'banner' ? pad + band : pad
  const fill = st.gradientTo ? 'url(#qr-grad)' : o.fg
  const eyeFill = st.eyeColor ?? (st.gradientTo ? 'url(#qr-grad)' : o.fg)

  const parts: string[] = []
  if (st.gradientTo)
    parts.push(`<defs><linearGradient id="qr-grad" gradientUnits="userSpaceOnUse" x1="${ox}" y1="${oy}" x2="${ox + code}" y2="${oy + code}"><stop offset="0" stop-color="${o.fg}"/><stop offset="1" stop-color="${st.gradientTo}"/></linearGradient></defs>`)

  // Frame.
  const fontSize = band * 0.42
  const text = (cx: number, cy: number, color: string) =>
    `<text x="${f(cx)}" y="${f(cy)}" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${f(fontSize)}" letter-spacing="${f(fontSize * 0.08)}" fill="${color}">${esc(label)}</text>`
  if (st.frame === 'label') {
    parts.push(`<path d="${roundedRect(0, 0, W, H, [code * 0.06, code * 0.06, code * 0.06, code * 0.06])}" fill="${frameColor}"/>`)
    parts.push(`<rect x="${f(ox)}" y="${f(oy)}" width="${code}" height="${code}" rx="${f(code * 0.03)}" fill="${o.bg}"/>`)
    parts.push(text(W / 2, oy + code + pad / 2 + band / 2, o.bg))
  } else if (st.frame === 'banner') {
    parts.push(`<path d="${roundedRect(0, 0, W, H, [code * 0.05, code * 0.05, code * 0.05, code * 0.05])}" fill="${o.bg}" stroke="${frameColor}" stroke-width="${f(pad * 0.6)}"/>`)
    parts.push(`<path d="${roundedRect(0, 0, W, pad + band, [code * 0.05, code * 0.05, 0, 0])}" fill="${frameColor}"/>`)
    parts.push(text(W / 2, (pad + band) / 2 + pad * 0.2, '#ffffff'))
  } else if (st.frame === 'badge') {
    parts.push(`<path d="${roundedRect(0, 0, W, H, [code * 0.12, code * 0.12, code * 0.12, code * 0.12])}" fill="${frameColor}"/>`)
    parts.push(`<rect x="${f(ox)}" y="${f(oy)}" width="${code}" height="${code}" rx="${f(code * 0.08)}" fill="${o.bg}"/>`)
    parts.push(`<rect x="${f(W / 2 - code * 0.3)}" y="${f(oy + code + pad * 0.45)}" width="${f(code * 0.6)}" height="${f(band * 0.8)}" rx="${f(band * 0.4)}" fill="${o.bg}"/>`)
    parts.push(text(W / 2, oy + code + pad * 0.45 + band * 0.4, frameColor))
  } else parts.push(`<rect width="${W}" height="${H}" fill="${o.bg}"/>`)

  // Code.
  parts.push(`<g transform="translate(${f(ox)} ${f(oy)})">`)
  parts.push(`<path d="${modulesPath(matrix, st.modules, m)}" fill="${fill}"/>`)
  for (const [ex, ey] of [
    [m, m],
    [m + n - 7, m],
    [m, m + n - 7],
  ]) {
    const e = eyePaths(ex, ey, st.eyes)
    parts.push(`<path d="${e.ring}" fill="${eyeFill}" fill-rule="evenodd"/><path d="${e.pupil}" fill="${eyeFill}"/>`)
  }
  parts.push('</g>')

  const px = o.size ?? 512
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${Math.round((px * H) / W)}" viewBox="0 0 ${f(W)} ${f(H)}" shape-rendering="${st.modules === 'square' && st.eyes === 'square' ? 'crispEdges' : 'geometricPrecision'}">${parts.join('')}</svg>`
  return { svg, width: W, height: H }
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
