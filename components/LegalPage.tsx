// Shared layout for the Privacy Policy and Terms: title, last-updated date,
// a short summary, a sticky table of contents and the document body.

export function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

interface LegalPageProps {
  id: string
  title: string
  /** ISO date for the <time> element. */
  updatedIso: string
  updated: string
  intro: React.ReactNode
  /** Plain-language summary shown above the document. */
  summary: React.ReactNode[]
  toc: [id: string, label: string][]
  children: React.ReactNode
}

export default function LegalPage({ id, title, updatedIso, updated, intro, summary, toc, children }: LegalPageProps) {
  return (
    <>
      <section aria-labelledby={`${id}-title`} className="border-b border-gray-200 bg-gray-50">
        <div className="page-container py-12 sm:py-16">
          <p className="eyebrow">Legal</p>
          <h1 id={`${id}-title`} className="heading-display mt-3">
            {title}
          </h1>
          <p className="mt-4 text-ink-soft">
            Last updated: <time dateTime={updatedIso}>{updated}</time>
          </p>
          <div className="mt-4 max-w-2xl text-sm text-ink-muted">{intro}</div>
        </div>
      </section>

      <div className="page-container grid gap-12 py-12 lg:grid-cols-[16rem_1fr] lg:py-16">
        <nav aria-label={`${title} sections`} className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-sm font-bold text-ink">On this page</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {toc.map(([anchor, label]) => (
              <li key={anchor}>
                <a href={`#${anchor}`} className="text-ink-soft hover:text-brand-700">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="prose-policy min-w-0 max-w-3xl [overflow-wrap:anywhere]">
          <section aria-labelledby={`${id}-summary`} className="mb-10 rounded-2xl border border-gray-200 bg-gray-50 p-6 [&_li]:text-sm [&_ul]:mt-3">
            <h2 id={`${id}-summary`} className="!mt-0 !text-xl">
              Summary
            </h2>
            <ul>
              {summary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <p className="!mt-3 !text-xs text-ink-muted">This summary is for convenience. The full text below is what applies.</p>
          </section>
          {children}
        </article>
      </div>
    </>
  )
}
