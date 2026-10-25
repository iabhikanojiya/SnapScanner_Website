// Create Studio registry: the five template categories, their fields, sizes
// and templates, and the function that turns a project into a design.
import type { Design, FontFamily } from './engine'
import { MM, design, type Content, type FieldDef, type Palette, type ProjectOptions, type RenderCtx, type SizeOption, type TemplateDef } from './kit'
import { BC_BLEED, BC_FIELDS, BC_SAFE, BC_SAMPLE, BC_SIZES, BC_TEMPLATES } from './categories/business-cards'
import { CERT_FIELDS, CERT_SAMPLE, CERT_SIZES, CERT_TEMPLATES } from './categories/certificates'
import { ID_FIELDS, ID_SAMPLE, ID_SIZES, ID_TEMPLATES } from './categories/id-cards'
import { INVOICE_FIELDS, INVOICE_SAMPLE, INVOICE_SIZES, INVOICE_TEMPLATES } from './categories/invoices'
import { LETTERHEAD_FIELDS, LETTERHEAD_SAMPLE, LETTERHEAD_SIZES, LETTERHEAD_TEMPLATES } from './categories/letterheads'
import { GREETING_FIELDS, GREETING_SAMPLE, GREETING_SIZES, GREETING_TEMPLATES } from './categories/festival-greetings'
import { COLLAGE_FIELDS, COLLAGE_SAMPLE, COLLAGE_SIZES, COLLAGE_TEMPLATES, MAX_SLOTS, slotKey } from './categories/photo-collages'

export type CategoryId = 'id-cards' | 'invoices' | 'business-cards' | 'certificates' | 'photo-collages' | 'letterheads' | 'festival-greetings'
export type ExportFormat = 'pdf' | 'png' | 'jpg'

export interface Category {
  id: CategoryId
  /** Tool name, e.g. "ID Card Maker". */
  name: string
  /** Plural noun, e.g. "ID cards". */
  plural: string
  /** Singular noun used in file names and messages. */
  noun: string
  description: string
  href: string
  fields: FieldDef[]
  sample: Content
  sizes: SizeOption[]
  /** Whether a custom size (in mm) can be entered. */
  customSize: boolean
  templates: TemplateDef[]
  formats: ExportFormat[]
  /** Print bleed and safe area in points (business cards). */
  print?: { bleed: number; safe: number }
  /** Extra editor panel. */
  panel?: 'invoice' | 'collage'
  /** Shown in the editor and on the landing page. */
  disclaimer: string
}

export const CATEGORIES: Category[] = [
  {
    id: 'id-cards',
    name: 'ID Card Maker',
    plural: 'ID cards',
    noun: 'ID card',
    description: 'Employee, student, event and membership cards with photo, logo and an optional QR code.',
    href: '/create/id-cards',
    fields: ID_FIELDS,
    sample: ID_SAMPLE,
    sizes: ID_SIZES,
    customSize: true,
    templates: ID_TEMPLATES,
    formats: ['pdf', 'png', 'jpg'],
    disclaimer: 'Cards made here are design templates. They aren’t official, government-issued or verified identification.',
  },
  {
    id: 'invoices',
    name: 'Invoice Maker',
    plural: 'invoices',
    noun: 'invoice',
    description: 'Professional invoices with line items, discounts, any tax rates and 22 currencies, calculated exactly.',
    href: '/create/invoices',
    fields: INVOICE_FIELDS,
    sample: INVOICE_SAMPLE,
    sizes: INVOICE_SIZES,
    customSize: false,
    templates: INVOICE_TEMPLATES,
    formats: ['pdf', 'png', 'jpg'],
    panel: 'invoice',
    disclaimer: 'Invoice Maker lays out and totals your invoice. It isn’t accounting or tax software: check tax rates and legal requirements for your country.',
  },
  {
    id: 'business-cards',
    name: 'Business Card Maker',
    plural: 'business cards',
    noun: 'business card',
    description: 'Two-sided cards in standard sizes, with bleed and safe-area guides and a print-ready PDF.',
    href: '/create/business-cards',
    fields: BC_FIELDS,
    sample: BC_SAMPLE,
    sizes: BC_SIZES,
    customSize: true,
    templates: BC_TEMPLATES,
    formats: ['pdf', 'png', 'jpg'],
    print: { bleed: BC_BLEED, safe: BC_SAFE },
    disclaimer: 'The print PDF adds 1/8 in (3.2 mm) bleed and sets the PDF trim and bleed boxes. Confirm your print shop’s exact file requirements before ordering.',
  },
  {
    id: 'certificates',
    name: 'Certificate Maker',
    plural: 'certificates',
    noun: 'certificate',
    description: 'Certificates of achievement, completion and appreciation with seals, signatures and an optional QR code.',
    href: '/create/certificates',
    fields: CERT_FIELDS,
    sample: CERT_SAMPLE,
    sizes: CERT_SIZES,
    customSize: true,
    templates: CERT_TEMPLATES,
    formats: ['pdf', 'png', 'jpg'],
    disclaimer: 'Certificates made here are design templates. They don’t make a qualification accredited or verifiable.',
  },
  {
    id: 'photo-collages',
    name: 'Photo Collage Maker',
    plural: 'photo collages',
    noun: 'collage',
    description: 'Grids, mosaics, film strips and scrapbook layouts. Drag photos into place, crop and caption them.',
    href: '/create/photo-collages',
    fields: COLLAGE_FIELDS,
    sample: COLLAGE_SAMPLE,
    sizes: COLLAGE_SIZES,
    customSize: true,
    templates: COLLAGE_TEMPLATES,
    formats: ['png', 'jpg', 'pdf'],
    panel: 'collage',
    disclaimer: 'Photos stay on this device. They’re downscaled to at most 2400 px on the longest side when added.',
  },
  {
    id: 'letterheads',
    name: 'Letterhead Maker',
    plural: 'letterheads',
    noun: 'letterhead',
    description: 'Branded letterheads with your logo and contact details, with or without a letter. Long letters continue onto more pages.',
    href: '/create/letterheads',
    fields: LETTERHEAD_FIELDS,
    sample: LETTERHEAD_SAMPLE,
    sizes: LETTERHEAD_SIZES,
    customSize: false,
    templates: LETTERHEAD_TEMPLATES,
    formats: ['pdf', 'png', 'jpg'],
    disclaimer: 'Download PDF keeps the letter as selectable text. Turn off “Include the letter” for a blank letterhead to print or reuse.',
  },
  {
    id: 'festival-greetings',
    name: 'Festival Greeting Maker',
    plural: 'festival greetings',
    noun: 'greeting',
    description: 'Greeting cards and posts for Diwali, New Year, Christmas, Holi, Eid, Raksha Bandhan, Onam and more festivals.',
    href: '/create/festival-greetings',
    fields: GREETING_FIELDS,
    sample: GREETING_SAMPLE,
    sizes: GREETING_SIZES,
    customSize: true,
    templates: GREETING_TEMPLATES,
    formats: ['png', 'jpg', 'pdf'],
    disclaimer: 'Leave the greeting, subheading and message blank to use each template’s own festival wording. Social sizes export at their exact pixel size.',
  },
]

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id)
}

export function getTemplate(cat: Category, id: string): TemplateDef | undefined {
  return cat.templates.find((t) => t.id === id)
}

export const CUSTOM_SIZE_ID = 'custom'
export const CUSTOM_LIMITS = { min: 20, max: 1000 } // mm

export function defaultSizeId(cat: Category, tpl: TemplateDef): string {
  return (cat.sizes.find((s) => s.orientation === tpl.orientation) ?? cat.sizes[0]).id
}

/** Trim size in points for the project's options. */
export function resolveSize(cat: Category, tpl: TemplateDef, options: ProjectOptions): { w: number; h: number; label: string } {
  if (options.sizeId === CUSTOM_SIZE_ID && cat.customSize) {
    const clamp = (v: number | undefined, d: number) => Math.min(CUSTOM_LIMITS.max, Math.max(CUSTOM_LIMITS.min, Number.isFinite(v) ? (v as number) : d))
    const w = clamp(options.customW, 100)
    const h = clamp(options.customH, 100)
    return { w: w * MM, h: h * MM, label: `Custom (${w} × ${h} mm)` }
  }
  const s = cat.sizes.find((x) => x.id === options.sizeId) ?? cat.sizes.find((x) => x.id === defaultSizeId(cat, tpl))!
  return { w: s.w, h: s.h, label: s.label }
}

export function paletteFor(tpl: TemplateDef, options: ProjectOptions): Palette {
  const hex = (v: string | undefined, d: string) => (v && /^#[0-9a-f]{6}$/i.test(v) ? v : d)
  return { ...tpl.palette, primary: hex(options.primary, tpl.palette.primary), secondary: hex(options.secondary, tpl.palette.secondary), accent: hex(options.accent, tpl.palette.accent) }
}

/** Builds the design for a project. Business cards always carry bleed so backgrounds extend past the trim. */
export function buildDesign(cat: Category, tpl: TemplateDef, content: Content, options: ProjectOptions): Design {
  const { w, h } = resolveSize(cat, tpl, options)
  const bleed = cat.print?.bleed ?? 0
  const head: FontFamily = options.headFont && ['sans', 'serif', 'mono'].includes(options.headFont) ? options.headFont : tpl.fonts.head
  const ctx: RenderCtx = { W: w, H: h, p: paletteFor(tpl, options), f: { ...tpl.fonts, head }, c: content, bleed }
  return design(w, h, tpl.render(ctx), bleed, cat.print?.safe)
}

/** Photo slots used by a collage template. */
export function slotCount(tpl: TemplateDef) {
  return Math.min(MAX_SLOTS, tpl.slots ?? 0)
}

/**
 * What a template switch would discard. All templates in a category share the
 * same fields, so only collage photos beyond the new slot count are at risk.
 */
export function switchLosses(cat: Category, from: TemplateDef, to: TemplateDef, content: Content): string[] {
  if (cat.panel !== 'collage') return []
  const lost: string[] = []
  for (let i = slotCount(to); i < slotCount(from); i++) if (content[slotKey(i)]) lost.push(`Photo ${i + 1}`)
  return lost
}

/** Content after a template switch: drops collage photos with no slot. */
export function contentForTemplate(cat: Category, to: TemplateDef, content: Content): Content {
  if (cat.panel !== 'collage') return content
  const next = { ...content }
  for (let i = slotCount(to); i < MAX_SLOTS; i++) delete next[slotKey(i)]
  return next
}

export const TOTAL_TEMPLATES = CATEGORIES.reduce((n, c) => n + c.templates.length, 0)
