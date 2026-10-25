import ToolPage from '@/components/tools/ToolPage'
import SplitTool from '@/components/tools/split/SplitTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Extract PDF Pages – Save Selected Pages as a New PDF",
  description:
    "Pick pages from thumbnails or type ranges like 2-5 to create a new PDF with only those pages. Multiple ranges become separate files or a ZIP.",
  path: '/tools/extract-pages',
})

export default function ExtractPagesPage() {
  return (
    <ToolPage
      id="extract-pages"
      steps={[
        "Choose a PDF.",
        "Select pages from the thumbnails, or switch to Custom ranges and type them (for example 2-5, 9).",
        "Select Extract pages and download the result.",
      ]}
      notes={[
        "Selected pages go into one PDF; with custom ranges, each range becomes its own PDF.",
        "Pages are copied without re-encoding.",
        "The original file isn’t changed.",
      ]}
      related={['split-pdf', 'remove-pages', 'organize-pdf', 'merge-pdf']}
    >
      <SplitTool variant="extract" />
    </ToolPage>
  )
}
