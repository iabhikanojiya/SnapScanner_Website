import { describe, expect, it } from 'vitest'
import { AmountError, computeInvoice, formatMoney, formatQuantity, parseScaled } from '@/lib/create/money'

const item = (quantity: string, unitPrice: string, id = Math.random().toString()) => ({ id, description: 'x', quantity, unitPrice })

describe('invoice arithmetic', () => {
  it('parses decimals into scaled integers with half-up rounding', () => {
    expect(parseScaled('12.34', 2)).toBe(1234n)
    expect(parseScaled('12.345', 2)).toBe(1235n)
    expect(parseScaled('12.344', 2)).toBe(1234n)
    expect(parseScaled('1,250', 2)).toBe(125000n)
    expect(parseScaled('.5', 3)).toBe(500n)
    expect(parseScaled('', 2)).toBe(0n)
    expect(() => parseScaled('12a', 2)).toThrow(AmountError)
    expect(() => parseScaled('-3', 2)).toThrow(AmountError)
  })

  it('avoids floating-point errors (0.1 + 0.2)', () => {
    const r = computeInvoice({ currency: 'USD', items: [item('1', '0.1'), item('1', '0.2')], discountType: 'none', discountValue: '', taxes: [] })
    expect(r.subtotal).toBe(30n)
    expect(formatMoney(r.total, 'USD')).toBe('$0.30')
  })

  it('computes lines, percent discount and multiple taxes', () => {
    const r = computeInvoice({
      currency: 'INR',
      items: [item('2', '1500'), item('1.5', '999.99'), item('3', '33.333')],
      discountType: 'percent',
      discountValue: '10',
      taxes: [
        { id: 'c', name: 'CGST', rate: '9' },
        { id: 's', name: 'SGST', rate: '9' },
      ],
    })
    // 1.5 × 999.99 = 1499.985 → 1499.99; unit prices are rounded to the currency first (33.333 → 33.33).
    expect(r.lines.map((l) => l.amount)).toEqual([300000n, 149999n, 9999n])
    expect(r.subtotal).toBe(459998n)
    expect(r.discount).toBe(46000n) // 45999.8 → 46000
    expect(r.taxable).toBe(413998n)
    expect(r.taxes.map((t) => t.amount)).toEqual([37260n, 37260n]) // 37259.82 → 37260
    expect(r.total).toBe(488518n)
    expect(formatMoney(r.total, 'INR')).toBe('INR 4,885.18')
  })

  it('supports fixed discounts, amounts paid and zero-decimal currencies', () => {
    const r = computeInvoice({ currency: 'JPY', items: [item('3', '1200')], discountType: 'fixed', discountValue: '500', taxes: [{ id: 't', name: 'Consumption tax', rate: '10' }], paid: '1000' })
    expect(r.subtotal).toBe(3600n)
    expect(r.total).toBe(3410n)
    expect(r.due).toBe(2410n)
    expect(formatMoney(r.due, 'JPY')).toBe('¥2,410')
    expect(formatMoney(1234567n, 'KWD')).toBe('KWD 1,234.567')
    expect(formatMoney(123456789n, 'EUR')).toBe('€1,234,567.89')
  })

  it('reports invalid input without breaking the totals', () => {
    const r = computeInvoice({ currency: 'USD', items: [item('two', '5'), item('1', '5')], discountType: 'percent', discountValue: '150', taxes: [{ id: 'x', name: 'VAT', rate: 'abc' }] })
    expect(r.subtotal).toBe(500n)
    expect(r.errors).toHaveLength(3)
    const fixed = computeInvoice({ currency: 'USD', items: [item('1', '5')], discountType: 'fixed', discountValue: '9', taxes: [] })
    expect(fixed.discount).toBe(500n)
    expect(fixed.errors[0]).toMatch(/larger than the subtotal/)
  })

  it('formats quantities', () => {
    expect(formatQuantity('1.500')).toBe('1.5')
    expect(formatQuantity('2')).toBe('2')
  })
})
