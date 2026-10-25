import ToolPage from '@/components/tools/ToolPage'
import EditPdfTool from '@/components/tools/edit/EditPdfTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Edit PDF – Add and Replace Text in a PDF',
  description:
    'Edit PDF text in your browser: click existing text to cover it and type a replacement, add new text anywhere, choose fonts and colours, then download the PDF. No upload.',
  path: '/tools/edit-pdf',
})

export default function EditPdfPage() {
  return (
    <ToolPage
      id="edit-pdf"
      steps={[
        'Open a PDF. It stays in your browser.',
        'Choose Replace text and click a line of text, or drag around an area. Type the new text and adjust its font, size and colours. Use Add text for new text anywhere, and Cover area to hide something.',
        'Move and resize edits on the page, undo anything with Ctrl+Z, then select Download PDF.',
      ]}
      notes={[
        'Replacing text covers the old text with a solid colour and draws the new text on top. The old text isn’t deleted: it may still be found by search or copied. To remove content permanently, use Redact PDF.',
        'Covers work best on plain backgrounds. Use Match page colour, or pick the colour yourself, for tinted pages; patterned or photo backgrounds won’t match perfectly.',
        'New text uses the standard PDF fonts (Helvetica, Times and Courier), so it may not exactly match the document’s own font. Non-Latin characters aren’t supported by these fonts and appear as “?”.',
        'Click-to-replace needs a PDF with real text. On scanned pages, drag around the area instead, or run OCR PDF first.',
      ]}
      related={['annotate-pdf', 'redact-pdf', 'sign-pdf', 'fill-pdf-form']}
    >
      <EditPdfTool />
    </ToolPage>
  )
}
