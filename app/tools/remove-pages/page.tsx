import ToolPage from '@/components/tools/ToolPage'
import PageWorkbench from '@/components/tools/organize/PageWorkbench'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Remove PDF Pages – Delete Pages from a PDF",
  description:
    "Delete unwanted pages from a PDF by selecting them in a thumbnail grid, then download the shorter file. Free, no sign-up, processed in your browser.",
  path: '/tools/remove-pages',
})

export default function RemovePagesPage() {
  return (
    <ToolPage
      id="remove-pages"
      steps={[
        "Choose a PDF. Every page appears as a thumbnail.",
        "Select the pages you want to delete. Select one again to keep it.",
        "Select Remove pages and download the new PDF.",
      ]}
      notes={[
        "At least one page must remain.",
        "The pages you keep are copied unchanged, so text and quality stay the same.",
        "Bookmarks pointing to removed pages may no longer work.",
      ]}
      related={['extract-pages', 'organize-pdf', 'split-pdf', 'merge-pdf']}
    >
      <PageWorkbench mode="remove" />
    </ToolPage>
  )
}
