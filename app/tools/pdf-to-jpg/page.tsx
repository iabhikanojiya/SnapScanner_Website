import ToolPage from '@/components/tools/ToolPage'
import PdfToImagesTool from '@/components/tools/convert/PdfToImagesTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "PDF to JPG – Convert PDF Pages to JPG Images",
  description:
    "Save every PDF page, or chosen pages, as JPG images at 72, 150 or 300 dpi. Download pages individually or all at once as a ZIP. Free, in your browser.",
  path: '/tools/pdf-to-jpg',
})

export default function PdfToJpgPage() {
  return (
    <ToolPage
      id="pdf-to-jpg"
      steps={[
        "Choose a PDF.",
        "Pick a resolution and JPG quality, and optionally which pages.",
        "Select Convert to JPG, then download pages one by one or as a ZIP.",
      ]}
      notes={[
        "300 dpi suits printing; 150 dpi is a good default for sharing.",
        "Very large pages are scaled down to stay within browser memory limits.",
      ]}
      related={['pdf-to-png', 'pdf-to-text', 'compress-pdf', 'split-pdf']}
    >
      <PdfToImagesTool format="jpeg" />
    </ToolPage>
  )
}
