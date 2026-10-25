import type { Metadata } from 'next'
import StudioEditor from '@/components/create/StudioEditor'
import { CATEGORY_PAGES } from '@/lib/create/pages'

// The editor shows a project from this browser's storage, so it has no content
// for search engines.
export const metadata: Metadata = {
  title: `Edit – ${CATEGORY_PAGES['id-cards'].heading}`,
  robots: { index: false, follow: false },
  alternates: { canonical: '/create/id-cards' },
}

export default function EditPage() {
  return (
    <>
      <h1 className="sr-only">{CATEGORY_PAGES['id-cards'].heading} editor</h1>
      <StudioEditor categoryId="id-cards" />
    </>
  )
}
