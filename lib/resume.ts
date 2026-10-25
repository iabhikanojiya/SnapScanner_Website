// Mirrors the Resume Builder in the Snap Scanner app
// (lib/features/resume/templates/*). Preview images are the first page of
// each template's real PDF output, rendered from the app's own sample resume.

export type ResumeCategory = 'Professional' | 'Modern' | 'Creative' | 'Academic'

export interface ResumeTemplate {
  id: string
  name: string
  description: string
  categories: ResumeCategory[]
  /** Flagged ATS-friendly in the app. Not a guarantee of how any ATS parses it. */
  atsFriendly: boolean
  photo: boolean
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  { id: 'classic_professional', name: 'Classic Professional', description: 'Traditional single column with serif type and a centred header.', categories: ['Professional', 'Academic'], atsFriendly: true, photo: false },
  { id: 'modern_executive', name: 'Modern Executive', description: 'Commanding name header with a gold rule and refined spacing.', categories: ['Professional'], atsFriendly: false, photo: false },
  { id: 'minimal_ats', name: 'Minimal ATS', description: 'Black-and-white, single column. Easy for screening software to read.', categories: ['Professional'], atsFriendly: true, photo: false },
  { id: 'corporate_split', name: 'Corporate Split', description: 'Dark header over a structured two-column page with a contact sidebar.', categories: ['Professional'], atsFriendly: false, photo: false },
  { id: 'elegant_serif', name: 'Elegant Serif', description: 'Letter-spaced serif name, centred section titles and generous whitespace.', categories: ['Professional', 'Creative', 'Academic'], atsFriendly: false, photo: false },
  { id: 'modern_sidebar', name: 'Modern Sidebar', description: 'Dark left sidebar for contact, skills and education; work history on the right.', categories: ['Modern'], atsFriendly: false, photo: true },
  { id: 'bold_header', name: 'Bold Header', description: 'Vivid full-width header band with a clear, confident hierarchy.', categories: ['Modern', 'Creative'], atsFriendly: false, photo: true },
  { id: 'creative_portfolio', name: 'Creative Portfolio', description: 'Editorial two-line name, numbered sections and a terracotta accent.', categories: ['Creative'], atsFriendly: false, photo: false },
  { id: 'minimal_grid', name: 'Minimal Grid', description: 'Section labels in a left gutter on a precise, compact grid.', categories: ['Modern', 'Creative'], atsFriendly: false, photo: false },
  { id: 'contemporary', name: 'Contemporary', description: 'Balanced type, a timeline for experience and restrained indigo accents.', categories: ['Modern'], atsFriendly: false, photo: false },
  { id: 'navy_executive', name: 'Navy Executive', description: 'Centred navy header with gold detail and tinted section bars.', categories: ['Professional'], atsFriendly: false, photo: false },
  { id: 'emerald_professional', name: 'Emerald Professional', description: 'Clean layout with a soft green sidebar on the right and emerald accents.', categories: ['Professional', 'Modern'], atsFriendly: false, photo: true },
  { id: 'burgundy_elegant', name: 'Burgundy Elegant', description: 'Serif headings in burgundy over crisp sans-serif body text.', categories: ['Professional', 'Creative'], atsFriendly: false, photo: false },
  { id: 'teal_modern', name: 'Teal Modern', description: 'Teal top edge, label-style section titles and a dated left column.', categories: ['Modern'], atsFriendly: false, photo: false },
  { id: 'soft_blue', name: 'Soft Blue', description: 'Pale blue sidebar with your photo and name; airy white content area.', categories: ['Modern', 'Creative'], atsFriendly: false, photo: true },
  { id: 'compact_one_page', name: 'Compact One-Page', description: 'Tight spacing and one-line entries to fit more on a single page.', categories: ['Professional'], atsFriendly: true, photo: false },
  { id: 'academic_cv', name: 'Academic CV', description: 'Education and publications first, with years in a left column.', categories: ['Academic'], atsFriendly: true, photo: false },
  { id: 'technical_resume', name: 'Technical Resume', description: 'Skills up front, project-focused, with monospace technical details.', categories: ['Modern'], atsFriendly: false, photo: false },
  { id: 'experienced_professional', name: 'Experienced Professional', description: 'Built for long careers: core competencies, then detailed achievements.', categories: ['Professional'], atsFriendly: true, photo: false },
  { id: 'photo_profile', name: 'Photo Profile', description: 'Large profile photo beside your name, with a light right-hand column.', categories: ['Modern', 'Creative'], atsFriendly: false, photo: true },
]

export function templateImage(id: string) {
  return `/resume-templates/${id}.webp`
}

/** Preview images are 639 × 905 (A4). */
export const TEMPLATE_IMAGE_SIZE = { width: 639, height: 905 }

export interface ResumePalette {
  id: string
  name: string
  primary: string
  accent: string
}

export const RESUME_PALETTES: ResumePalette[] = [
  { id: 'navy', name: 'Navy', primary: '#1F3A5F', accent: '#2F5D8C' },
  { id: 'emerald', name: 'Emerald', primary: '#1D5C4A', accent: '#23775E' },
  { id: 'burgundy', name: 'Burgundy', primary: '#6E2236', accent: '#8E3049' },
  { id: 'teal', name: 'Teal', primary: '#0D5560', accent: '#0F6F7A' },
  { id: 'charcoal', name: 'Charcoal', primary: '#2F3437', accent: '#4F5860' },
  { id: 'indigo', name: 'Indigo', primary: '#33307A', accent: '#4A45A8' },
  { id: 'terracotta', name: 'Terracotta', primary: '#83391F', accent: '#A9492C' },
  { id: 'blue', name: 'Blue', primary: '#1E4E8C', accent: '#2560A8' },
  { id: 'plum', name: 'Plum', primary: '#4F2350', accent: '#74387A' },
]

export function palette(id: string): ResumePalette | undefined {
  return RESUME_PALETTES.find((p) => p.id === id)
}
