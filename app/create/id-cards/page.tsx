import CategoryLanding from '@/components/create/CategoryLanding'
import { pageMetadata } from '@/lib/metadata'
import { CATEGORY_PAGES } from '@/lib/create/pages'

const copy = CATEGORY_PAGES['id-cards']

export const metadata = pageMetadata({ title: copy.title, description: copy.metaDescription, path: '/create/id-cards' })

export default function Page() {
  return <CategoryLanding categoryId="id-cards" />
}
