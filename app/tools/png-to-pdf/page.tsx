import ToolPage from '@/components/tools/ToolPage'
import ImageToPdfTool from '@/components/tools/images/ImageToPdfTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "PNG to PDF – Convert PNG Images and Screenshots",
  description:
    "Convert PNG images and screenshots into a PDF with your page size, orientation and margins. Reorder, crop and rotate first. Free, in your browser.",
  path: '/tools/png-to-pdf',
})

export default function PngToPdfPage() {
  return (
    <ToolPage
      id="png-to-pdf"
      steps={[
        "Choose your PNG images.",
        "Reorder them, and select an image to crop, rotate or filter it.",
        "Choose page settings and select Convert to PDF.",
      ]}
      notes={[
        "Only PNG files are accepted here; use Images to PDF to mix formats.",
        "Transparent areas are placed on white pages.",
      ]}
      related={['image-to-pdf', 'jpg-to-pdf', 'webp-to-pdf', 'compress-pdf']}
    >
      <ImageToPdfTool tool="png-to-pdf" only="png" />
    </ToolPage>
  )
}
