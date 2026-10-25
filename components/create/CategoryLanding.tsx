import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import FaqList from '@/components/FaqList'
import JsonLd from '@/components/JsonLd'
import SectionHeading from '@/components/SectionHeading'
import { ProjectList, TemplateGallery } from '@/components/create/CreateGallery'
import { CATEGORY_PAGES } from '@/lib/create/pages'
import { getCategory, type CategoryId } from '@/lib/create/registry'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/metadata'
import { SITE_URL } from '@/lib/site'

/** Landing page of one Create Studio tool: saved projects, templates, features and FAQ. */
export default function CategoryLanding({ categoryId }: { categoryId: CategoryId }) {
  const cat = getCategory(categoryId)!
  const copy = CATEGORY_PAGES[categoryId]
  return (
    <>
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="page-container py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
            <ol className="flex items-center gap-1">
              <li>
                <Link href="/" className="hover:text-ink">
                  Home
                </Link>
              </li>
              <li aria-hidden>
                <ChevronRight className="h-4 w-4" />
              </li>
              <li>
                <Link href="/create" className="hover:text-ink">
                  Create
                </Link>
              </li>
              <li aria-hidden>
                <ChevronRight className="h-4 w-4" />
              </li>
              <li aria-current="page" className="font-semibold text-ink-soft">
                {copy.heading}
              </li>
            </ol>
          </nav>
          <h1 className="heading-display mt-3 max-w-3xl">{copy.heading}</h1>
          <p className="lead mt-4 max-w-2xl">{copy.intro}</p>
          <p className="mt-3 text-sm text-ink-muted">
            {cat.templates.length} templates · Free · No sign-up · Saved in your browser
          </p>
        </div>
      </section>

      <div className="page-container space-y-14 py-10">
        <ProjectList categoryId={categoryId} />

        <section aria-labelledby="templates">
          <SectionHeading id="templates" eyebrow="Templates" title="Pick a template to start" description="Each template starts with example content you can replace. You can switch templates later without losing what you’ve typed." />
          <div className="mt-8">
            <TemplateGallery categoryId={categoryId} />
          </div>
        </section>

        <section aria-labelledby="highlights">
          <h2 id="highlights" className="sr-only">
            Features
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.highlights.map((h) => (
              <li key={h.title} className="card p-5">
                <h3 className="font-bold text-ink">{h.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{h.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-muted">{cat.disclaimer}</p>
        </section>

        <section aria-labelledby="cat-faq" className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading id="cat-faq" eyebrow="FAQ" title={`${copy.heading} questions`} />
          <FaqList items={copy.faq} />
        </section>
      </div>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: `Snap Scanner ${copy.heading}`,
          url: `${SITE_URL}${cat.href}`,
          applicationCategory: 'DesignApplication',
          operatingSystem: 'Any (web browser)',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Create', path: '/create' },
          { name: copy.heading, path: cat.href },
        ])}
      />
      <JsonLd data={faqJsonLd(copy.faq)} />
    </>
  )
}
