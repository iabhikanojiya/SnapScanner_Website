import ToolPage from '@/components/tools/ToolPage'
import LockTool from '@/components/tools/security/LockTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Lock PDF – Password Protect a PDF',
  description:
    'Add a password to a PDF with AES-256 encryption so it can’t be opened without it. Free, no sign-up, and your password never leaves your browser.',
  path: '/tools/lock-pdf',
})

export default function LockPdfPage() {
  return (
    <ToolPage
      id="lock-pdf"
      steps={[
        'Choose the PDF you want to protect.',
        'Enter a password twice.',
        'Select Protect PDF and download the encrypted copy.',
      ]}
      notes={[
        'Files are encrypted with AES-256 (the PDF 2.0 standard security handler). Adobe Acrobat, Chrome, Edge, Firefox, macOS Preview and current PDF apps can open them with the password.',
        'Very old PDF readers that predate AES-256 support may not be able to open the file.',
        'Your password isn’t stored or sent anywhere, so it can’t be recovered if you forget it.',
        'To change the password of an already protected PDF, unlock it first.',
      ]}
      related={['unlock-pdf', 'sign-pdf', 'compress-pdf', 'merge-pdf']}
    >
      <LockTool />
    </ToolPage>
  )
}
