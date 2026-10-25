// Groupings of the tool registry (lib/tools.ts) for the header menus and the
// homepage tools directory. Items reference tools by id, so names, routes and
// icons always come from the registry and only existing tools can appear.
import { tool, type ToolId } from '@/lib/tools'

export type NavItem =
  | { kind: 'tool'; id: ToolId }
  /** A page that isn't a processing tool, e.g. Snap Assistant. */
  | { kind: 'page'; label: string; href: string; icon: 'assistant' | 'templates' }

export interface NavGroup {
  id: string
  name: string
  items: NavItem[]
}

const tools = (...ids: ToolId[]): NavItem[] => ids.map((id) => ({ kind: 'tool', id }))

const ORGANIZE: NavGroup = { id: 'organize', name: 'Organize PDF', items: tools('merge-pdf', 'split-pdf', 'remove-pages', 'extract-pages', 'organize-pdf', 'rotate-pdf') }
const OPTIMIZE: NavGroup = { id: 'optimize', name: 'Optimize PDF', items: tools('compress-pdf', 'repair-pdf', 'ocr-pdf') }
const EDIT: NavGroup = {
  id: 'edit',
  name: 'Edit PDF',
  items: tools('edit-pdf', 'annotate-pdf', 'pdf-reader', 'add-page-numbers', 'crop-pdf', 'add-watermark', 'sign-pdf', 'redact-pdf', 'fill-pdf-form', 'compare-pdf'),
}
const SECURITY: NavGroup = { id: 'security', name: 'PDF Security', items: tools('lock-pdf', 'unlock-pdf', 'pdf-metadata') }
const TO_PDF: NavGroup = { id: 'convert-to', name: 'Convert to PDF', items: tools('scan-pdf', 'word-to-pdf', 'jpg-to-pdf', 'png-to-pdf', 'webp-to-pdf', 'image-to-pdf', 'html-to-pdf') }
const FROM_PDF: NavGroup = { id: 'convert-from', name: 'Convert from PDF', items: tools('pdf-to-word', 'pdf-to-jpg', 'pdf-to-png', 'pdf-to-text', 'pdf-to-markdown') }
const IMAGE: NavGroup = { id: 'image', name: 'Image tools', items: tools('resize-image', 'crop-image', 'rotate-image', 'filter-image', 'convert-image', 'image-to-webp') }
const CREATE: NavGroup = { id: 'create', name: 'Create', items: tools('resume-builder', 'id-card-maker', 'invoice-maker', 'business-card-maker', 'certificate-maker', 'photo-collage-maker', 'letterhead-maker', 'festival-greeting-maker', 'qr-code-generator') }

/** Short descriptions shown in the Create menu. */
export const CREATE_MENU_DESCRIPTIONS: Partial<Record<ToolId, string>> = {
  'resume-builder': 'Resumes with ATS-friendly templates',
  'id-card-maker': 'Employee, student and event cards',
  'invoice-maker': 'Invoices with exact totals and taxes',
  'business-card-maker': 'Two-sided cards with print guides',
  'certificate-maker': 'Awards, completion and appreciation',
  'photo-collage-maker': 'Grids, mosaics and scrapbooks',
  'letterhead-maker': 'Branded letters and stationery',
  'festival-greeting-maker': 'Diwali, New Year, Eid, Christmas and more',
  'qr-code-generator': 'Styled QR codes for links and Wi-Fi',
}

export interface HeaderMenu {
  id: string
  label: string
  groups: NavGroup[]
  /** Single list with descriptions instead of grouped columns. */
  described?: boolean
  footer: { label: string; href: string }
}

/** Header dropdowns. Each tool appears in exactly one menu. */
export const HEADER_MENUS: HeaderMenu[] = [
  { id: 'pdf-tools', label: 'PDF Tools', groups: [ORGANIZE, OPTIMIZE, EDIT, SECURITY], footer: { label: 'See all tools', href: '/tools' } },
  { id: 'convert-image', label: 'Convert & Image', groups: [TO_PDF, FROM_PDF, IMAGE], footer: { label: 'See all tools', href: '/tools' } },
  { id: 'create', label: 'Create', groups: [CREATE], described: true, footer: { label: 'Explore Create Studio', href: '/create' } },
]

/** The complete directory shown above the footer on the home page. */
export const DIRECTORY_GROUPS: NavGroup[] = [
  ORGANIZE,
  OPTIMIZE,
  { id: 'convert-image', name: 'Convert & Image', items: [...TO_PDF.items, ...FROM_PDF.items, ...IMAGE.items] },
  EDIT,
  SECURITY,
  { id: 'intelligence', name: 'PDF Intelligence', items: [{ kind: 'page', label: 'Snap Assistant', href: '/assistant', icon: 'assistant' }] },
  {
    id: 'create',
    name: 'Create',
    items: [...CREATE.items, { kind: 'page', label: 'Resume templates', href: '/resume-builder#templates', icon: 'templates' }],
  },
]

export function itemLabel(item: NavItem, menu?: HeaderMenu) {
  if (item.kind !== 'tool') return item.label
  return item.id === 'resume-builder' && !menu?.described ? 'Create resume' : tool(item.id).name
}

export function itemHref(item: NavItem) {
  return item.kind === 'tool' ? tool(item.id).href : item.href
}
