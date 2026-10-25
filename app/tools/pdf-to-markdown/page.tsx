import ToolPage from '@/components/tools/ToolPage'
import PdfToTextTool from '@/components/tools/convert/PdfToTextTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "PDF to Markdown – Convert PDF Text to .md",
  description:
    "Convert a PDF’s text into Markdown, with headings, paragraphs and bullet lists inferred from the layout. Download a .md file. Free, in your browser.",
  path: '/tools/pdf-to-markdown',
})

export default function PdfToMarkdownPage() {
  return (
    <ToolPage
      id="pdf-to-markdown"
      steps={[
        "Choose a PDF.",
        "Select Convert to Markdown.",
        "Check the preview, then download the .md file or copy it.",
      ]}
      notes={[
        "Headings are detected from larger font sizes, and lists from bullet characters and numbers.",
        "Tables, columns, images and links aren’t converted.",
        "Scanned PDFs need OCR PDF first.",
      ]}
      related={['pdf-to-text', 'ocr-pdf', 'pdf-reader', 'compare-pdf']}
    >
      <PdfToTextTool format="markdown" />
    </ToolPage>
  )
}
