import ToolPage from '@/components/tools/ToolPage'
import SignTool from '@/components/tools/sign/SignTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Sign PDF – Add Your Signature to a PDF',
  description:
    'Draw, type or upload your signature and place it on any page of a PDF. Drag and resize it, then download the signed copy. Free and in your browser.',
  path: '/tools/sign-pdf',
})

export default function SignPdfPage() {
  return (
    <ToolPage
      id="sign-pdf"
      steps={[
        'Open the PDF you need to sign.',
        'Create a signature: draw it, type your name in a handwriting style, or upload a photo of your signature.',
        'Scroll to the right page, add the signature, drag it into place and resize it, then select Save signed PDF.',
      ]}
      notes={[
        'This adds a visible electronic signature image to the page. It isn’t a certificate-based digital signature and doesn’t verify your identity.',
        'Some forms and contracts require a specific type of signature. Check what the recipient accepts.',
        'Signatures you create stay in this tab only and are discarded when you leave the page.',
      ]}
      related={['pdf-reader', 'annotate-pdf', 'lock-pdf', 'merge-pdf']}
    >
      <SignTool />
    </ToolPage>
  )
}
