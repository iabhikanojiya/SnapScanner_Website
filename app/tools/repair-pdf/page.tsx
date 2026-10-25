import ToolPage from '@/components/tools/ToolPage'
import RepairTool from '@/components/tools/optimize/RepairTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Repair PDF – Recover a Damaged PDF File",
  description:
    "Try to fix a corrupt or damaged PDF by rebuilding its structure, or recover readable pages as images. Best-effort recovery that runs in your browser.",
  path: '/tools/repair-pdf',
})

export default function RepairPdfPage() {
  return (
    <ToolPage
      id="repair-pdf"
      steps={[
        "Choose the damaged PDF.",
        "Select Repair PDF. The file’s objects are scanned and the document is rebuilt with a new cross-reference table.",
        "If that fails, try recovering the readable pages as images, then download the result and check every page.",
      ]}
      notes={[
        "Repair is best effort. Broken cross-reference tables and damaged trailers can often be fixed; truncated or overwritten content usually can’t be recovered.",
        "The image fallback keeps how pages look, but their text is no longer selectable.",
        "Password-protected files must be unlocked first.",
      ]}
      related={['compress-pdf', 'pdf-reader', 'unlock-pdf', 'merge-pdf']}
    >
      <RepairTool />
    </ToolPage>
  )
}
