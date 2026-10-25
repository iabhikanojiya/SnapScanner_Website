import ToolPage from '@/components/tools/ToolPage'
import { WatermarkTool } from '@/components/tools/edit/StampTools'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Add Watermark to PDF – Text or Logo Watermark",
  description:
    "Stamp a text or image watermark such as CONFIDENTIAL or your logo on PDF pages, with position, size, opacity and rotation controls. Free, in-browser.",
  path: '/tools/add-watermark',
})

export default function AddWatermarkPage() {
  return (
    <ToolPage
      id="add-watermark"
      steps={[
        "Choose a PDF.",
        "Enter text or choose an image, then set position, size, opacity, rotation and pages.",
        "Select Add watermark and check the preview before downloading.",
      ]}
      notes={[
        "The watermark is drawn into the page content. It discourages copying but can be removed by someone with editing tools.",
        "Text watermarks use a standard Latin font.",
      ]}
      related={['add-page-numbers', 'lock-pdf', 'sign-pdf', 'annotate-pdf']}
    >
      <WatermarkTool />
    </ToolPage>
  )
}
