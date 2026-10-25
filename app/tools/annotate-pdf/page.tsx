import ToolPage from '@/components/tools/ToolPage'
import DocumentWorkspace from '@/components/tools/viewer/DocumentWorkspace'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Annotate PDF – Highlight and Draw on PDFs',
  description:
    'Highlight PDF text in five colours or mark up scanned pages with a freehand marker and pen, then download the annotated copy. Free and in your browser.',
  path: '/tools/annotate-pdf',
})

export default function AnnotatePdfPage() {
  return (
    <ToolPage
      id="annotate-pdf"
      steps={[
        'Open a PDF.',
        'Choose Highlight text and select words on the page, or use the Marker or Pen to draw. Pick a colour; Undo removes the last mark.',
        'Select Save annotated PDF and download the new copy.',
      ]}
      notes={[
        'Text highlighting needs a PDF with selectable text. On scanned pages, use the Marker instead.',
        'Annotations are drawn into the pages of the new copy, so they look the same in every PDF viewer but can’t be edited later as separate comments.',
        'This tool adds marks on top of a page. It doesn’t change or replace the PDF’s existing text.',
      ]}
      related={['pdf-reader', 'sign-pdf', 'compress-pdf', 'merge-pdf']}
    >
      <DocumentWorkspace initialMode="annotate" />
    </ToolPage>
  )
}
