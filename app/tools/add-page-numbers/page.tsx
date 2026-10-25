import ToolPage from '@/components/tools/ToolPage'
import { PageNumbersTool } from '@/components/tools/edit/StampTools'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Add Page Numbers to PDF – Number Pages Online",
  description:
    "Add page numbers to a PDF with your choice of position, format such as “Page 3 of 10”, starting number, size and colour. Free and in your browser.",
  path: '/tools/add-page-numbers',
})

export default function AddPageNumbersPage() {
  return (
    <ToolPage
      id="add-page-numbers"
      steps={[
        "Choose a PDF.",
        "Pick the position, format, first number, size and which pages to number.",
        "Select Add page numbers and check the preview before downloading.",
      ]}
      notes={[
        "Numbers are drawn into the pages with a standard font and appear in every PDF viewer.",
        "Pages with a rotation are numbered as they’re displayed.",
      ]}
      related={['add-watermark', 'merge-pdf', 'organize-pdf', 'sign-pdf']}
    >
      <PageNumbersTool />
    </ToolPage>
  )
}
