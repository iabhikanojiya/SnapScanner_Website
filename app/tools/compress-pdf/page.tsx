import ToolPage from '@/components/tools/ToolPage'
import CompressTool from '@/components/tools/compress/CompressTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Compress PDF – Reduce PDF File Size',
  description:
    'Make PDFs smaller by recompressing their images, with High, Medium or Low settings. Text stays sharp, and the file never leaves your browser.',
  path: '/tools/compress-pdf',
})

export default function CompressPdfPage() {
  return (
    <ToolPage
      id="compress-pdf"
      steps={[
        'Choose a PDF.',
        'Pick High compression for the smallest file, or Low to keep images closer to the original.',
        'Select Compress PDF and compare the original and new sizes before downloading.',
      ]}
      notes={[
        'Compression works on the photos and scans inside a PDF: they are scaled down and re-saved as JPEG. Text, fonts and vector graphics are kept as they are.',
        'PDFs that are mostly text often can’t get much smaller. If the result wouldn’t be smaller, you’ll be told and the original is kept.',
        'Images with unusual colour formats (such as CMYK) are left unchanged.',
        'Password-protected PDFs need their password; the compressed copy isn’t password-protected.',
      ]}
      related={['merge-pdf', 'split-pdf', 'lock-pdf', 'image-to-pdf']}
    >
      <CompressTool />
    </ToolPage>
  )
}
