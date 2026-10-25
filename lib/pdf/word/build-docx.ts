// Writes analysed PDF pages as an editable Word document with the `docx`
// library. Each PDF page becomes a section with the same page size and
// margins; two-column parts become two-column sections.
import {
  AlignmentType,
  BorderStyle,
  ColumnBreak,
  Document,
  HeadingLevel,
  ImageRun,
  LineRuleType,
  Packer,
  PageOrientation,
  Paragraph,
  SectionType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  type ISectionOptions,
} from 'docx'
import type { Family, OutBlock, OutPage, Run } from './analyze'

const tw = (pt: number) => Math.max(0, Math.round(pt * 20))
const FONT: Record<Family, string> = { sans: 'Arial', serif: 'Times New Roman', mono: 'Courier New' }
const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED } as const
/** Points to the 96-dpi pixels docx uses for image sizes. */
const px = (pt: number) => Math.max(1, Math.round((pt * 96) / 72))

function textRuns(runs: Run[]) {
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.bold || undefined,
        italics: r.italic || undefined,
        size: Math.min(1638, Math.max(2, Math.round(r.size * 2))),
        font: r.font ?? FONT[r.family],
      })
  )
}

const THIN = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' }

function blockToDocx(b: OutBlock, maxWidth: number, columnBreak: boolean): (Paragraph | Table)[] {
  const extra = columnBreak ? [new ColumnBreak()] : []
  // Large gaps (e.g. before a footer line) are reduced slightly, so small
  // differences in line height don't push the last lines onto a new page.
  const before = tw(b.spaceBefore > 24 ? b.spaceBefore * 0.85 : b.spaceBefore)
  switch (b.t) {
    case 'para':
      return [
        new Paragraph({
          children: [...textRuns(b.runs), ...extra],
          alignment: ALIGN[b.align],
          heading: b.heading === 1 ? HeadingLevel.HEADING_1 : b.heading === 2 ? HeadingLevel.HEADING_2 : undefined,
          bullet: b.bullet ? { level: 0 } : undefined,
          spacing: { before: before, after: 0, line: tw(Math.max(b.lineHeight, 1)), lineRule: LineRuleType.AT_LEAST },
          indent: b.bullet ? undefined : { left: tw(b.indent), ...(b.firstLine >= 0 ? { firstLine: tw(b.firstLine) } : { hanging: tw(-b.firstLine) }) },
        }),
      ]
    case 'image': {
      const scale = Math.min(1, maxWidth / b.image.w)
      return [
        new Paragraph({
          spacing: { before, after: 0 },
          indent: { left: tw(Math.min(b.indent, Math.max(0, maxWidth - b.image.w * scale))) },
          children: [new ImageRun({ type: b.image.type, data: b.image.data, transformation: { width: px(b.image.w * scale), height: px(b.image.h * scale) } }), ...extra],
        }),
      ]
    }
    case 'table': {
      const total = b.widths.reduce((a, c) => a + c, 0)
      const scale = Math.min(1, maxWidth / total)
      const widths = b.widths.map((w) => tw(w * scale))
      const table = new Table({
        layout: TableLayoutType.FIXED,
        width: { size: widths.reduce((a, c) => a + c, 0), type: WidthType.DXA },
        columnWidths: widths,
        indent: { size: tw(Math.min(b.indent, Math.max(0, maxWidth - total * scale))), type: WidthType.DXA },
        borders: { top: THIN, bottom: THIN, left: THIN, right: THIN, insideHorizontal: THIN, insideVertical: THIN },
        rows: b.rows.map(
          (row) =>
            new TableRow({
              children: widths.map((w, k) => new TableCell({ width: { size: w, type: WidthType.DXA }, children: [new Paragraph({ children: textRuns(row[k] ?? []) })] })),
            })
        ),
      })
      // Word requires a paragraph between a table and a following column break.
      return [new Paragraph({ spacing: { before, after: 0 }, children: [] }), table, ...(columnBreak ? [new Paragraph({ children: extra })] : [])]
    }
  }
}

export interface BuildOptions {
  title?: string
}

export async function buildDocx(pages: OutPage[], opts: BuildOptions = {}): Promise<Blob> {
  const sections: ISectionOptions[] = []
  pages.forEach((page, pi) => {
    const landscape = page.width > page.height
    const size = { width: tw(Math.min(page.width, page.height)), height: tw(Math.max(page.width, page.height)), orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }
    const margin = { top: tw(page.margins.top), right: tw(page.margins.right), bottom: tw(page.margins.bottom), left: tw(page.margins.left), header: 360, footer: 360 }
    const width = page.width - page.margins.left - page.margins.right
    page.regions.forEach((region, ri) => {
      const type = ri === 0 ? (pi === 0 ? undefined : SectionType.NEXT_PAGE) : SectionType.CONTINUOUS
      if (region.columns === 1) {
        const children = region.blocks.flatMap((b) => blockToDocx(b, width, false))
        sections.push({ properties: { type, page: { size, margin } }, children: children.length ? children : [new Paragraph({ children: [] })] })
      } else {
        const colWidth = (width - region.gap) / 2
        const left = region.left.flatMap((b, i) => blockToDocx(b, colWidth, i === region.left.length - 1))
        const right = region.right.flatMap((b) => blockToDocx(b, colWidth, false))
        sections.push({
          properties: { type, page: { size, margin }, column: { count: 2, space: tw(region.gap), equalWidth: true } },
          children: [...(left.length ? left : [new Paragraph({ children: [new ColumnBreak()] })]), ...(right.length ? right : [new Paragraph({ children: [] })])],
        })
      }
    })
  })
  const doc = new Document({
    title: opts.title,
    creator: 'Snap Scanner PDF to Word',
    styles: {
      default: {
        // Headings keep the PDF's own sizes and colours rather than Word's theme styles.
        heading1: { run: { color: '000000', font: 'Arial' }, paragraph: { spacing: { after: 0 } } },
        heading2: { run: { color: '000000', font: 'Arial' }, paragraph: { spacing: { after: 0 } } },
        document: { run: { font: 'Arial' } },
      },
    },
    sections: sections.length ? sections : [{ children: [new Paragraph({ children: [] })] }],
  })
  return Packer.toBlob(doc)
}
