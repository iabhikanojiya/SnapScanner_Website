import { describe, expect, it } from 'vitest'
import { buildIndex, findInPage, matchRects } from '@/lib/pdf/search'
import { makePdf, openWithPdfjs } from './helpers'

describe('text search', () => {
  const items = [
    { str: 'Invoice number 1001', transform: [12, 0, 0, 12, 72, 700], width: 120, hasEOL: true },
    { str: 'Total due: invoice', transform: [10, 0, 0, 10, 72, 680], width: 90 },
  ]

  it('finds case-insensitive matches across items', () => {
    const index = buildIndex(items)
    expect(findInPage(index, 'INVOICE', 0)).toEqual([
      { page: 0, start: 0, end: 7 },
      { page: 0, start: 31, end: 38 },
    ])
    expect(findInPage(index, '  ', 0)).toEqual([])
  })

  it('computes rectangles around the matched characters', () => {
    const index = buildIndex(items)
    const [r] = matchRects(index, { page: 0, start: 8, end: 14 })
    // "number" is characters 8-14 of a 19-character, 120-unit-wide item.
    expect(r[0]).toBeCloseTo(72 + (120 * 8) / 19)
    expect(r[2]).toBeCloseTo(72 + (120 * 14) / 19)
    expect(r[1]).toBeLessThan(700)
    expect(r[3]).toBeGreaterThan(700)
  })

  it('works on text extracted by pdf.js from a real PDF', async () => {
    const doc = await openWithPdfjs(await makePdf(3, { label: 'Search' }))
    const page = await doc.getPage(2)
    const tc = await page.getTextContent()
    const index = buildIndex(tc.items.filter((i) => 'str' in i) as never)
    const matches = findInPage(index, 'page 2', 1)
    expect(matches).toHaveLength(1)
    expect(matchRects(index, matches[0])).toHaveLength(1)
  })
})
