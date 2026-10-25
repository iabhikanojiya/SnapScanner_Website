import { FileDown, LayoutTemplate, ListChecks, Palette, Save, ShieldCheck } from 'lucide-react'
import DownloadCta from '@/components/DownloadCta'
import FaqList from '@/components/FaqList'
import JsonLd from '@/components/JsonLd'
import SectionHeading from '@/components/SectionHeading'
import { DraftList, TemplateGallery } from '@/components/resume/ResumeDashboard'
import type { FaqItem } from '@/lib/content'
import { faqJsonLd, pageMetadata } from '@/lib/metadata'
import { RESUME_PALETTES } from '@/lib/resume'
import { SITE_URL } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Free Resume Builder – 20 Templates, PDF Export',
  description:
    'Build a resume in your browser with 20 templates and 9 colour palettes, a live preview and text-based PDF export. No sign-up; drafts are saved on your device.',
  path: '/resume-builder',
})

const HIGHLIGHTS = [
  { icon: LayoutTemplate, title: '20 templates', text: 'Professional, modern, creative and academic layouts, adapted from the Snap Scanner app.' },
  { icon: Palette, title: '9 colour palettes', text: 'Recolour templates, or keep their original colours.' },
  { icon: ListChecks, title: 'Every section you need', text: 'Experience, education, skills, projects, publications, references and custom sections.' },
  { icon: Save, title: 'Autosaved drafts', text: 'Drafts save in this browser as you type. Rename, duplicate, export or delete them.' },
  { icon: FileDown, title: 'Real PDF export', text: 'Download a text-based PDF, print it, or share it from your device.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Your resume is never uploaded or put in a link. It stays in this browser.' },
]

const FAQ: FaqItem[] = [
  {
    question: 'Do I need an account?',
    answer: 'No. Open the builder and start writing. Drafts are saved in your browser’s storage on this device.',
  },
  {
    question: 'Will my resume pass an applicant tracking system (ATS)?',
    answer:
      'Templates marked ATS-friendly use a single column and simple structure, and every exported PDF contains real text rather than an image. Each ATS works differently, so no template can guarantee how a particular system reads your resume.',
  },
  {
    question: 'Can I switch templates after writing my resume?',
    answer: 'Yes. Your content is stored separately from the design, so switching templates or colours never loses anything you’ve typed.',
  },
  {
    question: 'Where are my drafts stored?',
    answer:
      'In this browser on this device (IndexedDB). They aren’t synced to other devices or to the Android app, and clearing your browser’s site data deletes them. Use Export data (JSON) to keep a backup you can import later.',
  },
  {
    question: 'Why do some characters look different in the PDF?',
    answer:
      'Download PDF uses standard PDF fonts, which cover Latin alphabets. If your resume uses other scripts, the builder tells you, and Print → Save as PDF keeps every character.',
  },
]

export default function ResumeBuilderPage() {
  return (
    <>
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="page-container py-10 sm:py-14">
          <p className="eyebrow">Resume Builder</p>
          <h1 className="heading-display mt-3 max-w-3xl">Build a resume that’s ready to send</h1>
          <p className="lead mt-4 max-w-2xl">
            Choose a template, fill in your details with a live preview, and download a PDF. Free, with no sign-up, and your
            resume stays in your browser.
          </p>
        </div>
      </section>

      <div className="page-container space-y-14 py-10">
        <DraftList />

        <section aria-labelledby="templates">
          <SectionHeading id="templates" eyebrow="Templates" title="Pick a template to start" description="Each template starts with example content you can replace. Previews show the app’s versions of each design." />
          <div className="mt-8">
            <TemplateGallery />
          </div>
        </section>

        <section aria-labelledby="palettes" className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <SectionHeading id="palettes" eyebrow="Colours" title="Nine palettes" description="Change colours from the editor at any time. Black-and-white ATS templates keep their simple styling." />
          <ul className="grid grid-cols-3 gap-3">
            {RESUME_PALETTES.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
                <span aria-hidden className="flex">
                  <span className="h-8 w-4 rounded-l-md" style={{ background: p.primary }} />
                  <span className="h-8 w-4 rounded-r-md" style={{ background: p.accent }} />
                </span>
                <span className="text-sm font-semibold text-ink">{p.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="highlights">
          <h2 id="highlights" className="sr-only">
            Features
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="card p-5">
                <span className="icon-tile">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-bold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="resume-faq" className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading id="resume-faq" eyebrow="FAQ" title="Resume questions" />
          <FaqList items={FAQ} />
        </section>
      </div>

      <DownloadCta small />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Snap Scanner Resume Builder',
          url: `${SITE_URL}/resume-builder`,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Any (web browser)',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />
      <JsonLd data={faqJsonLd(FAQ)} />
    </>
  )
}
