import ToolPage from '@/components/tools/ToolPage'
import HtmlToPdfTool from '@/components/tools/convert/HtmlToPdfTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "HTML to PDF – Print HTML as a PDF in Your Browser",
  description:
    "Paste HTML or open an .html file, preview it safely and save it as a PDF with your browser’s print dialog. Choose page size and margins. Free.",
  path: '/tools/html-to-pdf',
})

export default function HtmlToPdfPage() {
  return (
    <ToolPage
      id="html-to-pdf"
      steps={[
        "Paste HTML or open an .html file.",
        "Choose page size and margins and check the preview.",
        "Select Save as PDF and choose Save as PDF as the destination in the print dialog.",
      ]}
      notes={[
        "The PDF is produced by your browser’s own print engine, so the result matches the preview closely.",
        "For safety, scripts, forms and frames are removed and content from other websites (images, fonts, styles) isn’t loaded. Embed images as data URLs.",
        "This doesn’t capture live web pages by URL.",
      ]}
      related={['image-to-pdf', 'merge-pdf', 'compress-pdf', 'add-page-numbers']}
    >
      <HtmlToPdfTool />
    </ToolPage>
  )
}
