import ToolPage from '@/components/tools/ToolPage'
import OcrTool from '@/components/tools/optimize/OcrTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "OCR PDF – Make Scanned PDFs Searchable",
  description:
    "Recognize text in scanned PDFs with on-device OCR (Tesseract) in six languages. Download a searchable PDF and the text. No upload, no account.",
  path: '/tools/ocr-pdf',
})

export default function OcrPdfPage() {
  return (
    <ToolPage
      id="ocr-pdf"
      steps={[
        "Choose a scanned PDF and its language.",
        "Select Recognize text. Each page is rendered and read on your device.",
        "Download the searchable PDF, or copy and download the recognized text.",
      ]}
      notes={[
        "OCR uses Tesseract (open source) running in your browser. Language models (0.7–2.9 MB) are downloaded from this website the first time.",
        "Accuracy depends on scan quality. Handwriting, low resolution and unusual fonts produce more errors.",
        "The searchable layer uses a Latin font; for scripts like Hindi the text file contains the recognized words but the PDF layer may not.",
        "Large documents can take a while, especially on phones.",
      ]}
      related={['pdf-to-text', 'scan-pdf', 'compress-pdf', 'pdf-reader']}
    >
      <OcrTool />
    </ToolPage>
  )
}
