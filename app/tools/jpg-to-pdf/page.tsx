import ToolPage from '@/components/tools/ToolPage'
import ImageToPdfTool from '@/components/tools/images/ImageToPdfTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "JPG to PDF – Convert JPG Images to PDF",
  description:
    "Turn JPG and JPEG photos into a PDF. Reorder, rotate, crop and filter them, choose page size and margins, and download. Free, in your browser.",
  path: '/tools/jpg-to-pdf',
})

export default function JpgToPdfPage() {
  return (
    <ToolPage
      id="jpg-to-pdf"
      steps={[
        "Choose your JPG images.",
        "Reorder them, and select an image to crop, rotate or filter it.",
        "Choose page size, orientation and margins, then select Convert to PDF.",
      ]}
      notes={[
        "Only JPG/JPEG files are accepted here; use Images to PDF to mix formats.",
        "Camera orientation (EXIF) is applied automatically.",
      ]}
      related={['image-to-pdf', 'png-to-pdf', 'scan-pdf', 'compress-pdf']}
    >
      <ImageToPdfTool tool="jpg-to-pdf" only="jpeg" />
    </ToolPage>
  )
}
