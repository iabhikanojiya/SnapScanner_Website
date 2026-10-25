import Link from 'next/link'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import ToolIcon from '@/components/ToolIcon'
import DownloadCta from '@/components/DownloadCta'
import FaqList from '@/components/FaqList'
import JsonLd from '@/components/JsonLd'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/metadata'
import { APP_NAME, DEVELOPER_NAME, SITE_URL } from '@/lib/site'
import { TOOL_CONTENT } from '@/lib/tool-content'
import { TOOLS, tool as getTool, type ToolId } from '@/lib/tools'

interface ToolPageProps {
  id: ToolId
  children: React.ReactNode
  /** Short how-to steps shown below the workspace. */
  steps: string[]
  /** Accurate notes about limits and behaviour. */
  notes: React.ReactNode[]
  related: ToolId[]
}

/** Shared shell for every tool page: title, workspace, how-to, notes, formats, FAQ and related tools. */
export default function ToolPage({ id, children, steps, notes, related }: ToolPageProps) {
  const t = getTool(id)
  const content = TOOL_CONTENT[id]
  const trail = [
    { name: 'Home', path: '/' },
    { name: 'All tools', path: '/tools' },
    { name: t.name, path: t.href },
  ]
  return (
    <>
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="page-container py-6 sm:py-8">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-sm text-ink-muted">
              {trail.slice(0, -1).map((c) => (
                <li key={c.path} className="flex items-center gap-1">
                  <Link href={c.path} className="hover:text-brand-700">
                    {c.name}
                  </Link>
                  <ChevronRight aria-hidden className="h-4 w-4" />
                </li>
              ))}
              <li aria-current="page" className="font-semibold text-ink-soft">
                {t.name}
              </li>
            </ol>
          </nav>
          <div className="mt-4 flex items-start gap-4">
            <ToolIcon id={id} size="lg" />
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{t.name}</h1>
              <p className="mt-2 max-w-2xl text-ink-soft">{t.tagline}</p>
            </div>
          </div>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
            <ShieldCheck aria-hidden className="h-4 w-4" />
            Runs in your browser. Files aren’t uploaded.
          </p>
        </div>
      </div>

      <div className="page-container py-6 sm:py-10">{children}</div>

      <section aria-labelledby="how-title" className="border-t border-gray-200 bg-gray-50">
        <div className="page-container grid gap-10 py-12 lg:grid-cols-2">
          <div>
            <h2 id="how-title" className="text-xl font-bold text-ink">
              How to use {t.name}
            </h2>
            <ol className="mt-4 space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-ink-soft">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-700 ring-1 ring-gray-200">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Good to know</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-soft marker:text-brand">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {content && (
        <section aria-labelledby="details-title" className="page-container grid gap-10 py-12 lg:grid-cols-2">
          <div>
            <h2 id="details-title" className="text-xl font-bold text-ink">
              Supported files
            </h2>
            <dl className="mt-4 space-y-3">
              <div className="card p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Input</dt>
                <dd className="mt-1 text-ink-soft">{content.formats.input}</dd>
              </div>
              <div className="card p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Output</dt>
                <dd className="mt-1 text-ink-soft">{content.formats.output}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-ink-muted">
              Processing happens on your device, so very large files depend on its memory. Free, with no sign-up or watermark.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">What people use it for</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-soft marker:text-brand">
              {content.uses.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {content && (
        <section aria-labelledby="tool-faq-title" className="border-t border-gray-200 bg-gray-50">
          <div className="page-container grid gap-8 py-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 id="tool-faq-title" className="text-xl font-bold text-ink">
                {t.name} questions
              </h2>
              <p className="mt-3 text-sm text-ink-soft">
                Something else?{' '}
                <Link href="/support" className="text-link">
                  Visit support
                </Link>
              </p>
            </div>
            <FaqList items={content.faq} />
          </div>
        </section>
      )}

      <section aria-labelledby="related-title" className="page-container py-12">
        <h2 id="related-title" className="text-xl font-bold text-ink">
          Related tools
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((rid) => {
            const r = TOOLS.find((x) => x.id === rid)!
            return (
              <li key={rid}>
                <Link href={r.href} className="card-link flex h-full items-start gap-3 p-4">
                  <ToolIcon id={rid} size="sm" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{r.name}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{r.description}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        <p className="mt-6 text-sm">
          <Link href="/tools" className="text-link">
            Browse all Snap Scanner tools
          </Link>
        </p>
      </section>

      <DownloadCta small className="pb-12" />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: `${t.name} – ${APP_NAME}`,
          url: `${SITE_URL}${t.href}`,
          description: t.description,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any (web browser)',
          browserRequirements: 'Requires JavaScript and a modern browser',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          publisher: { '@type': 'Organization', name: DEVELOPER_NAME, url: SITE_URL },
        }}
      />
      <JsonLd data={breadcrumbJsonLd(trail)} />
      {content && <JsonLd data={faqJsonLd(content.faq)} />}
    </>
  )
}
