import ToolPage from '@/components/tools/ToolPage'
import DocumentWorkspace from '@/components/tools/viewer/DocumentWorkspace'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'PDF Reader – Open and Search PDFs Online',
  description:
    'Open PDFs in your browser with zoom, fit to width, rotation, page thumbnails and text search. Then sign, compress or protect them. Nothing is uploaded.',
  path: '/tools/pdf-reader',
})

export default function PdfReaderPage() {
  return (
    <ToolPage
      id="pdf-reader"
      steps={[
        'Open a PDF from your device or from My files.',
        'Scroll or use the page controls, zoom, fit to width or rotate the view.',
        'Search for words, switch to Annotate to highlight, or open the file in another tool.',
      ]}
      notes={[
        'Search finds text in PDFs that contain a text layer. Scanned pages are images, so their words can’t be searched; use the marker to highlight them.',
        'Rotating the view doesn’t change the file. To keep annotations, save them from Annotate mode.',
        'Existing text in a PDF can’t be edited here; annotations are added on top of the page.',
      ]}
      related={['annotate-pdf', 'sign-pdf', 'compress-pdf', 'split-pdf']}
    >
      <DocumentWorkspace initialMode="read" />
    </ToolPage>
  )
}
