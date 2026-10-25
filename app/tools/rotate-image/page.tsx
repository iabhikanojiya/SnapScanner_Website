import ToolPage from '@/components/tools/ToolPage'
import ImageStudio from '@/components/tools/images/ImageStudio'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Rotate Image – Rotate or Flip Photos Online",
  description:
    "Rotate an image left or right in 90° steps, or flip it horizontally or vertically, then download it as JPG, PNG or WebP. Free, in your browser.",
  path: '/tools/rotate-image',
})

export default function RotateImagePage() {
  return (
    <ToolPage
      id="rotate-image"
      steps={[
        "Choose an image.",
        "Rotate it or flip it, and check the preview.",
        "Pick a format and select Save image.",
      ]}
      notes={[
        "Camera orientation (EXIF) is applied when the image opens, so rotate only if it still looks wrong.",
        "Images over 4000 px on the long side are scaled down.",
      ]}
      related={['crop-image', 'resize-image', 'convert-image', 'image-to-pdf']}
    >
      <ImageStudio focus="rotate" />
    </ToolPage>
  )
}
