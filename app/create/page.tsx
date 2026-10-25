import JsonLd from '@/components/JsonLd'
import SectionHeading from '@/components/SectionHeading'
import CreateCards from '@/components/create/CreateCards'
import RecentProjects from '@/components/create/RecentProjects'
import { pageMetadata } from '@/lib/metadata'
import { CATEGORIES, TOTAL_TEMPLATES } from '@/lib/create/registry'
import { RESUME_TEMPLATES } from '@/lib/resume'
import { SITE_URL } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Create Studio – Free Resume, Invoice & Card Makers',
  description: `Design resumes, ID cards, invoices, business cards, certificates, photo collages and festival greetings in your browser. ${TOTAL_TEMPLATES + RESUME_TEMPLATES.length} templates, PDF and image export, no sign-up. Projects stay on your device.`,
  path: '/create',
})

export default function CreatePage() {
  return (
    <>
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="page-container py-10 sm:py-14">
          <p className="eyebrow">Create</p>
          <h1 className="heading-display mt-3 max-w-3xl">Create something great.</h1>
          <p className="lead mt-4 max-w-2xl">
            Resumes, ID cards, invoices, business cards, certificates, photo collages and festival greetings, made from {TOTAL_TEMPLATES + RESUME_TEMPLATES.length} editable templates. Free, with no
            sign-up, and your projects stay in this browser.
          </p>
        </div>
      </section>

      <div className="page-container space-y-14 py-10">
        <section aria-labelledby="makers">
          <h2 id="makers" className="sr-only">
            Tools
          </h2>
          <CreateCards />
        </section>

        <section aria-labelledby="recent">
          <SectionHeading
            id="recent"
            title="Recently edited"
            description="Projects and resume drafts saved in this browser on this device. They aren’t synced to other browsers or devices."
          />
          <div className="mt-6">
            <RecentProjects />
          </div>
        </section>
      </div>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Snap Scanner Create',
          url: `${SITE_URL}/create`,
          hasPart: [
            { name: 'Resume Builder', url: `${SITE_URL}/resume-builder` },
            ...CATEGORIES.map((c) => ({
              name: c.name,
              url: `${SITE_URL}${c.href}`,
            })),
          ].map((p) => ({ '@type': 'WebApplication', ...p })),
        }}
      />
    </>
  )
}
