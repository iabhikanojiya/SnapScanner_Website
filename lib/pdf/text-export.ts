// Turns pdf.js text content into plain text or Markdown. Only text that is
// actually in the PDF's text layer is used; nothing is guessed or generated.

export interface TextRun {
  str: string
  /** [a, b, c, d, e, f] text matrix in PDF user space. */
  transform: number[]
  width: number
  height?: number
  hasEOL?: boolean
}

export interface Line {
  text: string
  /** Baseline y in user space (larger = higher on the page). */
  y: number
  x: number
  size: number
}

/** Groups runs into lines by baseline, ordered top to bottom, left to right. */
export function toLines(runs: TextRun[]): Line[] {
  const items = runs
    .filter((r) => r.str.trim() || r.str === ' ')
    .map((r) => ({ ...r, x: r.transform[4], y: r.transform[5], size: Math.hypot(r.transform[2], r.transform[3]) || Math.abs(r.transform[0]) || 10 }))
  items.sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: { items: typeof items; y: number; size: number }[] = []
  for (const it of items) {
    const line = lines.find((l) => Math.abs(l.y - it.y) < Math.max(2, Math.min(l.size, it.size) * 0.4))
    if (line) {
      line.items.push(it)
      line.size = Math.max(line.size, it.size)
    } else lines.push({ items: [it], y: it.y, size: it.size })
  }
  lines.sort((a, b) => b.y - a.y)
  return lines
    .map((l) => {
      const sorted = l.items.sort((a, b) => a.x - b.x)
      let text = ''
      let lastEnd: number | null = null
      for (const it of sorted) {
        // Insert a space when there's a visible gap between runs.
        if (lastEnd !== null && it.x - lastEnd > it.size * 0.2 && !text.endsWith(' ') && !it.str.startsWith(' ')) text += ' '
        text += it.str
        lastEnd = it.x + it.width
      }
      return { text: text.replace(/\s+/g, ' ').trim(), y: l.y, x: sorted[0].x, size: l.size }
    })
    .filter((l) => l.text)
}

interface Block {
  kind: 'heading1' | 'heading2' | 'bullet' | 'paragraph'
  text: string
}

const BULLET = /^([•◦▪●‣∙·*-]|\d{1,3}[.)])\s+/

/** Splits lines into paragraphs, headings and list items using spacing and font size. */
export function toBlocks(lines: Line[], bodySize: number): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let prev: Line | null = null
  const flush = () => {
    if (para.length) blocks.push({ kind: 'paragraph', text: para.join(' ').replace(/(\w)- (\w)/g, '$1$2') })
    para = []
  }
  for (const line of lines) {
    const ratio = line.size / bodySize
    const gap = prev ? prev.y - line.y : 0
    const newPara = !prev || gap > Math.max(prev.size, line.size) * 1.6
    if (ratio >= 1.45 && line.text.length < 120) {
      flush()
      blocks.push({ kind: 'heading1', text: line.text })
    } else if (ratio >= 1.15 && line.text.length < 140) {
      flush()
      blocks.push({ kind: 'heading2', text: line.text })
    } else if (BULLET.test(line.text)) {
      flush()
      blocks.push({ kind: 'bullet', text: line.text.replace(BULLET, '') })
    } else {
      if (newPara) flush()
      // A short line continuing a bullet is part of that bullet.
      const last = blocks[blocks.length - 1]
      if (!newPara && para.length === 0 && last?.kind === 'bullet') last.text += ` ${line.text}`
      else para.push(line.text)
    }
    prev = line
  }
  flush()
  return blocks
}

/** The most common font size, weighted by characters: the body text size. */
export function bodyFontSize(lines: Line[]) {
  const weights = new Map<number, number>()
  for (const l of lines) weights.set(Math.round(l.size), (weights.get(Math.round(l.size)) ?? 0) + l.text.length)
  let best = 12
  let bestW = -1
  for (const [s, w] of weights) if (w > bestW) [best, bestW] = [s, w]
  return best
}

export interface ExportedText {
  text: string
  markdown: string
  /** Pages (0-based) without any text layer. */
  emptyPages: number[]
  characters: number
}

const mdEscape = (s: string) => s.replace(/([\\`*_[\]#<>])/g, '\\$1')

export function exportText(pages: TextRun[][]): ExportedText {
  const allLines = pages.map(toLines)
  const body = bodyFontSize(allLines.flat())
  const txt: string[] = []
  const md: string[] = []
  const emptyPages: number[] = []
  allLines.forEach((lines, i) => {
    if (!lines.length) emptyPages.push(i)
    const blocks = toBlocks(lines, body)
    txt.push(blocks.map((b) => (b.kind === 'bullet' ? `• ${b.text}` : b.text)).join('\n\n'))
    md.push(
      blocks
        .map((b) => (b.kind === 'heading1' ? `# ${mdEscape(b.text)}` : b.kind === 'heading2' ? `## ${mdEscape(b.text)}` : b.kind === 'bullet' ? `- ${mdEscape(b.text)}` : mdEscape(b.text)))
        .join('\n\n')
    )
  })
  const text = txt.map((t, i) => (pages.length > 1 ? `--- Page ${i + 1} ---\n\n${t}` : t)).join('\n\n').trim() + '\n'
  const markdown = md.map((t, i) => (pages.length > 1 ? `<!-- Page ${i + 1} -->\n\n${t}` : t)).join('\n\n---\n\n').trim() + '\n'
  return { text, markdown, emptyPages, characters: allLines.flat().reduce((n, l) => n + l.text.length, 0) }
}
