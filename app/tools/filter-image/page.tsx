import ToolPage from '@/components/tools/ToolPage'
import ImageStudio from '@/components/tools/images/ImageStudio'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Image Filters – Enhance, B&W, Magic Color and More",
  description:
    "Apply Snap Scanner’s eight filters to a photo: Enhance, Original, Magic Color, Sharpen, Bright, Grayscale, B&W and Sepia. Download the result.",
  path: '/tools/filter-image',
})

export default function FilterImagePage() {
  return (
    <ToolPage
      id="filter-image"
      steps={[
        "Choose an image.",
        "Pick a filter and compare the preview.",
        "Pick a format and select Save image.",
      ]}
      notes={[
        "B&W uses adaptive thresholding, which is ideal for text documents with uneven lighting.",
        "Processing runs on your device.",
      ]}
      related={['crop-image', 'scan-pdf', 'convert-image', 'resize-image']}
    >
      <ImageStudio focus="filter" />
    </ToolPage>
  )
}
