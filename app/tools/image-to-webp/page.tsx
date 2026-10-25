import ToolPage from '@/components/tools/ToolPage'
import ImageToWebpTool from '@/components/tools/images/ImageToWebpTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'PNG and JPG to WebP Converter',
  description: 'Convert PNG and JPG images to WebP in your browser. Adjust image quality and download optimized images without uploading files.',
  path: '/tools/image-to-webp',
})

export default function ImageToWebpPage() {
  return (
    <ToolPage
      id="image-to-webp"
      steps={['Add one or more PNG or JPG images.', 'Choose the quality, and optionally shrink large images.', 'Convert, then download each WebP or all of them as a ZIP.']}
      notes={[
        'Conversion uses your browser’s own WebP encoder. If your browser can’t create WebP, you’ll see an error rather than a renamed file.',
        'WebP here is lossy: it usually makes files smaller, but can soften fine detail at lower quality. Transparency in PNGs is kept.',
        'File sizes shown are the real sizes of the files you download. Already-optimized images can get larger; the tool tells you when that happens.',
        'Photos are rotated using their camera orientation, and metadata such as location isn’t copied into the WebP.',
      ]}
      related={['convert-image', 'resize-image', 'compress-pdf', 'image-to-pdf']}
    >
      <ImageToWebpTool />
    </ToolPage>
  )
}
