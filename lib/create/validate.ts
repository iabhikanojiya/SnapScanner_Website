// Checks shown in the editor before export. None of them block exporting.
import { toWinAnsi } from './engine'
import { invoiceTotals } from './categories/invoices'
import { slotKey } from './categories/photo-collages'
import { bool, str, type Content, type TemplateDef } from './kit'
import { slotCount, type Category } from './registry'

export interface Warning {
  tone: 'warning' | 'info'
  text: string
}

function strings(v: unknown, out: string[]) {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out))
  else if (v && typeof v === 'object' && !('src' in v)) Object.values(v).forEach((x) => strings(x, out))
}

/** Characters the PDF standard fonts can't draw (they appear as "?" or without accents). */
export function unsupportedChars(content: Content): string[] {
  const all: string[] = []
  strings(content, all)
  const bad = new Set<string>()
  for (const s of all)
    for (const ch of Array.from(s.replace(/[   ]/g, ' '))) {
      if (toWinAnsi(ch) !== ch) bad.add(ch)
    }
  return [...bad]
}

export function projectWarnings(cat: Category, tpl: TemplateDef, content: Content): Warning[] {
  const w: Warning[] = []
  const bad = unsupportedChars(content)
  if (bad.length)
    w.push({
      tone: 'warning',
      text: `Some characters (${bad.slice(0, 10).join(' ')}) aren’t supported by the built-in PDF fonts and are shown simplified or as “?”. Latin-alphabet text is fully supported.`,
    })
  if (bool(content, 'showQr') && !str(content, 'qrData').trim()) w.push({ tone: 'warning', text: 'The QR code is turned on but has no content, so it isn’t shown.' })
  const unusedFilled = (tpl.unused ?? []).filter((k) => {
    const v = content[k]
    return typeof v === 'string' ? v.trim() !== '' : !!v
  })
  if (unusedFilled.length) {
    const labels = unusedFilled.map((k) => cat.fields.find((f) => f.key === k)?.label ?? k)
    w.push({ tone: 'info', text: `${tpl.name} doesn’t show: ${labels.join(', ')}. It’s kept for templates that do.` })
  }
  if (cat.id === 'id-cards') {
    const issue = str(content, 'issueDate')
    const expiry = str(content, 'expiryDate')
    if (/^\d{4}-\d{2}-\d{2}$/.test(issue) && /^\d{4}-\d{2}-\d{2}$/.test(expiry) && expiry < issue) w.push({ tone: 'warning', text: 'The expiry date is before the issue date.' })
  }
  if (cat.id === 'invoices') {
    const t = invoiceTotals(content)
    for (const e of t.errors) w.push({ tone: 'warning', text: e })
    if (!t.lines.length) w.push({ tone: 'warning', text: 'Add at least one line item.' })
    const d = str(content, 'invoiceDate')
    const due = str(content, 'dueDate')
    if (d && due && due < d) w.push({ tone: 'warning', text: 'The due date is before the invoice date.' })
    if (t.due < 0n) w.push({ tone: 'warning', text: 'The amount paid is more than the total.' })
  }
  if (cat.id === 'photo-collages') {
    const n = slotCount(tpl)
    const empty = Array.from({ length: n }, (_, i) => i).filter((i) => !content[slotKey(i)])
    if (empty.length) w.push({ tone: 'info', text: `${empty.length} of ${n} photo frames ${empty.length === 1 ? 'is' : 'are'} empty. Empty frames are left blank in exports.` })
  }
  return w
}
