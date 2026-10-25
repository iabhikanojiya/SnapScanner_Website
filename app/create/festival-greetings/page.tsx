import CategoryLanding from '@/components/create/CategoryLanding'
import { pageMetadata } from '@/lib/metadata'
import { CATEGORY_PAGES } from '@/lib/create/pages'

const copy = CATEGORY_PAGES['festival-greetings']

export const metadata = pageMetadata({ title: copy.title, description: copy.metaDescription, path: '/create/festival-greetings' })

export default function Page() {
  return <CategoryLanding categoryId="festival-greetings" />
}
