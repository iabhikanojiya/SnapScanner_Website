// Creating, editing and validating resume data. Pure functions, unit-tested.
import { RESUME_TEMPLATES } from '@/lib/resume'
import { templateStyle } from './templates'
import type { ResumeData, ResumeDraft, ResumeEntry, ResumeSection, SectionType } from './types'

let counter = 0
export function uid(prefix = 'id') {
  counter = (counter + 1) % 1e6
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  return `${prefix}-${Date.now().toString(36)}${counter}`
}

export interface FieldSpec {
  key: keyof Omit<ResumeEntry, 'id'>
  label: string
  placeholder?: string
  multiline?: boolean
}

export interface SectionSpec {
  type: SectionType
  label: string
  /** Shows a list of short items (skills, languages) instead of full entries. */
  compact?: boolean
  fields: FieldSpec[]
  itemLabel: string
}

const dates: FieldSpec[] = [
  { key: 'start', label: 'Start', placeholder: 'Jan 2022' },
  { key: 'end', label: 'End', placeholder: 'Present' },
]

export const SECTION_SPECS: Record<SectionType, SectionSpec> = {
  experience: {
    type: 'experience',
    label: 'Work experience',
    itemLabel: 'position',
    fields: [
      { key: 'title', label: 'Job title', placeholder: 'Product Designer' },
      { key: 'subtitle', label: 'Employer', placeholder: 'Company name' },
      { key: 'location', label: 'Location', placeholder: 'City' },
      ...dates,
      { key: 'description', label: 'Description', placeholder: '- Start lines with a dash for bullet points', multiline: true },
    ],
  },
  education: {
    type: 'education',
    label: 'Education',
    itemLabel: 'school',
    fields: [
      { key: 'title', label: 'Degree', placeholder: 'B.Sc. Computer Science' },
      { key: 'subtitle', label: 'School', placeholder: 'University name' },
      { key: 'location', label: 'Location', placeholder: 'City' },
      ...dates,
      { key: 'description', label: 'Description', placeholder: 'Grades, honours, thesis', multiline: true },
    ],
  },
  skills: {
    type: 'skills',
    label: 'Skills',
    compact: true,
    itemLabel: 'skill',
    fields: [
      { key: 'title', label: 'Skill', placeholder: 'Figma' },
      { key: 'subtitle', label: 'Level (optional)', placeholder: 'Expert' },
    ],
  },
  projects: {
    type: 'projects',
    label: 'Projects',
    itemLabel: 'project',
    fields: [
      { key: 'title', label: 'Project name' },
      { key: 'subtitle', label: 'Role or technologies' },
      { key: 'link', label: 'Link', placeholder: 'github.com/you/project' },
      ...dates,
      { key: 'description', label: 'Description', multiline: true },
    ],
  },
  publications: {
    type: 'publications',
    label: 'Publications',
    itemLabel: 'publication',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'subtitle', label: 'Publisher or journal' },
      { key: 'end', label: 'Date', placeholder: '2025' },
      { key: 'link', label: 'Link or DOI' },
      { key: 'description', label: 'Notes', multiline: true },
    ],
  },
  certifications: {
    type: 'certifications',
    label: 'Certifications',
    itemLabel: 'certification',
    fields: [
      { key: 'title', label: 'Certification' },
      { key: 'subtitle', label: 'Issuer' },
      { key: 'end', label: 'Date', placeholder: '2024' },
    ],
  },
  languages: {
    type: 'languages',
    label: 'Languages',
    compact: true,
    itemLabel: 'language',
    fields: [
      { key: 'title', label: 'Language', placeholder: 'Spanish' },
      { key: 'subtitle', label: 'Level', placeholder: 'Fluent' },
    ],
  },
  interests: {
    type: 'interests',
    label: 'Interests',
    compact: true,
    itemLabel: 'interest',
    fields: [{ key: 'title', label: 'Interest', placeholder: 'Photography' }],
  },
  references: {
    type: 'references',
    label: 'References',
    itemLabel: 'reference',
    fields: [
      { key: 'title', label: 'Name' },
      { key: 'subtitle', label: 'Role and company' },
      { key: 'location', label: 'Contact', placeholder: 'Email or phone' },
      { key: 'description', label: 'Relationship', multiline: true },
    ],
  },
  custom: {
    type: 'custom',
    label: 'Custom section',
    itemLabel: 'item',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'subtitle', label: 'Subtitle' },
      { key: 'location', label: 'Location' },
      ...dates,
      { key: 'description', label: 'Description', multiline: true },
    ],
  },
}

export const ADDABLE_SECTIONS: SectionType[] = [
  'experience',
  'education',
  'skills',
  'projects',
  'publications',
  'certifications',
  'languages',
  'interests',
  'references',
  'custom',
]

export function emptyEntry(): ResumeEntry {
  return { id: uid('e'), title: '', subtitle: '', location: '', start: '', end: '', link: '', description: '' }
}

export function newSection(type: SectionType, title?: string): ResumeSection {
  return { id: uid('s'), type, title: title ?? SECTION_SPECS[type].label, entries: [emptyEntry()] }
}

export function emptyResume(): ResumeData {
  return {
    personal: { fullName: '', jobTitle: '', email: '', phone: '', location: '', website: '', linkedin: '' },
    summary: '',
    sections: [newSection('experience'), newSection('education'), newSection('skills')],
  }
}

/** Fictional example content, so a new resume isn't a blank page. */
export function sampleResume(): ResumeData {
  const e = (p: Partial<ResumeEntry>): ResumeEntry => ({ ...emptyEntry(), ...p })
  return {
    personal: {
      fullName: 'Jordan Patel',
      jobTitle: 'Product Designer',
      email: 'jordan.patel@example.com',
      phone: '+1 555 0100',
      location: 'Austin, TX',
      website: 'jordanpatel.example',
      linkedin: 'linkedin.com/in/jordan-example',
    },
    summary:
      'Product designer with six years of experience turning research into clear, accessible interfaces for web and mobile. Comfortable leading projects from discovery to launch and working closely with engineering.',
    sections: [
      {
        id: uid('s'),
        type: 'experience',
        title: 'Work experience',
        entries: [
          e({
            title: 'Senior Product Designer',
            subtitle: 'Northwind Health',
            location: 'Austin, TX',
            start: 'Mar 2022',
            end: 'Present',
            description:
              '- Led the redesign of the patient app, raising task completion from 71% to 89%\n- Built a shared component library used by four product teams\n- Ran weekly usability sessions and shared findings with leadership',
          }),
          e({
            title: 'Product Designer',
            subtitle: 'Brightline Studio',
            location: 'Remote',
            start: 'Jun 2019',
            end: 'Feb 2022',
            description: '- Designed onboarding flows for fintech and education clients\n- Introduced accessibility reviews into every release',
          }),
        ],
      },
      {
        id: uid('s'),
        type: 'education',
        title: 'Education',
        entries: [e({ title: 'B.A. Interaction Design', subtitle: 'State University', location: 'Austin, TX', start: '2015', end: '2019' })],
      },
      {
        id: uid('s'),
        type: 'skills',
        title: 'Skills',
        entries: ['User research', 'Prototyping', 'Design systems', 'Accessibility (WCAG)', 'Figma', 'HTML & CSS'].map((title) => e({ title })),
      },
      {
        id: uid('s'),
        type: 'languages',
        title: 'Languages',
        entries: [e({ title: 'English', subtitle: 'Native' }), e({ title: 'Hindi', subtitle: 'Professional' })],
      },
    ],
  }
}

export function newDraft(templateId: string, opts: { sample?: boolean; name?: string } = {}): ResumeDraft {
  const template = RESUME_TEMPLATES.find((t) => t.id === templateId) ?? RESUME_TEMPLATES[0]
  const now = Date.now()
  return {
    id: uid('r'),
    name: opts.name ?? `${template.name} resume`,
    templateId: template.id,
    paletteId: 'template',
    data: opts.sample === false ? emptyResume() : sampleResume(),
    createdAt: now,
    updatedAt: now,
  }
}

export function duplicateDraft(d: ResumeDraft): ResumeDraft {
  const now = Date.now()
  return { ...structuredClone(d), id: uid('r'), name: `${d.name} (copy)`, createdAt: now, updatedAt: now }
}

/** Sections in display order for a template: its priority types first, the rest as the user ordered them. */
export function orderedSections(data: ResumeData, templateId: string): ResumeSection[] {
  const visible = data.sections.filter((s) => !s.hidden && s.entries.some((e) => entryHasContent(e)))
  const priority = templateStyle(templateId).priority ?? []
  const first = priority.flatMap((type) => visible.filter((s) => s.type === type))
  return [...first, ...visible.filter((s) => !first.includes(s))]
}

export function entryHasContent(e: ResumeEntry) {
  return [e.title, e.subtitle, e.location, e.start, e.end, e.link, e.description].some((v) => v.trim())
}

/** Splits a description into paragraphs and bullet points. */
export function parseDescription(text: string): { kind: 'p' | 'li'; text: string }[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/^[-•*]\s*/.test(l) ? { kind: 'li' as const, text: l.replace(/^[-•*]\s*/, '') } : { kind: 'p' as const, text: l }))
}

export function dateRange(e: ResumeEntry) {
  if (e.start && e.end) return `${e.start} – ${e.end}`
  return e.start || e.end
}

/** Validates an imported JSON draft. Returns the draft or throws a readable error. */
export function parseImportedDraft(json: string): ResumeDraft {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('That file isn’t valid JSON.')
  }
  const d = raw as Partial<ResumeDraft>
  const data = d?.data as Partial<ResumeData> | undefined
  if (!d || typeof d !== 'object' || !data || typeof data !== 'object' || !data.personal || !Array.isArray(data.sections))
    throw new Error('That file isn’t a Snap Scanner resume export.')
  const str = (v: unknown, max = 5000) => (typeof v === 'string' ? v.slice(0, max) : '')
  const types = Object.keys(SECTION_SPECS) as SectionType[]
  const now = Date.now()
  const photo = str(data.personal.photo, 3_000_000)
  return {
    id: uid('r'),
    name: str(d.name, 120) || 'Imported resume',
    templateId: RESUME_TEMPLATES.some((t) => t.id === d.templateId) ? d.templateId! : RESUME_TEMPLATES[0].id,
    paletteId: str(d.paletteId, 40) || 'template',
    createdAt: now,
    updatedAt: now,
    data: {
      personal: {
        fullName: str(data.personal.fullName, 200),
        jobTitle: str(data.personal.jobTitle, 200),
        email: str(data.personal.email, 200),
        phone: str(data.personal.phone, 100),
        location: str(data.personal.location, 200),
        website: str(data.personal.website, 300),
        linkedin: str(data.personal.linkedin, 300),
        // Only accept embedded JPEG/PNG images, never remote URLs.
        photo: /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(photo) ? photo : undefined,
      },
      summary: str(data.summary),
      sections: data.sections.slice(0, 40).map((s) => ({
        id: uid('s'),
        type: types.includes(s?.type) ? s.type : 'custom',
        title: str(s?.title, 120) || 'Section',
        hidden: !!s?.hidden,
        entries: (Array.isArray(s?.entries) ? s.entries : []).slice(0, 100).map((e) => ({
          id: uid('e'),
          title: str(e?.title, 300),
          subtitle: str(e?.subtitle, 300),
          location: str(e?.location, 200),
          start: str(e?.start, 60),
          end: str(e?.end, 60),
          link: str(e?.link, 300),
          description: str(e?.description),
        })),
      })),
    },
  }
}
