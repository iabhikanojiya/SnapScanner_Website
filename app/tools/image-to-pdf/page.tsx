import ToolPage from '@/components/tools/ToolPage'
import ImageToPdfTool from '@/components/tools/images/ImageToPdfTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Image to PDF – Convert JPG and PNG to PDF',
  description:
    'Convert JPG, PNG and WebP images into one PDF. Reorder, rotate, crop and filter images and choose page size and margins. Free and processed in your browser.',
  path: '/tools/image-to-pdf',
})

export default function ImageToPdfPage() {
  return (
    <ToolPage
      id="image-to-pdf"
      steps={[
        'Choose your images. Each one becomes a page.',
        'Drag them into order. Select an image to crop, rotate or apply a filter.',
        'Pick page size, orientation and margins, name the file and select Convert to PDF.',
      ]}
      notes={[
        'Supported formats: JPG, PNG, WebP, GIF (first frame) and BMP. iPhone HEIC photos must be converted to JPG first in most browsers.',
        'Fit image makes each page the size of its image. A4 and Letter scale images to fit inside the margins.',
        'Standard quality keeps files small; High keeps more detail for printing.',
        'Photo orientation from the camera (EXIF) is applied automatically.',
      ]}
      related={['scan-pdf', 'merge-pdf', 'compress-pdf', 'resize-image']}
    >
      <ImageToPdfTool />
    </ToolPage>
  )
}
