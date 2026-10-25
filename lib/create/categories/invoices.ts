// Invoice Maker: 25 templates assembled from distinct headers, table styles,
// totals presentations and footers, laid out by one paginating engine.
// This is a document template, not accounting or tax software.
import { T, measure, mix, onColor, textHeight, type El } from '../engine'
import { dotGrid, stripes, wave } from '../decor'
import { MM, bgRect, fmtDate, logoOrMonogram, page, str, type Content, type FieldDef, type Palette, type RenderCtx, type SizeOption, type TemplateDef } from '../kit'
import { CURRENCIES, computeInvoice, formatMoney, formatQuantity, type LineItem, type TaxLine } from '../money'

export const INVOICE_FIELDS: FieldDef[] = [
  { key: 'bizName', label: 'Business name', type: 'text', group: 'Your business', maxLength: 60 },
  { key: 'logo', label: 'Logo', type: 'image', group: 'Your business', imageKind: 'logo' },
  { key: 'bizAddress', label: 'Address', type: 'textarea', group: 'Your business', maxLength: 160 },
  { key: 'bizEmail', label: 'Email', type: 'text', group: 'Your business', maxLength: 60 },
  { key: 'bizPhone', label: 'Phone', type: 'text', group: 'Your business', maxLength: 30 },
  { key: 'bizTaxLabel', label: 'Tax ID label', type: 'text', group: 'Your business', maxLength: 20, placeholder: 'VAT, GSTIN, ABN, EIN…' },
  { key: 'bizTaxId', label: 'Tax ID', type: 'text', group: 'Your business', maxLength: 30 },
  { key: 'invoiceTitle', label: 'Document title', type: 'text', group: 'Invoice', maxLength: 30 },
  { key: 'invoiceNumber', label: 'Invoice number', type: 'text', group: 'Invoice', maxLength: 30 },
  { key: 'invoiceDate', label: 'Invoice date', type: 'date', group: 'Invoice' },
  { key: 'dueDate', label: 'Due date', type: 'date', group: 'Invoice' },
  { key: 'poNumber', label: 'PO / reference', type: 'text', group: 'Invoice', maxLength: 30 },
  { key: 'currency', label: 'Currency', type: 'select', group: 'Invoice', options: CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} – ${c.name}` })) },
  { key: 'clientName', label: 'Client name', type: 'text', group: 'Bill to', maxLength: 60 },
  { key: 'clientCompany', label: 'Client company', type: 'text', group: 'Bill to', maxLength: 60 },
  { key: 'clientAddress', label: 'Client address', type: 'textarea', group: 'Bill to', maxLength: 160 },
  { key: 'clientEmail', label: 'Client email', type: 'text', group: 'Bill to', maxLength: 60 },
  { key: 'paymentInstructions', label: 'Payment instructions', type: 'textarea', group: 'Payment & notes', maxLength: 400 },
  { key: 'notes', label: 'Notes', type: 'textarea', group: 'Payment & notes', maxLength: 400 },
  { key: 'terms', label: 'Terms', type: 'textarea', group: 'Payment & notes', maxLength: 600 },
]

export const INVOICE_SAMPLE: Content = {
  bizName: 'Brightline Studio',
  bizAddress: '221 Canal Street\nPortland, OR 97201',
  bizEmail: 'billing@brightline.example',
  bizPhone: '+1 555 0177',
  bizTaxLabel: 'EIN',
  bizTaxId: '12-3456789',
  invoiceTitle: 'Invoice',
  invoiceNumber: 'INV-2026-041',
  invoiceDate: '2026-10-24',
  dueDate: '2026-11-07',
  poNumber: 'PO-7781',
  currency: 'USD',
  clientName: 'Jordan Lee',
  clientCompany: 'Harbor & Pine Co.',
  clientAddress: '9 Wharf Lane\nSeattle, WA 98101',
  clientEmail: 'accounts@harborpine.example',
  items: [
    { id: 'i1', description: 'Brand strategy workshop (half day)', quantity: '1', unitPrice: '1200' },
    { id: 'i2', description: 'Logo and visual identity design, including three concepts and two rounds of revisions', quantity: '1', unitPrice: '3400' },
    { id: 'i3', description: 'Website landing page design', quantity: '12.5', unitPrice: '95' },
    { id: 'i4', description: 'Stock photography licence', quantity: '6', unitPrice: '29.99' },
  ] satisfies LineItem[],
  discountType: 'percent',
  discountValue: '5',
  taxes: [{ id: 't1', name: 'Sales tax', rate: '8.25' }] satisfies TaxLine[],
  paid: '',
  paymentInstructions: 'Bank transfer to Brightline Studio\nAccount 000123456 · Routing 110000000\nPlease include the invoice number as the reference.',
  notes: 'Thank you for your business!',
  terms: 'Payment is due within 14 days of the invoice date. Please contact us with any questions about this invoice.',
}

export const INVOICE_SIZES: SizeOption[] = [
  { id: 'a4', label: 'A4 (210 × 297 mm)', w: 210 * MM, h: 297 * MM, orientation: 'portrait' },
  { id: 'letter', label: 'US Letter (8.5 × 11 in)', w: 612, h: 792, orientation: 'portrait' },
]

const items = (c: Content): LineItem[] => (Array.isArray(c.items) ? (c.items as LineItem[]) : [])
const taxes = (c: Content): TaxLine[] => (Array.isArray(c.taxes) ? (c.taxes as TaxLine[]) : [])

export function invoiceTotals(c: Content) {
  return computeInvoice({
    currency: str(c, 'currency', 'USD'),
    items: items(c),
    discountType: (['none', 'percent', 'fixed'].includes(str(c, 'discountType')) ? str(c, 'discountType') : 'none') as 'none' | 'percent' | 'fixed',
    discountValue: str(c, 'discountValue'),
    taxes: taxes(c),
    paid: str(c, 'paid'),
  })
}

// ---------------------------------------------------------------------------
// Building blocks

interface Area {
  x: number
  w: number
}

type Header = (ctx: RenderCtx, area: Area, m: number) => { els: El[]; y: number; area?: Area }
type Footer = (ctx: RenderCtx, m: number) => { els: El[]; h: number }
type TableStyle = 'striped' | 'lined' | 'grid' | 'minimal' | 'dark'
type TotalsStyle = 'right' | 'box' | 'band' | 'stacked'

const due = (c: Content) => formatMoney(invoiceTotals(c).due, str(c, 'currency', 'USD'))

function metaRows(c: Content): [string, string][] {
  return (
    [
      ['Invoice no.', str(c, 'invoiceNumber')],
      ['Date', fmtDate(str(c, 'invoiceDate'))],
      ['Due date', fmtDate(str(c, 'dueDate'))],
      ['Reference', str(c, 'poNumber')],
    ] as [string, string][]
  ).filter(([, v]) => v.trim())
}

function bizLines(c: Content) {
  return [str(c, 'bizAddress'), str(c, 'bizEmail'), str(c, 'bizPhone'), str(c, 'bizTaxId') ? `${str(c, 'bizTaxLabel') || 'Tax ID'} ${str(c, 'bizTaxId')}` : ''].filter((s) => s.trim()).join('\n')
}

function clientLines(c: Content) {
  return [str(c, 'clientCompany'), str(c, 'clientAddress'), str(c, 'clientEmail')].filter((s) => s.trim()).join('\n')
}

/** "Bill to" block; returns elements and the bottom y. */
function billTo(ctx: RenderCtx, x: number, y: number, w: number, labelColor: string, size: number, align: 'left' | 'right' = 'left') {
  const { c, p } = ctx
  const label = T({ x, y, text: 'Bill to', size: size * 0.8, bold: true, upper: true, ls: 1, color: labelColor, align })
  const name = T({ x, y: y + size * 1.5, text: str(c, 'clientName') || str(c, 'clientCompany'), size: size * 1.15, bold: true, color: p.ink, w, maxLines: 2, align })
  const rest = T({ x, y: y + size * 1.5 + textHeight(name) + size * 1.2, text: clientLines(c), size, color: mix(p.ink, p.paper, 0.3), w, maxLines: 6, align })
  return { els: [label, name, rest], bottom: y + size * 1.5 + textHeight(name) + size * 1.2 + textHeight(rest) }
}

function metaBlock(ctx: RenderCtx, x: number, y: number, w: number, size: number, labelColor: string, align: 'left' | 'right' = 'right') {
  const els: El[] = []
  metaRows(ctx.c).forEach(([k, v], i) => {
    const yy = y + i * size * 1.6
    if (align === 'right') {
      els.push(T({ x: x + w * 0.55, y: yy, text: k, size, color: labelColor, align: 'right' }))
      els.push(T({ x: x + w, y: yy, text: v, size, bold: true, color: ctx.p.ink, align: 'right', w: w * 0.42, fit: true }))
    } else {
      els.push(T({ x, y: yy, text: k, size, color: labelColor }))
      els.push(T({ x: x + w * 0.4, y: yy, text: v, size, bold: true, color: ctx.p.ink, w: w * 0.6, fit: true }))
    }
  })
  return { els, bottom: y + metaRows(ctx.c).length * size * 1.6 }
}

const title = (c: Content) => str(c, 'invoiceTitle') || 'Invoice'

// ---------------------------------------------------------------------------
// Headers (first page)

const HEADERS: Record<string, Header> = {
  band: (ctx, a, m) => {
    const { W, p, c, f } = ctx
    const bh = m * 2.6
    const s = m * 0.2
    const els: El[] = [
      { t: 'rect', x: 0, y: 0, w: W, h: bh, fill: p.primary },
      ...logoOrMonogram(c, 'logo', 'bizName', m, bh * 0.22, bh * 0.56, p.paper, 'rounded', f.head),
      T({ x: m + bh * 0.7, y: bh * 0.55, text: str(c, 'bizName'), size: s * 1.5, bold: true, color: onColor(p.primary), w: W * 0.45, fit: true, font: f.head }),
      T({ x: W - m, y: bh * 0.62, text: title(c), size: s * 2.6, bold: true, upper: true, ls: 2, color: onColor(p.primary), align: 'right' }),
    ]
    const biz = T({ x: m, y: bh + m * 0.8, text: bizLines(c), size: s * 0.85, color: mix(p.ink, p.paper, 0.35), w: W * 0.4, maxLines: 6 })
    const meta = metaBlock(ctx, W - m - W * 0.35, bh + m * 0.8, W * 0.35, s * 0.85, mix(p.ink, p.paper, 0.45))
    const bt = billTo(ctx, m, bh + m * 0.8 + textHeight(biz) + m * 0.7, W * 0.45, p.primary, s * 0.9)
    els.push(biz, ...meta.els, ...bt.els)
    void a
    return { els, y: Math.max(bt.bottom, meta.bottom) + m * 0.8 }
  },
  split: (ctx, a, m) => {
    const { W, p, c, f } = ctx
    const s = m * 0.2
    const els: El[] = [
      ...logoOrMonogram(c, 'logo', 'bizName', m, m, m * 1.2, p.primary, 'circle', f.head),
      T({ x: m, y: m * 2.7, text: str(c, 'bizName'), size: s * 1.4, bold: true, color: p.ink, w: W * 0.45, fit: true, font: f.head }),
    ]
    const biz = T({ x: m, y: m * 2.7 + s * 1.6, text: bizLines(c), size: s * 0.85, color: mix(p.ink, p.paper, 0.4), w: W * 0.42, maxLines: 6 })
    els.push(T({ x: W - m, y: m * 1.7, text: title(c), size: s * 3.4, color: p.primary, align: 'right', font: f.head }), biz)
    const meta = metaBlock(ctx, W - m - W * 0.34, m * 2.7, W * 0.34, s * 0.85, mix(p.ink, p.paper, 0.45))
    els.push(...meta.els)
    const top = Math.max(m * 2.7 + s * 1.6 + textHeight(biz), meta.bottom) + m * 0.7
    els.push({ t: 'line', x1: m, y1: top, x2: W - m, y2: top, stroke: mix(p.ink, p.paper, 0.85), sw: 0.6 })
    const bt = billTo(ctx, m, top + m * 0.6, W * 0.45, p.primary, s * 0.9)
    els.push(...bt.els)
    void a
    return { els, y: bt.bottom + m * 0.8 }
  },
  centered: (ctx, a, m) => {
    const { W, p, c, f } = ctx
    const s = m * 0.2
    const els: El[] = [
      ...logoOrMonogram(c, 'logo', 'bizName', W / 2 - m * 0.6, m * 0.8, m * 1.2, p.primary, 'circle', f.head),
      T({ x: W / 2, y: m * 2.6, text: str(c, 'bizName'), size: s * 1.6, bold: true, color: p.ink, align: 'center', w: W * 0.7, fit: true, font: f.head }),
      T({ x: W / 2, y: m * 2.6 + s * 1.5, text: bizLines(c).replace(/\n/g, '  ·  '), size: s * 0.8, color: mix(p.ink, p.paper, 0.4), align: 'center', w: W - 2 * m, maxLines: 2 }),
      { t: 'line', x1: m, y1: m * 3.6, x2: W / 2 - m * 1.4, y2: m * 3.6, stroke: p.accent, sw: 0.8 },
      { t: 'line', x1: W / 2 + m * 1.4, y1: m * 3.6, x2: W - m, y2: m * 3.6, stroke: p.accent, sw: 0.8 },
      T({ x: W / 2, y: m * 3.6 + s * 0.5, text: title(c), size: s * 1.4, bold: true, upper: true, ls: 4, color: p.primary, align: 'center', font: f.head }),
    ]
    const bt = billTo(ctx, m, m * 4.4, W * 0.42, p.accent, s * 0.9)
    const meta = metaBlock(ctx, W - m - W * 0.36, m * 4.4, W * 0.36, s * 0.85, mix(p.ink, p.paper, 0.45))
    els.push(...bt.els, ...meta.els)
    void a
    return { els, y: Math.max(bt.bottom, meta.bottom) + m * 0.8 }
  },
  sidebar: (ctx, a, m) => {
    const { W, H, p, c, f } = ctx
    const sw = W * 0.3
    const s = m * 0.2
    const els: El[] = [
      { t: 'rect', x: 0, y: 0, w: sw, h: H, fill: p.primary },
      ...logoOrMonogram(c, 'logo', 'bizName', m * 0.8, m, m * 1.3, p.paper, 'rounded', f.head),
      T({ x: m * 0.8, y: m * 3, text: str(c, 'bizName'), size: s * 1.3, bold: true, color: onColor(p.primary), w: sw - m * 1.4, maxLines: 3, font: f.head }),
      T({ x: m * 0.8, y: m * 4.2, text: bizLines(c), size: s * 0.78, color: onColor(p.primary), w: sw - m * 1.4, maxLines: 9, opacity: 0.9 }),
    ]
    const bt = billTo({ ...ctx, p: { ...p, ink: onColor(p.primary), paper: p.primary } }, m * 0.8, H * 0.45, sw - m * 1.4, p.accent, s * 0.82)
    els.push(...bt.els)
    const x = sw + m * 0.8
    const w = W - x - m
    els.push(T({ x, y: m * 1.6, text: title(c), size: s * 3, bold: true, color: p.ink, font: f.head }))
    const meta = metaBlock(ctx, x, m * 2.4, w * 0.6, s * 0.85, mix(p.ink, p.paper, 0.45), 'left')
    els.push(...meta.els)
    void a
    return { els, y: meta.bottom + m * 0.8, area: { x, w } }
  },
  hero: (ctx, a, m) => {
    const { W, p, c, f } = ctx
    const s = m * 0.2
    const els: El[] = [
      T({ x: m - s * 0.3, y: m * 2.2, text: title(c), size: s * 5.6, bold: true, color: p.primary, font: f.head, w: W * 0.6, fit: true, opacity: 0.95 }),
      ...logoOrMonogram(c, 'logo', 'bizName', W - m - m * 1.1, m, m * 1.1, p.accent, 'rounded', f.head),
      T({ x: W - m, y: m * 2.6, text: str(c, 'bizName'), size: s * 1.1, bold: true, color: p.ink, align: 'right', w: W * 0.4, fit: true }),
      T({ x: W - m, y: m * 2.6 + s * 1.3, text: bizLines(c), size: s * 0.78, color: mix(p.ink, p.paper, 0.4), align: 'right', w: W * 0.4, maxLines: 6 }),
    ]
    const y0 = m * 4.2
    const meta = metaBlock(ctx, m, y0, W * 0.38, s * 0.85, mix(p.ink, p.paper, 0.45), 'left')
    const bt = billTo(ctx, W * 0.52, y0, W * 0.4, p.primary, s * 0.9)
    els.push(...meta.els, ...bt.els)
    void a
    return { els, y: Math.max(meta.bottom, bt.bottom) + m * 0.8 }
  },
  boxes: (ctx, a, m) => {
    const { W, p, c, f } = ctx
    const s = m * 0.2
    const els: El[] = [
      ...logoOrMonogram(c, 'logo', 'bizName', m, m, m * 1.1, p.primary, 'rounded', f.head),
      T({ x: m + m * 1.4, y: m * 1.5, text: str(c, 'bizName'), size: s * 1.4, bold: true, color: p.ink, w: W * 0.45, fit: true, font: f.head }),
      T({ x: m + m * 1.4, y: m * 1.5 + s * 1.3, text: bizLines(c).replace(/\n/g, ' · '), size: s * 0.75, color: mix(p.ink, p.paper, 0.4), w: W * 0.5, maxLines: 2 }),
      T({ x: W - m, y: m * 1.7, text: title(c), size: s * 2.2, bold: true, color: p.primary, align: 'right', upper: true, ls: 1 }),
    ]
    const rows = metaRows(c)
    const bw = (W - 2 * m - (rows.length - 1) * m * 0.3) / Math.max(1, rows.length)
    rows.forEach(([k, v], i) => {
      const x = m + i * (bw + m * 0.3)
      els.push({ t: 'rect', x, y: m * 2.8, w: bw, h: m * 1.1, r: s * 0.5, fill: p.secondary })
      els.push(T({ x: x + s, y: m * 2.8 + s * 1.6, text: k, size: s * 0.72, upper: true, ls: 0.6, bold: true, color: mix(p.ink, p.secondary, 0.35) }))
      els.push(T({ x: x + s, y: m * 2.8 + s * 3.6, text: v, size: s * 0.95, bold: true, color: p.ink, w: bw - 2 * s, fit: true }))
    })
    const bt = billTo(ctx, m, m * 4.4, W * 0.45, p.primary, s * 0.9)
    els.push(...bt.els)
    void a
    return { els, y: bt.bottom + m * 0.8 }
  },
  amountDue: (ctx, a, m) => {
    const { W, p, c, f } = ctx
    const s = m * 0.2
    const els: El[] = [
      { t: 'rect', x: 0, y: 0, w: W, h: s * 0.8, fill: p.accent },
      ...logoOrMonogram(c, 'logo', 'bizName', m, m, m, p.primary, 'circle', f.head),
      T({ x: m + m * 1.3, y: m * 1.6, text: str(c, 'bizName'), size: s * 1.3, bold: true, color: p.ink, w: W * 0.4, fit: true, font: f.head }),
      { t: 'rect', x: W - m - W * 0.34, y: m * 0.9, w: W * 0.34, h: m * 1.7, r: s * 0.6, fill: p.primary },
      T({ x: W - m - W * 0.17, y: m * 0.9 + s * 2.4, text: 'Amount due', size: s * 0.8, upper: true, ls: 1, bold: true, color: onColor(p.primary), align: 'center' }),
      T({ x: W - m - W * 0.17, y: m * 0.9 + s * 5.8, text: due(c), size: s * 2.1, bold: true, color: onColor(p.primary), align: 'center', w: W * 0.3, fit: true }),
    ]
    const biz = T({ x: m, y: m * 3.2, text: bizLines(c), size: s * 0.8, color: mix(p.ink, p.paper, 0.4), w: W * 0.4, maxLines: 6 })
    const meta = metaBlock(ctx, W - m - W * 0.34, m * 3.2, W * 0.34, s * 0.85, mix(p.ink, p.paper, 0.45))
    const bt = billTo(ctx, m, m * 3.2 + textHeight(biz) + m * 0.6, W * 0.45, p.primary, s * 0.9)
    els.push(T({ x: m, y: m * 2.7, text: title(c), size: s * 1.1, bold: true, upper: true, ls: 2, color: p.primary }), biz, ...meta.els, ...bt.els)
    void a
    return { els, y: Math.max(bt.bottom, meta.bottom) + m * 0.8 }
  },
  diagonal: (ctx, a, m) => {
    const { W, p, c, f } = ctx
    const s = m * 0.2
    const els: El[] = [
      { t: 'path', d: `M0 0H${W}V${m * 1.6}L0 ${m * 3.2}Z`, fill: p.primary },
      { t: 'path', d: `M${W * 0.55} 0H${W}V${m * 1.6}L${W * 0.42} ${m * 2.6}Z`, fill: p.accent, opacity: 0.85 },
      ...logoOrMonogram(c, 'logo', 'bizName', m, m * 0.7, m * 1.1, p.paper, 'circle', f.head),
      T({ x: m + m * 1.4, y: m * 1.4, text: str(c, 'bizName'), size: s * 1.4, bold: true, color: onColor(p.primary), w: W * 0.4, fit: true, font: f.head }),
      T({ x: W - m, y: m * 1.3, text: title(c), size: s * 2.4, bold: true, upper: true, ls: 2, color: onColor(p.accent), align: 'right' }),
    ]
    const biz = T({ x: W - m, y: m * 3.6, text: bizLines(c), size: s * 0.8, color: mix(p.ink, p.paper, 0.4), w: W * 0.4, maxLines: 6, align: 'right' })
    const bt = billTo(ctx, m, m * 3.6, W * 0.45, p.primary, s * 0.9)
    const meta = metaBlock(ctx, W - m - W * 0.36, m * 3.6 + textHeight(biz) + m * 0.6, W * 0.36, s * 0.85, mix(p.ink, p.paper, 0.45))
    els.push(biz, ...bt.els, ...meta.els)
    void a
    return { els, y: Math.max(bt.bottom, meta.bottom) + m * 0.8 }
  },
  letterhead: (ctx, a, m) => {
    const { W, p, c, f } = ctx
    const s = m * 0.2
    const els: El[] = [
      T({ x: m, y: m * 1.5, text: str(c, 'bizName'), size: s * 2, color: p.primary, w: W * 0.6, fit: true, font: 'serif', italic: true }),
      { t: 'line', x1: m, y1: m * 2, x2: W - m, y2: m * 2, stroke: p.primary, sw: 1.2 },
      { t: 'line', x1: m, y1: m * 2 + 2.5, x2: W - m, y2: m * 2 + 2.5, stroke: p.primary, sw: 0.4 },
      T({ x: m, y: m * 2.6, text: bizLines(c).replace(/\n/g, '   '), size: s * 0.75, color: mix(p.ink, p.paper, 0.4), w: W - 2 * m, maxLines: 2, font: 'serif' }),
      ...logoOrMonogram(c, 'logo', 'bizName', W - m - m * 1.1, m * 0.55, m * 1.1, p.primary, 'circle', 'serif'),
      T({ x: m, y: m * 3.8, text: `${title(c)} ${str(c, 'invoiceNumber')}`, size: s * 1.5, bold: true, color: p.ink, font: 'serif' }),
    ]
    const bt = billTo(ctx, m, m * 4.4, W * 0.45, p.primary, s * 0.9)
    const meta = metaBlock(ctx, W - m - W * 0.36, m * 4.4, W * 0.36, s * 0.85, mix(p.ink, p.paper, 0.45))
    els.push(...bt.els, ...meta.els)
    void a
    void f
    return { els, y: Math.max(bt.bottom, meta.bottom) + m * 0.8 }
  },
}

/** Compact header for continuation pages. */
function contHeader(ctx: RenderCtx, area: Area, m: number, pageNo: number): { els: El[]; y: number } {
  const { p, c } = ctx
  const s = m * 0.2
  return {
    els: [
      T({ x: area.x, y: m, text: `${str(c, 'bizName')} · ${title(c)} ${str(c, 'invoiceNumber')}`, size: s * 0.9, bold: true, color: p.ink, w: area.w * 0.7, fit: true }),
      T({ x: area.x + area.w, y: m, text: `Page ${pageNo}`, size: s * 0.85, color: mix(p.ink, p.paper, 0.45), align: 'right' }),
      { t: 'line', x1: area.x, y1: m + s, x2: area.x + area.w, y2: m + s, stroke: mix(p.ink, p.paper, 0.85), sw: 0.6 },
    ],
    y: m + s * 3,
  }
}

// ---------------------------------------------------------------------------
// Footers

const FOOTERS: Record<string, Footer> = {
  none: () => ({ els: [], h: 0 }),
  rule: (ctx, m) => {
    const { W, H, p, c } = ctx
    const s = m * 0.2
    return {
      h: m * 1.2,
      els: [
        { t: 'line', x1: m, y1: H - m * 0.95, x2: W - m, y2: H - m * 0.95, stroke: mix(p.ink, p.paper, 0.85), sw: 0.6 },
        T({ x: W / 2, y: H - m * 0.55, text: [str(c, 'bizName'), str(c, 'bizEmail'), str(c, 'bizPhone')].filter(Boolean).join('  ·  '), size: s * 0.75, color: mix(p.ink, p.paper, 0.45), align: 'center', w: W - 2 * m, fit: true }),
      ],
    }
  },
  band: (ctx, m) => {
    const { W, H, p, c } = ctx
    const s = m * 0.2
    return {
      h: m * 1.3,
      els: [{ t: 'rect', x: 0, y: H - m * 0.9, w: W, h: m * 0.9, fill: p.primary }, T({ x: W / 2, y: H - m * 0.38, text: str(c, 'notes') || 'Thank you for your business', size: s * 0.85, bold: true, color: onColor(p.primary), align: 'center', w: W - 2 * m, fit: true })],
    }
  },
  wave: (ctx, m) => {
    const { W, H, p } = ctx
    return { h: m * 1.4, els: [{ t: 'path', d: wave(0, W, H - m * 0.7, m * 0.15, 3, H), fill: p.primary, opacity: 0.9 }, { t: 'path', d: wave(0, W, H - m * 0.45, m * 0.12, 4, H), fill: p.accent, opacity: 0.7 }] }
  },
  dots: (ctx, m) => {
    const { W, H, p } = ctx
    return { h: m * 1.2, els: [{ t: 'path', d: dotGrid(m, H - m * 0.8, W - 2 * m, m * 0.5, m * 0.18, m * 0.03), fill: p.primary, opacity: 0.35 }] }
  },
}

// ---------------------------------------------------------------------------
// Engine

interface InvoiceDesign {
  header: keyof typeof HEADERS
  table: TableStyle
  totals: TotalsStyle
  footer: keyof typeof FOOTERS
  numbered?: boolean
  stripesBg?: boolean
}

function renderInvoice(ctx: RenderCtx, d: InvoiceDesign) {
  const { W, H, p, c } = ctx
  const m = W * 0.07
  const s = m * 0.2
  const cur = str(c, 'currency', 'USD')
  const totals = invoiceTotals(c)
  const footer = FOOTERS[d.footer](ctx, m)
  const bottom = H - Math.max(m, footer.h + m * 0.3)
  const pages: El[][] = []
  const first = HEADERS[d.header](ctx, { x: m, w: W - 2 * m }, m)
  const area = first.area ?? { x: m, w: W - 2 * m }
  const base = (els: El[]) => [bgRect(ctx, p.paper), ...(d.stripesBg ? [{ t: 'path' as const, d: stripes(W * 0.7, 0, W * 0.3, H * 0.12, m * 0.25, m * 0.06), fill: p.secondary, opacity: 0.8 }] : []), ...els]
  let cur_els: El[] = base(first.els)
  let y = first.y

  // Column layout.
  const numW = d.numbered ? s * 2.4 : 0
  const amountW = area.w * 0.18
  const priceW = area.w * 0.17
  const qtyW = area.w * 0.1
  const descW = area.w - numW - qtyW - priceW - amountW
  const col = { num: area.x, desc: area.x + numW, qty: area.x + numW + descW, price: area.x + numW + descW + qtyW, amount: area.x + area.w }
  const pad = s * 0.7
  const size = s * 0.9
  const headH = size * 2.4

  const dark = d.table === 'dark'
  const tableHead = (yy: number): El[] => {
    const fill = dark ? p.ink : d.table === 'striped' || d.table === 'grid' ? p.primary : undefined
    const color = fill ? onColor(fill) : p.primary
    const els: El[] = []
    if (fill) els.push({ t: 'rect', x: area.x, y: yy, w: area.w, h: headH, fill, r: d.table === 'striped' ? s * 0.3 : 0 })
    const ty = yy + headH * 0.64
    const lab = (x: number, text: string, align: 'left' | 'right') => T({ x, y: ty, text, size: size * 0.82, bold: true, upper: true, ls: 0.6, color, align })
    if (d.numbered) els.push(lab(col.num + pad, '#', 'left'))
    els.push(lab(col.desc + pad, 'Description', 'left'), lab(col.qty + qtyW - pad, 'Qty', 'right'), lab(col.price + priceW - pad, 'Price', 'right'), lab(col.amount - pad, 'Amount', 'right'))
    if (!fill) els.push({ t: 'line', x1: area.x, y1: yy + headH, x2: area.x + area.w, y2: yy + headH, stroke: d.table === 'minimal' ? p.ink : p.primary, sw: d.table === 'minimal' ? 1.2 : 0.8 })
    return els
  }

  const newPage = () => {
    cur_els.push(...footer.els)
    pages.push(cur_els)
    const h = contHeader(ctx, area, m, pages.length + 1)
    cur_els = base(h.els)
    y = h.y
    cur_els.push(...tableHead(y))
    y += headH
  }

  cur_els.push(...tableHead(y))
  y += headH
  const list = items(c)
  list.forEach((it, i) => {
    const desc = T({ x: col.desc + pad, y: 0, text: it.description || '—', size, color: p.ink, w: descW - 2 * pad })
    const rowH = textHeight(desc) + size * 0.9 + pad * 2
    if (y + rowH > bottom) newPage()
    const ty = y + pad + size * 0.9
    if (d.table === 'striped' && i % 2 === 1) cur_els.push({ t: 'rect', x: area.x, y, w: area.w, h: rowH, fill: p.secondary })
    if (dark && i % 2 === 1) cur_els.push({ t: 'rect', x: area.x, y, w: area.w, h: rowH, fill: mix(p.paper, p.ink, 0.05) })
    if (d.numbered) cur_els.push(T({ x: col.num + pad, y: ty, text: String(i + 1), size, color: mix(p.ink, p.paper, 0.45) }))
    cur_els.push({ ...desc, y: ty } as El)
    cur_els.push(T({ x: col.qty + qtyW - pad, y: ty, text: formatQuantity(it.quantity), size, color: p.ink, align: 'right' }))
    cur_els.push(T({ x: col.price + priceW - pad, y: ty, text: it.unitPrice.trim() ? formatMoney(totalsPrice(it, cur), cur) : '', size, color: p.ink, align: 'right', w: priceW - pad, fit: true }))
    cur_els.push(T({ x: col.amount - pad, y: ty, text: formatMoney(totals.lines[i]?.amount ?? 0n, cur), size, bold: true, color: p.ink, align: 'right', w: amountW - pad, fit: true }))
    y += rowH
    if (d.table === 'lined' || d.table === 'minimal') cur_els.push({ t: 'line', x1: area.x, y1: y, x2: area.x + area.w, y2: y, stroke: mix(p.ink, p.paper, 0.85), sw: 0.5 })
    if (d.table === 'grid') {
      cur_els.push({ t: 'rect', x: area.x, y: y - rowH, w: area.w, h: rowH, stroke: mix(p.ink, p.paper, 0.75), sw: 0.5 })
      for (const x of [col.qty, col.price, col.amount - amountW]) cur_els.push({ t: 'line', x1: x, y1: y - rowH, x2: x, y2: y, stroke: mix(p.ink, p.paper, 0.75), sw: 0.5 })
    }
  })

  // Totals.
  const rows: [string, string, boolean][] = [['Subtotal', formatMoney(totals.subtotal, cur), false]]
  if (totals.discount > 0n) rows.push([str(c, 'discountType') === 'percent' ? `Discount (${str(c, 'discountValue')}%)` : 'Discount', `-${formatMoney(totals.discount, cur)}`, false])
  for (const t of totals.taxes) rows.push([`${t.name || 'Tax'}${t.rate ? ` (${t.rate}%)` : ''}`, formatMoney(t.amount, cur), false])
  rows.push(['Total', formatMoney(totals.total, cur), true])
  if (totals.paid > 0n) rows.push(['Paid', `-${formatMoney(totals.paid, cur)}`, false], ['Amount due', formatMoney(totals.due, cur), true])
  const lineH = size * 1.9
  const totalsH = rows.length * lineH + m * 0.8
  if (y + totalsH > bottom) newPage()
  y += m * 0.4
  const tw = Math.min(area.w * 0.48, W * 0.42)
  const tx = area.x + area.w - tw
  if (d.totals === 'box') cur_els.push({ t: 'rect', x: tx - pad, y: y - pad, w: tw + pad, h: rows.length * lineH + pad * 1.5, r: s * 0.4, fill: p.secondary })
  rows.forEach(([k, v, strong], i) => {
    const yy = y + i * lineH + size
    const isLast = strong && (i === rows.length - 1)
    if (d.totals === 'band' && isLast) {
      cur_els.push({ t: 'rect', x: tx - pad, y: yy - size * 1.35, w: tw + pad * 2, h: lineH * 1.1, fill: p.primary })
      cur_els.push(T({ x: tx, y: yy, text: k, size: size * 1.1, bold: true, upper: true, color: onColor(p.primary) }), T({ x: tx + tw, y: yy, text: v, size: size * 1.25, bold: true, color: onColor(p.primary), align: 'right', w: tw * 0.6, fit: true }))
      return
    }
    if (d.totals === 'stacked' && isLast) {
      cur_els.push({ t: 'line', x1: tx, y1: yy - size * 1.4, x2: tx + tw, y2: yy - size * 1.4, stroke: p.ink, sw: 1 })
      cur_els.push(T({ x: tx, y: yy + size * 0.3, text: k, size: size * 1.05, bold: true, color: p.ink }), T({ x: tx + tw, y: yy + size * 0.5, text: v, size: size * 1.8, bold: true, color: p.primary, align: 'right', w: tw * 0.7, fit: true }))
      return
    }
    cur_els.push(T({ x: tx, y: yy, text: k, size, bold: strong, color: strong ? p.ink : mix(p.ink, p.paper, 0.35) }), T({ x: tx + tw, y: yy, text: v, size: strong ? size * 1.15 : size, bold: strong, color: strong ? p.primary : p.ink, align: 'right', w: tw * 0.6, fit: true }))
  })
  y += rows.length * lineH + m * 0.5

  // Payment, notes and terms.
  for (const [label, key] of [
    ['Payment instructions', 'paymentInstructions'],
    ['Notes', 'notes'],
    ['Terms', 'terms'],
  ] as const) {
    const text = str(c, key)
    if (!text.trim() || (key === 'notes' && d.footer === 'band')) continue
    const body = T({ x: area.x, y: 0, text, size: size * 0.9, color: mix(p.ink, p.paper, 0.3), w: area.w * 0.62 })
    const h = size * 1.6 + textHeight(body) + size
    if (y + h > bottom) newPage()
    cur_els.push(T({ x: area.x, y: y + size, text: label, size: size * 0.82, bold: true, upper: true, ls: 0.6, color: p.primary }), { ...body, y: y + size * 2.4 } as El)
    y += h + size * 0.6
  }
  cur_els.push(...footer.els)
  pages.push(cur_els)
  return pages.map((els, i) => page(els, pages.length > 1 ? `Page ${i + 1}` : undefined))
}

function totalsPrice(it: LineItem, cur: string) {
  return computeInvoice({ currency: cur, items: [{ ...it, quantity: '1' }], discountType: 'none', discountValue: '', taxes: [] }).subtotal
}

const P = (primary: string, secondary: string, accent: string, ink = '#111827', paper = '#FFFFFF'): Palette => ({ primary, secondary, accent, ink, paper })

function def(id: string, name: string, family: string, tags: string[], d: InvoiceDesign, palette: Palette, head: 'sans' | 'serif' | 'mono' = 'sans'): TemplateDef {
  return { id, name, family, tags, orientation: 'portrait', palette, fonts: { head, body: 'sans' }, render: (ctx) => renderInvoice(ctx, d) }
}

export const INVOICE_TEMPLATES: TemplateDef[] = [
  def('inv-band-striped', 'Bold Band', 'Corporate', ['small business', 'services', 'corporate'], { header: 'band', table: 'striped', totals: 'box', footer: 'rule' }, P('#1E3A5F', '#EEF2F7', '#F5A623')),
  def('inv-band-dark', 'Midnight Band', 'Premium', ['agency', 'consulting', 'premium'], { header: 'band', table: 'dark', totals: 'band', footer: 'none', numbered: true }, P('#0F172A', '#E2E8F0', '#38BDF8')),
  def('inv-split-lined', 'Clean Split', 'Minimal', ['freelancer', 'consultant', 'minimal'], { header: 'split', table: 'lined', totals: 'right', footer: 'rule' }, P('#E53935', '#FDECEC', '#111827')),
  def('inv-split-grid', 'Ledger Grid', 'Accounting', ['accounting', 'bookkeeping', 'contractor'], { header: 'split', table: 'grid', totals: 'box', footer: 'dots', numbered: true }, P('#065F46', '#ECFDF5', '#10B981')),
  def('inv-centered-minimal', 'Centered Classic', 'Elegant', ['law', 'professional services', 'architecture'], { header: 'centered', table: 'minimal', totals: 'stacked', footer: 'rule' }, P('#3F2A1E', '#F5EFE6', '#B08D57', '#1F1A17', '#FFFDF8'), 'serif'),
  def('inv-centered-striped', 'Boutique', 'Elegant', ['retail', 'boutique', 'events'], { header: 'centered', table: 'striped', totals: 'band', footer: 'wave' }, P('#9D174D', '#FDF2F8', '#F9A8D4'), 'serif'),
  def('inv-sidebar-lined', 'Sidebar Pro', 'Modern', ['startup', 'agency', 'consultant'], { header: 'sidebar', table: 'lined', totals: 'stacked', footer: 'none' }, P('#4338CA', '#EEF2FF', '#F472B6')),
  def('inv-sidebar-grid', 'Sidebar Ledger', 'Corporate', ['contractor', 'construction', 'trades'], { header: 'sidebar', table: 'grid', totals: 'box', footer: 'none', numbered: true }, P('#334155', '#F1F5F9', '#F59E0B')),
  def('inv-hero-minimal', 'Big Type', 'Modern', ['designer', 'creative', 'freelancer'], { header: 'hero', table: 'minimal', totals: 'stacked', footer: 'none' }, P('#111827', '#F3F4F6', '#E53935')),
  def('inv-hero-striped', 'Statement', 'Bold', ['creative agency', 'studio', 'media'], { header: 'hero', table: 'striped', totals: 'band', footer: 'wave', stripesBg: true }, P('#7C3AED', '#F5F3FF', '#FBBF24')),
  def('inv-boxes-lined', 'Meta Boxes', 'Modern', ['saas', 'startup', 'subscription'], { header: 'boxes', table: 'lined', totals: 'right', footer: 'band' }, P('#0369A1', '#E0F2FE', '#22C55E')),
  def('inv-boxes-dark', 'Dashboard', 'Modern', ['tech', 'it services', 'software'], { header: 'boxes', table: 'dark', totals: 'box', footer: 'rule', numbered: true }, P('#0F766E', '#CCFBF1', '#14B8A6')),
  def('inv-due-grid', 'Amount First', 'Bold', ['services', 'repair', 'cleaning'], { header: 'amountDue', table: 'grid', totals: 'right', footer: 'rule' }, P('#C2410C', '#FFF7ED', '#FB923C')),
  def('inv-due-striped', 'Quick Pay', 'Modern', ['freelancer', 'tutor', 'coaching'], { header: 'amountDue', table: 'striped', totals: 'stacked', footer: 'dots' }, P('#1D4ED8', '#EFF6FF', '#FACC15')),
  def('inv-diagonal-lined', 'Diagonal', 'Geometric', ['startup', 'marketing', 'events'], { header: 'diagonal', table: 'lined', totals: 'band', footer: 'none' }, P('#DB2777', '#FDF2F8', '#7C3AED')),
  def('inv-diagonal-minimal', 'Angle Minimal', 'Geometric', ['photography', 'video', 'production'], { header: 'diagonal', table: 'minimal', totals: 'box', footer: 'dots', numbered: true }, P('#111827', '#F3F4F6', '#F59E0B')),
  def('inv-letterhead-minimal', 'Letterhead', 'Traditional', ['law', 'accounting', 'medical'], { header: 'letterhead', table: 'minimal', totals: 'right', footer: 'rule', numbered: true }, P('#1E3A8A', '#EFF6FF', '#CA8A04'), 'serif'),
  def('inv-letterhead-grid', 'Heritage Ledger', 'Traditional', ['wholesale', 'manufacturing', 'trade'], { header: 'letterhead', table: 'grid', totals: 'stacked', footer: 'none' }, P('#7F1D1D', '#FEF2F2', '#B45309', '#1C1917', '#FFFBF5'), 'serif'),
  def('inv-band-lined-wave', 'Ocean Wave', 'Friendly', ['travel', 'hospitality', 'wellness'], { header: 'band', table: 'lined', totals: 'stacked', footer: 'wave' }, P('#0E7490', '#ECFEFF', '#F97316')),
  def('inv-split-dark', 'Monochrome', 'Minimal', ['architecture', 'design', 'photography'], { header: 'split', table: 'dark', totals: 'stacked', footer: 'band' }, P('#18181B', '#F4F4F5', '#71717A')),
  def('inv-centered-grid', 'Product Sales', 'Retail', ['retail', 'products', 'ecommerce'], { header: 'centered', table: 'grid', totals: 'right', footer: 'dots', numbered: true }, P('#15803D', '#F0FDF4', '#84CC16')),
  def('inv-sidebar-striped', 'Coral Sidebar', 'Bold', ['beauty', 'salon', 'lifestyle'], { header: 'sidebar', table: 'striped', totals: 'band', footer: 'none' }, P('#FF6F61', '#FFF1EF', '#2D2A32')),
  def('inv-hero-grid', 'Engineer', 'Technical', ['engineering', 'it', 'consulting'], { header: 'hero', table: 'grid', totals: 'box', footer: 'rule', numbered: true }, P('#0F172A', '#F1F5F9', '#22D3EE'), 'mono'),
  def('inv-boxes-striped', 'Studio Boxes', 'Friendly', ['education', 'classes', 'workshops'], { header: 'boxes', table: 'striped', totals: 'stacked', footer: 'wave' }, P('#B45309', '#FFFBEB', '#0EA5E9')),
  def('inv-due-dark', 'Contractor Bold', 'Bold', ['contractor', 'trades', 'construction'], { header: 'amountDue', table: 'dark', totals: 'band', footer: 'none', numbered: true }, P('#EAB308', '#FEFCE8', '#111827', '#111827', '#FFFFFF')),
]

void measure
