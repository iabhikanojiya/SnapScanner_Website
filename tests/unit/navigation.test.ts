import { describe, expect, it } from 'vitest'
import { CREATE_MENU_DESCRIPTIONS, DIRECTORY_GROUPS, HEADER_MENUS, itemHref } from '@/lib/navigation'
import { TOOLS } from '@/lib/tools'

const toolIds = (items: { kind: string; id?: string }[]) => items.filter((i) => i.kind === 'tool').map((i) => i.id!)

describe('navigation', () => {
  it('lists every tool exactly once across the header menus', () => {
    const ids = HEADER_MENUS.flatMap((m) => m.groups.flatMap((g) => toolIds(g.items)))
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.sort()).toEqual(TOOLS.map((t) => t.id).sort())
  })

  it('has a Create menu with the resume builder and the five makers, each described', () => {
    expect(HEADER_MENUS.map((m) => m.label)).toEqual(['PDF Tools', 'Convert & Image', 'Create'])
    const create = HEADER_MENUS[2]
    const ids = toolIds(create.groups.flatMap((g) => g.items))
    expect(ids).toEqual(['resume-builder', 'id-card-maker', 'invoice-maker', 'business-card-maker', 'certificate-maker', 'photo-collage-maker', 'letterhead-maker', 'festival-greeting-maker', 'qr-code-generator'])
    for (const id of ids) expect(CREATE_MENU_DESCRIPTIONS[id as keyof typeof CREATE_MENU_DESCRIPTIONS]).toBeTruthy()
    expect(create.groups.flatMap((g) => g.items).map(itemHref)).toEqual(['/resume-builder', '/create/id-cards', '/create/invoices', '/create/business-cards', '/create/certificates', '/create/photo-collages', '/create/letterheads', '/create/festival-greetings', '/tools/qr-code-generator'])
    expect(create.footer.href).toBe('/create')
  })

  it('puts conversion and image tools in Convert & Image, not PDF Tools', () => {
    const [pdf, convert] = HEADER_MENUS
    expect(pdf.label).toBe('PDF Tools')
    expect(convert.label).toBe('Convert & Image')
    const convertIds = toolIds(convert.groups.flatMap((g) => g.items))
    for (const t of TOOLS.filter((x) => ['convert-to', 'convert-from', 'image'].includes(x.category))) expect(convertIds).toContain(t.id)
    expect(toolIds(pdf.groups.flatMap((g) => g.items)).some((id) => convertIds.includes(id))).toBe(false)
  })

  it('shows every tool once in the home page directory, with real routes', () => {
    const items = DIRECTORY_GROUPS.flatMap((g) => g.items)
    const ids = toolIds(items)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.sort()).toEqual(TOOLS.map((t) => t.id).sort())
    expect(DIRECTORY_GROUPS.map((g) => g.name)).toEqual(['Organize PDF', 'Optimize PDF', 'Convert & Image', 'Edit PDF', 'PDF Security', 'PDF Intelligence', 'Create'])
    expect(items.map(itemHref)).toContain('/assistant')
  })
})
