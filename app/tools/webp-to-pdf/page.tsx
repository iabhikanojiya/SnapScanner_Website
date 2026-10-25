import ToolPage from '@/components/tools/ToolPage'
import ImageToPdfTool from '@/components/tools/images/ImageToPdfTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "WebP to PDF – Convert WebP Images to PDF",
  description:
    "Turn WebP images into a PDF with page size, orientation and margin options. Reorder, crop, rotate and filter them first. Free and in your browser.",
  path: '/tools/webp-to-pdf',
})

export default function WebpToPdfPage() {
  return (
    <ToolPage
      id="webp-to-pdf"
      steps={[
        "Choose your WebP images.",
        "Reorder them, and select an image to crop, rotate or filter it.",
        "Choose page settings and select Convert to PDF.",
      ]}
      notes={[
        "Only WebP files are accepted here; use Images to PDF to mix formats.",
        "Animated WebP files use their first frame.",
      ]}
      related={['image-to-pdf', 'jpg-to-pdf', 'png-to-pdf', 'convert-image']}
    >
      <ImageToPdfTool tool="webp-to-pdf" only="webp" />
    </ToolPage>
  )
}
