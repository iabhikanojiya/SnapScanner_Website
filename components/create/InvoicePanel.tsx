'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { invoiceTotals } from '@/lib/create/categories/invoices'
import { str, type Content } from '@/lib/create/kit'
import { formatMoney, type LineItem, type TaxLine } from '@/lib/create/money'
import { newId } from '@/lib/storage/db'

interface Props {
  content: Content
  onChange: (key: string, value: unknown, coalesce?: string) => void
}

/** Line items, discount, taxes and amount paid, with live totals. */
export default function InvoicePanel({ content, onChange }: Props) {
  const items = (Array.isArray(content.items) ? content.items : []) as LineItem[]
  const taxes = (Array.isArray(content.taxes) ? content.taxes : []) as TaxLine[]
  const cur = str(content, 'currency', 'USD')
  const totals = invoiceTotals(content)
  const setItem = (i: number, patch: Partial<LineItem>, field: string) => onChange('items', items.map((it, j) => (j === i ? { ...it, ...patch } : it)), `item-${items[i].id}-${field}`)
  const move = (i: number, d: -1 | 1) => {
    const next = [...items]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange('items', next)
  }
  const setTax = (i: number, patch: Partial<TaxLine>, field: string) => onChange('taxes', taxes.map((t, j) => (j === i ? { ...t, ...patch } : t)), `tax-${taxes[i].id}-${field}`)
  const discountType = str(content, 'discountType', 'none')

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="items-heading">
        <h2 id="items-heading" className="text-sm font-bold text-ink">
          Line items
        </h2>
        <ol className="mt-3 space-y-3" data-testid="line-items">
          {items.map((it, i) => (
            <li key={it.id} className="rounded-lg border border-gray-200 p-3">
              <label htmlFor={`desc-${it.id}`} className="field-label text-xs">
                Item {i + 1} description
              </label>
              <textarea id={`desc-${it.id}`} rows={2} className="field" maxLength={300} value={it.description} onChange={(e) => setItem(i, { description: e.target.value }, 'd')} />
              <div className="mt-2 grid grid-cols-[1fr_1.4fr_1.4fr] gap-2">
                <div>
                  <label htmlFor={`qty-${it.id}`} className="field-label text-xs">
                    Qty
                  </label>
                  <input id={`qty-${it.id}`} inputMode="decimal" className="field" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value }, 'q')} aria-invalid={!!totals.lines[i]?.error} />
                </div>
                <div>
                  <label htmlFor={`price-${it.id}`} className="field-label text-xs">
                    Unit price
                  </label>
                  <input id={`price-${it.id}`} inputMode="decimal" className="field" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: e.target.value }, 'p')} aria-invalid={!!totals.lines[i]?.error} />
                </div>
                <div>
                  <p className="field-label text-xs">Amount</p>
                  <p className="mt-1 flex h-10 items-center justify-end rounded-lg bg-gray-50 px-2 text-sm font-semibold tabular-nums text-ink" data-testid={`line-amount-${i}`}>
                    {formatMoney(totals.lines[i]?.amount ?? 0n, cur)}
                  </p>
                </div>
              </div>
              {totals.lines[i]?.error && <p className="mt-1 text-xs text-brand-700">{totals.lines[i].error}</p>}
              <div className="mt-2 flex justify-end gap-1">
                <Button variant="ghost" size="icon-sm" aria-label={`Move item ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp aria-hidden className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Move item ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown aria-hidden className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Remove item ${i + 1}`} onClick={() => onChange('items', items.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <Button variant="secondary" size="xs" className="mt-3" disabled={items.length >= 200} onClick={() => onChange('items', [...items, { id: newId(), description: '', quantity: '1', unitPrice: '' }])}>
          <Plus aria-hidden className="h-4 w-4" />
          Add item
        </Button>
        <p className="mt-2 text-xs text-ink-muted">Use digits with an optional decimal point, e.g. 2.5 or 1,250.00. Long invoices continue on more pages automatically.</p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="adjust-heading">
        <h2 id="adjust-heading" className="text-sm font-bold text-ink">
          Discount, taxes and payments
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="discount-type" className="field-label text-xs">
              Discount
            </label>
            <select id="discount-type" className="field" value={discountType} onChange={(e) => onChange('discountType', e.target.value)}>
              <option value="none">No discount</option>
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </div>
          {discountType !== 'none' && (
            <div>
              <label htmlFor="discount-value" className="field-label text-xs">
                {discountType === 'percent' ? 'Discount %' : `Discount (${cur})`}
              </label>
              <input id="discount-value" inputMode="decimal" className="field" value={str(content, 'discountValue')} onChange={(e) => onChange('discountValue', e.target.value, 'discount-value')} />
            </div>
          )}
        </div>

        <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-muted">Taxes</h3>
        <p className="text-xs text-ink-muted">Add the taxes that apply to you (for example VAT, GST, CGST + SGST or sales tax), or none.</p>
        <ul className="mt-2 space-y-2">
          {taxes.map((t, i) => (
            <li key={t.id} className="grid grid-cols-[1.6fr_1fr_auto] items-end gap-2">
              <div>
                <label htmlFor={`tax-name-${t.id}`} className="field-label text-xs">
                  Tax name
                </label>
                <input id={`tax-name-${t.id}`} className="field" maxLength={30} value={t.name} onChange={(e) => setTax(i, { name: e.target.value }, 'n')} />
              </div>
              <div>
                <label htmlFor={`tax-rate-${t.id}`} className="field-label text-xs">
                  Rate %
                </label>
                <input id={`tax-rate-${t.id}`} inputMode="decimal" className="field" value={t.rate} onChange={(e) => setTax(i, { rate: e.target.value }, 'r')} />
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Remove tax ${t.name || i + 1}`} onClick={() => onChange('taxes', taxes.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
        <Button variant="secondary" size="xs" className="mt-2" disabled={taxes.length >= 6} onClick={() => onChange('taxes', [...taxes, { id: newId(), name: 'Tax', rate: '' }])}>
          <Plus aria-hidden className="h-4 w-4" />
          Add tax
        </Button>

        <div className="mt-4 max-w-[12rem]">
          <label htmlFor="amount-paid" className="field-label text-xs">
            Amount already paid ({cur})
          </label>
          <input id="amount-paid" inputMode="decimal" className="field" value={str(content, 'paid')} onChange={(e) => onChange('paid', e.target.value, 'amount-paid')} />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4" aria-labelledby="totals-heading">
        <h2 id="totals-heading" className="text-sm font-bold text-ink">
          Totals
        </h2>
        <dl className="mt-2 space-y-1 text-sm tabular-nums" data-testid="invoice-totals">
          <Row label="Subtotal" value={formatMoney(totals.subtotal, cur)} />
          {totals.discount > 0n && <Row label="Discount" value={`-${formatMoney(totals.discount, cur)}`} />}
          {totals.taxes.map((t) => (
            <Row key={t.id} label={`${t.name || 'Tax'}${t.rate ? ` (${t.rate}%)` : ''}`} value={formatMoney(t.amount, cur)} />
          ))}
          <Row label="Total" value={formatMoney(totals.total, cur)} strong testId="invoice-total" />
          {totals.paid > 0n && (
            <>
              <Row label="Paid" value={`-${formatMoney(totals.paid, cur)}`} />
              <Row label="Amount due" value={formatMoney(totals.due, cur)} strong />
            </>
          )}
        </dl>
        <p className="mt-2 text-xs text-ink-muted">Amounts are calculated exactly in the currency’s smallest unit and rounded half up per line, discount and tax.</p>
      </section>
    </div>
  )
}

function Row({ label, value, strong, testId }: { label: string; value: string; strong?: boolean; testId?: string }) {
  return (
    <div className={strong ? 'flex justify-between border-t border-gray-200 pt-1 font-bold text-ink' : 'flex justify-between text-ink-soft'}>
      <dt>{label}</dt>
      <dd data-testid={testId}>{value}</dd>
    </div>
  )
}
