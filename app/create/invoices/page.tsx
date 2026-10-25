import CategoryLanding from '@/components/create/CategoryLanding'
import { pageMetadata } from '@/lib/metadata'
import { CATEGORY_PAGES } from '@/lib/create/pages'

const copy = CATEGORY_PAGES['invoices']

export const metadata = pageMetadata({ title: copy.title, description: copy.metaDescription, path: '/create/invoices' })

export default function Page() {
  return <CategoryLanding categoryId="invoices" />
}
