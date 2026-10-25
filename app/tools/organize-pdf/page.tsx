import ToolPage from '@/components/tools/ToolPage'
import PageWorkbench from '@/components/tools/organize/PageWorkbench'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Organize PDF – Reorder, Rotate and Delete Pages",
  description:
    "Drag PDF pages into a new order, rotate, duplicate or delete them in a thumbnail grid, then export the reorganized PDF. Free and in your browser.",
  path: '/tools/organize-pdf',
})

export default function OrganizePdfPage() {
  return (
    <ToolPage
      id="organize-pdf"
      steps={[
        "Choose a PDF.",
        "Drag thumbnails to reorder pages, or use the arrows. Rotate, duplicate or delete pages with the buttons under each one.",
        "Select Save PDF to download the new page order.",
      ]}
      notes={[
        "Duplicated pages are exact copies.",
        "Rotation is saved in the PDF, so every viewer shows the page the right way up.",
        "Keyboard users can reorder with the drag handle: Space to pick up, arrow keys to move, Space to drop.",
      ]}
      related={['rotate-pdf', 'remove-pages', 'merge-pdf', 'split-pdf']}
    >
      <PageWorkbench mode="organize" />
    </ToolPage>
  )
}
