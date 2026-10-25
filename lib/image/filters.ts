// The eight scan filters from the Snap Scanner app, implemented as pure
// functions over RGBA pixels so they run in a Web Worker, on the main thread
// or in Node tests.

export const SCAN_FILTERS = ['enhance', 'original', 'magic', 'sharpen', 'bright', 'grayscale', 'bw', 'sepia'] as const
export type ScanFilter = (typeof SCAN_FILTERS)[number]

export const FILTER_LABELS: Record<ScanFilter, string> = {
  enhance: 'Enhance',
  original: 'Original',
  magic: 'Magic Color',
  sharpen: 'Sharpen',
  bright: 'Bright',
  grayscale: 'Grayscale',
  bw: 'B&W',
  sepia: 'Sepia',
}

export interface Pixels {
  data: Uint8ClampedArray
  width: number
  height: number
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)
const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

/** Luminance values at the given percentiles (0..1), from a histogram. */
function lumaPercentiles(p: Pixels, lo: number, hi: number): [number, number] {
  const hist = new Uint32Array(256)
  const d = p.data
  for (let i = 0; i < d.length; i += 4) hist[luma(d[i], d[i + 1], d[i + 2]) | 0]++
  const total = p.width * p.height
  let acc = 0
  let low = 0
  let high = 255
  let foundLow = false
  for (let v = 0; v < 256; v++) {
    acc += hist[v]
    if (!foundLow && acc >= total * lo) {
      low = v
      foundLow = true
    }
    if (acc >= total * hi) {
      high = v
      break
    }
  }
  return [low, Math.max(high, low + 1)]
}

/** Stretches levels so the darkest and brightest 1% map to black and white. */
function autoLevels(p: Pixels, lo = 0.01, hi = 0.99) {
  const [low, high] = lumaPercentiles(p, lo, hi)
  const scale = 255 / (high - low)
  const d = p.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp((d[i] - low) * scale)
    d[i + 1] = clamp((d[i + 1] - low) * scale)
    d[i + 2] = clamp((d[i + 2] - low) * scale)
  }
}

function contrastBrightness(p: Pixels, contrast: number, brightness: number) {
  const d = p.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp((d[i] - 128) * contrast + 128 + brightness)
    d[i + 1] = clamp((d[i + 1] - 128) * contrast + 128 + brightness)
    d[i + 2] = clamp((d[i + 2] - 128) * contrast + 128 + brightness)
  }
}

function saturate(p: Pixels, amount: number) {
  const d = p.data
  for (let i = 0; i < d.length; i += 4) {
    const l = luma(d[i], d[i + 1], d[i + 2])
    d[i] = clamp(l + (d[i] - l) * amount)
    d[i + 1] = clamp(l + (d[i + 1] - l) * amount)
    d[i + 2] = clamp(l + (d[i + 2] - l) * amount)
  }
}

/** 3×3 sharpening (unsharp) kernel with adjustable strength. */
function sharpen(p: Pixels, strength: number) {
  const { width: w, height: h } = p
  const src = new Uint8ClampedArray(p.data)
  const d = p.data
  const k = strength
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const center = src[i + c]
        const sum = src[i - 4 + c] + src[i + 4 + c] + src[i - w * 4 + c] + src[i + w * 4 + c]
        d[i + c] = clamp(center * (1 + 4 * k) - sum * k)
      }
    }
  }
}

function grayscale(p: Pixels) {
  const d = p.data
  for (let i = 0; i < d.length; i += 4) {
    const l = luma(d[i], d[i + 1], d[i + 2])
    d[i] = d[i + 1] = d[i + 2] = l
  }
}

/**
 * Adaptive threshold (Bradley–Roth): a pixel is black if it is darker than the
 * mean of its neighbourhood by more than `t`. Handles uneven lighting far
 * better than a single global threshold.
 */
function adaptiveThreshold(p: Pixels, t = 0.12) {
  const { width: w, height: h, data: d } = p
  const gray = new Float64Array(w * h)
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) gray[j] = luma(d[i], d[i + 1], d[i + 2])
  // Integral image with a one-pixel border.
  const W = w + 1
  const integral = new Float64Array(W * (h + 1))
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      row += gray[y * w + x]
      integral[(y + 1) * W + x + 1] = integral[y * W + x + 1] + row
    }
  }
  const half = Math.max(4, Math.round(Math.max(w, h) / 32))
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half)
    const y1 = Math.min(h - 1, y + half)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half)
      const x1 = Math.min(w - 1, x + half)
      const count = (x1 - x0 + 1) * (y1 - y0 + 1)
      const sum = integral[(y1 + 1) * W + x1 + 1] - integral[y0 * W + x1 + 1] - integral[(y1 + 1) * W + x0] + integral[y0 * W + x0]
      const v = gray[y * w + x] * count < sum * (1 - t) ? 0 : 255
      const i = (y * w + x) * 4
      d[i] = d[i + 1] = d[i + 2] = v
    }
  }
}

function sepia(p: Pixels) {
  const d = p.data
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]
    d[i] = clamp(0.393 * r + 0.769 * g + 0.189 * b)
    d[i + 1] = clamp(0.349 * r + 0.686 * g + 0.168 * b)
    d[i + 2] = clamp(0.272 * r + 0.534 * g + 0.131 * b)
  }
}

/** Pushes near-white paper to pure white, keeping ink colours. */
function whitenPaper(p: Pixels, threshold: number) {
  const d = p.data
  for (let i = 0; i < d.length; i += 4) {
    const l = luma(d[i], d[i + 1], d[i + 2])
    if (l > threshold) {
      const t = Math.min(1, (l - threshold) / (255 - threshold) * 1.5)
      d[i] = clamp(d[i] + (255 - d[i]) * t)
      d[i + 1] = clamp(d[i + 1] + (255 - d[i + 1]) * t)
      d[i + 2] = clamp(d[i + 2] + (255 - d[i + 2]) * t)
    }
  }
}

/** Applies a filter in place. Alpha is left unchanged. */
export function applyFilter(p: Pixels, filter: ScanFilter): Pixels {
  switch (filter) {
    case 'original':
      break
    case 'enhance':
      autoLevels(p)
      contrastBrightness(p, 1.12, 6)
      sharpen(p, 0.25)
      break
    case 'magic':
      autoLevels(p, 0.02, 0.97)
      contrastBrightness(p, 1.25, 10)
      saturate(p, 1.45)
      whitenPaper(p, 185)
      break
    case 'sharpen':
      sharpen(p, 0.7)
      break
    case 'bright':
      contrastBrightness(p, 1.08, 38)
      break
    case 'grayscale':
      grayscale(p)
      break
    case 'bw':
      adaptiveThreshold(p)
      break
    case 'sepia':
      sepia(p)
      break
  }
  return p
}
