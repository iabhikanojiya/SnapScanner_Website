import ToolPage from '@/components/tools/ToolPage'
import MetadataTool from '@/components/tools/security/MetadataTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "PDF Metadata – View, Edit or Remove PDF Properties",
  description:
    "Inspect a PDF’s title, author, creator, dates, page sizes, form fields, attachments and scripts; edit the fields or remove all metadata. Free.",
  path: '/tools/pdf-metadata',
})

export default function PdfMetadataPage() {
  return (
    <ToolPage
      id="pdf-metadata"
      steps={[
        "Choose a PDF.",
        "Review its properties.",
        "Edit the title, author, subject and keywords, or remove all metadata, and download the copy.",
      ]}
      notes={[
        "Removing metadata clears the document information and XMP metadata. It doesn’t change text on the pages.",
        "Attachments and JavaScript are reported so you can decide whether to trust the file.",
      ]}
      related={['redact-pdf', 'lock-pdf', 'compress-pdf', 'repair-pdf']}
    >
      <MetadataTool />
    </ToolPage>
  )
}
