import ToolPage from '@/components/tools/ToolPage'
import CropPdfTool from '@/components/tools/edit/CropPdfTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Crop PDF – Trim PDF Page Margins Online",
  description:
    "Trim the margins of PDF pages by dragging crop edges on a preview, then apply to one page, a range or all pages. Free and processed in your browser.",
  path: '/tools/crop-pdf',
})

export default function CropPdfPage() {
  return (
    <ToolPage
      id="crop-pdf"
      steps={[
        "Choose a PDF.",
        "Drag the four crop handles on the preview, or type margins in percent.",
        "Choose which pages to crop and select Crop PDF.",
      ]}
      notes={[
        "Cropping changes each page’s visible area (CropBox). Content outside the area is hidden, not deleted, and can be restored by other editors.",
        "To remove sensitive content permanently, use Redact PDF instead.",
      ]}
      related={['organize-pdf', 'redact-pdf', 'rotate-pdf', 'compress-pdf']}
    >
      <CropPdfTool />
    </ToolPage>
  )
}
