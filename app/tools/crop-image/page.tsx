import ToolPage from '@/components/tools/ToolPage'
import ImageStudio from '@/components/tools/images/ImageStudio'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Crop Image – Crop and Straighten Photos Online",
  description:
    "Crop an image by dragging its corners. Tilted documents and whiteboards are straightened with perspective correction. Export JPG, PNG or WebP.",
  path: '/tools/crop-image',
})

export default function CropImagePage() {
  return (
    <ToolPage
      id="crop-image"
      steps={[
        "Choose an image.",
        "Drag the four corners to the area you want.",
        "Pick a format and select Save image.",
      ]}
      notes={[
        "Dragging corners into a non-rectangular shape straightens it, which is handy for photographed pages.",
        "Images over 4000 px on the long side are scaled down.",
      ]}
      related={['rotate-image', 'resize-image', 'filter-image', 'scan-pdf']}
    >
      <ImageStudio focus="crop" />
    </ToolPage>
  )
}
