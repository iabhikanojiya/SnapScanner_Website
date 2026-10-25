import { describe, expect, it } from 'vitest'
import { SCAN_FILTERS, applyFilter, type Pixels } from '@/lib/image/filters'
import { FULL_QUAD, detectDocument, homography, rotatePixels, warpPerspective, warpSize } from '@/lib/image/geometry'
import { processPixels } from '@/lib/image/pipeline'

function image(w: number, h: number, fill: (x: number, y: number) => [number, number, number]): Pixels {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fill(x, y)
      const i = (y * w + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  return { data, width: w, height: h }
}

const px = (p: Pixels, x: number, y: number) => Array.from(p.data.slice((y * p.width + x) * 4, (y * p.width + x) * 4 + 3))

/** Is (x, y) inside the convex polygon? */
function inside(poly: [number, number][], x: number, y: number) {
  let sign = 0
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i]
    const [bx, by] = poly[(i + 1) % poly.length]
    const s = Math.sign((bx - ax) * (y - ay) - (by - ay) * (x - ax))
    if (s === 0) continue
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return true
}

describe('filters', () => {
  const sample = () => image(40, 30, (x, y) => [100 + x, 120 + y, 90])

  it('implements all eight filters', () => {
    expect(SCAN_FILTERS).toHaveLength(8)
    for (const f of SCAN_FILTERS) {
      const out = applyFilter(sample(), f)
      expect(out.data.length).toBe(40 * 30 * 4)
    }
  })

  it('original leaves pixels unchanged; grayscale equalizes channels', () => {
    expect(px(applyFilter(sample(), 'original'), 5, 5)).toEqual([105, 125, 90])
    const [r, g, b] = px(applyFilter(sample(), 'grayscale'), 5, 5)
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('B&W produces only black and white, keeping dark text dark', () => {
    const page = image(64, 64, (x, y) => (y > 28 && y < 34 && x > 10 && x < 54 ? [30, 30, 30] : [210, 205, 200]))
    const out = applyFilter(page, 'bw')
    for (let i = 0; i < out.data.length; i += 4) expect([0, 255]).toContain(out.data[i])
    expect(px(out, 30, 31)[0]).toBe(0)
    expect(px(out, 30, 5)[0]).toBe(255)
  })

  it('bright lightens and sepia tints warm', () => {
    expect(px(applyFilter(sample(), 'bright'), 0, 0)[0]).toBeGreaterThan(100)
    const [r, , b] = px(applyFilter(image(4, 4, () => [128, 128, 128]), 'sepia'), 1, 1)
    expect(r).toBeGreaterThan(b)
  })
})

describe('geometry', () => {
  it('computes a homography that maps the corners', () => {
    const from = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
    const to = [{ x: 2, y: 1 }, { x: 20, y: 3 }, { x: 18, y: 25 }, { x: 1, y: 22 }]
    const H = homography(from, to)
    for (let i = 0; i < 4; i++) {
      const { x, y } = from[i]
      const d = H[6] * x + H[7] * y + H[8]
      expect((H[0] * x + H[1] * y + H[2]) / d).toBeCloseTo(to[i].x, 6)
      expect((H[3] * x + H[4] * y + H[5]) / d).toBeCloseTo(to[i].y, 6)
    }
  })

  it('warps a quad into a rectangle', () => {
    const src = image(100, 100, (x) => (x < 50 ? [255, 0, 0] : [0, 0, 255]))
    const half = warpPerspective(src, [{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 0, y: 1 }])
    expect([half.width, half.height]).toEqual([50, 100])
    expect(px(half, 25, 50)).toEqual([255, 0, 0])
    expect(warpSize(FULL_QUAD, 4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 })
  })

  it('rotates by quarter turns', () => {
    const src = image(3, 2, (x, y) => [x * 10 + y, 0, 0])
    const r = rotatePixels(src, 90)
    expect([r.width, r.height]).toEqual([2, 3])
    // Top-left of the source ends up top-right after a clockwise turn.
    expect(px(r, 1, 0)[0]).toBe(0)
    expect(rotatePixels(rotatePixels(src, 180), 180).data).toEqual(src.data)
  })

  it('pipeline crops, rotates and filters', () => {
    const src = image(80, 60, () => [200, 100, 50])
    const out = processPixels(src, { quad: FULL_QUAD, rotation: 90, filter: 'grayscale' }, 40)
    expect([out.width, out.height]).toEqual([30, 40])
  })
})

describe('document detection', () => {
  it('finds a light, tilted page on a dark background', () => {
    const corners: [number, number][] = [
      [120, 60],
      [500, 90],
      [470, 560],
      [90, 520],
    ]
    const src = image(600, 640, (x, y) => (inside(corners, x, y) ? [235, 232, 225] : [45, 50, 60]))
    const found = detectDocument(src)
    expect(found).not.toBeNull()
    const expected = corners.map(([x, y]) => ({ x: x / 600, y: y / 640 }))
    found!.quad.forEach((p, i) => {
      expect(Math.abs(p.x - expected[i].x)).toBeLessThan(0.03)
      expect(Math.abs(p.y - expected[i].y)).toBeLessThan(0.03)
    })
  })

  it('returns null when there is no distinct page', () => {
    expect(detectDocument(image(200, 200, () => [128, 128, 128]))).toBeNull()
    // A smooth gradient has a bright half, but it runs along the border.
    expect(detectDocument(image(400, 300, (x, y) => [(x / 400) * 255, (y / 300) * 255, 140]))).toBeNull()
    expect(detectDocument(image(200, 200, (x, y) => ((x + y) % 2 ? [255, 255, 255] : [0, 0, 0])))).toBeNull()
  })
})

describe('flip', () => {
  it('mirrors horizontally and vertically', async () => {
    const { flipPixels } = await import('@/lib/image/geometry')
    const src = image(2, 2, (x, y) => [x * 100 + y, 0, 0])
    expect(px(flipPixels(src, true, false), 0, 0)[0]).toBe(100)
    expect(px(flipPixels(src, false, true), 0, 0)[0]).toBe(1)
    expect(flipPixels(src, false, false)).toBe(src)
  })
})
