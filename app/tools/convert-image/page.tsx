import ToolPage from '@/components/tools/ToolPage'
import ImageStudio from '@/components/tools/images/ImageStudio'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Convert Image – JPG, PNG and WebP Converter",
  description:
    "Convert images between JPG, PNG and WebP, with a quality setting for JPG and WebP. GIF and BMP files can be converted too. Free, in your browser.",
  path: '/tools/convert-image',
})

export default function ConvertImagePage() {
  return (
    <ToolPage
      id="convert-image"
      steps={[
        "Choose an image.",
        "Pick the output format and quality.",
        "Select Save image and download it.",
      ]}
      notes={[
        "JPG doesn’t support transparency; transparent areas become white.",
        "WebP output depends on your browser; if it can’t encode WebP you’ll be told.",
        "Animated GIFs are converted from their first frame.",
      ]}
      related={['resize-image', 'crop-image', 'image-to-pdf', 'filter-image']}
    >
      <ImageStudio focus="convert" />
    </ToolPage>
  )
}
