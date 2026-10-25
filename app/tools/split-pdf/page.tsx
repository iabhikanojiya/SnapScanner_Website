import ToolPage from '@/components/tools/ToolPage'
import SplitTool from '@/components/tools/split/SplitTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Split PDF – Extract Pages and Ranges',
  description:
    'Split a PDF by page ranges like 1-3, 5, 8-10 or pick pages from thumbnails. Download each part or a ZIP. Free and processed in your browser.',
  path: '/tools/split-pdf',
})

export default function SplitPdfPage() {
  return (
    <ToolPage
      id="split-pdf"
      steps={[
        'Choose a PDF. Thumbnails of every page appear.',
        'Type ranges such as 1-3, 5, 8-10, or switch to Select pages and pick them from the thumbnails.',
        'Select Split PDF, then download each file or all of them as a ZIP.',
      ]}
      notes={[
        'Each range becomes a separate PDF. Write “4-” for page 4 to the end.',
        'Pages are copied without re-encoding, so text and image quality are unchanged.',
        'If the PDF is password-protected, you’ll need its password. The split files aren’t password-protected.',
      ]}
      related={['merge-pdf', 'compress-pdf', 'pdf-reader', 'lock-pdf']}
    >
      <SplitTool />
    </ToolPage>
  )
}
