import FilesApp from '@/components/files/FilesApp'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'My Files – Your Local Document Library',
  description:
    'Keep PDFs and images in your browser: search, sort, rename, organise into folders, open and share them, or send them to a PDF tool. No account or upload.',
  path: '/files',
})

export default function FilesPage() {
  return (
    <>
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="page-container py-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">My files</h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            A document library stored in this browser on this device. Nothing is uploaded, and there’s no account: files
            are only available here, in this browser.
          </p>
        </div>
      </div>
      <div className="page-container py-8">
        <FilesApp />
      </div>
    </>
  )
}
