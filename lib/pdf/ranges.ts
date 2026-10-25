// Page-range parsing for Split PDF: "1-3, 5, 8-10" → [[0,1,2],[4],[7,8,9]].

export class RangeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PageRangeError'
  }
}

/**
 * Parses comma-separated page numbers and ranges (1-based, inclusive) into
 * groups of 0-based page indexes. "4-" means page 4 to the end. Throws
 * RangeError with a readable message for invalid input.
 */
export function parsePageRanges(input: string, pageCount: number): number[][] {
  const parts = input
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) throw new RangeError('Enter at least one page or range, for example 1-3, 5.')

  return parts.map((part) => {
    const m = part.match(/^(\d+)\s*(?:[-–—]\s*(\d*))?$/)
    if (!m) throw new RangeError(`“${part}” isn’t a page number or range. Use numbers like 2 or 4-7.`)
    const start = Number(m[1])
    const end = m[2] === undefined ? start : m[2] === '' ? pageCount : Number(m[2])
    if (start < 1 || end < 1) throw new RangeError('Page numbers start at 1.')
    if (start > pageCount || end > pageCount)
      throw new RangeError(`“${part}” goes past the last page. This PDF has ${pageCount} page${pageCount === 1 ? '' : 's'}.`)
    if (end < start) throw new RangeError(`“${part}” runs backwards. Write the lower page first, like ${end}-${start}.`)
    return Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i)
  })
}

/** Formats sorted 0-based indexes as compact 1-based ranges: [0,1,2,4] → "1-3, 5". */
export function formatPageRanges(indexes: number[]): string {
  const sorted = [...new Set(indexes)].sort((a, b) => a - b)
  const out: string[] = []
  for (let i = 0; i < sorted.length; ) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++
    out.push(i === j ? `${sorted[i] + 1}` : `${sorted[i] + 1}-${sorted[j] + 1}`)
    i = j + 1
  }
  return out.join(', ')
}

/** Groups 0-based indexes into runs of consecutive pages. */
export function consecutiveGroups(indexes: number[]): number[][] {
  const sorted = [...new Set(indexes)].sort((a, b) => a - b)
  const groups: number[][] = []
  for (const i of sorted) {
    const last = groups[groups.length - 1]
    if (last && last[last.length - 1] === i - 1) last.push(i)
    else groups.push([i])
  }
  return groups
}
