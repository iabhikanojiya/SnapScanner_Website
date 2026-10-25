import type { Metadata } from 'next'
import ResumeEditor from '@/components/resume/ResumeEditor'

// The editor shows a draft from this browser's storage, so it has no content
// for search engines.
export const metadata: Metadata = {
  title: 'Edit resume',
  robots: { index: false, follow: false },
  alternates: { canonical: '/resume-builder' },
}

export default function EditResumePage() {
  return (
    <>
      <h1 className="sr-only">Resume editor</h1>
      <ResumeEditor />
    </>
  )
}
