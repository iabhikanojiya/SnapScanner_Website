// Reads a .docx package (Office Open XML) into the document model that the
// Word to PDF layout uses. Styles, numbering, sections, headers and footers,
// tables and images are resolved here so layout only deals with final values.
import { unzipSync } from 'fflate'
import type { Block, Border, Cell, DocImage, DocModel, HeaderFooterSet, Inline, ParaStyle, Paragraph, Row, RunStyle, Section, Table, TabStop } from './model'
import { child, childrenNamed, elements, find, findAll, parseXml, textOf, type XmlElement } from './xml'

export class DocxError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DocxError'
  }
}

/** Unpacked sizes beyond these are refused, which also stops ZIP bombs. */
const MAX_PART_BYTES = 150 * 1024 * 1024
const MAX_TOTAL_BYTES = 400 * 1024 * 1024

const twip = (v: string | undefined, fallback = 0) => (v === undefined || v === '' || isNaN(Number(v)) ? fallback : Number(v) / 20)
const emu = (v: string | undefined) => (v && !isNaN(Number(v)) ? Number(v) / 12700 : 0)
const attr = (el: XmlElement | undefined, name: string) => el?.attrs[`w:${name}`] ?? el?.attrs[name]
const val = (el: XmlElement | undefined) => attr(el, 'val')
const truthy = (v: string | undefined) => v === undefined || !['0', 'false', 'off', 'none'].includes(v)
const onOff = (el: XmlElement | undefined): boolean | undefined => (el ? truthy(val(el)) : undefined)

/** Detects the type of an embedded image from its leading bytes. */
export function imageFormat(b: Uint8Array): string {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpeg'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'gif'
  if (b[0] === 0x42 && b[1] === 0x4d) return 'bmp'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return 'webp'
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a) || (b[0] === 0x4d && b[1] === 0x4d && b[3] === 0x2a)) return 'tiff'
  if (b[0] === 0x01 && b[1] === 0x00 && b[2] === 0x00 && b[3] === 0x00 && b[40] === 0x20 && b[41] === 0x45 && b[42] === 0x4d && b[43] === 0x46) return 'emf'
  if ((b[0] === 0xd7 && b[1] === 0xcd && b[2] === 0xc6 && b[3] === 0x9a) || (b[0] === 0x01 && b[1] === 0x00 && b[2] === 0x09 && b[3] === 0x00)) return 'wmf'
  const head = new TextDecoder().decode(b.subarray(0, 256)).trimStart()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg'
  return 'unknown'
}

/** Checks the first bytes of a file the user picked. */
export function sniffWordFile(head: Uint8Array): 'docx' | 'ole' | 'other' {
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) return 'docx'
  // Compound File Binary: legacy .doc, or a password-protected .docx.
  if (head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0) return 'ole'
  return 'other'
}

type Files = Record<string, Uint8Array>

function unzip(bytes: Uint8Array): Files {
  let total = 0
  try {
    return unzipSync(bytes, {
      filter: (f) => {
        if (f.originalSize > MAX_PART_BYTES) throw new DocxError('This document contains a part that is too large to open in the browser.')
        total += f.originalSize
        if (total > MAX_TOTAL_BYTES) throw new DocxError('This document is too large to open in the browser.')
        return true
      },
    })
  } catch (e) {
    if (e instanceof DocxError) throw e
    throw new DocxError('The file isn’t a valid Word document. It may be damaged or incomplete.')
  }
}

const decoder = new TextDecoder('utf-8')

function readXml(files: Files, path: string): XmlElement | undefined {
  const bytes = files[path]
  if (!bytes) return undefined
  try {
    return parseXml(decoder.decode(bytes))
  } catch {
    return undefined
  }
}

/** Resolves a relationship target relative to the part that references it. */
function resolvePath(base: string, target: string) {
  if (target.startsWith('/')) return target.slice(1)
  const parts = base.split('/').slice(0, -1)
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg && seg !== '.') parts.push(seg)
  }
  return parts.join('/')
}

interface Rel {
  target: string
  type: string
  external: boolean
}

function readRels(files: Files, partPath: string): Map<string, Rel> {
  const dir = partPath.split('/').slice(0, -1).join('/')
  const name = partPath.split('/').pop()
  const relsPath = `${dir ? `${dir}/` : ''}_rels/${name}.rels`
  const xml = readXml(files, relsPath)
  const map = new Map<string, Rel>()
  for (const r of childrenNamed(xml, 'Relationship')) {
    const external = r.attrs.TargetMode === 'External'
    map.set(r.attrs.Id, { target: external ? r.attrs.Target : resolvePath(partPath, r.attrs.Target), type: r.attrs.Type ?? '', external })
  }
  return map
}

// ---------------------------------------------------------------------------
// Styles

type RPr = Partial<RunStyle>
type PPr = Partial<Omit<ParaStyle, 'borders'>> & { borders?: ParaStyle['borders']; numId?: string; ilvl?: number }

interface StyleDef {
  type: string
  basedOn?: string
  rPr: RPr
  pPr: PPr
  tbl?: TableProps
}

interface TableProps {
  borders: Partial<Record<'top' | 'bottom' | 'left' | 'right' | 'insideH' | 'insideV', Border | null>>
  cellMargins: Partial<Record<'top' | 'bottom' | 'left' | 'right', number>>
}

const HIGHLIGHT: Record<string, string> = {
  yellow: 'FFFF00', green: '00FF00', cyan: '00FFFF', magenta: 'FF00FF', blue: '0000FF', red: 'FF0000', darkBlue: '00008B',
  darkCyan: '008B8B', darkGreen: '006400', darkMagenta: '800080', darkRed: '8B0000', darkYellow: '808000', darkGray: 'A9A9A9',
  lightGray: 'D3D3D3', black: '000000', white: 'FFFFFF',
}

const hex = (v: string | undefined) => (v && /^[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : undefined)

interface Ctx {
  files: Files
  styles: Map<string, StyleDef>
  defaultPara?: string
  defaultTable?: string
  docR: RPr
  docP: PPr
  theme: { major: string; minor: string }
  numbering: Numbering
  images: Map<string, DocImage>
  warnings: Set<string>
  footnotes: Map<string, Block[]>
  usedFootnotes: { id: string; mark: number }[]
}

function parseBorder(el: XmlElement | undefined): Border | null | undefined {
  if (!el) return undefined
  const v = val(el)
  if (!v || v === 'none' || v === 'nil') return null
  const sz = Number(attr(el, 'sz') ?? 4)
  const width = Math.max(0.25, (isNaN(sz) ? 4 : sz) / 8) * (v === 'double' ? 2.5 : v === 'thick' ? 1.5 : 1)
  const color = hex(attr(el, 'color')) ?? '000000'
  return { width, color, space: Number(attr(el, 'space') ?? 0) || 0 }
}

function parseRPr(el: XmlElement | undefined, ctx: Pick<Ctx, 'theme'>): RPr {
  const r: RPr = {}
  if (!el) return r
  for (const c of elements(el)) {
    switch (c.name) {
      case 'w:rFonts': {
        const theme = attr(c, 'asciiTheme') ?? attr(c, 'hAnsiTheme')
        const font = attr(c, 'ascii') ?? attr(c, 'hAnsi') ?? attr(c, 'cs') ?? attr(c, 'eastAsia')
        if (font) r.font = font
        else if (theme) r.font = theme.startsWith('major') ? ctx.theme.major : ctx.theme.minor
        break
      }
      case 'w:b': r.bold = onOff(c); break
      case 'w:i': r.italic = onOff(c); break
      case 'w:u': r.underline = !!val(c) && val(c) !== 'none'; break
      case 'w:strike':
      case 'w:dstrike': r.strike = onOff(c); break
      case 'w:caps': r.caps = onOff(c); break
      case 'w:vanish': r.hidden = onOff(c); break
      case 'w:sz': {
        const s = Number(val(c))
        if (s > 0) r.size = s / 2
        break
      }
      case 'w:color': {
        const v = val(c)
        if (v === 'auto') r.color = '000000'
        else if (hex(v)) r.color = hex(v)
        break
      }
      case 'w:highlight': {
        const v = val(c)
        if (v && HIGHLIGHT[v]) r.background = HIGHLIGHT[v]
        break
      }
      case 'w:shd': {
        const fill = hex(attr(c, 'fill'))
        if (fill && r.background === undefined) r.background = fill
        break
      }
      case 'w:vertAlign': {
        const v = val(c)
        r.vertAlign = v === 'superscript' ? 'super' : v === 'subscript' ? 'sub' : undefined
        break
      }
    }
  }
  return r
}

function parsePPr(el: XmlElement | undefined): PPr {
  const p: PPr = {}
  if (!el) return p
  for (const c of elements(el)) {
    switch (c.name) {
      case 'w:pStyle': p.styleId = val(c); break
      case 'w:jc': {
        const v = val(c)
        p.align = v === 'center' ? 'center' : v === 'right' || v === 'end' ? 'right' : v === 'both' || v === 'distribute' ? 'justify' : 'left'
        break
      }
      case 'w:ind': {
        const left = attr(c, 'left') ?? attr(c, 'start')
        const right = attr(c, 'right') ?? attr(c, 'end')
        if (left !== undefined) p.indentLeft = twip(left)
        if (right !== undefined) p.indentRight = twip(right)
        if (attr(c, 'hanging') !== undefined) p.firstLine = -twip(attr(c, 'hanging'))
        else if (attr(c, 'firstLine') !== undefined) p.firstLine = twip(attr(c, 'firstLine'))
        break
      }
      case 'w:spacing': {
        if (attr(c, 'beforeAutospacing') !== undefined && truthy(attr(c, 'beforeAutospacing'))) p.spaceBefore = 14
        else if (attr(c, 'before') !== undefined) p.spaceBefore = twip(attr(c, 'before'))
        if (attr(c, 'afterAutospacing') !== undefined && truthy(attr(c, 'afterAutospacing'))) p.spaceAfter = 14
        else if (attr(c, 'after') !== undefined) p.spaceAfter = twip(attr(c, 'after'))
        const line = attr(c, 'line')
        if (line !== undefined && !isNaN(Number(line))) {
          const rule = attr(c, 'lineRule')
          p.line = rule === 'exact' ? { rule: 'exact', value: twip(line) } : rule === 'atLeast' ? { rule: 'atLeast', value: twip(line) } : { rule: 'auto', value: Number(line) / 240 }
        }
        break
      }
      case 'w:keepNext': p.keepNext = onOff(c); break
      case 'w:keepLines': p.keepLines = onOff(c); break
      case 'w:pageBreakBefore': p.pageBreakBefore = onOff(c); break
      case 'w:contextualSpacing': p.contextualSpacing = onOff(c); break
      case 'w:shd': {
        const fill = hex(attr(c, 'fill'))
        if (fill) p.shading = fill
        break
      }
      case 'w:pBdr': {
        const b: ParaStyle['borders'] = {}
        for (const side of ['top', 'bottom', 'left', 'right'] as const) {
          const bd = parseBorder(child(c, `w:${side}`) ?? (side === 'left' ? child(c, 'w:start') : side === 'right' ? child(c, 'w:end') : undefined))
          if (bd) b[side] = bd
        }
        p.borders = b
        break
      }
      case 'w:tabs': {
        const tabs: TabStop[] = []
        for (const t of childrenNamed(c, 'w:tab')) {
          const v = val(t)
          if (v === 'clear' || v === 'bar') continue
          const leader = attr(t, 'leader')
          tabs.push({
            pos: twip(attr(t, 'pos')),
            align: v === 'right' || v === 'end' ? 'right' : v === 'center' ? 'center' : v === 'decimal' ? 'decimal' : 'left',
            leader: leader === 'dot' || leader === 'middleDot' ? 'dot' : leader === 'hyphen' ? 'hyphen' : leader === 'underscore' || leader === 'heavy' ? 'underscore' : undefined,
          })
        }
        p.tabs = tabs.sort((a, b) => a.pos - b.pos)
        break
      }
      case 'w:numPr': {
        const numId = val(child(c, 'w:numId'))
        const ilvl = val(child(c, 'w:ilvl'))
        if (numId !== undefined) p.numId = numId
        if (ilvl !== undefined) p.ilvl = Number(ilvl) || 0
        break
      }
    }
  }
  return p
}

function parseTableProps(tblPr: XmlElement | undefined): TableProps {
  const props: TableProps = { borders: {}, cellMargins: {} }
  const borders = child(tblPr, 'w:tblBorders')
  for (const side of ['top', 'bottom', 'left', 'right', 'insideH', 'insideV'] as const) {
    const el = child(borders, `w:${side}`) ?? (side === 'left' ? child(borders, 'w:start') : side === 'right' ? child(borders, 'w:end') : undefined)
    const b = parseBorder(el)
    if (b !== undefined) props.borders[side] = b
  }
  const mar = child(tblPr, 'w:tblCellMar')
  for (const side of ['top', 'bottom', 'left', 'right'] as const) {
    const el = child(mar, `w:${side}`) ?? (side === 'left' ? child(mar, 'w:start') : side === 'right' ? child(mar, 'w:end') : undefined)
    if (el && attr(el, 'type') !== 'pct') props.cellMargins[side] = twip(attr(el, 'w'))
  }
  return props
}

function readStyles(files: Files, ctx: Ctx) {
  const xml = readXml(files, 'word/styles.xml')
  const defaults = child(xml, 'w:docDefaults')
  ctx.docR = parseRPr(child(child(defaults, 'w:rPrDefault'), 'w:rPr'), ctx)
  ctx.docP = parsePPr(child(child(defaults, 'w:pPrDefault'), 'w:pPr'))
  for (const s of childrenNamed(xml, 'w:style')) {
    const id = attr(s, 'styleId')
    if (!id) continue
    const type = attr(s, 'type') ?? 'paragraph'
    const def: StyleDef = {
      type,
      basedOn: val(child(s, 'w:basedOn')),
      rPr: parseRPr(child(s, 'w:rPr'), ctx),
      pPr: parsePPr(child(s, 'w:pPr')),
      tbl: type === 'table' ? parseTableProps(child(s, 'w:tblPr')) : undefined,
    }
    ctx.styles.set(id, def)
    if (truthy(attr(s, 'default') ?? '0')) {
      if (type === 'paragraph') ctx.defaultPara = id
      if (type === 'table') ctx.defaultTable = id
    }
  }
}

/** Style chain from the root ancestor down to the style itself. */
function chain(ctx: Ctx, id: string | undefined): StyleDef[] {
  const out: StyleDef[] = []
  const seen = new Set<string>()
  while (id && !seen.has(id)) {
    seen.add(id)
    const s = ctx.styles.get(id)
    if (!s) break
    out.unshift(s)
    id = s.basedOn
  }
  return out
}

function readTheme(files: Files): { major: string; minor: string } {
  const themePath = Object.keys(files).find((p) => /^word\/theme\/theme\d*\.xml$/.test(p))
  const xml = themePath ? readXml(files, themePath) : undefined
  const major = find(find(xml, 'a:majorFont'), 'a:latin')?.attrs.typeface
  const minor = find(find(xml, 'a:minorFont'), 'a:latin')?.attrs.typeface
  return { major: major || 'Calibri Light', minor: minor || 'Calibri' }
}

// ---------------------------------------------------------------------------
// Numbering

interface Level {
  start: number
  format: string
  text: string
  pPr: PPr
  rPr: RPr
}

interface Numbering {
  /** numId → abstract levels with overrides applied. */
  nums: Map<string, { abstractId: string; levels: Map<number, Level> }>
  counters: Map<string, number[]>
}

function readNumbering(files: Files, ctx: Ctx): Numbering {
  const xml = readXml(files, 'word/numbering.xml')
  const abstracts = new Map<string, Map<number, Level>>()
  const parseLevel = (l: XmlElement): Level => ({
    start: Number(val(child(l, 'w:start')) ?? 1) || 0,
    format: val(child(l, 'w:numFmt')) ?? 'decimal',
    text: val(child(l, 'w:lvlText')) ?? '',
    pPr: parsePPr(child(l, 'w:pPr')),
    rPr: parseRPr(child(l, 'w:rPr'), ctx),
  })
  for (const a of childrenNamed(xml, 'w:abstractNum')) {
    const levels = new Map<number, Level>()
    for (const l of childrenNamed(a, 'w:lvl')) levels.set(Number(attr(l, 'ilvl')) || 0, parseLevel(l))
    abstracts.set(attr(a, 'abstractNumId') ?? '', levels)
  }
  const nums: Numbering['nums'] = new Map()
  for (const n of childrenNamed(xml, 'w:num')) {
    const abstractId = val(child(n, 'w:abstractNumId')) ?? ''
    const levels = new Map(abstracts.get(abstractId) ?? [])
    for (const o of childrenNamed(n, 'w:lvlOverride')) {
      const ilvl = Number(attr(o, 'ilvl')) || 0
      const lvl = child(o, 'w:lvl')
      const base = lvl ? parseLevel(lvl) : levels.get(ilvl)
      const start = val(child(o, 'w:startOverride'))
      if (base) levels.set(ilvl, start !== undefined ? { ...base, start: Number(start) || 0 } : base)
    }
    nums.set(attr(n, 'numId') ?? '', { abstractId, levels })
  }
  return { nums, counters: new Map() }
}

const ROMAN: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]

function roman(n: number) {
  let s = ''
  for (const [v, r] of ROMAN)
    while (n >= v) {
      s += r
      n -= v
    }
  return s
}

function letters(n: number) {
  if (n <= 0) return ''
  const ch = String.fromCharCode(97 + ((n - 1) % 26))
  return ch.repeat(Math.floor((n - 1) / 26) + 1)
}

export function formatNumber(n: number, format: string): string {
  switch (format) {
    case 'lowerLetter': return letters(n)
    case 'upperLetter': return letters(n).toUpperCase()
    case 'lowerRoman': return roman(n)
    case 'upperRoman': return roman(n).toUpperCase()
    case 'decimalZero': return n < 10 ? `0${n}` : String(n)
    case 'none': return ''
    case 'ordinal': return `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
    default: return String(n)
  }
}

/** Symbol and Wingdings bullets live in the private use area; map them to Unicode. */
const SYMBOL_BULLETS: Record<string, string> = {
  '': '•', '': '▪', '': '➢', '': '✓', '': '❖', '': '□', '': '■', '': '❑', '': '→', '': '◆', '': '◊',
}

export function mapSymbolChar(c: string): string {
  if (SYMBOL_BULLETS[c]) return SYMBOL_BULLETS[c]
  const code = c.codePointAt(0) ?? 0
  // Other private-use symbol-font characters have no reliable Unicode mapping.
  return code >= 0xf000 && code <= 0xf0ff ? '•' : c
}

function nextLabel(ctx: Ctx, numId: string, ilvl: number): { level: Level; text: string } | undefined {
  const num = ctx.numbering.nums.get(numId)
  if (!num || numId === '0') return undefined
  const level = num.levels.get(ilvl)
  if (!level) return undefined
  // Lists that share an abstract definition continue the same count, like Word.
  const key = num.abstractId
  let counters = ctx.numbering.counters.get(key)
  if (!counters) ctx.numbering.counters.set(key, (counters = []))
  for (let i = 0; i <= ilvl; i++) if (counters[i] === undefined) counters[i] = (num.levels.get(i)?.start ?? 1) - (i === ilvl ? 1 : 0)
  counters[ilvl]++
  counters.length = ilvl + 1
  if (level.format === 'bullet') return { level, text: mapSymbolChar(level.text || '•') }
  const text = level.text.replace(/%(\d)/g, (_, d: string) => {
    const i = Number(d) - 1
    const lvl = num.levels.get(i)
    const n = counters![i] ?? lvl?.start ?? 1
    return formatNumber(n, i === ilvl ? level.format : (lvl?.format ?? 'decimal'))
  })
  return { level, text }
}

// ---------------------------------------------------------------------------
// Resolution

const BASE_RUN: RunStyle = { font: 'Times New Roman', size: 10, bold: false, italic: false, underline: false, strike: false, color: '000000', caps: false, hidden: false }

const BASE_PARA: ParaStyle = {
  align: 'left', indentLeft: 0, indentRight: 0, firstLine: 0, spaceBefore: 0, spaceAfter: 0, line: { rule: 'auto', value: 1 },
  keepNext: false, keepLines: false, pageBreakBefore: false, contextualSpacing: false, styleId: '', tabs: [], borders: {},
}

const clean = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>

function mergeP(target: ParaStyle & { numId?: string; ilvl?: number }, p: PPr) {
  const { tabs, ...rest } = clean(p)
  Object.assign(target, rest)
  if (tabs) target.tabs = [...target.tabs.filter((t) => !tabs.some((x) => Math.abs(x.pos - t.pos) < 0.5)), ...tabs].sort((a, b) => a.pos - b.pos)
}

function paragraphProps(ctx: Ctx, pPrEl: XmlElement | undefined) {
  const direct = parsePPr(pPrEl)
  const styleId = direct.styleId ?? ctx.defaultPara
  const styles = chain(ctx, styleId)
  const pStyle: ParaStyle & { numId?: string; ilvl?: number } = { ...BASE_PARA, borders: {}, tabs: [] }
  mergeP(pStyle, ctx.docP)
  for (const s of styles) mergeP(pStyle, s.pPr)
  // Numbering indentation sits between the style and direct formatting.
  const numId = direct.numId ?? pStyle.numId
  const ilvl = direct.ilvl ?? pStyle.ilvl ?? 0
  let label: { level: Level; text: string } | undefined
  if (numId !== undefined) {
    label = nextLabel(ctx, numId, ilvl)
    if (label) mergeP(pStyle, label.level.pPr)
  }
  mergeP(pStyle, direct)
  pStyle.styleId = styleId ?? ''
  let runBase: RunStyle = { ...BASE_RUN, ...clean(ctx.docR) }
  for (const s of styles) runBase = { ...runBase, ...clean(s.rPr) }
  return { style: pStyle as ParaStyle, runBase, label, markR: parseRPr(child(pPrEl, 'w:rPr'), ctx) }
}

function runStyle(ctx: Ctx, base: RunStyle, rPrEl: XmlElement | undefined): RunStyle {
  const direct = parseRPr(rPrEl, ctx)
  let s = base
  const cStyle = val(child(rPrEl, 'w:rStyle'))
  if (cStyle) for (const st of chain(ctx, cStyle)) s = { ...s, ...clean(st.rPr) }
  return { ...s, ...clean(direct) }
}

// ---------------------------------------------------------------------------
// Content

interface PartCtx {
  path: string
  rels: Map<string, Rel>
}

function loadImage(ctx: Ctx, part: PartCtx, rid: string | undefined): string | undefined {
  if (!rid) return undefined
  const rel = part.rels.get(rid)
  if (!rel || rel.external) {
    if (rel?.external) ctx.warnings.add('Linked images that live outside the document were left out.')
    return undefined
  }
  if (!ctx.images.has(rel.target)) {
    const bytes = ctx.files[rel.target]
    if (!bytes) return undefined
    ctx.images.set(rel.target, { bytes, format: imageFormat(bytes) })
  }
  return rel.target
}

interface FieldState {
  /** Instruction text gathered so far, while between begin and separate. */
  instr: string
  phase: 'instr' | 'result'
  /** PAGE/NUMPAGES fields replace their cached result with a live value. */
  live?: 'page' | 'pages'
}

interface InlineCtx {
  ctx: Ctx
  part: PartCtx
  base: RunStyle
  out: Inline[]
  fields: FieldState[]
  /** Blocks found inside text boxes, placed after the paragraph. */
  extra: Block[]
  href?: string
}

function fieldKind(instr: string): 'page' | 'pages' | undefined {
  const name = instr.trim().split(/\s+/)[0]?.toUpperCase()
  return name === 'PAGE' ? 'page' : name === 'NUMPAGES' || name === 'SECTIONPAGES' ? 'pages' : undefined
}

/** True while inside a field's instruction or a live field's cached result. */
const suppressed = (ic: InlineCtx) => ic.fields.some((f) => f.phase === 'instr' || f.live)

function pushText(ic: InlineCtx, text: string, style: RunStyle) {
  if (!text || style.hidden || suppressed(ic)) return
  const last = ic.out[ic.out.length - 1]
  if (last?.t === 'text' && last.style === style && last.href === ic.href) last.text += text
  else ic.out.push({ t: 'text', text, style, href: ic.href })
}

function readDrawing(ic: InlineCtx, el: XmlElement, style: RunStyle) {
  const holder = child(el, 'wp:inline') ?? child(el, 'wp:anchor')
  if (!holder) return
  if (holder.name === 'wp:anchor') ic.ctx.warnings.add('Floating images and shapes were placed in line with the text, so their position may differ.')
  const extent = child(holder, 'wp:extent')
  const width = emu(extent?.attrs.cx)
  const height = emu(extent?.attrs.cy)
  const blip = find(holder, 'a:blip')
  const id = loadImage(ic.ctx, ic.part, blip?.attrs['r:embed'])
  if (id && width > 0 && height > 0) {
    const fmt = ic.ctx.images.get(id)!.format
    if (fmt === 'emf' || fmt === 'wmf' || fmt === 'tiff' || fmt === 'unknown') {
      ic.ctx.warnings.add(`Some images use a format browsers can’t draw (${fmt.toUpperCase()}) and are shown as placeholders.`)
      ic.out.push({ t: 'placeholder', label: `${fmt.toUpperCase()} image`, width, height, style })
    } else ic.out.push({ t: 'image', id, width, height, style })
    return
  }
  const txbx = find(holder, 'w:txbxContent')
  if (txbx) {
    ic.ctx.warnings.add('Text boxes were placed as ordinary paragraphs below the text they were anchored to.')
    ic.extra.push(...readBlocks(ic.ctx, ic.part, txbx))
    return
  }
  if (find(holder, 'c:chart')) {
    ic.ctx.warnings.add('Charts can’t be drawn and are shown as placeholders.')
    if (width > 0 && height > 0) ic.out.push({ t: 'placeholder', label: 'Chart', width, height, style })
    return
  }
  if (find(holder, 'dgm:relIds')) {
    ic.ctx.warnings.add('SmartArt graphics can’t be drawn and are shown as placeholders.')
    if (width > 0 && height > 0) ic.out.push({ t: 'placeholder', label: 'SmartArt', width, height, style })
    return
  }
  if (find(holder, 'wps:wsp') || find(holder, 'wpg:wgp')) ic.ctx.warnings.add('Drawing shapes (lines, arrows, boxes) were left out.')
}

/** Old-style VML images (w:pict), still written by some apps. */
function readPict(ic: InlineCtx, el: XmlElement, style: RunStyle) {
  const shape = find(el, 'v:shape')
  const img = find(el, 'v:imagedata')
  const css = Object.fromEntries((shape?.attrs.style ?? '').split(';').map((kv) => kv.split(':').map((s) => s.trim())))
  const len = (v: string | undefined) => {
    const m = v?.match(/^([\d.]+)(pt|in|px|cm|mm)?$/)
    if (!m) return 0
    const n = Number(m[1])
    return m[2] === 'in' ? n * 72 : m[2] === 'px' ? n * 0.75 : m[2] === 'cm' ? (n * 72) / 2.54 : m[2] === 'mm' ? (n * 72) / 25.4 : n
  }
  const id = loadImage(ic.ctx, ic.part, img?.attrs['r:id'])
  const w = len(css.width)
  const h = len(css.height)
  if (id && w > 0 && h > 0) {
    const fmt = ic.ctx.images.get(id)!.format
    if (['png', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(fmt)) ic.out.push({ t: 'image', id, width: w, height: h, style })
    else ic.out.push({ t: 'placeholder', label: `${fmt.toUpperCase()} image`, width: w, height: h, style })
    return
  }
  const txbx = find(el, 'w:txbxContent')
  if (txbx) ic.extra.push(...readBlocks(ic.ctx, ic.part, txbx))
}

function readRun(ic: InlineCtx, r: XmlElement) {
  readRunContent(ic, elements(r), runStyle(ic.ctx, ic.base, child(r, 'w:rPr')))
}

function readRunContent(ic: InlineCtx, content: XmlElement[], style: RunStyle) {
  for (const c of content) {
    switch (c.name) {
      case 'w:t':
        // Some writers put tab characters straight into the text.
        textOf(c)
          .split('\t')
          .forEach((part, i) => {
            if (i > 0 && !suppressed(ic)) ic.out.push({ t: 'tab', style })
            pushText(ic, part, style)
          })
        break
      case 'w:tab':
        if (!suppressed(ic)) ic.out.push({ t: 'tab', style })
        break
      case 'w:br':
      case 'w:cr': {
        if (suppressed(ic)) break
        const type = attr(c, 'type')
        ic.out.push({ t: 'break', kind: type === 'page' ? 'page' : type === 'column' ? 'column' : 'line', style })
        break
      }
      case 'w:noBreakHyphen':
        pushText(ic, '‑', style)
        break
      case 'w:sym':
        pushText(ic, mapSymbolChar(String.fromCharCode(parseInt(attr(c, 'char') ?? '0', 16) || 0x2022)), style)
        break
      case 'w:fldChar': {
        const type = attr(c, 'fldCharType')
        if (type === 'begin') ic.fields.push({ instr: '', phase: 'instr' })
        else if (type === 'separate') {
          const f = ic.fields[ic.fields.length - 1]
          if (f) {
            f.phase = 'result'
            f.live = fieldKind(f.instr)
            if (f.live && !ic.fields.slice(0, -1).some((x) => x.phase === 'instr' || x.live)) ic.out.push({ t: 'field', field: f.live, style })
          }
        } else if (type === 'end') {
          const f = ic.fields.pop()
          // A field without a cached result still shows page numbers.
          if (f && f.phase === 'instr' && fieldKind(f.instr) && !suppressed(ic)) ic.out.push({ t: 'field', field: fieldKind(f.instr)!, style })
        }
        break
      }
      case 'w:instrText': {
        const f = ic.fields[ic.fields.length - 1]
        if (f && f.phase === 'instr') f.instr += textOf(c)
        break
      }
      case 'w:drawing':
        if (!suppressed(ic)) readDrawing(ic, c, style)
        break
      case 'w:pict':
        if (!suppressed(ic)) readPict(ic, c, style)
        break
      case 'w:object':
        ic.ctx.warnings.add('Embedded objects (such as equations or spreadsheets) were left out.')
        break
      case 'mc:AlternateContent': {
        const choice = child(c, 'mc:Choice')
        const fallback = child(c, 'mc:Fallback')
        const use = choice && find(choice, 'w:drawing') ? choice : (fallback ?? choice)
        if (use) readRunContent(ic, elements(use), style)
        break
      }
      case 'w:footnoteReference':
      case 'w:endnoteReference': {
        const id = attr(c, 'id')
        if (!id || !ic.ctx.footnotes.has(`${c.name === 'w:footnoteReference' ? 'f' : 'e'}${id}`)) break
        const mark = ic.ctx.usedFootnotes.length + 1
        ic.ctx.usedFootnotes.push({ id: `${c.name === 'w:footnoteReference' ? 'f' : 'e'}${id}`, mark })
        pushText(ic, String(mark), { ...style, vertAlign: 'super' })
        break
      }
    }
  }
}

function readInlines(ic: InlineCtx, el: XmlElement) {
  for (const c of elements(el)) {
    switch (c.name) {
      case 'w:r':
        readRun(ic, c)
        break
      case 'w:hyperlink': {
        const rel = c.attrs['r:id'] ? ic.part.rels.get(c.attrs['r:id']) : undefined
        const prev = ic.href
        if (rel?.external && /^(https?:|mailto:)/i.test(rel.target)) ic.href = rel.target
        readInlines(ic, c)
        ic.href = prev
        break
      }
      case 'w:fldSimple': {
        const live = fieldKind(attr(c, 'instr') ?? '')
        if (live) {
          const r = find(c, 'w:r')
          ic.out.push({ t: 'field', field: live, style: runStyle(ic.ctx, ic.base, child(r, 'w:rPr')) })
        } else readInlines(ic, c)
        break
      }
      // Containers whose content is part of the paragraph.
      case 'w:ins':
      case 'w:smartTag':
      case 'w:customXml':
      case 'w:bdo':
      case 'w:dir':
      case 'w:moveTo':
        readInlines(ic, c)
        break
      case 'w:sdt':
        readInlines(ic, child(c, 'w:sdtContent') ?? c)
        break
      case 'm:oMathPara':
      case 'm:oMath':
        ic.ctx.warnings.add('Equations were converted to plain text and may not look like the original.')
        pushText(ic, findAll(c, 'm:t').map(textOf).join(''), ic.base)
        break
      // w:del, w:moveFrom, comments, bookmarks and proofing marks are skipped.
    }
  }
}

function readParagraph(ctx: Ctx, part: PartCtx, p: XmlElement): Block[] {
  const pPr = child(p, 'w:pPr')
  const { style, runBase, label, markR } = paragraphProps(ctx, pPr)
  const ic: InlineCtx = { ctx, part, base: runBase, out: [], fields: [], extra: [] }
  readInlines(ic, p)
  const para: Paragraph = { t: 'p', style, markStyle: { ...runBase, ...clean(markR) }, inlines: ic.out }
  if (label && label.text) {
    // List labels use the paragraph mark's formatting plus the level's own.
    para.label = { text: label.text, style: { ...runBase, ...clean(markR), ...clean(label.level.rPr), underline: false } }
    if (label.level.rPr.font && /symbol|wingdings/i.test(label.level.rPr.font)) para.label.style.font = runBase.font
  }
  return [para, ...ic.extra]
}

function readTable(ctx: Ctx, part: PartCtx, tbl: XmlElement): Table {
  const tblPr = child(tbl, 'w:tblPr')
  const styleProps: TableProps = { borders: {}, cellMargins: {} }
  for (const s of chain(ctx, val(child(tblPr, 'w:tblStyle')) ?? ctx.defaultTable)) {
    if (!s.tbl) continue
    Object.assign(styleProps.borders, s.tbl.borders)
    Object.assign(styleProps.cellMargins, s.tbl.cellMargins)
  }
  const direct = parseTableProps(tblPr)
  const borders = { ...styleProps.borders, ...direct.borders }
  const margins = { top: 0, bottom: 0, left: 5.4, right: 5.4, ...styleProps.cellMargins, ...direct.cellMargins }
  const jc = val(child(tblPr, 'w:jc'))
  const tblInd = child(tblPr, 'w:tblInd')
  const columns = childrenNamed(child(tbl, 'w:tblGrid'), 'w:gridCol').map((g) => twip(attr(g, 'w')))

  const rows: Row[] = []
  const trs = childrenNamed(tbl, 'w:tr')
  trs.forEach((tr, ri) => {
    const trPr = child(tr, 'w:trPr')
    const trH = child(trPr, 'w:trHeight')
    const cells: Cell[] = []
    const tcs = elements(tr).flatMap((c) => (c.name === 'w:tc' ? [c] : c.name === 'w:sdt' || c.name === 'w:customXml' ? findAll(c, 'w:tc') : []))
    tcs.forEach((tc, ci) => {
      const tcPr = child(tc, 'w:tcPr')
      const tcB = child(tcPr, 'w:tcBorders')
      const side = (name: 'top' | 'bottom' | 'left' | 'right', inside: 'insideH' | 'insideV', outer: boolean) => {
        const own = parseBorder(child(tcB, `w:${name}`) ?? (name === 'left' ? child(tcB, 'w:start') : name === 'right' ? child(tcB, 'w:end') : undefined))
        if (own !== undefined) return own ?? undefined
        return (outer ? borders[name] : borders[inside]) ?? undefined
      }
      const vm = child(tcPr, 'w:vMerge')
      const mar = child(tcPr, 'w:tcMar')
      const m = (s: 'top' | 'bottom' | 'left' | 'right') => {
        const el = child(mar, `w:${s}`) ?? (s === 'left' ? child(mar, 'w:start') : s === 'right' ? child(mar, 'w:end') : undefined)
        return el && attr(el, 'type') !== 'pct' ? twip(attr(el, 'w')) : margins[s]
      }
      const va = val(child(tcPr, 'w:vAlign'))
      cells.push({
        blocks: readBlocks(ctx, part, tc),
        span: Math.max(1, Number(val(child(tcPr, 'w:gridSpan')) ?? 1) || 1),
        vMerge: vm ? (val(vm) === 'restart' ? 'restart' : 'continue') : undefined,
        shading: hex(attr(child(tcPr, 'w:shd'), 'fill')),
        borders: {
          top: side('top', 'insideH', ri === 0),
          bottom: side('bottom', 'insideH', ri === trs.length - 1),
          left: side('left', 'insideV', ci === 0),
          right: side('right', 'insideV', ci === tcs.length - 1),
        },
        margins: { top: m('top'), bottom: m('bottom'), left: m('left'), right: m('right') },
        vAlign: va === 'center' ? 'center' : va === 'bottom' ? 'bottom' : 'top',
      })
    })
    rows.push({
      cells,
      height: trH ? { value: twip(attr(trH, 'val')), rule: attr(trH, 'hRule') === 'exact' ? 'exact' : 'atLeast' } : undefined,
      header: !!onOff(child(trPr, 'w:tblHeader')),
      cantSplit: !!onOff(child(trPr, 'w:cantSplit')),
    })
  })
  // Tables without a grid (rare, hand-written XML) get equal columns.
  const gridCount = Math.max(0, ...rows.map((r) => r.cells.reduce((n, c) => n + c.span, 0)))
  while (columns.length < gridCount) columns.push(0)
  return {
    t: 'table',
    rows,
    columns,
    indent: twip(attr(tblInd, 'w')),
    align: jc === 'center' ? 'center' : jc === 'right' || jc === 'end' ? 'right' : 'left',
  }
}

/** Reads the paragraphs and tables in a body, cell, header or text box. */
function readBlocks(ctx: Ctx, part: PartCtx, container: XmlElement, onSection?: (sectPr: XmlElement, blocks: Block[]) => Block[]): Block[] {
  let blocks: Block[] = []
  const visit = (el: XmlElement) => {
    for (const c of elements(el)) {
      switch (c.name) {
        case 'w:p': {
          blocks.push(...readParagraph(ctx, part, c))
          const sectPr = child(child(c, 'w:pPr'), 'w:sectPr')
          if (sectPr && onSection) blocks = onSection(sectPr, blocks)
          break
        }
        case 'w:tbl':
          blocks.push(readTable(ctx, part, c))
          break
        case 'w:sdt':
          visit(child(c, 'w:sdtContent') ?? c)
          break
        case 'w:customXml':
        case 'w:ins':
        case 'w:moveTo':
          visit(c)
          break
        case 'w:altChunk':
          ctx.warnings.add('Imported content (such as pasted HTML or RTF) was left out.')
          break
      }
    }
  }
  visit(container)
  return blocks
}

function readHeaderFooter(ctx: Ctx, part: PartCtx, sectPr: XmlElement, kind: 'header' | 'footer', inherited: HeaderFooterSet): HeaderFooterSet {
  const set: HeaderFooterSet = { ...inherited }
  for (const ref of childrenNamed(sectPr, `w:${kind}Reference`)) {
    const type = (attr(ref, 'type') ?? 'default') as keyof HeaderFooterSet
    const rel = part.rels.get(ref.attrs['r:id'] ?? '')
    if (!rel) continue
    const xml = readXml(ctx.files, rel.target)
    if (!xml) continue
    // Headers keep their own list numbering apart from the body's.
    const counters = ctx.numbering.counters
    ctx.numbering.counters = new Map()
    set[type] = readBlocks(ctx, { path: rel.target, rels: readRels(ctx.files, rel.target) }, xml)
    ctx.numbering.counters = counters
  }
  return set
}

function readSection(ctx: Ctx, part: PartCtx, sectPr: XmlElement | undefined, prev: Section | undefined, blocks: Block[]): Section {
  const pgSz = child(sectPr, 'w:pgSz')
  const pgMar = child(sectPr, 'w:pgMar')
  let width = twip(attr(pgSz, 'w'), 612)
  let height = twip(attr(pgSz, 'h'), 792)
  if (attr(pgSz, 'orient') === 'landscape' && width < height) [width, height] = [height, width]
  // Guard against nonsense sizes; Word allows 0.1" to 22".
  width = Math.min(1584, Math.max(72, width))
  height = Math.min(1584, Math.max(72, height))
  const cols = Number(attr(child(sectPr, 'w:cols'), 'num') ?? 1)
  if (cols > 1) ctx.warnings.add('Multi-column sections were laid out as a single column.')
  const type = val(child(sectPr, 'w:type'))
  return {
    width,
    height,
    margin: {
      top: Math.abs(twip(attr(pgMar, 'top'), 72)),
      bottom: Math.abs(twip(attr(pgMar, 'bottom'), 72)),
      left: twip(attr(pgMar, 'left') ?? attr(pgMar, 'start'), 72),
      right: twip(attr(pgMar, 'right') ?? attr(pgMar, 'end'), 72),
      header: twip(attr(pgMar, 'header'), 36),
      footer: twip(attr(pgMar, 'footer'), 36),
    },
    newPage: !prev || type !== 'continuous',
    titlePage: !!onOff(child(sectPr, 'w:titlePg')),
    headers: sectPr ? readHeaderFooter(ctx, part, sectPr, 'header', prev?.headers ?? {}) : (prev?.headers ?? {}),
    footers: sectPr ? readHeaderFooter(ctx, part, sectPr, 'footer', prev?.footers ?? {}) : (prev?.footers ?? {}),
    blocks,
  }
}

function readNotes(ctx: Ctx, path: string, tag: 'w:footnote' | 'w:endnote', prefix: string) {
  const xml = readXml(ctx.files, path)
  if (!xml) return
  const part = { path, rels: readRels(ctx.files, path) }
  for (const n of childrenNamed(xml, tag)) {
    const type = attr(n, 'type')
    if (type === 'separator' || type === 'continuationSeparator' || type === 'continuationNotice') continue
    ctx.footnotes.set(`${prefix}${attr(n, 'id')}`, readBlocks(ctx, part, n))
  }
}

/** Parses a .docx file. Throws DocxError with a message that can be shown to the user. */
export function parseDocx(bytes: Uint8Array): DocModel {
  const kind = sniffWordFile(bytes)
  if (kind === 'ole')
    throw new DocxError('This is an older Word (.doc) file or a password-protected document. Open it in Word and save it as an unprotected .docx, then try again.')
  if (kind !== 'docx') throw new DocxError('This file isn’t a Word document (.docx).')
  const files = unzip(bytes)
  const rootRels = readRels(files, '')
  const mainRel = [...rootRels.values()].find((r) => r.type.endsWith('/officeDocument'))
  const docPath = mainRel && files[mainRel.target] ? mainRel.target : 'word/document.xml'
  if (!files[docPath]) {
    if (Object.keys(files).some((f) => f.startsWith('xl/'))) throw new DocxError('This is an Excel workbook, not a Word document.')
    if (Object.keys(files).some((f) => f.startsWith('ppt/'))) throw new DocxError('This is a PowerPoint presentation, not a Word document.')
    throw new DocxError('This file isn’t a Word document (.docx). It has no document content.')
  }
  const doc = readXml(files, docPath)
  const body = child(doc, 'w:body')
  if (!doc || !body) throw new DocxError('The document’s content couldn’t be read. The file may be damaged.')

  const ctx: Ctx = {
    files,
    styles: new Map(),
    docR: {},
    docP: {},
    theme: readTheme(files),
    numbering: { nums: new Map(), counters: new Map() },
    images: new Map(),
    warnings: new Set(),
    footnotes: new Map(),
    usedFootnotes: [],
  }
  readStyles(files, ctx)
  ctx.numbering = readNumbering(files, ctx)
  const part: PartCtx = { path: docPath, rels: readRels(files, docPath) }
  const relOf = (suffix: string) => [...part.rels.values()].find((r) => r.type.endsWith(suffix))?.target
  const fnPath = relOf('/footnotes')
  const enPath = relOf('/endnotes')
  if (fnPath) readNotes(ctx, fnPath, 'w:footnote', 'f')
  if (enPath) readNotes(ctx, enPath, 'w:endnote', 'e')

  const sections: Section[] = []
  const blocks = readBlocks(ctx, part, body, (sectPr, current) => {
    sections.push(readSection(ctx, part, sectPr, sections[sections.length - 1], current))
    return []
  })
  sections.push(readSection(ctx, part, child(body, 'w:sectPr'), sections[sections.length - 1], blocks))

  if (ctx.usedFootnotes.length) {
    ctx.warnings.add('Footnotes and endnotes were placed together at the end of the document.')
    const last = sections[sections.length - 1]
    const rule: Paragraph = {
      t: 'p',
      style: { ...BASE_PARA, borders: { top: { width: 0.5, color: '000000' } }, spaceBefore: 12, indentRight: (last.width - last.margin.left - last.margin.right) * 0.67, tabs: [] },
      markStyle: { ...BASE_RUN, size: 4 },
      inlines: [],
    }
    last.blocks.push(rule)
    for (const { id, mark } of ctx.usedFootnotes) {
      const note = ctx.footnotes.get(id) ?? []
      const first = note.find((b): b is Paragraph => b.t === 'p')
      if (first) first.inlines.unshift({ t: 'text', text: `${mark} `, style: { ...(first.markStyle ?? BASE_RUN), vertAlign: 'super' } })
      last.blocks.push(...note)
    }
  }

  const settings = readXml(files, 'word/settings.xml')
  const core = readXml(files, 'docProps/core.xml')
  const title = core ? textOf(find(core, 'dc:title') ?? { name: '', attrs: {}, children: [] }).trim() : ''
  return {
    sections,
    images: ctx.images,
    evenAndOddHeaders: !!onOff(child(settings, 'w:evenAndOddHeaders')),
    title: title || undefined,
    warnings: [...ctx.warnings],
  }
}
