import ToolPage from '@/components/tools/ToolPage'
import MergeTool from '@/components/tools/merge/MergeTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Merge PDF – Combine PDF Files Online',
  description:
    'Combine several PDF files into one, in the order you choose. Free, no sign-up, and the merge runs in your browser so your files aren’t uploaded.',
  path: '/tools/merge-pdf',
})

export default function MergePdfPage() {
  return (
    <ToolPage
      id="merge-pdf"
      steps={[
        'Select two or more PDFs, drop them on the page or pick them from My files.',
        'Drag the files into the order you want, or use the arrow buttons.',
        'Select Merge, then download the combined PDF or save it to My files.',
      ]}
      notes={[
        'Every page is copied as it is, so text stays selectable and quality is unchanged.',
        'Password-protected files need their password before they can be merged.',
        'Bookmarks, form fields and links inside the original files may not carry over to the merged PDF.',
        'Very large files use a lot of memory. Up to 60 files of 150 MB each can be added.',
      ]}
      related={['split-pdf', 'compress-pdf', 'image-to-pdf', 'sign-pdf']}
    >
      <MergeTool />
    </ToolPage>
  )
}
