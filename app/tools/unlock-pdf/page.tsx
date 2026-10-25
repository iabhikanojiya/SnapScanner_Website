import ToolPage from '@/components/tools/ToolPage'
import UnlockTool from '@/components/tools/security/UnlockTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Unlock PDF – Remove a Known PDF Password',
  description:
    'Remove the password from a protected PDF when you know it, and save a copy that opens without one. Processed in your browser; nothing is uploaded.',
  path: '/tools/unlock-pdf',
})

export default function UnlockPdfPage() {
  return (
    <ToolPage
      id="unlock-pdf"
      steps={[
        'Choose a password-protected PDF.',
        'Enter its current password.',
        'Select Remove password and download the unlocked copy.',
      ]}
      notes={[
        'You must know the password. This tool doesn’t guess, crack or bypass passwords.',
        'Supported encryption: AES-256, AES-128 and RC4, the methods defined by the PDF standard’s password security.',
        'PDFs protected with certificates or digital rights management can’t be unlocked here.',
        'Only remove protection from documents you’re allowed to change.',
      ]}
      related={['lock-pdf', 'pdf-reader', 'compress-pdf', 'split-pdf']}
    >
      <UnlockTool />
    </ToolPage>
  )
}
