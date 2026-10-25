import ToolPage from '@/components/tools/ToolPage'
import PdfToTextTool from '@/components/tools/convert/PdfToTextTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "PDF to Text – Extract Text from a PDF",
  description:
    "Extract the text of a PDF into a plain .txt file, page by page, or copy it to the clipboard. Works on PDFs with a text layer; use OCR for scans.",
  path: '/tools/pdf-to-text',
})

export default function PdfToTextPage() {
  return (
    <ToolPage
      id="pdf-to-text"
      steps={[
        "Choose a PDF.",
        "Select Convert to text.",
        "Check the preview, then download the .txt file or copy the text.",
      ]}
      notes={[
        "Only text that’s really in the PDF is extracted; nothing is guessed or rewritten.",
        "Scanned pages have no text layer; run OCR PDF on them first.",
        "Multi-column layouts and tables may need tidying.",
      ]}
      related={['pdf-to-markdown', 'ocr-pdf', 'pdf-reader', 'compare-pdf']}
    >
      <PdfToTextTool format="text" />
    </ToolPage>
  )
}
