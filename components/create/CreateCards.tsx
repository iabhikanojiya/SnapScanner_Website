import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import TemplateThumb from '@/components/create/TemplateThumb'
import { ResumeStart, StartButton } from '@/components/create/RecentProjects'
import { CATEGORIES } from '@/lib/create/registry'
import { qrMatrix } from '@/lib/qr'
import { SITE_URL } from '@/lib/site'
import { QR_TEMPLATES, getTemplate as getQrTemplate, styledQrSvg, svgDataUrl } from '@/lib/qr-style'
import { RESUME_TEMPLATES, templateImage, TEMPLATE_IMAGE_SIZE } from '@/lib/resume'
import { tool } from '@/lib/tools'
import { cn } from '@/lib/utils'

/** Three templates shown on each tool card. */
const SHOWCASE: Record<string, string[]> = {
  'id-cards': ['id-corporate-sidebar', 'id-split-photo', 'id-header-band'],
  invoices: ['inv-band-striped', 'inv-sidebar-lined', 'inv-hero-minimal'],
  'business-cards': ['bc-split-navy', 'bc-monogram-gold', 'bc-diagonal-blue'],
  certificates: ['cert-classic-gold', 'cert-side-navy', 'cert-deco-midnight'],
  'photo-collages': ['col-five-mosaic', 'col-polaroid-3', 'col-quad-feature'],
  letterheads: ['lh-band-indigo', 'lh-centered-gold', 'lh-sidebar-coral'],
  'festival-greetings': ['fg-holi-letters', 'fg-diwali-wordmark', 'fg-newyear-ticket'],
}

const QR_TEMPLATE_COUNT = QR_TEMPLATES.length

/** Three QR design templates for the QR Code Generator card, rendered at build time. */
const QR_SHOWCASE = (() => {
  const matrix = qrMatrix(SITE_URL, 'M')
  return ['dotty', 'scan-me', 'ocean'].map((id) => {
    const t = getQrTemplate(id)
    return { id, url: svgDataUrl(styledQrSvg(matrix, { fg: t.fg, bg: t.bg, margin: 2, style: t.style, size: 200 }).svg) }
  })
})()

/**
 * The six creation tools with real template previews (used on /create and the
 * home page). `compact` gives smaller cards that match the home page's tool cards.
 */
export default function CreateCards({ headingLevel = 'h3', className, compact }: { headingLevel?: 'h2' | 'h3'; className?: string; compact?: boolean }) {
  const H = headingLevel
  /** Preview sizes scale down with the card. */
  const k = compact ? 0.62 : 1
  const btn = compact ? 'xs' : 'sm'
  const body = compact ? 'flex flex-1 flex-col p-4' : 'flex flex-1 flex-col p-5'
  const title = compact ? 'font-bold text-ink' : 'text-lg font-bold text-ink'
  const desc = compact ? 'mt-0.5 line-clamp-2 text-sm leading-snug text-ink-soft' : 'mt-1 text-sm text-ink-soft'
  return (
    <ul className={cn('grid sm:grid-cols-2 lg:grid-cols-3', compact ? 'gap-3' : 'gap-6', className)}>
      <li className="card flex flex-col overflow-hidden">
        <div className={cn('flex items-end justify-center bg-gray-50 px-4', compact ? 'h-28 gap-2 pt-3' : 'h-48 gap-3 pt-5')} aria-hidden>
          {RESUME_TEMPLATES.slice(0, 3).map((t, i) => (
            <Image
              key={t.id}
              src={templateImage(t.id)}
              alt=""
              width={TEMPLATE_IMAGE_SIZE.width}
              height={TEMPLATE_IMAGE_SIZE.height}
              className={cn('w-auto rounded-t shadow-card', compact ? (i === 1 ? 'h-24' : 'h-20') : i === 1 ? 'h-44' : 'h-36')}
              sizes="110px"
            />
          ))}
        </div>
        <div className={body}>
          <H className={title}>Resume Builder</H>
          <p className={desc}>Resumes with a live preview, ATS-friendly layouts and text-based PDF export.</p>
          <p className={cn('text-xs font-semibold text-ink-muted', compact ? 'mt-1' : 'mt-2')}>{RESUME_TEMPLATES.length} templates</p>
          <div className={cn('mt-auto flex flex-wrap gap-2', compact ? 'pt-3' : 'pt-4')}>
            <ResumeStart size={btn} />
            <Button asChild variant="secondary" size={btn}>
              <Link href="/resume-builder">Explore templates</Link>
            </Button>
          </div>
        </div>
      </li>
      {CATEGORIES.map((cat) => {
        const tpls = SHOWCASE[cat.id].map((id) => cat.templates.find((t) => t.id === id)!)
        return (
          <li key={cat.id} className="card flex flex-col overflow-hidden" data-testid={`create-card-${cat.id}`}>
            <div className={cn('relative flex items-center justify-center bg-gray-50 px-4', compact ? 'h-28' : 'h-48')} aria-hidden>
              {tpls.map((t, i) => {
                const portrait = t.orientation === 'portrait'
                const w = (portrait ? 92 : cat.id === 'certificates' ? 150 : 140) * k
                return (
                  <div
                    key={t.id}
                    className="absolute overflow-hidden rounded shadow-card"
                    style={{
                      width: w,
                      transform: `translateX(${(i - 1) * (w * 0.62)}px) rotate(${(i - 1) * 5}deg)`,
                      zIndex: i === 1 ? 2 : 1,
                    }}
                  >
                    <TemplateThumb categoryId={cat.id} templateId={t.id} />
                  </div>
                )
              })}
            </div>
            <div className={body}>
              <H className={title}>{cat.name}</H>
              <p className={desc}>{cat.description}</p>
              <p className={cn('text-xs font-semibold text-ink-muted', compact ? 'mt-1' : 'mt-2')}>{cat.templates.length} templates</p>
              <div className={cn('mt-auto flex flex-wrap gap-2', compact ? 'pt-3' : 'pt-4')}>
                <StartButton categoryId={cat.id} label={`Start creating with ${cat.name}`} size={btn} />
                <Button asChild variant="secondary" size={btn}>
                  <Link href={cat.href} aria-label={`Explore ${cat.name} templates`}>
                    Explore templates
                  </Link>
                </Button>
              </div>
            </div>
          </li>
        )
      })}
      <li className="card flex flex-col overflow-hidden" data-testid="create-card-qr">
        <div className={cn('relative flex items-center justify-center gap-3 bg-gray-50 px-4', compact ? 'h-28' : 'h-48')} aria-hidden>
          {QR_SHOWCASE.map((q, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- locally generated SVG
            <img key={q.id} src={q.url} alt="" className={cn('rounded shadow-card', compact ? (i === 1 ? 'h-20' : 'h-16') : i === 1 ? 'h-32' : 'h-24', 'w-auto')} />
          ))}
        </div>
        <div className={body}>
          <H className={title}>{tool('qr-code-generator').name}</H>
          <p className={desc}>QR codes for links, text, email, phone numbers and Wi-Fi, in styled designs, as PNG or SVG.</p>
          <p className={cn('text-xs font-semibold text-ink-muted', compact ? 'mt-1' : 'mt-2')}>{QR_TEMPLATE_COUNT} designs</p>
          <div className={cn('mt-auto flex flex-wrap gap-2', compact ? 'pt-3' : 'pt-4')}>
            <Button asChild size={btn}>
              <Link href="/tools/qr-code-generator" aria-label="Start creating with QR Code Generator">
                Start creating
              </Link>
            </Button>
          </div>
        </div>
      </li>
    </ul>
  )
}
