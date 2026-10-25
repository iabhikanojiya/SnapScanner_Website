import ToolPage from '@/components/tools/ToolPage'
import PdfToWordTool from '@/components/tools/convert/PdfToWordTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'PDF to Word – Convert PDF to an Editable DOCX',
  description:
    'Convert a PDF into an editable Word document (.docx) in your browser. Keeps paragraphs, headings, tables and images; OCR for scanned pages. Free, no upload.',
  path: '/tools/pdf-to-word',
})

export default function PdfToWordPage() {
  return (
    <ToolPage
      id="pdf-to-word"
      steps={[
        'Choose a PDF. Enter its password if it’s protected.',
        'If some pages are scanned, decide whether to recognize their text with OCR.',
        'Select Convert to Word, then download the .docx file.',
      ]}
      notes={[
        'Paragraphs, headings, bold and italic text, font sizes, bullet lists, simple tables, two-column layouts and images are rebuilt from the PDF’s text positions. Text colours, vector drawings (charts, lines, shapes) and form fields aren’t converted.',
        'Each PDF page becomes a section with the same page size and margins. Complex layouts, such as magazines or forms, may need tidying in Word.',
        'Scanned pages have no text layer. With OCR, their text is recognized on your device; without it, they’re added as pictures.',
        'Fonts are matched by name where the PDF uses a common font; otherwise Arial, Times New Roman or Courier New is used.',
      ]}
      related={['word-to-pdf', 'pdf-to-text', 'ocr-pdf', 'edit-pdf']}
    >
      <PdfToWordTool />
    </ToolPage>
  )
}
