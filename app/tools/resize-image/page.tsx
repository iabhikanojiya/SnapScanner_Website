import ToolPage from '@/components/tools/ToolPage'
import ResizeTool from '@/components/tools/resize/ResizeTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Resize Image – Change Image Dimensions Online',
  description:
    'Resize JPG, PNG and WebP images to exact pixel dimensions, keep the aspect ratio and choose the output format. Free and processed in your browser.',
  path: '/tools/resize-image',
})

export default function ResizeImagePage() {
  return (
    <ToolPage
      id="resize-image"
      steps={[
        'Choose an image.',
        'Enter the new width or height. With the aspect ratio locked, the other side updates automatically.',
        'Pick JPG, PNG or WebP, then select Resize image and download it.',
      ]}
      notes={[
        'Images can be resized up to 8000 pixels on each side.',
        'Enlarging an image can’t add detail; it will look softer.',
        'JPG has no transparency, so transparent areas become white. Use PNG or WebP to keep them.',
        'Metadata such as camera details and location (EXIF) isn’t copied to the resized image.',
      ]}
      related={['image-to-pdf', 'scan-pdf', 'compress-pdf', 'merge-pdf']}
    >
      <ResizeTool />
    </ToolPage>
  )
}
