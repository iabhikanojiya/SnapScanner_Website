// Web adaptations of the app's 20 resume templates. Each template is a set of
// layout and typography choices interpreted by components/resume/ResumeDocument.
// Fonts are metric-compatible with the PDF standard fonts (Helvetica, Times,
// Courier) so the exported PDF matches the preview and has real, selectable text.
import type { SectionType } from './types'

export type Layout = 'single' | 'sidebar-left' | 'sidebar-right' | 'gutter'
export type FontKind = 'sans' | 'serif'
export type SectionTitleStyle = 'rule' | 'underline' | 'caps' | 'bar' | 'label' | 'numbered' | 'centered' | 'plain'
export type HeaderStyle = 'plain' | 'band' | 'centered-band' | 'sidebar' | 'photo-hero'

export interface TemplateStyle {
  id: string
  layout: Layout
  body: FontKind
  heading: FontKind
  header: HeaderStyle
  nameAlign: 'left' | 'center'
  nameCase?: 'upper' | 'normal'
  /** Letter-spaced name (Elegant Serif). */
  spacedName?: boolean
  /** Name split over two lines (Creative Portfolio). */
  twoLineName?: boolean
  sectionTitle: SectionTitleStyle
  density: 'compact' | 'normal' | 'airy'
  /** Dates in a left column next to entries. */
  dateColumn?: boolean
  timeline?: boolean
  /** Monospace for skills and project details (Technical Resume). */
  monoDetails?: boolean
  /** Skills shown as a grid of competencies near the top. */
  competencies?: boolean
  /** Coloured strip at the top edge (Teal Modern). */
  topEdge?: boolean
  /** Thin gold rule (Modern Executive, Navy Executive). */
  goldRule?: boolean
  sidebarTone?: 'dark' | 'tint'
  /** Sections placed in the sidebar for sidebar layouts. */
  sidebarSections?: SectionType[]
  /** Section types moved to the front, in this order. */
  priority?: SectionType[]
  photo: boolean
  defaultPalette: string
  /** False for strictly black-and-white templates. */
  usesPalette: boolean
}

const SIDEBAR_DEFAULT: SectionType[] = ['skills', 'languages', 'interests', 'certifications']

export const TEMPLATE_STYLES: TemplateStyle[] = [
  { id: 'classic_professional', layout: 'single', body: 'serif', heading: 'serif', header: 'plain', nameAlign: 'center', sectionTitle: 'rule', density: 'normal', photo: false, defaultPalette: 'navy', usesPalette: true },
  { id: 'modern_executive', layout: 'single', body: 'sans', heading: 'sans', header: 'plain', nameAlign: 'left', nameCase: 'upper', goldRule: true, sectionTitle: 'caps', density: 'normal', photo: false, defaultPalette: 'charcoal', usesPalette: true },
  { id: 'minimal_ats', layout: 'single', body: 'sans', heading: 'sans', header: 'plain', nameAlign: 'left', sectionTitle: 'underline', density: 'normal', photo: false, defaultPalette: 'charcoal', usesPalette: false },
  { id: 'corporate_split', layout: 'sidebar-left', body: 'sans', heading: 'sans', header: 'band', nameAlign: 'left', sectionTitle: 'caps', density: 'normal', sidebarTone: 'tint', sidebarSections: ['skills', 'languages', 'certifications', 'interests'], photo: false, defaultPalette: 'navy', usesPalette: true },
  { id: 'elegant_serif', layout: 'single', body: 'serif', heading: 'serif', header: 'plain', nameAlign: 'center', nameCase: 'upper', spacedName: true, sectionTitle: 'centered', density: 'airy', photo: false, defaultPalette: 'charcoal', usesPalette: true },
  { id: 'modern_sidebar', layout: 'sidebar-left', body: 'sans', heading: 'sans', header: 'sidebar', nameAlign: 'left', sectionTitle: 'caps', density: 'normal', sidebarTone: 'dark', sidebarSections: ['skills', 'education', 'languages', 'certifications', 'interests'], photo: true, defaultPalette: 'charcoal', usesPalette: true },
  { id: 'bold_header', layout: 'single', body: 'sans', heading: 'sans', header: 'band', nameAlign: 'left', sectionTitle: 'bar', density: 'normal', photo: true, defaultPalette: 'blue', usesPalette: true },
  { id: 'creative_portfolio', layout: 'single', body: 'sans', heading: 'serif', header: 'plain', nameAlign: 'left', twoLineName: true, sectionTitle: 'numbered', density: 'normal', photo: false, defaultPalette: 'terracotta', usesPalette: true },
  { id: 'minimal_grid', layout: 'gutter', body: 'sans', heading: 'sans', header: 'plain', nameAlign: 'left', sectionTitle: 'plain', density: 'compact', photo: false, defaultPalette: 'charcoal', usesPalette: true },
  { id: 'contemporary', layout: 'single', body: 'sans', heading: 'sans', header: 'plain', nameAlign: 'left', sectionTitle: 'rule', timeline: true, density: 'normal', photo: false, defaultPalette: 'indigo', usesPalette: true },
  { id: 'navy_executive', layout: 'single', body: 'sans', heading: 'serif', header: 'centered-band', nameAlign: 'center', goldRule: true, sectionTitle: 'bar', density: 'normal', photo: false, defaultPalette: 'navy', usesPalette: true },
  { id: 'emerald_professional', layout: 'sidebar-right', body: 'sans', heading: 'sans', header: 'plain', nameAlign: 'left', sectionTitle: 'underline', density: 'normal', sidebarTone: 'tint', sidebarSections: SIDEBAR_DEFAULT, photo: true, defaultPalette: 'emerald', usesPalette: true },
  { id: 'burgundy_elegant', layout: 'single', body: 'sans', heading: 'serif', header: 'plain', nameAlign: 'left', sectionTitle: 'underline', density: 'normal', photo: false, defaultPalette: 'burgundy', usesPalette: true },
  { id: 'teal_modern', layout: 'single', body: 'sans', heading: 'sans', header: 'plain', nameAlign: 'left', topEdge: true, sectionTitle: 'label', dateColumn: true, density: 'normal', photo: false, defaultPalette: 'teal', usesPalette: true },
  { id: 'soft_blue', layout: 'sidebar-left', body: 'sans', heading: 'sans', header: 'sidebar', nameAlign: 'left', sectionTitle: 'caps', density: 'airy', sidebarTone: 'tint', sidebarSections: SIDEBAR_DEFAULT, photo: true, defaultPalette: 'blue', usesPalette: true },
  { id: 'compact_one_page', layout: 'single', body: 'sans', heading: 'sans', header: 'plain', nameAlign: 'left', sectionTitle: 'rule', density: 'compact', photo: false, defaultPalette: 'charcoal', usesPalette: true },
  { id: 'academic_cv', layout: 'single', body: 'serif', heading: 'serif', header: 'plain', nameAlign: 'center', sectionTitle: 'rule', dateColumn: true, density: 'normal', priority: ['education', 'publications'], photo: false, defaultPalette: 'navy', usesPalette: true },
  { id: 'technical_resume', layout: 'single', body: 'sans', heading: 'sans', header: 'plain', nameAlign: 'left', sectionTitle: 'caps', monoDetails: true, density: 'normal', priority: ['skills', 'projects'], photo: false, defaultPalette: 'teal', usesPalette: true },
  { id: 'experienced_professional', layout: 'single', body: 'sans', heading: 'sans', header: 'plain', nameAlign: 'left', sectionTitle: 'rule', competencies: true, density: 'normal', priority: ['skills', 'experience'], photo: false, defaultPalette: 'navy', usesPalette: true },
  { id: 'photo_profile', layout: 'sidebar-right', body: 'sans', heading: 'sans', header: 'photo-hero', nameAlign: 'left', sectionTitle: 'underline', density: 'normal', sidebarTone: 'tint', sidebarSections: SIDEBAR_DEFAULT, photo: true, defaultPalette: 'plum', usesPalette: true },
]

export function templateStyle(id: string): TemplateStyle {
  return TEMPLATE_STYLES.find((t) => t.id === id) ?? TEMPLATE_STYLES[0]
}

export const FONT_STACKS: Record<FontKind | 'mono', string> = {
  sans: 'Arial, Helvetica, "Liberation Sans", Arimo, sans-serif',
  serif: '"Times New Roman", Times, "Liberation Serif", Tinos, serif',
  mono: '"Courier New", Courier, "Liberation Mono", Cousine, monospace',
}
