import ToolPage from '@/components/tools/ToolPage'
import CompareTool from '@/components/tools/edit/CompareTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Compare PDF – Find Differences Between Two PDFs",
  description:
    "Compare two PDFs: see words that were added, removed or changed, plus a page-by-page visual difference highlighted in red. Free, in your browser.",
  path: '/tools/compare-pdf',
})

export default function ComparePdfPage() {
  return (
    <ToolPage
      id="compare-pdf"
      steps={[
        "Add the original PDF and the changed version.",
        "Select Compare.",
        "Review the highlighted text changes and step through pages in the visual comparison.",
      ]}
      notes={[
        "Text comparison uses each PDF’s text layer; scanned PDFs need OCR PDF first.",
        "Reflowed layouts can make moved text show as removed and added.",
        "This is a helpful guide, not a legal or certified comparison.",
      ]}
      related={['pdf-to-text', 'ocr-pdf', 'pdf-reader', 'merge-pdf']}
    >
      <CompareTool />
    </ToolPage>
  )
}
