// A small, dependency-free XML parser for the parts of a .docx package. Word
// writes well-formed XML, so this handles elements, attributes, text, CDATA,
// comments, processing instructions and the standard and numeric entities.
// Names keep their namespace prefix ("w:p"), which is how OOXML is addressed.
// It works without the DOM, so it runs in unit tests and workers alike.

export interface XmlElement {
  name: string
  attrs: Record<string, string>
  children: XmlNode[]
}

export type XmlNode = XmlElement | string

export class XmlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'XmlError'
  }
}

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }

function decode(s: string): string {
  if (!s.includes('&')) return s
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e] ?? m
  })
}

const ATTR = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g

/** Parses an XML document and returns its root element. Throws XmlError on malformed input. */
export function parseXml(xml: string): XmlElement {
  const root: XmlElement = { name: '#document', attrs: {}, children: [] }
  const stack: XmlElement[] = [root]
  let i = 0
  const n = xml.length
  while (i < n) {
    const lt = xml.indexOf('<', i)
    if (lt === -1) {
      pushText(stack[stack.length - 1], xml.slice(i))
      break
    }
    if (lt > i) pushText(stack[stack.length - 1], xml.slice(i, lt))
    if (xml.startsWith('<!--', lt)) {
      const end = xml.indexOf('-->', lt + 4)
      if (end === -1) throw new XmlError('Unterminated comment')
      i = end + 3
    } else if (xml.startsWith('<![CDATA[', lt)) {
      const end = xml.indexOf(']]>', lt + 9)
      if (end === -1) throw new XmlError('Unterminated CDATA section')
      const parent = stack[stack.length - 1]
      parent.children.push(xml.slice(lt + 9, end))
      i = end + 3
    } else if (xml[lt + 1] === '?' || xml[lt + 1] === '!') {
      const end = xml.indexOf('>', lt)
      if (end === -1) throw new XmlError('Unterminated declaration')
      i = end + 1
    } else if (xml[lt + 1] === '/') {
      const end = xml.indexOf('>', lt)
      if (end === -1) throw new XmlError('Unterminated end tag')
      const name = xml.slice(lt + 2, end).trim()
      const open = stack.pop()
      if (!open || open.name !== name || stack.length === 0) throw new XmlError(`Mismatched end tag </${name}>`)
      i = end + 1
    } else {
      // Find the end of the start tag, skipping '>' inside quoted attribute values.
      let j = lt + 1
      let quote: string | null = null
      while (j < n) {
        const c = xml[j]
        if (quote) {
          if (c === quote) quote = null
        } else if (c === '"' || c === "'") quote = c
        else if (c === '>') break
        j++
      }
      if (j >= n) throw new XmlError('Unterminated start tag')
      const selfClosing = xml[j - 1] === '/'
      const body = xml.slice(lt + 1, selfClosing ? j - 1 : j)
      const nameEnd = body.search(/[\s/]|$/)
      const name = body.slice(0, nameEnd)
      if (!name) throw new XmlError('Empty tag name')
      const attrs: Record<string, string> = {}
      ATTR.lastIndex = 0
      const rest = body.slice(nameEnd)
      let m: RegExpExecArray | null
      while ((m = ATTR.exec(rest))) attrs[m[1]] = decode(m[3] ?? m[4] ?? '')
      const el: XmlElement = { name, attrs, children: [] }
      stack[stack.length - 1].children.push(el)
      if (!selfClosing) stack.push(el)
      i = j + 1
    }
  }
  if (stack.length !== 1) throw new XmlError(`Unclosed element <${stack[stack.length - 1].name}>`)
  const top = root.children.find((c): c is XmlElement => typeof c !== 'string')
  if (!top) throw new XmlError('No root element')
  return top
}

function pushText(parent: XmlElement, raw: string) {
  // Text is kept verbatim: readers only take it from elements like w:t, where
  // spaces are significant. Text outside the root element is ignored.
  if (parent.name === '#document') return
  parent.children.push(decode(raw))
}

// Helpers for navigating OOXML trees.

export const elements = (el: XmlElement | undefined): XmlElement[] =>
  el ? (el.children.filter((c) => typeof c !== 'string') as XmlElement[]) : []

export const child = (el: XmlElement | undefined, name: string): XmlElement | undefined =>
  el?.children.find((c): c is XmlElement => typeof c !== 'string' && c.name === name)

export const childrenNamed = (el: XmlElement | undefined, name: string): XmlElement[] => elements(el).filter((c) => c.name === name)

/** Text content of an element and its descendants. */
export function textOf(el: XmlElement): string {
  let s = ''
  for (const c of el.children) s += typeof c === 'string' ? c : textOf(c)
  return s
}

/** The first descendant with the given name (depth-first). */
export function find(el: XmlElement | undefined, name: string): XmlElement | undefined {
  if (!el) return undefined
  for (const c of el.children) {
    if (typeof c === 'string') continue
    if (c.name === name) return c
    const f = find(c, name)
    if (f) return f
  }
  return undefined
}

/** All descendants with the given name. */
export function findAll(el: XmlElement | undefined, name: string, out: XmlElement[] = []): XmlElement[] {
  if (!el) return out
  for (const c of el.children) {
    if (typeof c === 'string') continue
    if (c.name === name) out.push(c)
    findAll(c, name, out)
  }
  return out
}
