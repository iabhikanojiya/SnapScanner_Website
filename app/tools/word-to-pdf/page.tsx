import ToolPage from '@/components/tools/ToolPage'
import WordToPdfTool from '@/components/tools/convert/WordToPdfTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Word to PDF – Convert DOCX to PDF in Your Browser',
  description:
    'Convert Word documents (.docx) to PDF on your device, with selectable text, tables, images, lists, headers and page numbers. Free, no upload or sign-up.',
  path: '/tools/word-to-pdf',
})

export default function WordToPdfPage() {
  return (
    <ToolPage
      id="word-to-pdf"
      steps={['Choose a Word document (.docx).', 'Select Convert to PDF.', 'Check the preview, then download the PDF.']}
      notes={[
        'Text, headings, fonts, sizes, colours, bold, italic and underline, lists, tables with borders and shading, images, page size and margins, page breaks, headers, footers and page numbers are kept.',
        'Microsoft’s fonts can’t be shipped, so matching open fonts are used: Carlito for Calibri, Caladea for Cambria, Arimo for Arial, Tinos for Times New Roman and Cousine for Courier New. They have the same character widths, so lines and pages usually break where Word breaks them, but not always.',
        'Floating images and text boxes are placed in line with the text; charts, SmartArt, shapes and equations aren’t drawn (charts and SmartArt appear as labelled placeholders). Footnotes are collected at the end of the document and multi-column sections become one column.',
        'Older .doc files and password-protected documents can’t be opened; save them as an unprotected .docx first. Text in scripts other than Latin, Greek, Cyrillic and Devanagari may not display.',
      ]}
      related={['pdf-to-word', 'merge-pdf', 'compress-pdf', 'html-to-pdf']}
    >
      <WordToPdfTool />
    </ToolPage>
  )
}
