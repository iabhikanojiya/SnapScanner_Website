import Link from 'next/link'
import DownloadCta from '@/components/DownloadCta'
import ToolDirectory from '@/components/ToolDirectory'
import JsonLd from '@/components/JsonLd'
import ToolIcon from '@/components/ToolIcon'
import { breadcrumbJsonLd, pageMetadata } from '@/lib/metadata'
import { SITE_URL } from '@/lib/site'
import { TOOLS, TOOL_CATEGORIES, toolsIn } from '@/lib/tools'

export const metadata = pageMetadata({
  title: 'All PDF Tools – Merge, Split, Compress, Sign and More',
  description:
    'Every Snap Scanner web tool in one place: scan to PDF, image to PDF, merge, split, compress, sign, lock, unlock, annotate, read PDFs, resize images and build a resume.',
  path: '/tools',
})

export default function ToolsPage() {
  return (
    <>
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="page-container py-10 sm:py-12">
          <h1 className="heading-display">All PDF, image and document tools</h1>
          <p className="lead mt-3 max-w-2xl">Free tools that run in your browser. No sign-up, and your files aren’t uploaded.</p>
          <div className="mt-8">
            <ToolDirectory id="tools-search" />
          </div>
        </div>
      </section>

      <div className="page-container space-y-12 py-12">
        {TOOL_CATEGORIES.map((c) => (
          <section key={c.id} aria-labelledby={`cat-${c.id}`}>
            <h2 id={`cat-${c.id}`} className="text-xl font-bold text-ink">
              {c.name}
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {toolsIn(c.id).map((t) => (
                <li key={t.id}>
                  <Link href={t.href} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-gray-300 hover:bg-gray-50">
                    <ToolIcon id={t.id} size="sm" />
                    <span>
                      <span className="block font-semibold text-ink">{t.name}</span>
                      <span className="block text-xs text-ink-muted">{t.tagline}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <DownloadCta small />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'All Snap Scanner tools',
          url: `${SITE_URL}/tools`,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: TOOLS.length,
            itemListElement: TOOLS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, url: `${SITE_URL}${t.href}` })),
          },
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'All tools', path: '/tools' },
        ])}
      />
    </>
  )
}
