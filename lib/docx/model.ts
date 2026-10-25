// The subset of a Word document that Word to PDF lays out. Lengths are in
// points (1/72 inch); colours are 6-digit hex strings without '#'.

export interface RunStyle {
  font: string
  size: number
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  color: string
  /** Background behind the text (highlight or run shading). */
  background?: string
  vertAlign?: 'super' | 'sub'
  caps: boolean
  hidden: boolean
}

export type Inline =
  | { t: 'text'; text: string; style: RunStyle; href?: string }
  | { t: 'tab'; style: RunStyle }
  | { t: 'break'; kind: 'line' | 'page' | 'column'; style: RunStyle }
  | { t: 'image'; id: string; width: number; height: number; style: RunStyle }
  /** A box standing in for content that can't be drawn (charts, shapes, EMF images). */
  | { t: 'placeholder'; label: string; width: number; height: number; style: RunStyle }
  /** Page number fields, resolved per page (mainly in headers and footers). */
  | { t: 'field'; field: 'page' | 'pages'; style: RunStyle }

export interface Border {
  width: number
  color: string
  /** Gap between the border and the text, for paragraph borders. */
  space?: number
}

export interface TabStop {
  pos: number
  align: 'left' | 'center' | 'right' | 'decimal'
  leader?: 'dot' | 'hyphen' | 'underscore'
}

export interface ParaStyle {
  align: 'left' | 'center' | 'right' | 'justify'
  indentLeft: number
  indentRight: number
  /** Positive for a first-line indent, negative for a hanging indent. */
  firstLine: number
  spaceBefore: number
  spaceAfter: number
  line: { rule: 'auto' | 'exact' | 'atLeast'; value: number }
  keepNext: boolean
  keepLines: boolean
  pageBreakBefore: boolean
  contextualSpacing: boolean
  styleId: string
  tabs: TabStop[]
  shading?: string
  borders: { top?: Border; bottom?: Border; left?: Border; right?: Border }
}

export interface Paragraph {
  t: 'p'
  style: ParaStyle
  /** Style for the paragraph mark, used for empty paragraphs' height. */
  markStyle: RunStyle
  inlines: Inline[]
  /** List number or bullet, already formatted ("3.", "•"). */
  label?: { text: string; style: RunStyle }
}

export interface Cell {
  blocks: Block[]
  span: number
  vMerge?: 'restart' | 'continue'
  shading?: string
  borders: { top?: Border; bottom?: Border; left?: Border; right?: Border }
  margins: { top: number; bottom: number; left: number; right: number }
  vAlign: 'top' | 'center' | 'bottom'
}

export interface Row {
  cells: Cell[]
  height?: { value: number; rule: 'atLeast' | 'exact' }
  header: boolean
  cantSplit: boolean
}

export interface Table {
  t: 'table'
  rows: Row[]
  /** Grid column widths. */
  columns: number[]
  indent: number
  align: 'left' | 'center' | 'right'
}

export type Block = Paragraph | Table

export interface HeaderFooterSet {
  default?: Block[]
  first?: Block[]
  even?: Block[]
}

export interface Section {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number; header: number; footer: number }
  /** Whether the section starts on a new page. */
  newPage: boolean
  titlePage: boolean
  headers: HeaderFooterSet
  footers: HeaderFooterSet
  blocks: Block[]
}

export interface DocImage {
  bytes: Uint8Array
  /** Detected from the bytes: 'png' | 'jpeg' | 'gif' | 'bmp' | 'webp' | 'tiff' | 'emf' | 'wmf' | 'svg' | 'unknown'. */
  format: string
}

export interface DocModel {
  sections: Section[]
  images: Map<string, DocImage>
  evenAndOddHeaders: boolean
  title?: string
  /** Readable notes about content that was approximated or left out. */
  warnings: string[]
}
