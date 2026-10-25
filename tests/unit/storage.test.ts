import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { StorageFullError, clearAllData, storageError } from '@/lib/storage/db'
import { createFolder, deleteFiles, deleteFolder, getFile, listFiles, listFolders, moveFiles, renameFile, saveFile } from '@/lib/storage/library'
import { queryFiles } from '@/lib/storage/query'
import { deleteDraft, getDraft, listDrafts, putDraft } from '@/lib/resume/store'
import { duplicateDraft, newDraft, orderedSections, parseDescription, parseImportedDraft } from '@/lib/resume/model'
import { RESUME_PALETTES, RESUME_TEMPLATES } from '@/lib/resume'
import { TEMPLATE_STYLES } from '@/lib/resume/templates'

const pdf = (text: string) => new Blob([`%PDF-1.7 ${text}`], { type: 'application/pdf' })

describe('library', () => {
  beforeEach(async () => {
    await clearAllData()
  })

  it('saves, reads back, renames and deletes files', async () => {
    const a = await saveFile(pdf('a'), { name: 'Invoice.pdf', kind: 'pdf', pageCount: 2 })
    await saveFile(new Blob(['x'], { type: 'image/png' }), { name: 'Receipt.png', kind: 'image' })
    expect((await listFiles()).map((f) => f.name).sort()).toEqual(['Invoice.pdf', 'Receipt.png'])
    const loaded = await getFile(a.id)
    expect(loaded?.file.name).toBe('Invoice.pdf')
    expect(await loaded?.file.text()).toBe('%PDF-1.7 a')
    await renameFile(a.id, 'March invoice.pdf')
    expect((await getFile(a.id))?.meta.name).toBe('March invoice.pdf')
    await expect(renameFile(a.id, '  ')).rejects.toThrow(/Enter a file name/)
    await deleteFiles([a.id])
    expect(await getFile(a.id)).toBeUndefined()
  })

  it('organises files into folders', async () => {
    const bills = await createFolder('Bills')
    await expect(createFolder('bills')).rejects.toThrow(/already exists/)
    const f = await saveFile(pdf('b'), { name: 'Water.pdf', kind: 'pdf' })
    await moveFiles([f.id], bills.id)
    expect(queryFiles(await listFiles(), { folderId: bills.id })).toHaveLength(1)
    await deleteFolder(bills.id, { deleteContents: false })
    expect(await listFolders()).toHaveLength(0)
    expect((await getFile(f.id))?.meta.folderId).toBeNull()
    const tax = await createFolder('Tax')
    await moveFiles([f.id], tax.id)
    await deleteFolder(tax.id, { deleteContents: true })
    expect(await listFiles()).toHaveLength(0)
  })

  it('maps quota errors to a readable message', () => {
    expect(storageError(new DOMException('full', 'QuotaExceededError'))).toBeInstanceOf(StorageFullError)
    expect(storageError(new DOMException('full', 'QuotaExceededError')).message).toMatch(/storage for this site is full/)
  })

  it('searches and sorts', async () => {
    await saveFile(new Blob(['1234567890']), { name: 'Big bill.pdf', kind: 'pdf' })
    await saveFile(new Blob(['1']), { name: 'small bill.pdf', kind: 'pdf' })
    const files = await listFiles()
    expect(queryFiles(files, { text: 'BILL', sort: 'size-desc' }).map((f) => f.name)).toEqual(['Big bill.pdf', 'small bill.pdf'])
    expect(queryFiles(files, { sort: 'name-asc' }).map((f) => f.name)).toEqual(['Big bill.pdf', 'small bill.pdf'])
    expect(queryFiles(files, { minSize: 5 })).toHaveLength(1)
  })
})

describe('resume drafts', () => {
  beforeEach(async () => {
    await clearAllData()
  })

  it('creates, saves, duplicates and deletes drafts', async () => {
    const d = await putDraft(newDraft('soft_blue'), false)
    expect((await getDraft(d.id))?.templateId).toBe('soft_blue')
    const copy = await putDraft(duplicateDraft(d), false)
    expect(copy.name).toBe('Soft Blue resume (copy)')
    expect((await listDrafts()).length).toBe(2)
    await deleteDraft(d.id)
    expect((await listDrafts()).map((x) => x.id)).toEqual([copy.id])
  })

  it('keeps content when the template changes', () => {
    const d = newDraft('academic_cv')
    const academic = orderedSections(d.data, 'academic_cv').map((s) => s.type)
    expect(academic[0]).toBe('education')
    const technical = orderedSections(d.data, 'technical_resume').map((s) => s.type)
    expect(technical[0]).toBe('skills')
    expect(new Set(academic)).toEqual(new Set(technical))
  })

  it('has all 20 templates and 9 palettes from the app', () => {
    expect(RESUME_TEMPLATES).toHaveLength(20)
    expect(TEMPLATE_STYLES.map((t) => t.id).sort()).toEqual(RESUME_TEMPLATES.map((t) => t.id).sort())
    expect(RESUME_PALETTES.map((p) => p.name)).toEqual(['Navy', 'Emerald', 'Burgundy', 'Teal', 'Charcoal', 'Indigo', 'Terracotta', 'Blue', 'Plum'])
  })

  it('parses bullets and validates imports', () => {
    expect(parseDescription('Intro\n- one\n• two')).toEqual([
      { kind: 'p', text: 'Intro' },
      { kind: 'li', text: 'one' },
      { kind: 'li', text: 'two' },
    ])
    const exported = JSON.stringify({ ...newDraft('minimal_ats'), data: { ...newDraft('minimal_ats').data, personal: { ...newDraft('minimal_ats').data.personal, photo: 'https://evil.example/x.jpg' } } })
    const imported = parseImportedDraft(exported)
    expect(imported.templateId).toBe('minimal_ats')
    expect(imported.data.personal.photo).toBeUndefined()
    expect(() => parseImportedDraft('{"foo":1}')).toThrow(/isn’t a Snap Scanner resume/)
    expect(() => parseImportedDraft('nope')).toThrow(/valid JSON/)
  })
})
