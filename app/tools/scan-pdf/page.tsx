import ToolPage from '@/components/tools/ToolPage'
import ScanTool from '@/components/tools/scan/ScanTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Scan to PDF – Document Scanner in Your Browser',
  description:
    'Scan documents with your camera or photos, crop and straighten pages, apply eight filters and save a multipage PDF. Works in your browser, no app required.',
  path: '/tools/scan-pdf',
})

export default function ScanPdfPage() {
  return (
    <ToolPage
      id="scan-pdf"
      steps={[
        'Select Use camera and capture each page, or upload photos of your documents.',
        'Check each page. Drag the corners to adjust the crop, rotate pages and pick one of eight filters: Enhance, Original, Magic Color, Sharpen, Bright, Grayscale, B&W or Sepia.',
        'Drag pages into order, choose page size and margins, then select Save as PDF.',
      ]}
      notes={[
        'The camera needs your permission and a secure connection. If it’s blocked or unavailable, upload photos instead; on phones, Take photo opens your camera app.',
        'Page edges are found automatically when a light page stands out against a darker background. If detection fails, crop by hand; tilted pages are straightened with perspective correction.',
        'Scanned pages are saved as images. To make their text searchable, run the PDF through OCR PDF afterwards.',
        'The Android app uses Google’s ML Kit document scanner for more reliable edge detection.',
      ]}
      related={['image-to-pdf', 'compress-pdf', 'merge-pdf', 'sign-pdf']}
    >
      <ScanTool />
    </ToolPage>
  )
}
