import ToolPage from '@/components/tools/ToolPage'
import PageWorkbench from '@/components/tools/organize/PageWorkbench'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Rotate PDF – Turn Pages 90°, 180° or 270°",
  description:
    "Rotate individual PDF pages or the whole document and save the rotation permanently. Preview every page before downloading. Free, in your browser.",
  path: '/tools/rotate-pdf',
})

export default function RotatePdfPage() {
  return (
    <ToolPage
      id="rotate-pdf"
      steps={[
        "Choose a PDF.",
        "Rotate single pages with the buttons under each thumbnail, or rotate all pages at once.",
        "Select Save rotation and download the PDF.",
      ]}
      notes={[
        "Rotation is stored in the PDF page settings, so the page content isn’t re-encoded.",
        "Rotation adds to any rotation the page already has.",
      ]}
      related={['organize-pdf', 'remove-pages', 'scan-pdf', 'compress-pdf']}
    >
      <PageWorkbench mode="rotate" />
    </ToolPage>
  )
}
