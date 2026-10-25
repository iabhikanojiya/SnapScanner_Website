import ToolPage from '@/components/tools/ToolPage'
import PdfToImagesTool from '@/components/tools/convert/PdfToImagesTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "PDF to PNG – Convert PDF Pages to PNG Images",
  description:
    "Turn PDF pages into lossless PNG images at the resolution you choose. Download individual pages or a ZIP of all of them. Processed in your browser.",
  path: '/tools/pdf-to-png',
})

export default function PdfToPngPage() {
  return (
    <ToolPage
      id="pdf-to-png"
      steps={[
        "Choose a PDF.",
        "Pick a resolution and, optionally, which pages.",
        "Select Convert to PNG, then download the images or a ZIP.",
      ]}
      notes={[
        "PNG is lossless, so files are larger than JPG; it suits text, diagrams and screenshots.",
        "Very large pages are scaled down to stay within browser memory limits.",
      ]}
      related={['pdf-to-jpg', 'pdf-to-text', 'split-pdf', 'compress-pdf']}
    >
      <PdfToImagesTool format="png" />
    </ToolPage>
  )
}
