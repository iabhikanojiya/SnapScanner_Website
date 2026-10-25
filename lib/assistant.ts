// Snap Assistant: a rule-based helper. Requests are parsed with keyword and
// pattern matching (no AI model, nothing leaves the browser), then turned into
// actions on the local library and the website's tools.
import type { LibraryFile } from '@/lib/storage/db'
import { queryFiles, type FileQuery, type SortKey } from '@/lib/storage/query'
import { TOOLS, type ToolId } from '@/lib/tools'

export type Intent =
  | { type: 'help' }
  | { type: 'greeting' }
  | { type: 'find'; query: FileQuery; describe: string; refersToPrevious: boolean }
  | { type: 'tool'; tool: ToolId; reference: Reference; count?: number; pages?: string }
  | { type: 'resume'; action: 'create' | 'list' }
  | { type: 'library' }
  | { type: 'unsupported'; reason: string }
  | { type: 'unknown' }

/** Whether the request points at files mentioned earlier ("these", "it"). */
export type Reference = 'previous' | 'none'

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const MONTH_RE = new RegExp(`\\b(${MONTHS.map((m) => `${m}|${m.slice(0, 3)}`).join('|')})\\b`)

const UNSUPPORTED: [RegExp, string][] = [
  [/\b(excel|xlsx?|powerpoint|pptx?)\b/, 'Converting between PDF and Excel or PowerPoint isn’t available: it can’t be done reliably in a browser with free tools. Export to PDF from your Office app, then use any tool here. Word documents are supported by Word to PDF and PDF to Word.'],
  [/\bpdf\/?a\b|archiv(e|al) (format|pdf)/, 'PDF/A conversion isn’t available, because the result can’t be validated in the browser.'],
  [/\btranslat/, 'Translation isn’t available. Snap Assistant only works with your files and the website’s tools.'],
  [/\bedit (the )?text|change (the )?text|rewrite|replace (the )?text/, 'Editing a PDF’s existing text isn’t supported. You can add highlights and drawings with Annotate PDF, or a signature with Sign PDF.'],
  [/\b(email|e-mail|send|upload|google drive|dropbox|cloud|sync)\b/, 'Snap Assistant can’t send or upload files. Download a file, or use Share in My files to pass it to another app on your device.'],
  [/\b(summari[sz]e|write (me )?a|generate|chat ?gpt|ai)\b/, 'Snap Assistant is rule-based and doesn’t read, summarise or write content. It finds files and opens tools.'],
  [/\b(crack|bypass|forgot|recover)\b.*\bpassword|\bpassword\b.*\b(crack|bypass|forgot|recover)/, 'Passwords can’t be recovered or bypassed. Unlock PDF removes a password only when you know it.'],
]

const IMAGE_WORDS = /\b(images?|photos?|pictures?|jpe?gs?|pngs?|webps?)\b/

// Order matters: more specific phrases come first.
const TOOL_RULES: [RegExp, ToolId][] = [
  [/\b(unlock|decrypt|remove (the )?password|take off (the )?password)\b/, 'unlock-pdf'],
  [/\b(redact|black ?out|censor|blank out)\b/, 'redact-pdf'],
  [/\b(lock|protect|encrypt|password)\b/, 'lock-pdf'],
  [/\b(metadata|properties|author|producer)\b/, 'pdf-metadata'],
  [/\b(repair|fix|recover|corrupt(ed)?|damaged|broken)\b/, 'repair-pdf'],
  [/\b(ocr|recogni[sz]e|make (it |them |this |these |the pdf )?searchable|scanned text)\b/, 'ocr-pdf'],
  [/\b(compare|diff|difference|differences)\b/, 'compare-pdf'],
  [/\b(fill|complete)\b.*\bforms?\b|\bform fields?\b/, 'fill-pdf-form'],
  [/\bpage numbers?\b|\bnumber (the |my )?pages\b|\bpaginate\b/, 'add-page-numbers'],
  [/\b(watermark|stamp)\b/, 'add-watermark'],
  [/\bhtml\b/, 'html-to-pdf'],
  [/\b(word|docx?)\b.*\b(to|into|as) (a |an )?pdfs?\b|\b(from|convert) (a |my |this |the )?(word|docx?)\b(?! to)/, 'word-to-pdf'],
  [/\b(to|into|as) (a |an )?(editable )?(ms |microsoft )?(word|docx?)\b|\beditable (word|docx?|document)\b/, 'pdf-to-word'],
  [/\b(remove|delete|drop|get rid of)\b.*\bpages?\b/, 'remove-pages'],
  [/\b(extract|pull out|take out|copy)\b.*\bpages?\b|\bpages? \d/, 'extract-pages'],
  [/\b(organi[sz]e|reorder|rearrange|re-?order)\b|\bsort (the )?pages\b/, 'organize-pdf'],
  [/\b(merge|combine|join|put together)\b/, 'merge-pdf'],
  [/\b(split|separate)\b/, 'split-pdf'],
  [/\b(compress|shrink|reduce|make (it |them )?smaller|optimi[sz]e)\b/, 'compress-pdf'],
  [/\b(sign|signature)\b/, 'sign-pdf'],
  [/\b(filter|enhance|black and white|grayscale|greyscale|sepia)\b/, 'filter-image'],
  [/\b(resize|scale)\b/, 'resize-image'],
  [/\b(to|as|into) (a )?(markdown|md)\b|\bmarkdown\b/, 'pdf-to-markdown'],
  [/\b(to|as|into) (plain )?(text|txt)\b|\bextract (the )?text\b|\bcopy (the )?text\b|\bget (the )?text\b/, 'pdf-to-text'],
  [/\b(to|as|into) (a )?pngs?\b/, 'pdf-to-png'],
  [/\b(to|as|into) (a )?(jpe?gs?|images?|pictures?|photos?)\b/, 'pdf-to-jpg'],
  [/\b(annotate|highlight|mark ?up|draw|text box|add text)\b/, 'annotate-pdf'],
  [/\b(scan|scanner|camera)\b/, 'scan-pdf'],
  [/\bconvert\b.*\b(to|into) (a )?pdf\b|\b(images?|photos?|pictures?|jpe?gs?|pngs?|webps?)\b.*\b(to|into) (a )?pdf\b|\bconvert (my |these |the )?(images?|photos?|pictures?)\b/, 'image-to-pdf'],
  [/\bconvert\b/, 'convert-image'],
  [/\b(crop|trim)\b/, 'crop-pdf'],
  [/\b(rotate|turn|flip)\b/, 'rotate-pdf'],
  [/\b(read|open|view|preview)\b/, 'pdf-reader'],
]

/** Tools that have a separate image version, used when the request is about images. */
const IMAGE_VARIANT: Partial<Record<ToolId, ToolId>> = { 'crop-pdf': 'crop-image', 'rotate-pdf': 'rotate-image', 'convert-image': 'convert-image' }

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, both: 2 }

const STOP = new Set(
  'a an the my me i please can you could would show find search look for get list all any some files file documents document docs doc pdfs pdf images image photos photo pictures picture of from in on with that which is are were was to and or named called about containing find, where did put saved stored recent recently latest newest last this these those it them'.split(
    ' '
  )
)

function startOfDay(d: Date) {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

/** Extracts a date range from phrases like "yesterday", "last week", "in September". */
export function parseDates(text: string, now: Date): { after?: number; before?: number; label?: string; consumed: RegExp[] } {
  const today = startOfDay(now)
  const day = 86_400_000
  const consumed: RegExp[] = []
  const take = (re: RegExp) => {
    consumed.push(re)
    return true
  }
  let m: RegExpMatchArray | null
  if (/\btoday\b/.test(text) && take(/\btoday\b/)) return { after: today.getTime(), label: 'today', consumed }
  if (/\byesterday\b/.test(text) && take(/\byesterday\b/))
    return { after: today.getTime() - day, before: today.getTime(), label: 'yesterday', consumed }
  if ((m = text.match(/\b(?:last|past) (\d+) days?\b/)) && take(/\b(?:last|past) \d+ days?\b/))
    return { after: today.getTime() - (Number(m[1]) - 1) * day, label: `in the last ${m[1]} days`, consumed }
  if (/\bthis week\b/.test(text) && take(/\bthis week\b/)) {
    const start = today.getTime() - ((today.getDay() + 6) % 7) * day
    return { after: start, label: 'this week', consumed }
  }
  if (/\blast week\b/.test(text) && take(/\blast week\b/)) {
    const thisWeek = today.getTime() - ((today.getDay() + 6) % 7) * day
    return { after: thisWeek - 7 * day, before: thisWeek, label: 'last week', consumed }
  }
  if (/\bthis month\b/.test(text) && take(/\bthis month\b/))
    return { after: new Date(today.getFullYear(), today.getMonth(), 1).getTime(), label: 'this month', consumed }
  if (/\blast month\b/.test(text) && take(/\blast month\b/))
    return {
      after: new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime(),
      before: new Date(today.getFullYear(), today.getMonth(), 1).getTime(),
      label: 'last month',
      consumed,
    }
  if ((m = text.match(MONTH_RE))) {
    consumed.push(MONTH_RE)
    const month = MONTHS.findIndex((x) => x.startsWith(m![1]))
    const yearMatch = text.match(/\b(20\d\d)\b/)
    let year = yearMatch ? Number(yearMatch[1]) : today.getFullYear()
    // A month later than this one, without a year, means last year.
    if (!yearMatch && month > today.getMonth()) year--
    if (yearMatch) consumed.push(/\b20\d\d\b/)
    return { after: new Date(year, month, 1).getTime(), before: new Date(year, month + 1, 1).getTime(), label: `in ${MONTHS[month][0].toUpperCase()}${MONTHS[month].slice(1)} ${year}`, consumed }
  }
  if ((m = text.match(/\b(?:in|from) (20\d\d)\b/))) {
    consumed.push(/\b(?:in|from) 20\d\d\b/)
    const y = Number(m[1])
    return { after: new Date(y, 0, 1).getTime(), before: new Date(y + 1, 0, 1).getTime(), label: `in ${y}`, consumed }
  }
  return { consumed }
}

const UNIT: Record<string, number> = { b: 1, kb: 1024, k: 1024, mb: 1024 ** 2, m: 1024 ** 2, gb: 1024 ** 3 }

export function parseSize(text: string): { minSize?: number; maxSize?: number; label?: string; consumed: RegExp[] } {
  const re = /\b(larger|bigger|greater|over|above|more|smaller|less|under|below)(?: than)? (\d+(?:\.\d+)?) ?(kb|mb|gb|k|m|b)\b/
  const m = text.match(re)
  if (!m) return { consumed: [] }
  const bytes = Number(m[2]) * UNIT[m[3]]
  const min = /larger|bigger|greater|over|above|more/.test(m[1])
  return {
    ...(min ? { minSize: bytes } : { maxSize: bytes }),
    label: `${min ? 'larger' : 'smaller'} than ${m[2]} ${m[3].toUpperCase().replace(/^K$/, 'KB').replace(/^M$/, 'MB')}`,
    consumed: [re],
  }
}

/** Parses a request. `now` is injectable for tests. */
export function parseRequest(input: string, now = new Date()): Intent {
  const text = input
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return { type: 'unknown' }
  if (/^(hi|hello|hey|hiya|good (morning|afternoon|evening))\b/.test(text) && text.split(' ').length <= 3) return { type: 'greeting' }
  if (/^(help|what can you do|how does this work|commands|\?)/.test(text) || /\bwhat can (you|i) do\b/.test(text)) return { type: 'help' }

  for (const [re, reason] of UNSUPPORTED) if (re.test(text)) return { type: 'unsupported', reason }

  if (/\b(resumes?|cvs?|curriculum vitae)\b/.test(text)) {
    if (/\b(my|saved|existing|list|show|open|continue|edit)\b/.test(text) && !/\b(new|create|make|build|start)\b/.test(text)) return { type: 'resume', action: 'list' }
    return { type: 'resume', action: 'create' }
  }

  // Size filters mention "smaller", which would otherwise read as Compress.
  const size = parseSize(text)
  let rest = text
  for (const re of size.consumed) rest = rest.replace(re, ' ')

  const reference: Reference = /\b(these|those|them|this|it|that|both|the (first|last|above|same)|selected)\b/.test(rest) ? 'previous' : 'none'
  const countMatch = rest.match(/\b(two|three|four|five|six|seven|eight|nine|ten|both|\d+)\b/)
  const count = countMatch ? NUMBER_WORDS[countMatch[1]] ?? Number(countMatch[1]) : undefined

  const isFind = /\b(find|search|show|list|where|look for|locate|get)\b/.test(rest) || /\b(recent|latest|newest|last)\b.*\b(files?|documents?|pdfs?|scans?|images?)\b/.test(rest)
  const toolRule = TOOL_RULES.find(([re]) => re.test(rest))
  // "show me the merged PDF" is a search; "merge my PDFs" is a tool.
  if (toolRule && !(isFind && /\b(merged|split|compressed|signed|locked|unlocked|scanned|annotated)\b/.test(rest) && !/\b(merge|split|compress|sign|lock|unlock|scan|annotate)\b/.test(rest))) {
    let [, tool] = toolRule
    if (IMAGE_VARIANT[tool] && IMAGE_WORDS.test(rest) && !/\bpdfs?\b/.test(rest)) tool = IMAGE_VARIANT[tool]!
    // "open my files" goes to the library, not the reader.
    if (tool === 'pdf-reader' && /\b(my files|library|folders?)\b/.test(rest) && reference === 'none') return { type: 'library' }
    if (tool === 'pdf-reader' && isFind && reference === 'none') {
      // "open my invoice" → search first, then offer to open.
    } else {
      const pages = tool === 'extract-pages' || tool === 'split-pdf' || tool === 'remove-pages' ? rest.match(/\bpages? (\d+(?:\s*(?:-|–|to)\s*\d+)?(?:\s*(?:,|and)\s*\d+(?:\s*(?:-|–|to)\s*\d+)?)*)/)?.[1] : undefined
      return { type: 'tool', tool, reference, count: pages ? undefined : count, ...(pages ? { pages: pages.replace(/\s*(to|–)\s*/g, '-').replace(/\s*and\s*/g, ', ') } : {}) }
    }
  }

  if (isFind || /\b(files?|documents?|pdfs?|images?|photos?|scans?)\b/.test(rest) || size.label) {
    const dates = parseDates(rest, now)
    for (const re of dates.consumed) rest = rest.replace(re, ' ')
    const query: FileQuery = {}
    const parts: string[] = []
    if (/\b(pdfs?|documents?|docs?|scans?)\b/.test(rest) && !/\b(images?|photos?|pictures?)\b/.test(rest)) {
      query.kind = 'pdf'
      parts.push('PDFs')
    } else if (/\b(images?|photos?|pictures?|jpe?gs?|pngs?)\b/.test(rest)) {
      query.kind = 'image'
      parts.push('images')
    } else parts.push('files')
    if (dates.after !== undefined) query.after = dates.after
    if (dates.before !== undefined) query.before = dates.before
    if (size.minSize) query.minSize = size.minSize
    if (size.maxSize) query.maxSize = size.maxSize
    let sort: SortKey = 'updated-desc'
    if (/\b(largest|biggest)\b/.test(rest)) sort = 'size-desc'
    if (/\b(smallest)\b/.test(rest)) sort = 'size-asc'
    if (/\b(oldest)\b/.test(rest)) sort = 'updated-asc'
    query.sort = sort
    const recent = /\b(recent|recently|latest|newest)\b/.test(rest)
    if (recent) query.limit = 10
    const nameMatch = rest.match(/\b(?:named|called|titled)\s+(.+)$/)
    const words = (nameMatch ? nameMatch[1] : rest)
      .split(' ')
      .filter((w) => w && !STOP.has(w) && !/^(largest|biggest|smallest|oldest|new|old|recent|recently|latest|newest|and|than|kb|mb|gb|\d+)$/.test(w))
      // Plurals: "bills" should match "bill.pdf".
      .map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    if (words.length) {
      query.text = words.join(' ')
      parts.push(`matching “${query.text}”`)
    }
    if (dates.label) parts.push(dates.label)
    if (size.label) parts.push(size.label)
    const describe = `${recent ? 'recent ' : ''}${parts.join(' ')}`
    return { type: 'find', query, describe, refersToPrevious: reference === 'previous' }
  }

  if (/\b(my files|library|folders?)\b/.test(rest)) return { type: 'library' }
  return { type: 'unknown' }
}

// ---------------------------------------------------------------------------
// Responses

export type AssistantAction =
  | { kind: 'navigate'; label: string; href: string; primary?: boolean }
  | { kind: 'pick'; tool: ToolId; min: number; max: number; fileKind: 'pdf' | 'image'; candidates: LibraryFile[]; preselected: string[]; pages?: string }
  | { kind: 'create-resume'; label: string }

export interface AssistantReply {
  text: string
  files?: LibraryFile[]
  actions: AssistantAction[]
}

export interface AssistantContext {
  files: LibraryFile[]
  /** Files shown in the previous reply, for "these" and "it". */
  previous: LibraryFile[]
  resumeCount: number
}

const single = (verb: string, kind: 'pdf' | 'image' = 'pdf') => ({ kind, min: 1, max: 1, verb })

const TOOL_NEEDS: Partial<Record<ToolId, { kind: 'pdf' | 'image'; min: number; max: number; verb: string }>> = {
  'merge-pdf': { kind: 'pdf', min: 2, max: 60, verb: 'merge' },
  'compare-pdf': { kind: 'pdf', min: 2, max: 2, verb: 'compare' },
  'split-pdf': single('split'),
  'remove-pages': single('remove pages from'),
  'extract-pages': single('extract pages from'),
  'organize-pdf': single('organize'),
  'rotate-pdf': single('rotate'),
  'compress-pdf': single('compress'),
  'repair-pdf': single('repair'),
  'ocr-pdf': single('run OCR on'),
  'pdf-to-jpg': single('convert to JPG'),
  'pdf-to-png': single('convert to PNG'),
  'pdf-to-text': single('extract text from'),
  'pdf-to-markdown': single('convert to Markdown'),
  'pdf-to-word': single('convert to Word'),
  'sign-pdf': single('sign'),
  'add-page-numbers': single('number'),
  'add-watermark': single('watermark'),
  'crop-pdf': single('crop'),
  'fill-pdf-form': single('fill in'),
  'lock-pdf': single('password-protect'),
  'unlock-pdf': single('unlock'),
  'redact-pdf': single('redact'),
  'pdf-metadata': single('inspect'),
  'pdf-reader': single('open'),
  'annotate-pdf': single('annotate'),
  'image-to-pdf': { kind: 'image', min: 1, max: 60, verb: 'convert to PDF' },
  'resize-image': single('resize', 'image'),
  'crop-image': single('crop', 'image'),
  'rotate-image': single('rotate', 'image'),
  'filter-image': single('filter', 'image'),
  'convert-image': single('convert', 'image'),
}

export const SUGGESTIONS = ['Find my recent PDFs', 'Find a file named invoice', 'Merge these documents', 'Compress this file', 'Extract pages 2-5', 'Create a resume']

export function toolPath(tool: ToolId, ids: string[], pages?: string) {
  const href = TOOLS.find((t) => t.id === tool)!.href
  const params = [ids.length ? `files=${ids.map(encodeURIComponent).join(',')}` : '', pages ? `pages=${encodeURIComponent(pages).replace(/%2C/g, ',')}` : ''].filter(Boolean)
  return params.length ? `${href}?${params.join('&')}` : href
}

export function respond(intent: Intent, ctx: AssistantContext): AssistantReply {
  switch (intent.type) {
    case 'greeting':
      return { text: 'Hi! I can find files saved in My files and open the right tool for them. Try “find my PDFs from last month” or “merge these two documents”.', actions: [] }
    case 'help':
      return {
        text: 'I understand requests like these:\n• Find files: “find my bills”, “PDFs from September”, “images larger than 2 MB”, “show my recent files”\n• Use a tool: “merge these”, “extract pages 2-5”, “compress this PDF”, “add page numbers”, “OCR my scan”, “convert it to JPG”, “redact it”\n• Resumes: “create a resume”, “show my resumes”\nI search only file names, types, dates and sizes in this browser. I don’t read what’s inside your documents.',
        actions: [{ kind: 'navigate', label: 'All tools', href: '/tools' }],
      }
    case 'unsupported':
      return { text: intent.reason, actions: [{ kind: 'navigate', label: 'See what’s available', href: '/tools' }] }
    case 'unknown':
      return {
        text: 'Sorry, I didn’t understand that. I can find your saved files or open a tool. Type “help” to see examples.',
        actions: [],
      }
    case 'library':
      return { text: 'Opening My files.', actions: [{ kind: 'navigate', label: 'Open My files', href: '/files', primary: true }] }
    case 'resume':
      if (intent.action === 'list')
        return ctx.resumeCount
          ? { text: `You have ${ctx.resumeCount} resume draft${ctx.resumeCount === 1 ? '' : 's'} saved in this browser.`, actions: [{ kind: 'navigate', label: 'Show my resumes', href: '/resume-builder', primary: true }, { kind: 'create-resume', label: 'Start a new one' }] }
          : { text: 'You don’t have any resume drafts in this browser yet. Want to start one?', actions: [{ kind: 'create-resume', label: 'Create a resume' }, { kind: 'navigate', label: 'Browse templates', href: '/resume-builder#templates' }] }
      return { text: 'Let’s build your resume. I’ll create a draft with example content you can replace, or you can pick a template first.', actions: [{ kind: 'create-resume', label: 'Create resume now' }, { kind: 'navigate', label: 'Choose a template', href: '/resume-builder#templates' }] }
    case 'find': {
      const base = intent.refersToPrevious && ctx.previous.length ? ctx.previous : ctx.files
      const found = queryFiles(base, intent.query)
      if (ctx.files.length === 0)
        return { text: 'There are no files saved in this browser yet. Add files in My files, or save a result from any tool.', actions: [{ kind: 'navigate', label: 'Open My files', href: '/files', primary: true }] }
      if (found.length === 0) return { text: `I couldn’t find any ${intent.describe}.`, actions: [{ kind: 'navigate', label: 'Browse My files', href: '/files' }] }
      return { text: `I found ${found.length} ${intent.describe.replace(/^(recent )?(files|PDFs|images)/, (_, r = '', w) => `${r}${found.length === 1 ? w.replace(/s$/, '') : w}`)}.`, files: found.slice(0, 25), actions: [] }
    }
    case 'tool': {
      const t = TOOLS.find((x) => x.id === intent.tool)!
      const need = TOOL_NEEDS[intent.tool]
      if (!need) return { text: `Opening ${t.name}.`, actions: [{ kind: 'navigate', label: `Open ${t.name}`, href: t.href, primary: true }] }
      const candidates = ctx.files.filter((f) => f.kind === need.kind)
      const referenced = intent.reference === 'previous' ? ctx.previous.filter((f) => f.kind === need.kind) : []
      const noun = need.kind === 'pdf' ? 'PDF' : 'image'

      // Exactly the referenced files: go straight to the tool.
      if (referenced.length >= need.min && referenced.length <= need.max && (!intent.count || intent.count === referenced.length))
        return {
          text: `Opening ${t.name} with ${referenced.length === 1 ? `“${referenced[0].name}”` : `${referenced.length} files`}.`,
          files: referenced,
          actions: [{ kind: 'navigate', label: `Open ${t.name}`, href: toolPath(intent.tool, referenced.map((f) => f.id), intent.pages), primary: true }],
        }
      if (candidates.length === 0)
        return {
          text: `You don’t have any ${noun}s saved in My files, so choose ${need.max === 1 ? `a ${noun}` : `${noun}s`} from your device in ${t.name}.`,
          actions: [{ kind: 'navigate', label: `Open ${t.name}`, href: t.href, primary: true }],
        }
      if (need.max === 1 && candidates.length === 1)
        return {
          text: `You have one ${noun} saved: “${candidates[0].name}”. Open it in ${t.name}?`,
          files: candidates,
          actions: [
            { kind: 'navigate', label: `Yes, ${need.verb} it`, href: toolPath(intent.tool, [candidates[0].id], intent.pages), primary: true },
            { kind: 'navigate', label: 'Choose a different file', href: t.href },
          ],
        }
      const min = Math.max(need.min, intent.count && need.max > 1 ? intent.count : need.min)
      const ask =
        need.max === 1
          ? `Which ${noun} do you want to ${need.verb}?`
          : `Which ${noun}s do you want to ${need.verb}?${intent.count ? ` Choose ${intent.count}.` : ` Choose at least ${need.min}.`}`
      return {
        text: referenced.length && referenced.length > need.max ? `That’s ${referenced.length} files, but ${t.name} takes one. ${ask}` : ask,
        actions: [
          { kind: 'pick', tool: intent.tool, min, max: intent.count && need.max > 1 ? intent.count : need.max, fileKind: need.kind, candidates: (referenced.length ? referenced : candidates).slice(0, 30), preselected: referenced.slice(0, need.max).map((f) => f.id), pages: intent.pages },
          { kind: 'navigate', label: 'Choose from device instead', href: t.href },
        ],
      }
    }
  }
}
