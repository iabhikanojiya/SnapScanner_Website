// Invoice arithmetic in integer minor units (e.g. cents), so totals never
// suffer from floating-point rounding. Quantities and rates are parsed from
// decimal strings into scaled integers; all rounding is half away from zero.

export interface Currency {
  code: string
  name: string
  /** Number of minor-unit digits (2 for USD, 0 for JPY, 3 for KWD). */
  digits: number
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US dollar', digits: 2 },
  { code: 'EUR', name: 'Euro', digits: 2 },
  { code: 'GBP', name: 'British pound', digits: 2 },
  { code: 'INR', name: 'Indian rupee', digits: 2 },
  { code: 'CAD', name: 'Canadian dollar', digits: 2 },
  { code: 'AUD', name: 'Australian dollar', digits: 2 },
  { code: 'NZD', name: 'New Zealand dollar', digits: 2 },
  { code: 'SGD', name: 'Singapore dollar', digits: 2 },
  { code: 'AED', name: 'UAE dirham', digits: 2 },
  { code: 'SAR', name: 'Saudi riyal', digits: 2 },
  { code: 'ZAR', name: 'South African rand', digits: 2 },
  { code: 'NGN', name: 'Nigerian naira', digits: 2 },
  { code: 'KES', name: 'Kenyan shilling', digits: 2 },
  { code: 'BRL', name: 'Brazilian real', digits: 2 },
  { code: 'MXN', name: 'Mexican peso', digits: 2 },
  { code: 'CHF', name: 'Swiss franc', digits: 2 },
  { code: 'SEK', name: 'Swedish krona', digits: 2 },
  { code: 'CNY', name: 'Chinese yuan', digits: 2 },
  { code: 'JPY', name: 'Japanese yen', digits: 0 },
  { code: 'KRW', name: 'South Korean won', digits: 0 },
  { code: 'KWD', name: 'Kuwaiti dinar', digits: 3 },
  { code: 'BHD', name: 'Bahraini dinar', digits: 3 },
]

export function currency(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}

/** Symbols the PDF standard fonts can draw. Others are written as the ISO code. */
const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥' }

export class AmountError extends Error {}

/**
 * Parses a non-negative decimal string into an integer scaled by 10^scale,
 * rounding extra digits half up. "12.345" with scale 2 → 1235.
 */
export function parseScaled(input: string, scale: number): bigint {
  const s = input.trim().replace(/,/g, '')
  if (s === '') return 0n
  const m = s.match(/^(\d*)(?:\.(\d*))?$/)
  if (!m || (m[1] === '' && !m[2])) throw new AmountError(`“${input}” isn’t a valid number.`)
  const whole = m[1] || '0'
  const frac = m[2] ?? ''
  const kept = (frac + '0'.repeat(scale)).slice(0, scale)
  let value = BigInt(whole) * 10n ** BigInt(scale) + BigInt(kept || '0')
  const next = frac.length > scale ? Number(frac[scale]) : 0
  if (next >= 5) value += 1n
  return value
}

/** Divides with rounding half away from zero (values here are non-negative). */
function divRound(a: bigint, b: bigint): bigint {
  const q = a / b
  return (a % b) * 2n >= b ? q + 1n : q
}

export const QTY_SCALE = 3
export const RATE_SCALE = 4

export interface LineItem {
  id: string
  description: string
  quantity: string
  unitPrice: string
}

export interface TaxLine {
  id: string
  name: string
  /** Percentage, e.g. "18" or "8.875". */
  rate: string
}

export interface InvoiceMoneyInput {
  currency: string
  items: LineItem[]
  discountType: 'none' | 'percent' | 'fixed'
  discountValue: string
  taxes: TaxLine[]
  /** Amount already paid, subtracted from the total due. */
  paid?: string
}

export interface InvoiceTotals {
  lines: { id: string; amount: bigint; error?: string }[]
  subtotal: bigint
  discount: bigint
  taxable: bigint
  taxes: { id: string; name: string; rate: string; amount: bigint }[]
  total: bigint
  paid: bigint
  due: bigint
  errors: string[]
}

/** Computes every amount in minor units. Invalid inputs count as zero and are reported. */
export function computeInvoice(input: InvoiceMoneyInput): InvoiceTotals {
  const cur = currency(input.currency)
  const errors: string[] = []
  const safe = (fn: () => bigint, label: string) => {
    try {
      return fn()
    } catch (e) {
      errors.push(`${label}: ${e instanceof Error ? e.message : 'invalid'}`)
      return 0n
    }
  }
  const lines = input.items.map((item, i) => {
    let error: string | undefined
    let amount = 0n
    try {
      const qty = parseScaled(item.quantity || '0', QTY_SCALE)
      const price = parseScaled(item.unitPrice || '0', cur.digits)
      // price (minor) × qty (scaled by 10^3) / 10^3
      amount = divRound(price * qty, 10n ** BigInt(QTY_SCALE))
    } catch (e) {
      error = e instanceof Error ? e.message : 'Invalid amount'
      errors.push(`Line ${i + 1}: ${error}`)
    }
    return { id: item.id, amount, error }
  })
  const subtotal = lines.reduce((s, l) => s + l.amount, 0n)
  let discount = 0n
  if (input.discountType === 'percent') {
    const rate = safe(() => parseScaled(input.discountValue, RATE_SCALE), 'Discount')
    if (rate > 100n * 10n ** BigInt(RATE_SCALE)) errors.push('Discount: a percentage can’t be more than 100.')
    else discount = divRound(subtotal * rate, 100n * 10n ** BigInt(RATE_SCALE))
  } else if (input.discountType === 'fixed') {
    discount = safe(() => parseScaled(input.discountValue, cur.digits), 'Discount')
    if (discount > subtotal) {
      errors.push('Discount: it’s larger than the subtotal.')
      discount = subtotal
    }
  }
  const taxable = subtotal - discount
  const taxes = input.taxes
    .filter((t) => t.name.trim() || t.rate.trim())
    .map((t) => {
      const rate = safe(() => parseScaled(t.rate, RATE_SCALE), `Tax “${t.name || 'unnamed'}”`)
      return { id: t.id, name: t.name, rate: t.rate, amount: divRound(taxable * rate, 100n * 10n ** BigInt(RATE_SCALE)) }
    })
  const total = taxable + taxes.reduce((s, t) => s + t.amount, 0n)
  const paid = input.paid ? safe(() => parseScaled(input.paid!, cur.digits), 'Amount paid') : 0n
  return { lines, subtotal, discount, taxable, taxes, total, paid, due: total - paid, errors }
}

/** Formats minor units with grouping, e.g. 123456 USD → "$1,234.56"; INR → "INR 1,234.56". */
export function formatMoney(minor: bigint, code: string): string {
  const cur = currency(code)
  const neg = minor < 0n
  const abs = neg ? -minor : minor
  const base = 10n ** BigInt(cur.digits)
  const whole = (abs / base).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const frac = cur.digits ? `.${(abs % base).toString().padStart(cur.digits, '0')}` : ''
  const symbol = SYMBOLS[cur.code]
  const body = `${whole}${frac}`
  return `${neg ? '-' : ''}${symbol ? `${symbol}${body}` : `${cur.code} ${body}`}`
}

/** Formats a scaled quantity without trailing zeros: 1500 (scale 3) → "1.5". */
export function formatQuantity(input: string): string {
  try {
    const v = parseScaled(input || '0', QTY_SCALE)
    const base = 10n ** BigInt(QTY_SCALE)
    const frac = (v % base).toString().padStart(QTY_SCALE, '0').replace(/0+$/, '')
    return `${v / base}${frac ? `.${frac}` : ''}`
  } catch {
    return input
  }
}
