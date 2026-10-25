import ToolPage from '@/components/tools/ToolPage'
import QrCodeGenerator from '@/components/tools/qr/QrCodeGenerator'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'QR Code Generator – Create and Download QR Codes',
  description: 'Create customizable QR codes for URLs, text, email, phone numbers and Wi-Fi. Download your QR code as PNG or SVG.',
  path: '/tools/qr-code-generator',
})

export default function QrCodeGeneratorPage() {
  return (
    <ToolPage
      id="qr-code-generator"
      steps={['Choose what the QR code is for and fill in the details.', 'Adjust colours, size, error correction and margin. The preview updates as you go.', 'Download a PNG or SVG, or copy the image.']}
      notes={[
        'QR codes are generated in your browser. What you type, including Wi-Fi passwords, isn’t sent anywhere.',
        'Dark codes on a light background scan most reliably. Keep a clear margin around the code.',
        'Higher error correction survives damage or a logo placed over the middle, but makes the code denser.',
        'Always test a code with a phone before printing it.',
      ]}
      related={['convert-image', 'image-to-webp', 'business-card-maker', 'resize-image']}
    >
      <QrCodeGenerator />
    </ToolPage>
  )
}
