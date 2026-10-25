// Resume data model. One shape serves every template, so switching templates
// never loses anything the user typed.

export type SectionType =
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'publications'
  | 'certifications'
  | 'languages'
  | 'interests'
  | 'references'
  | 'custom'

export interface ResumeEntry {
  id: string
  /** Role, degree, skill, project, publication, referee… depending on the section. */
  title: string
  /** Company, school, level, publisher, referee's role… */
  subtitle: string
  location: string
  start: string
  end: string
  link: string
  /** Free text. Lines starting with "-" or "•" render as bullet points. */
  description: string
}

export interface ResumeSection {
  id: string
  type: SectionType
  title: string
  hidden?: boolean
  entries: ResumeEntry[]
}

export interface PersonalDetails {
  fullName: string
  jobTitle: string
  email: string
  phone: string
  location: string
  website: string
  linkedin: string
  /** JPEG data URL, resized to at most 480 px. Shown only by templates with a photo slot. */
  photo?: string
}

export interface ResumeData {
  personal: PersonalDetails
  summary: string
  sections: ResumeSection[]
}

export interface ResumeDraft {
  id: string
  /** Name of the draft in the drafts list (not shown on the resume). */
  name: string
  templateId: string
  /** A palette id, or "template" to keep the template's own colours. */
  paletteId: string
  data: ResumeData
  createdAt: number
  updatedAt: number
}
