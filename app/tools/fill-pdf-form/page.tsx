import ToolPage from '@/components/tools/ToolPage'
import FormTool from '@/components/tools/edit/FormTool'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: "Fill PDF Form – Complete PDF Forms Online",
  description:
    "Fill in a PDF form’s text fields, checkboxes, dropdowns and radio buttons, optionally flatten it, and download the completed form. Free, in-browser.",
  path: '/tools/fill-pdf-form',
})

export default function FillPdfFormPage() {
  return (
    <ToolPage
      id="fill-pdf-form"
      steps={[
        "Choose a PDF form.",
        "Fill in the fields shown.",
        "Choose whether to flatten the answers, then select Save filled PDF.",
      ]}
      notes={[
        "Standard interactive (AcroForm) fields are supported. XFA forms, used by some government forms, can’t be filled in a browser.",
        "Flattening makes answers part of the page so they can’t be changed.",
        "For flat forms without fields, use Annotate PDF to add text boxes.",
      ]}
      related={['sign-pdf', 'annotate-pdf', 'add-page-numbers', 'lock-pdf']}
    >
      <FormTool />
    </ToolPage>
  )
}
