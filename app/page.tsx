import Link from 'next/link'
import {
  ArrowRight,
  Camera,
  Crop,
  FolderOpen,
  HardDrive,
  Layers,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react'
import DownloadCta from '@/components/DownloadCta'
import FaqList from '@/components/FaqList'
import JsonLd from '@/components/JsonLd'
import PlayReviews from '@/components/PlayReviews'
import SectionHeading from '@/components/SectionHeading'
import ToolDirectory from '@/components/ToolDirectory'
import ToolsDirectory from '@/components/ToolsDirectory'
import ToolIcon from '@/components/ToolIcon'
import AssistantChat from '@/components/assistant/AssistantChat'
import ResumeShowcase from '@/components/resume/ResumeShowcase'
import CreateCards from '@/components/create/CreateCards'
import { Button } from '@/components/ui/button'
import { HOME_FAQ } from '@/lib/content'
import { FILTER_LABELS, SCAN_FILTERS } from '@/lib/image/filters'
import { faqJsonLd, pageMetadata } from '@/lib/metadata'
import { APP_NAME, DEVELOPER_NAME, PLAY_STORE_URL, SITE_URL } from '@/lib/site'
import { TOOLS, type ToolCategoryId } from '@/lib/tools'

export const metadata = pageMetadata({
  title: 'Snap Scanner – Free PDF Tools & Resume Builder in Your Browser',
  description:
    'Scan to PDF, convert images, merge, split, compress, sign, lock and annotate PDFs, and build a resume. Free, no sign-up, and your files are processed in your browser.',
  path: '/',
  absoluteTitle: true,
})

function CategorySection({
  id,
  eyebrow,
  title,
  description,
  categories,
  tinted,
}: {
  id: string
  eyebrow: string
  title: string
  description: string
  categories: ToolCategoryId[]
  tinted?: boolean
}) {
  const tools = TOOLS.filter((t) => categories.includes(t.category))
  return (
    <section aria-labelledby={id} className={tinted ? 'section border-y border-gray-200 bg-gray-50' : 'section'}>
      <div className="page-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading id={id} eyebrow={eyebrow} title={title} description={description} />
          <Link href="/tools" className="text-link text-sm">
            All tools
          </Link>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((t) => (
            <li key={t.id}>
              <Link href={t.href} className="card-link group flex h-full items-start gap-3 p-4">
                <ToolIcon id={t.id} size="sm" />
                <span className="min-w-0">
                  <h3 className="font-bold text-ink group-hover:text-brand-700">{t.name}</h3>
                  <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{t.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}


const STEPS = [
  { icon: Upload, title: 'Choose your files', text: 'Drop PDFs or images on a tool, select them from your device or pick them from My files.' },
  { icon: SlidersHorizontal, title: 'Set it up', text: 'Reorder pages, pick ranges, choose compression, place a signature: every tool previews the real document.' },
  { icon: MousePointerClick, title: 'Download the result', text: 'Processing happens in your browser. Download the file, share it, or save it to My files.' },
]

export default function HomePage() {
  return (
    <>
      {/* Hero with the tool launcher, so a tool is one click away. */}
      <section className="border-b border-gray-200 bg-gradient-to-b from-brand-50/60 to-white">
        <div className="page-container py-12 sm:py-16">
          <div className="max-w-3xl">
            <p className="eyebrow">Free online PDF tools</p>
            <h1 className="heading-display enter mt-3">Your documents. Every tool you need.</h1>
            <p className="lead mt-4">
              Scan, convert, merge, split, compress, sign and protect PDFs, and build your resume, right in your browser.
              No sign-up, and your files aren’t uploaded.
            </p>
          </div>
          <div className="mt-8">
            <ToolDirectory id="home-search" popularFirst headingLevel="h2" />
          </div>
        </div>
      </section>

      <CategorySection
        id="organize"
        eyebrow="Organize PDF"
        title="Put pages exactly where you want them"
        description="Merge, split, reorder, rotate, remove or extract pages with real page previews."
        categories={['organize']}
      />
      <CategorySection
        id="optimize"
        eyebrow="Compress & optimize"
        title="Smaller, searchable, repaired"
        description="Shrink images inside PDFs, make scans searchable with on-device OCR, or rebuild a damaged file."
        categories={['optimize']}
        tinted
      />
      <CategorySection
        id="convert"
        eyebrow="Convert PDF"
        title="Into PDF and back out again"
        description="Turn images and HTML into PDFs, or save PDF pages as JPG, PNG, text or Markdown."
        categories={['convert-to', 'convert-from']}
      />
      <CategorySection
        id="edit"
        eyebrow="Sign & edit PDF"
        title="Sign, annotate, number and protect"
        description="Add signatures, highlights, text, page numbers and watermarks, fill forms, compare versions, and lock or redact sensitive documents."
        categories={['edit', 'security']}
        tinted
      />

      {/* Scanning and images (dark band) */}
      <section aria-labelledby="scan" className="band-ember section relative isolate overflow-hidden text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <span className="assistant-glow left-[-6%] top-[20%] h-72 w-72 bg-rose-500/25" />
          <span className="assistant-glow bottom-[-10%] right-[10%] h-64 w-64 bg-amber-400/15" style={{ animationDelay: '-7s' }} />
        </div>
        <div className="page-container grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading id="scan" eyebrow="Scan & convert" title="From paper and photos to a clean PDF" tone="dark" />
            <ul className="mt-6 space-y-4">
              {[
                { icon: Camera, text: 'Capture pages with your camera, or upload photos you already have.' },
                { icon: Crop, text: 'Page edges are detected where possible; adjust the four corners by hand and tilted pages are straightened.' },
                { icon: Layers, text: 'Add as many pages as you need, reorder and rotate them, then choose page size and margins.' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-3 text-white/80">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-rose-200">
                    <Icon aria-hidden className="h-4 w-4" />
                  </span>
                  <span className="pt-1.5">{text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/tools/scan-pdf">Scan to PDF</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/tools/image-to-pdf">Image to PDF</Link>
              </Button>
              <Button asChild variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white">
                <Link href="/tools/resize-image">Resize an image</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_70px_-35px_rgba(0,0,0,0.8)]">
            <h3 className="font-bold text-white">Eight scan filters</h3>
            <p className="mt-1 text-sm text-white/60">The same filters as the Android app, applied to one page or all of them.</p>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SCAN_FILTERS.map((f, i) => (
                <li key={f} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div aria-hidden className="aspect-[3/4] p-3" style={{ filter: ['contrast(1.15) brightness(1.05)', 'none', 'saturate(1.6) contrast(1.2)', 'contrast(1.3)', 'brightness(1.25)', 'grayscale(1)', 'grayscale(1) contrast(4)', 'sepia(0.9)'][i] }}>
                    <div className="h-full rounded bg-gradient-to-br from-amber-50 via-white to-sky-50 p-2">
                      <div className="h-1.5 w-3/4 rounded bg-gray-700" />
                      <div className="mt-2 space-y-1">
                        {[90, 80, 85, 60].map((w) => (
                          <div key={w} className="h-1 rounded bg-gray-400" style={{ width: `${w}%` }} />
                        ))}
                      </div>
                      <div className="mt-2 h-6 rounded bg-rose-300/70" />
                    </div>
                  </div>
                  <p className="border-t border-gray-100 py-1.5 text-center text-xs font-semibold text-ink-soft">{FILTER_LABELS[f]}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Resume Builder */}
      <section aria-labelledby="resume" className="section border-y border-gray-200 bg-white">
        <div className="page-container">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading id="resume" eyebrow="Resume Builder" title="A resume editor with a live preview" description="20 templates from the Snap Scanner app, 9 colour palettes and text-based PDF export. Try it: type your name below." />
            <Button asChild variant="secondary">
              <Link href="/resume-builder#templates">Browse all 20 templates</Link>
            </Button>
          </div>
          <div className="mt-10">
            <ResumeShowcase />
          </div>
        </div>
      </section>

      {/* Create tools (dark band) */}
      <section aria-labelledby="create" className="band-midnight section relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <span className="assistant-glow right-[-4%] top-[-10%] h-80 w-80 bg-violet-500/25" />
          <span className="assistant-glow bottom-[0%] left-[20%] h-64 w-64 bg-cyan-400/15" style={{ animationDelay: '-6s' }} />
        </div>
        <div className="page-container">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              tone="dark"
              id="create"
              eyebrow="Create"
              title="Create anything, beautifully"
              description="Resumes, ID cards, invoices, business cards, certificates, photo collages and festival greetings from editable templates, with PDF and image downloads."
            />
            <Button asChild variant="secondary">
              <Link href="/create">Explore Create Studio</Link>
            </Button>
          </div>
          <CreateCards compact className="mt-8" />
        </div>
      </section>

      {/* Local library and privacy */}
      <section aria-labelledby="privacy" className="section border-y border-gray-200 bg-gray-50">
        <div className="page-container">
          <SectionHeading id="privacy" eyebrow="My files & privacy" title="Your files stay on your device" description="The tools read and process files inside your browser tab. There’s no upload server and no account." />
          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: 'Processed in your browser', text: 'PDFs, images and passwords are handled by code running on your device. The site doesn’t send file contents anywhere.' },
              { icon: FolderOpen, title: 'A library in your browser', text: 'Save results to My files: search, sort, rename, organise in folders and open them in any tool.' },
              { icon: HardDrive, title: 'Stored locally, not synced', text: 'Saved files live in this browser on this device. They don’t sync with other devices or the Android app.' },
              { icon: Trash2, title: 'You’re in control', text: 'Delete files one by one, or clear all local data in My files. Clearing site data in your browser removes them too.' },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="card p-6">
                <span className="icon-tile">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="dark">
              <Link href="/files">Open My files</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/privacy-policy">Read the privacy policy</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Snap Assistant */}
      <section aria-labelledby="assistant" className="assistant-hero relative isolate overflow-hidden py-16 text-white sm:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <span className="assistant-glow left-[4%] top-[10%] h-64 w-64 bg-fuchsia-500/25" />
          <span className="assistant-glow right-[8%] bottom-[5%] h-72 w-72 bg-indigo-400/25" style={{ animationDelay: '-5s' }} />
          <span className="assistant-glow left-[45%] top-[-20%] h-64 w-64 bg-cyan-400/15" style={{ animationDelay: '-9s' }} />
        </div>
        <div className="page-container grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionHeading
              id="assistant"
              eyebrow="Snap Assistant"
              title="Just say what you need"
              description="Ask for “my bills from September” or “merge these two documents”. Snap Assistant searches My files and opens the right tool with your files."
              tone="dark"
            />
            <ul className="mt-7 space-y-4">
              {[
                { icon: Wand2, text: 'Understands file names, types, dates and sizes, and asks a follow-up question when something is missing.' },
                { icon: RefreshCw, text: 'Rule-based and private: it isn’t an AI chatbot and never reads what’s inside your documents.' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-3 text-sm text-white/85">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                    <Icon aria-hidden className="h-4 w-4" />
                  </span>
                  <span className="pt-1.5">{text}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="light" className="mt-8">
              <Link href="/assistant">
                Open Snap Assistant
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <AssistantChat compact />
        </div>
      </section>

      <PlayReviews />

      {/* How it works */}
      <section aria-labelledby="how" className="section border-t border-gray-200 bg-white">
        <div className="page-container">
          <SectionHeading id="how" eyebrow="How it works" title="Three steps, no sign-up" align="center" />
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
                  <Icon aria-hidden className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="section border-t border-gray-200 bg-gray-50">
        <div className="page-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeading id="faq" eyebrow="FAQ" title="Questions, answered" />
            <p className="mt-4 text-ink-soft">
              Something else?{' '}
              <Link href="/support" className="text-link">
                Visit support
              </Link>
            </p>
          </div>
          <FaqList items={HOME_FAQ} />
        </div>
      </section>

      <DownloadCta />

      {/* Complete tools directory, directly above the footer. */}
      <ToolsDirectory />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'MobileApplication',
          name: APP_NAME,
          operatingSystem: 'Android',
          applicationCategory: 'BusinessApplication',
          installUrl: PLAY_STORE_URL,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          publisher: { '@type': 'Organization', name: DEVELOPER_NAME },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: `${APP_NAME} online tools`,
          url: SITE_URL,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any (web browser)',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />
      <JsonLd data={faqJsonLd(HOME_FAQ)} />
    </>
  )
}
