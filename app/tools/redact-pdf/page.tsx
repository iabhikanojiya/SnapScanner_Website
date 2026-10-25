import ToolPage from '@/components/tools/ToolPage'
import RedactTool from '@/components/tools/security/RedactTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Redact PDF – Permanently Remove Sensitive Content",
  description:
    "Black out names, numbers or any area of a PDF and permanently remove the content underneath. Search to mark every match, then verify the result.",
  path: '/tools/redact-pdf',
})

export default function RedactPdfPage() {
  return (
    <ToolPage
      id="redact-pdf"
      steps={[
        "Choose a PDF.",
        "Search for words to mark every match, or drag boxes over areas, including on scanned pages.",
        "Select Apply redactions. The copy is checked to confirm the marked text is gone.",
      ]}
      notes={[
        "Each page with a redaction is rebuilt as a flattened image with the boxes burned in, so its original text and graphics are removed, not just covered.",
        "Redacted pages lose selectable text. Pages without redactions are unchanged.",
        "Metadata, bookmarks and attachments from the original aren’t carried over.",
        "Check the result: only what you mark is removed.",
      ]}
      related={['pdf-metadata', 'lock-pdf', 'crop-pdf', 'compress-pdf']}
    >
      <RedactTool />
    </ToolPage>
  )
}
