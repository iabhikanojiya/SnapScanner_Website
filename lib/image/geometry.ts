// Perspective correction, rotation and document-boundary detection on raw
// pixels. Pure functions: usable in a Web Worker, the main thread or tests.
import type { Pixels } from './filters'

export interface Point {
  x: number
  y: number
}

/** Corners in order: top-left, top-right, bottom-right, bottom-left. Normalized 0..1. */
export type Quad = [Point, Point, Point, Point]

export const FULL_QUAD: Quad = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]

export function isFullQuad(q: Quad) {
  return q.every((p, i) => Math.abs(p.x - FULL_QUAD[i].x) < 1e-6 && Math.abs(p.y - FULL_QUAD[i].y) < 1e-6)
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Solves the 8×8 linear system for the homography mapping `from` → `to`. */
export function homography(from: Point[], to: Point[]): number[] {
  const A: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i]
    const { x: u, y: v } = to[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  }
  // Gaussian elimination with partial pivoting.
  const n = 8
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r
    if (Math.abs(A[pivot][col]) < 1e-12) throw new Error('Degenerate quadrilateral')
    ;[A[col], A[pivot]] = [A[pivot], A[col]]
    ;[b[col], b[pivot]] = [b[pivot], b[col]]
    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / A[col][col]
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c]
      b[r] -= f * b[col]
    }
  }
  const h = new Array<number>(n)
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]
    for (let c = r + 1; c < n; c++) s -= A[r][c] * h[c]
    h[r] = s / A[r][r]
  }
  return [...h, 1]
}

/** Output size for a quad: the longer of each pair of opposite edges, capped at maxSide. */
export function warpSize(quad: Quad, width: number, height: number, maxSide: number) {
  const px = quad.map((p) => ({ x: p.x * width, y: p.y * height }))
  let w = Math.max(dist(px[0], px[1]), dist(px[3], px[2]))
  let h = Math.max(dist(px[0], px[3]), dist(px[1], px[2]))
  const scale = Math.min(1, maxSide / Math.max(w, h))
  w = Math.max(1, Math.round(w * scale))
  h = Math.max(1, Math.round(h * scale))
  return { width: w, height: h }
}

/** Crops `quad` out of `src` and straightens it into a rectangle (bilinear sampling). */
export function warpPerspective(src: Pixels, quad: Quad, maxSide = 4000): Pixels {
  const { width, height } = warpSize(quad, src.width, src.height, maxSide)
  const dstCorners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]
  const srcCorners = quad.map((p) => ({ x: p.x * src.width, y: p.y * src.height }))
  // Inverse mapping: for each output pixel, find where it comes from.
  const H = homography(dstCorners, srcCorners)
  const out = new Uint8ClampedArray(width * height * 4)
  const s = src.data
  const sw = src.width
  const sh = src.height
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cx = x + 0.5
      const cy = y + 0.5
      const den = H[6] * cx + H[7] * cy + H[8]
      let sx = (H[0] * cx + H[1] * cy + H[2]) / den - 0.5
      let sy = (H[3] * cx + H[4] * cy + H[5]) / den - 0.5
      sx = Math.min(Math.max(sx, 0), sw - 1)
      sy = Math.min(Math.max(sy, 0), sh - 1)
      const x0 = sx | 0
      const y0 = sy | 0
      const x1 = Math.min(x0 + 1, sw - 1)
      const y1 = Math.min(y0 + 1, sh - 1)
      const fx = sx - x0
      const fy = sy - y0
      const o = (y * width + x) * 4
      const i00 = (y0 * sw + x0) * 4
      const i10 = (y0 * sw + x1) * 4
      const i01 = (y1 * sw + x0) * 4
      const i11 = (y1 * sw + x1) * 4
      for (let c = 0; c < 4; c++) {
        const top = s[i00 + c] + (s[i10 + c] - s[i00 + c]) * fx
        const bottom = s[i01 + c] + (s[i11 + c] - s[i01 + c]) * fx
        out[o + c] = top + (bottom - top) * fy
      }
    }
  }
  return { data: out, width, height }
}

/** Rotates by a multiple of 90° clockwise. */
export function rotatePixels(src: Pixels, degrees: number): Pixels {
  const turns = (((Math.round(degrees / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3
  if (turns === 0) return src
  const { width: w, height: h, data: s } = src
  const W = turns % 2 ? h : w
  const H = turns % 2 ? w : h
  const out = new Uint8ClampedArray(s.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let nx: number
      let ny: number
      if (turns === 1) {
        nx = h - 1 - y
        ny = x
      } else if (turns === 2) {
        nx = w - 1 - x
        ny = h - 1 - y
      } else {
        nx = y
        ny = w - 1 - x
      }
      const i = (y * w + x) * 4
      const o = (ny * W + nx) * 4
      out[o] = s[i]
      out[o + 1] = s[i + 1]
      out[o + 2] = s[i + 2]
      out[o + 3] = s[i + 3]
    }
  }
  return { data: out, width: W, height: H }
}

/** Scales down (box-averaged) so the long side is at most maxSide. */
export function downscale(src: Pixels, maxSide: number): Pixels {
  const scale = maxSide / Math.max(src.width, src.height)
  if (scale >= 1) return src
  const w = Math.max(1, Math.round(src.width * scale))
  const h = Math.max(1, Math.round(src.height * scale))
  const out = new Uint8ClampedArray(w * h * 4)
  const sx = src.width / w
  const sy = src.height / h
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy)
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy))
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx)
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx))
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * src.width + xx) * 4
          r += src.data[i]
          g += src.data[i + 1]
          b += src.data[i + 2]
          a += src.data[i + 3]
          n++
        }
      }
      const o = (y * w + x) * 4
      out[o] = r / n
      out[o + 1] = g / n
      out[o + 2] = b / n
      out[o + 3] = a / n
    }
  }
  return { data: out, width: w, height: h }
}

// ---------------------------------------------------------------------------
// Document boundary detection

function otsu(gray: Uint8Array): number {
  const hist = new Float64Array(256)
  for (const v of gray) hist[v]++
  const total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0
  let wB = 0
  let best = 0
  let threshold = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) ** 2
    if (between > best) {
      best = between
      threshold = t
    }
  }
  return threshold
}

function boxBlur(gray: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tmp = new Float32Array(w * h)
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0
      let n = 0
      for (let k = -r; k <= r; k++) {
        const xx = x + k
        if (xx >= 0 && xx < w) {
          s += gray[y * w + xx]
          n++
        }
      }
      tmp[y * w + x] = s / n
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0
      let n = 0
      for (let k = -r; k <= r; k++) {
        const yy = y + k
        if (yy >= 0 && yy < h) {
          s += tmp[yy * w + x]
          n++
        }
      }
      out[y * w + x] = s / n
    }
  }
  return out
}

function quadArea(q: Point[]) {
  let a = 0
  for (let i = 0; i < 4; i++) {
    const p = q[i]
    const n = q[(i + 1) % 4]
    a += p.x * n.y - n.x * p.y
  }
  return Math.abs(a) / 2
}

function isConvex(q: Point[]) {
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    const c = q[(i + 2) % 4]
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(cross) < 1e-9) return false
    const s = Math.sign(cross)
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return true
}

export interface Detection {
  quad: Quad
  /** Fraction of the image the detected page covers. */
  coverage: number
}

/**
 * Looks for a light page on a darker background: blur, Otsu threshold, take
 * the largest bright region and fit a quadrilateral to its extreme corners.
 * Returns null when no convincing page is found; callers then fall back to
 * manual cropping. Works best with contrast between paper and background.
 */
export function detectDocument(src: Pixels): Detection | null {
  const small = downscale(src, 360)
  const { width: w, height: h, data } = small
  let gray: Uint8Array = new Uint8Array(w * h)
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  gray = boxBlur(gray, w, h, 2)
  const t = otsu(gray)

  // Largest 4-connected bright component.
  const labels = new Int32Array(w * h).fill(-1)
  let bestSize = 0
  let bestLabel = -1
  let label = 0
  const stack: number[] = []
  for (let start = 0; start < gray.length; start++) {
    if (gray[start] <= t || labels[start] !== -1) continue
    let size = 0
    stack.push(start)
    labels[start] = label
    while (stack.length) {
      const i = stack.pop()!
      size++
      const x = i % w
      const y = (i - x) / w
      const neighbours = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]
      for (const n of neighbours) {
        if (n >= 0 && labels[n] === -1 && gray[n] > t) {
          labels[n] = label
          stack.push(n)
        }
      }
    }
    if (size > bestSize) {
      bestSize = size
      bestLabel = label
    }
    label++
  }
  if (bestLabel < 0) return null
  const coverage = bestSize / (w * h)
  if (coverage < 0.12 || coverage > 0.97) return null

  // A page photographed on a surface has background around it. A region that
  // runs along much of the image border is lighting or background, not a page.
  let borderHits = 0
  for (let x = 0; x < w; x++) {
    if (labels[x] === bestLabel) borderHits++
    if (labels[(h - 1) * w + x] === bestLabel) borderHits++
  }
  for (let y = 1; y < h - 1; y++) {
    if (labels[y * w] === bestLabel) borderHits++
    if (labels[y * w + w - 1] === bestLabel) borderHits++
  }
  if (borderHits / (2 * (w + h)) > 0.3) return null

  // Extreme points in the diagonal directions give the four corners.
  let tl = { x: 0, y: 0, s: Infinity }
  let br = { x: 0, y: 0, s: -Infinity }
  let tr = { x: 0, y: 0, s: -Infinity }
  let bl = { x: 0, y: 0, s: Infinity }
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] !== bestLabel) continue
    const x = i % w
    const y = (i - x) / w
    const sum = x + y
    const diff = x - y
    if (sum < tl.s) tl = { x, y, s: sum }
    if (sum > br.s) br = { x, y, s: sum }
    if (diff > tr.s) tr = { x, y, s: diff }
    if (diff < bl.s) bl = { x, y, s: diff }
  }
  const quadPx = [tl, { x: tr.x + 1, y: tr.y }, { x: br.x + 1, y: br.y + 1 }, { x: bl.x, y: bl.y + 1 }]
  if (!isConvex(quadPx)) return null
  // The region should fill most of its fitted quad; otherwise it's not a page.
  const fill = bestSize / Math.max(1, quadArea(quadPx))
  if (fill < 0.8) return null

  const quad = quadPx.map((p) => ({ x: Math.min(1, Math.max(0, p.x / w)), y: Math.min(1, Math.max(0, p.y / h)) })) as Quad
  return { quad, coverage }
}

/** Mirrors an image horizontally and/or vertically. */
export function flipPixels(src: Pixels, horizontal: boolean, vertical: boolean): Pixels {
  if (!horizontal && !vertical) return src
  const { width: w, height: h, data: s } = src
  const out = new Uint8ClampedArray(s.length)
  for (let y = 0; y < h; y++) {
    const sy = vertical ? h - 1 - y : y
    for (let x = 0; x < w; x++) {
      const sx = horizontal ? w - 1 - x : x
      const i = (sy * w + sx) * 4
      const o = (y * w + x) * 4
      out[o] = s[i]
      out[o + 1] = s[i + 1]
      out[o + 2] = s[i + 2]
      out[o + 3] = s[i + 3]
    }
  }
  return { data: out, width: w, height: h }
}
