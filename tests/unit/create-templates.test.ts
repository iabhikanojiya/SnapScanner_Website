import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { luminance, measure, qrModules, type Design, type El } from '@/lib/create/engine'
import { designToPdf, type ImageRasterizer } from '@/lib/create/export-pdf'
import type { Content, ProjectOptions, TemplateDef } from '@/lib/create/kit'
import { CATEGORIES, CUSTOM_SIZE_ID, buildDesign, contentForTemplate, defaultSizeId, getCategory, resolveSize, slotCount, switchLosses, type Category } from '@/lib/create/registry'
import { DesignPageSvg } from '@/lib/create/render-svg'
import { svgMarkup } from '@/lib/create/export-browser'
import { invoiceTotals } from '@/lib/create/categories/invoices'
import { formatMoney } from '@/lib/create/money'
import { makePng, openWithPdfjs, pageTexts } from './helpers'

const png = makePng(8, 8, (x, y) => [x * 30, y * 30, 120])
const stub: ImageRasterizer = async () => ({ bytes: png, type: 'png' })
const image = (w = 800, h = 600) => ({ src: `data:image/png;base64,${Buffer.from(png).toString('base64')}`, width: w, height: h, zoom: 1, ox: 0, oy: 0 })

/** Sample content with every image field filled, so image frames are exercised. */
function filled(cat: Category): Content {
  const c: Content = structuredClone(cat.sample)
  for (const f of cat.fields) if (f.type === 'image') c[f.key] = image()
  if (cat.panel === 'collage') for (let i = 0; i < 9; i++) c[`photo${i + 1}`] = image(1200 + i * 10, 900)
  return c
}

const options = (cat: Category, tpl: TemplateDef, o: Partial<ProjectOptions> = {}): ProjectOptions => ({ sizeId: defaultSizeId(cat, tpl), print: !!cat.print, ...o })

function walk(els: El[], fn: (el: El) => void) {
  for (const el of els) {
    fn(el)
    if (el.t === 'group') walk(el.children, fn)
  }
}

/** Colour- and wording-agnostic geometry of a design, for uniqueness checks. */
function signature(d: Design) {
  const r = (n: number) => Math.round(n)
  const parts: string[] = []
  for (const p of d.pages)
    walk(p.els, (el) => {
      switch (el.t) {
        case 'rect':
          return parts.push(`r${r(el.x)},${r(el.y)},${r(el.w)},${r(el.h)},${el.r ? 1 : 0}`)
        case 'circle':
          return parts.push(`c${r(el.cx)},${r(el.cy)},${r(el.r)}`)
        case 'line':
          return parts.push(`l${r(el.x1)},${r(el.y1)},${r(el.x2)},${r(el.y2)}`)
        case 'path':
          return parts.push(`p${el.d.length}`)
        case 'text':
          return parts.push(`t${r(el.x)},${r(el.y)},${el.align},${r(el.size)}`)
        case 'image':
          return parts.push(`i${r(el.x)},${r(el.y)},${r(el.w)},${r(el.h)},${el.shape}`)
        case 'qr':
          return parts.push(`q${r(el.x)},${r(el.y)},${r(el.size)}`)
        case 'group':
          return parts.push(`g${r(el.rot)},${el.mirror ?? ''}`)
      }
    })
  return parts.join(';')
}

/** A distinctive string each category prints from its sample content. */
const MARKER_FIELD: Record<string, string> = { 'id-cards': 'name', 'business-cards': 'name', invoices: 'invoiceNumber', certificates: 'recipient', 'photo-collages': 'heading', letterheads: 'company', 'festival-greetings': 'from' }
const MARKER: Record<string, (c: Content) => string> = {
  'id-cards': (c) => String(c.name),
  'business-cards': (c) => String(c.name),
  invoices: (c) => String(c.invoiceNumber),
  certificates: (c) => String(c.recipient),
  'photo-collages': (c) => String(c.heading),
  letterheads: (c) => String(c.company),
  'festival-greetings': (c) => String(c.from),
}

describe('Create Studio registry', () => {
  it('has seven categories with at least 25 templates each and unique ids', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual(['id-cards', 'invoices', 'business-cards', 'certificates', 'photo-collages', 'letterheads', 'festival-greetings'])
    const ids = new Set<string>()
    for (const cat of CATEGORIES) {
      expect(cat.templates.length, cat.id).toBeGreaterThanOrEqual(25)
      expect(new Set(cat.templates.map((t) => t.name)).size, `${cat.id} names`).toBe(cat.templates.length)
      for (const t of cat.templates) {
        expect(ids.has(t.id), t.id).toBe(false)
        ids.add(t.id)
        expect(t.family && t.tags.length, t.id).toBeTruthy()
      }
      expect(cat.formats).toContain('pdf')
      expect(cat.formats).toContain('png')
    }
    expect(ids.size).toBeGreaterThanOrEqual(150)
  })

  it('templates differ in layout, not only colour or wording', () => {
    for (const cat of CATEGORIES) {
      const seen = new Map<string, string>()
      for (const tpl of cat.templates) {
        // Same neutral palette and fonts for every template.
        const neutral: TemplateDef = { ...tpl, palette: { primary: '#336699', secondary: '#DDDDDD', accent: '#CC3333', ink: '#111111', paper: '#FFFFFF' }, fonts: { head: 'sans', body: 'sans' } }
        const sig = signature(buildDesign(cat, neutral, filled(cat), { sizeId: cat.sizes[0].id }))
        expect(seen.get(sig), `${tpl.id} duplicates ${seen.get(sig)}`).toBeUndefined()
        seen.set(sig, tpl.id)
      }
    }
  })

  it('every template renders in every size with finite geometry', () => {
    for (const cat of CATEGORIES)
      for (const tpl of cat.templates)
        for (const size of cat.sizes) {
          const d = buildDesign(cat, tpl, filled(cat), options(cat, tpl, { sizeId: size.id }))
          expect(d.pages.length, tpl.id).toBeGreaterThan(0)
          for (const p of d.pages)
            walk(p.els, (el) => {
              for (const v of Object.values(el)) if (typeof v === 'number') expect(Number.isFinite(v), `${tpl.id} ${el.t}`).toBe(true)
            })
        }
  })

  it('renders SVG previews with the content', () => {
    for (const cat of CATEGORIES) {
      const tpl = cat.templates[0]
      const d = buildDesign(cat, tpl, cat.sample, options(cat, tpl))
      const svg = renderToStaticMarkup(createElement(DesignPageSvg, { design: d, page: d.pages[0], mode: 'export', width: d.width }))
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg).toContain(MARKER[cat.id](cat.sample).replace(/&/g, '&amp;'))
    }
  })

  it('keeps sample text inside the page (and the safe area on business cards)', () => {
    const problems: string[] = []
    for (const cat of CATEGORIES)
      for (const tpl of cat.templates)
        for (const size of cat.sizes.filter((s) => s.orientation === tpl.orientation)) {
          const d = buildDesign(cat, tpl, filled(cat), options(cat, tpl, { sizeId: size.id }))
          const inset = cat.print ? (d.safe ?? 0) - 1.5 : -0.5
          d.pages.forEach((p, pi) => {
            for (const el of p.els) {
              // Faint decorative text (watermarks) may bleed off the edge on purpose.
              if (el.t !== 'text' || !el.lines.some((l) => l.trim()) || (el.opacity ?? 1) <= 0.3) continue
              const w = Math.max(...el.lines.map((l) => measure(l, el.size, el.font, el.bold, el.italic, el.ls ?? 0)))
              const x0 = el.align === 'left' ? el.x : el.align === 'right' ? el.x - w : el.x - w / 2
              const top = el.y - el.size * 0.72
              const bottom = el.y + (el.lines.length - 1) * el.lh + el.size * 0.2
              if (x0 < inset || x0 + w > d.width - inset || top < inset || bottom > d.height - inset)
                problems.push(`${tpl.id} ${size.id} p${pi + 1}: "${el.lines[0].slice(0, 24)}" [${x0.toFixed(0)},${top.toFixed(0)} → ${(x0 + w).toFixed(0)},${bottom.toFixed(0)}] in ${d.width.toFixed(0)}×${d.height.toFixed(0)}`)
            }
          })
        }
    expect(problems).toEqual([])
  })

  it('draws every QR code dark on a light background so it scans', () => {
    for (const cat of CATEGORIES)
      for (const tpl of cat.templates) {
        const d = buildDesign(cat, tpl, { ...filled(cat), showQr: true, qrData: 'https://example.com' }, options(cat, tpl))
        for (const p of d.pages)
          walk(p.els, (el) => {
            if (el.t !== 'qr') return
            expect(luminance(el.color), `${tpl.id}: QR colour`).toBeLessThan(0.2)
            if (el.bg) expect(luminance(el.bg), `${tpl.id}: QR background`).toBeGreaterThan(0.6)
          })
      }
  })

  it('never overlaps two pieces of text', () => {
    const problems: string[] = []
    const box = (el: Extract<El, { t: 'text' }>) => {
      const w = Math.max(...el.lines.map((l) => measure(l, el.size, el.font, el.bold, el.italic, el.ls ?? 0)))
      const x0 = el.align === 'left' ? el.x : el.align === 'right' ? el.x - w : el.x - w / 2
      return { x0, x1: x0 + w, y0: el.y - el.size * 0.7, y1: el.y + (el.lines.length - 1) * el.lh + el.size * 0.15 }
    }
    for (const cat of CATEGORIES)
      for (const tpl of cat.templates) {
        const d = buildDesign(cat, tpl, filled(cat), options(cat, tpl))
        d.pages.forEach((p, pi) => {
          const texts = p.els.filter((e): e is Extract<El, { t: 'text' }> => e.t === 'text' && e.lines.some((l) => l.trim()) && (e.opacity ?? 1) > 0.3)
          for (let i = 0; i < texts.length; i++)
            for (let j = i + 1; j < texts.length; j++) {
              const a = box(texts[i])
              const b = box(texts[j])
              const ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
              const iy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
              if (ix > 1 && iy > 1) problems.push(`${tpl.id} p${pi + 1}: "${texts[i].lines[0].slice(0, 20)}" × "${texts[j].lines[0].slice(0, 20)}"`)
            }
        })
      }
    expect(problems).toEqual([])
  })

  it('produces standalone SVG with well-formed tags for image export', () => {
    for (const cat of CATEGORIES)
      for (const tpl of cat.templates) {
        const d = buildDesign(cat, tpl, filled(cat), options(cat, tpl))
        for (let i = 0; i < d.pages.length; i++) {
          const svg = svgMarkup(d, i, 1000, 600)
          expect(svg.startsWith('<svg width="1000" height="600" '), tpl.id).toBe(true)
          for (const tag of svg.matchAll(/<([a-zA-Z]+)((?:\s+[^\s=>/]+="[^"]*")*)\s*\/?>/g)) {
            const names = [...tag[2].matchAll(/\s([^\s=]+)=/g)].map((m) => m[1])
            expect(new Set(names).size, `${tpl.id}: duplicate attribute in <${tag[1]}>`).toBe(names.length)
          }
          expect(svg).not.toContain('data-placeholder')
        }
      }
  })

  it('exports every template to a valid PDF with the right size and selectable text', async () => {
    for (const cat of CATEGORIES)
      for (const tpl of cat.templates) {
        const content = filled(cat)
        const d = buildDesign(cat, tpl, content, options(cat, tpl))
        const bytes = await designToPdf(d, { title: tpl.name, rasterize: stub, bleed: !!cat.print })
        const doc = await openWithPdfjs(bytes)
        expect(doc.numPages, tpl.id).toBe(d.pages.length)
        const vp = (await doc.getPage(1)).getViewport({ scale: 1 })
        const b = cat.print ? d.bleed * 2 : 0
        expect(Math.abs(vp.width - (d.width + b)), tpl.id).toBeLessThan(0.5)
        expect(Math.abs(vp.height - (d.height + b)), tpl.id).toBeLessThan(0.5)
        const text = (await pageTexts(bytes)).join(' ')
        // Some layouts set a name over two lines or in capitals, so compare loosely.
        if (tpl.unused?.includes(MARKER_FIELD[cat.id])) {
          await doc.loadingTask.destroy()
          continue
        }
        const loose = (s: string) => s.replace(/\s+/g, '').toLowerCase()
        expect(loose(text), tpl.id).toContain(loose(MARKER[cat.id](content)))
        await doc.loadingTask.destroy()
      }
  }, 120_000)
})

describe('sizes and template switching', () => {
  const id = getCategory('id-cards')!
  const tpl = id.templates[0]

  it('clamps custom sizes to safe limits', () => {
    expect(resolveSize(id, tpl, { sizeId: CUSTOM_SIZE_ID, customW: 90, customH: 55 }).w).toBeCloseTo((90 * 72) / 25.4)
    expect(resolveSize(id, tpl, { sizeId: CUSTOM_SIZE_ID, customW: 1, customH: 99999 }).h).toBeCloseTo((1000 * 72) / 25.4)
    const inv = getCategory('invoices')!
    expect(resolveSize(inv, inv.templates[0], { sizeId: CUSTOM_SIZE_ID, customW: 50, customH: 50 }).w).toBeCloseTo(595.28, 1)
  })

  it('applies colour and font overrides', () => {
    const d = buildDesign(id, tpl, id.sample, { sizeId: 'cr80-l', primary: '#123456', headFont: 'serif' })
    const colours = new Set<string>()
    walk(d.pages[0].els, (el) => {
      if ('fill' in el && el.fill) colours.add(el.fill.toLowerCase())
    })
    expect(colours.has('#123456')).toBe(true)
  })

  it('business cards carry bleed and a safe area', () => {
    const bc = getCategory('business-cards')!
    const d = buildDesign(bc, bc.templates[0], bc.sample, options(bc, bc.templates[0]))
    expect(d.bleed).toBe(9)
    expect(d.safe).toBe(9)
    expect(d.pages.map((p) => p.label)).toEqual(['Front', 'Back'])
  })

  it('warns about collage photos a smaller layout would drop', () => {
    const col = getCategory('photo-collages')!
    const nine = col.templates.find((t) => slotCount(t) === 9)!
    const two = col.templates.find((t) => slotCount(t) === 2)!
    const c = filled(col)
    expect(switchLosses(col, nine, two, c)).toEqual(['Photo 3', 'Photo 4', 'Photo 5', 'Photo 6', 'Photo 7', 'Photo 8', 'Photo 9'])
    const next = contentForTemplate(col, two, c)
    expect(next.photo2).toBeTruthy()
    expect(next.photo3).toBeUndefined()
    expect(next.heading).toBe(c.heading)
    // Other categories share all fields.
    expect(switchLosses(id, id.templates[0], id.templates[5], id.sample)).toEqual([])
  })

  it('collage templates place one image frame per slot', () => {
    const col = getCategory('photo-collages')!
    for (const tpl of col.templates) {
      const d = buildDesign(col, tpl, filled(col), options(col, tpl))
      const fields: string[] = []
      walk(d.pages[0].els, (el) => {
        if (el.t === 'image' && el.field) fields.push(el.field)
      })
      expect(fields.sort(), tpl.id).toEqual(Array.from({ length: slotCount(tpl) }, (_, i) => `photo${i + 1}`).sort())
    }
  })
})

describe('invoice layout', () => {
  const inv = getCategory('invoices')!

  it('paginates long invoices and keeps every line item', async () => {
    const items = Array.from({ length: 45 }, (_, i) => ({ id: `x${i}`, description: `Service item number ${i + 1}`, quantity: '2', unitPrice: '10.50' }))
    const content = { ...inv.sample, items }
    for (const tpl of [inv.templates[0], inv.templates[6]]) {
      const d = buildDesign(inv, tpl, content, options(inv, tpl))
      expect(d.pages.length, tpl.id).toBeGreaterThan(1)
      const bytes = await designToPdf(d, { title: 'Invoice', rasterize: stub })
      const texts = await pageTexts(bytes)
      const all = texts.join(' ')
      for (let i = 1; i <= 45; i++) expect(all).toContain(`Service item number ${i}`)
      const total = formatMoney(invoiceTotals(content).total, 'USD')
      expect(texts[texts.length - 1]).toContain(total)
    }
  })

  it('prints the computed totals', async () => {
    const tpl = inv.templates[2]
    const d = buildDesign(inv, tpl, inv.sample, options(inv, tpl))
    const text = (await pageTexts(await designToPdf(d, { title: 'Invoice', rasterize: stub }))).join(' ')
    const t = invoiceTotals(inv.sample)
    // 1200 + 3400 + 1187.50 + 179.94 = 5967.44; -5% = 298.37; tax 8.25% of 5669.07 = 467.70
    expect(formatMoney(t.subtotal, 'USD')).toBe('$5,967.44')
    expect(formatMoney(t.discount, 'USD')).toBe('$298.37')
    expect(formatMoney(t.total, 'USD')).toBe('$6,136.77')
    for (const v of ['$5,967.44', '-$298.37', '$467.70', '$6,136.77']) expect(text).toContain(v)
  })
})

describe('QR codes', () => {
  it('generates a scannable-size matrix with finder patterns', () => {
    const m = qrModules('https://snapscanner.vercel.app')
    expect(m.length).toBeGreaterThanOrEqual(21)
    expect((m.length - 17) % 4).toBe(0)
    // Top-left finder pattern: 7×7 dark ring.
    for (let i = 0; i < 7; i++) {
      expect(m[0][i]).toBe(true)
      expect(m[6][i]).toBe(true)
      expect(m[i][0]).toBe(true)
    }
    expect(m[1][1]).toBe(false)
    expect(m[3][3]).toBe(true)
  })
})
