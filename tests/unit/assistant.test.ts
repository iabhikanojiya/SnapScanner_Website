import { describe, expect, it } from 'vitest'
import { parseRequest, respond, type AssistantContext } from '@/lib/assistant'
import type { LibraryFile } from '@/lib/storage/db'

// Thursday 23 October 2026, noon.
const NOW = new Date(2026, 9, 23, 12)
const day = 86_400_000

function file(name: string, kind: 'pdf' | 'image', daysAgo: number, size = 100_000): LibraryFile {
  const t = NOW.getTime() - daysAgo * day
  return { id: name, name, kind, mime: kind === 'pdf' ? 'application/pdf' : 'image/jpeg', size, createdAt: t, updatedAt: t, folderId: null }
}

const FILES = [
  file('Electricity bill Sept.pdf', 'pdf', 30, 300_000),
  file('Water bill.pdf', 'pdf', 2, 120_000),
  file('Passport scan.pdf', 'pdf', 0, 3_000_000),
  file('Receipt.jpg', 'image', 1, 2_500_000),
  file('Holiday.png', 'image', 200, 50_000),
]
const ctx = (over: Partial<AssistantContext> = {}): AssistantContext => ({ files: FILES, previous: [], resumeCount: 0, ...over })

describe('parseRequest', () => {
  it('understands file searches with type, date, size and name', () => {
    expect(parseRequest('Find my PDF files', NOW)).toMatchObject({ type: 'find', query: { kind: 'pdf' } })
    expect(parseRequest('Show my recent files', NOW)).toMatchObject({ type: 'find', query: { limit: 10, sort: 'updated-desc' } })
    expect(parseRequest('find my bills from september', NOW)).toMatchObject({
      type: 'find',
      query: { text: 'bill', after: new Date(2026, 8, 1).getTime(), before: new Date(2026, 9, 1).getTime() },
    })
    expect(parseRequest('images larger than 2 MB', NOW)).toMatchObject({ type: 'find', query: { kind: 'image', minSize: 2 * 1024 * 1024 } })
    expect(parseRequest('PDFs smaller than 500kb', NOW)).toMatchObject({ type: 'find', query: { kind: 'pdf', maxSize: 500 * 1024 } })
    expect(parseRequest('files from yesterday', NOW)).toMatchObject({ type: 'find', query: { after: new Date(2026, 9, 22).getTime() } })
    expect(parseRequest('documents from december', NOW)).toMatchObject({ query: { after: new Date(2025, 11, 1).getTime() } })
  })

  it('maps commands to tools and notices references', () => {
    expect(parseRequest('Merge these two documents', NOW)).toEqual({ type: 'tool', tool: 'merge-pdf', reference: 'previous', count: 2 })
    expect(parseRequest('Compress this PDF', NOW)).toMatchObject({ type: 'tool', tool: 'compress-pdf', reference: 'previous' })
    expect(parseRequest('please password protect my contract', NOW)).toMatchObject({ tool: 'lock-pdf', reference: 'none' })
    expect(parseRequest('remove the password from it', NOW)).toMatchObject({ tool: 'unlock-pdf' })
    expect(parseRequest('convert my photos to pdf', NOW)).toMatchObject({ tool: 'image-to-pdf' })
    expect(parseRequest('I need to sign a form', NOW)).toMatchObject({ tool: 'sign-pdf' })
    expect(parseRequest('split it', NOW)).toMatchObject({ tool: 'split-pdf' })
    expect(parseRequest('scan a document', NOW)).toMatchObject({ tool: 'scan-pdf' })
  })

  it('handles resumes, help and unsupported requests', () => {
    expect(parseRequest('Create a resume', NOW)).toEqual({ type: 'resume', action: 'create' })
    expect(parseRequest('show my resumes', NOW)).toEqual({ type: 'resume', action: 'list' })
    expect(parseRequest('help', NOW)).toEqual({ type: 'help' })
    expect(parseRequest('convert this spreadsheet to excel', NOW)).toMatchObject({ type: 'unsupported', reason: expect.stringMatching(/Excel/) })
    expect(parseRequest('ocr my scan', NOW)).toMatchObject({ type: 'tool', tool: 'ocr-pdf' })
    expect(parseRequest('email it to my boss', NOW)).toMatchObject({ type: 'unsupported' })
    expect(parseRequest('I forgot the password', NOW)).toMatchObject({ type: 'unsupported' })
    expect(parseRequest('banana', NOW)).toEqual({ type: 'unknown' })
  })
})

describe('respond', () => {
  it('searches the library', () => {
    const r = respond(parseRequest('find my bills', NOW), ctx())
    expect(r.files?.map((f) => f.name)).toEqual(['Water bill.pdf', 'Electricity bill Sept.pdf'])
    expect(r.text).toMatch(/found 2 PDFs|found 2 files/)
    expect(respond(parseRequest('images larger than 2 MB', NOW), ctx()).files?.map((f) => f.name)).toEqual(['Receipt.jpg'])
    expect(respond(parseRequest('find tax return', NOW), ctx()).text).toMatch(/couldn’t find/)
    expect(respond(parseRequest('find my pdfs', NOW), ctx({ files: [] })).text).toMatch(/no files saved/)
  })

  it('opens a tool directly with referenced files', () => {
    const previous = FILES.filter((f) => f.name.includes('bill'))
    const r = respond(parseRequest('Merge these two documents', NOW), ctx({ previous }))
    expect(r.actions[0]).toEqual({ kind: 'navigate', label: 'Open Merge PDF', href: '/tools/merge-pdf?files=Electricity%20bill%20Sept.pdf,Water%20bill.pdf', primary: true })
  })

  it('asks a follow-up question when files are missing or ambiguous', () => {
    const r = respond(parseRequest('Compress this PDF', NOW), ctx())
    expect(r.text).toBe('Which PDF do you want to compress?')
    expect(r.actions[0]).toMatchObject({ kind: 'pick', tool: 'compress-pdf', min: 1, max: 1 })
    const merge = respond(parseRequest('merge pdfs', NOW), ctx())
    expect(merge.actions[0]).toMatchObject({ kind: 'pick', min: 2 })
    // Referring to two files for a one-file tool.
    const two = respond(parseRequest('sign these', NOW), ctx({ previous: FILES.slice(0, 2) }))
    expect(two.text).toMatch(/takes one/)
    // No PDFs at all: send the user to the tool to choose from the device.
    const none = respond(parseRequest('split a pdf', NOW), ctx({ files: FILES.filter((f) => f.kind === 'image') }))
    expect(none.actions[0]).toMatchObject({ kind: 'navigate', href: '/tools/split-pdf' })
  })

  it('offers resume actions', () => {
    expect(respond({ type: 'resume', action: 'create' }, ctx()).actions[0]).toEqual({ kind: 'create-resume', label: 'Create resume now' })
    expect(respond({ type: 'resume', action: 'list' }, ctx({ resumeCount: 2 })).text).toMatch(/2 resume drafts/)
  })
})

describe('new tools', () => {
  const cases: [string, string][] = [
    ['extract pages 2-5', 'extract-pages'],
    ['remove page 3 from this', 'remove-pages'],
    ['rotate this pdf', 'rotate-pdf'],
    ['rotate my photo', 'rotate-image'],
    ['crop the image', 'crop-image'],
    ['crop pdf margins', 'crop-pdf'],
    ['reorder the pages', 'organize-pdf'],
    ['add page numbers', 'add-page-numbers'],
    ['add a watermark that says draft', 'add-watermark'],
    ['ocr my scan', 'ocr-pdf'],
    ['make this searchable', 'ocr-pdf'],
    ['convert this pdf to jpg', 'pdf-to-jpg'],
    ['save pages as png', 'pdf-to-png'],
    ['extract the text', 'pdf-to-text'],
    ['convert it to markdown', 'pdf-to-markdown'],
    ['compare these two', 'compare-pdf'],
    ['redact my bank statement', 'redact-pdf'],
    ['remove metadata', 'pdf-metadata'],
    ['repair a corrupted pdf', 'repair-pdf'],
    ['fill in this form', 'fill-pdf-form'],
    ['turn html into a pdf', 'html-to-pdf'],
    ['apply black and white filter to a photo', 'filter-image'],
    ['convert png to webp', 'convert-image'],
  ]
  it.each(cases)('“%s” → %s', (text, tool) => {
    expect(parseRequest(text, NOW)).toMatchObject({ type: 'tool', tool })
  })

  it('passes page ranges to the tool', () => {
    const intent = parseRequest('Extract pages 2-5', NOW)
    expect(intent).toMatchObject({ tool: 'extract-pages', pages: '2-5' })
    expect(parseRequest('extract pages 1 to 3 and 7', NOW)).toMatchObject({ pages: '1-3, 7' })
    const r = respond(intent, ctx({ files: [FILES[1]] }))
    expect(r.actions[0]).toMatchObject({ kind: 'navigate', href: '/tools/extract-pages?files=Water%20bill.pdf&pages=2-5' })
  })

  it('opens the Word converters', () => {
    expect(parseRequest('convert this pdf to word', NOW)).toMatchObject({ type: 'tool', tool: 'pdf-to-word', reference: 'previous' })
    expect(parseRequest('make it an editable word document', NOW)).toMatchObject({ type: 'tool', tool: 'pdf-to-word' })
    expect(parseRequest('convert my word file to pdf', NOW)).toMatchObject({ type: 'tool', tool: 'word-to-pdf' })
    expect(parseRequest('convert docx', NOW)).toMatchObject({ type: 'tool', tool: 'word-to-pdf' })
    expect(respond(parseRequest('convert word to pdf', NOW), ctx({})).actions[0]).toMatchObject({ kind: 'navigate', href: '/tools/word-to-pdf' })
  })

  it('still searches by name and keeps Excel and PowerPoint conversion unsupported', () => {
    expect(parseRequest('Find a file named invoice', NOW)).toMatchObject({ type: 'find', query: { text: 'invoice' } })
    expect(parseRequest('sort my files by size', NOW).type).not.toBe('tool')
    expect(parseRequest('convert this to powerpoint', NOW)).toMatchObject({ type: 'unsupported' })
    expect(parseRequest('export to xlsx', NOW)).toMatchObject({ type: 'unsupported' })
    expect(respond(parseRequest('compare these', NOW), ctx({ previous: FILES.slice(0, 2) })).actions[0]).toMatchObject({ kind: 'navigate', href: expect.stringContaining('/tools/compare-pdf?files=') })
  })
})
