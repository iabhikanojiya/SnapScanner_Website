// Every tool the website offers. The directory, search, header menu, sitemap,
// home page and Snap Assistant all read from this list, so a tool only appears
// once it has a working, tested page at `href`.

export type ToolCategoryId = 'organize' | 'optimize' | 'convert-to' | 'convert-from' | 'edit' | 'security' | 'image' | 'create'

export interface ToolCategory {
  id: ToolCategoryId
  name: string
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  { id: 'organize', name: 'Organize PDF' },
  { id: 'optimize', name: 'Optimize PDF' },
  { id: 'convert-to', name: 'Convert to PDF' },
  { id: 'convert-from', name: 'Convert from PDF' },
  { id: 'edit', name: 'Edit PDF' },
  { id: 'security', name: 'PDF security' },
  { id: 'image', name: 'Image tools' },
  { id: 'create', name: 'Create' },
]

export const TOOL_IDS = [
  'merge-pdf',
  'split-pdf',
  'remove-pages',
  'extract-pages',
  'organize-pdf',
  'rotate-pdf',
  'compress-pdf',
  'repair-pdf',
  'ocr-pdf',
  'scan-pdf',
  'image-to-pdf',
  'jpg-to-pdf',
  'png-to-pdf',
  'webp-to-pdf',
  'html-to-pdf',
  'word-to-pdf',
  'pdf-to-jpg',
  'pdf-to-png',
  'pdf-to-text',
  'pdf-to-markdown',
  'pdf-to-word',
  'pdf-reader',
  'sign-pdf',
  'edit-pdf',
  'annotate-pdf',
  'add-page-numbers',
  'add-watermark',
  'crop-pdf',
  'fill-pdf-form',
  'compare-pdf',
  'lock-pdf',
  'unlock-pdf',
  'redact-pdf',
  'pdf-metadata',
  'resize-image',
  'crop-image',
  'rotate-image',
  'filter-image',
  'convert-image',
  'image-to-webp',
  'qr-code-generator',
  'resume-builder',
  'id-card-maker',
  'invoice-maker',
  'business-card-maker',
  'certificate-maker',
  'photo-collage-maker',
  'letterhead-maker',
  'festival-greeting-maker',
] as const

export type ToolId = (typeof TOOL_IDS)[number]

/** What a tool takes as input, so the library and assistant can hand files over. */
export type ToolInput = 'pdf' | 'pdfs' | 'images' | 'image' | 'none'

export interface Tool {
  id: ToolId
  name: string
  /** One sentence for cards and search results. */
  description: string
  /** Shown on the tool's own page under the title. */
  tagline: string
  category: ToolCategoryId
  href: string
  input: ToolInput
  keywords: string
  popular?: boolean
}

const t = (tool: Omit<Tool, 'href'> & { href?: string }): Tool => ({ href: `/tools/${tool.id}`, ...tool })

export const TOOLS: Tool[] = [
  // Organize
  t({ id: 'merge-pdf', name: 'Merge PDF', description: 'Combine several PDFs into one file in the order you choose.', tagline: 'Add PDFs, drag them into order and merge them into a single document.', category: 'organize', input: 'pdfs', keywords: 'combine join merge append', popular: true }),
  t({ id: 'split-pdf', name: 'Split PDF', description: 'Split a PDF by page ranges into separate files, or download them as a ZIP.', tagline: 'Pick pages from the thumbnails or type ranges like 1-3, 5, 8-10. Each range becomes its own PDF.', category: 'organize', input: 'pdf', keywords: 'split separate pages range', popular: true }),
  t({ id: 'remove-pages', name: 'Remove pages', description: 'Delete the pages you don’t need from a PDF.', tagline: 'Select the pages to delete, then download the PDF without them.', category: 'organize', input: 'pdf', keywords: 'delete remove pages blank' }),
  t({ id: 'extract-pages', name: 'Extract pages', description: 'Copy selected pages or ranges into a new PDF.', tagline: 'Choose pages or type ranges, and get a new PDF with only those pages.', category: 'organize', input: 'pdf', keywords: 'extract pull out pages copy' }),
  t({ id: 'organize-pdf', name: 'Organize PDF', description: 'Reorder, rotate, duplicate and delete pages with drag and drop.', tagline: 'Drag page thumbnails into a new order, rotate, duplicate or delete pages, then export.', category: 'organize', input: 'pdf', keywords: 'organize reorder rearrange sort pages duplicate', popular: true }),
  t({ id: 'rotate-pdf', name: 'Rotate PDF', description: 'Rotate single pages or the whole document by 90°, 180° or 270°.', tagline: 'Turn pages the right way up and save the rotation permanently.', category: 'organize', input: 'pdf', keywords: 'rotate turn landscape portrait upside down' }),
  // Optimize
  t({ id: 'compress-pdf', name: 'Compress PDF', description: 'Reduce PDF size by recompressing images while keeping text and vectors sharp.', tagline: 'Shrinks and optimizes the images inside a PDF and its structure. Text and vector graphics are left untouched.', category: 'optimize', input: 'pdf', keywords: 'compress reduce shrink smaller size optimize images email', popular: true }),
  t({ id: 'repair-pdf', name: 'Repair PDF', description: 'Try to recover a damaged PDF by rebuilding its structure.', tagline: 'Rebuilds broken cross-reference tables and recovers the pages that can still be read.', category: 'optimize', input: 'pdf', keywords: 'repair fix recover damaged corrupt broken' }),
  t({ id: 'ocr-pdf', name: 'OCR PDF', description: 'Recognize text in scanned PDFs and make them searchable.', tagline: 'Reads text from scanned pages on your device and adds an invisible, searchable text layer.', category: 'optimize', input: 'pdf', keywords: 'ocr recognize text scanned searchable extract' }),
  // Convert to PDF
  t({ id: 'scan-pdf', name: 'Scan to PDF', description: 'Capture pages with your camera or photos, crop, filter and save as one PDF.', tagline: 'Use your camera or upload photos of documents. Crop each page, pick a filter and download a PDF.', category: 'convert-to', input: 'images', keywords: 'scan scanner camera document photo capture crop edge receipt', popular: true }),
  t({ id: 'image-to-pdf', name: 'Images to PDF', description: 'Convert several images into one PDF with your page size and margins.', tagline: 'Combine images into one PDF. Reorder, rotate, crop and filter them, then choose page size and margins.', category: 'convert-to', input: 'images', keywords: 'photo picture convert images to pdf multiple' }),
  t({ id: 'jpg-to-pdf', name: 'JPG to PDF', description: 'Turn JPG photos into a PDF.', tagline: 'Convert JPG and JPEG images to PDF, with page size, orientation and margins.', category: 'convert-to', input: 'images', keywords: 'jpg jpeg to pdf convert photo' }),
  t({ id: 'png-to-pdf', name: 'PNG to PDF', description: 'Turn PNG images and screenshots into a PDF.', tagline: 'Convert PNG images to PDF, with page size, orientation and margins.', category: 'convert-to', input: 'images', keywords: 'png screenshot to pdf convert' }),
  t({ id: 'webp-to-pdf', name: 'WebP to PDF', description: 'Turn WebP images into a PDF.', tagline: 'Convert WebP images to PDF, with page size, orientation and margins.', category: 'convert-to', input: 'images', keywords: 'webp to pdf convert' }),
  t({ id: 'html-to-pdf', name: 'HTML to PDF', description: 'Print HTML you paste or open to PDF with your browser.', tagline: 'Paste HTML or open an .html file, preview it safely, then save it as a PDF with your browser’s print dialog.', category: 'convert-to', input: 'none', keywords: 'html web page to pdf print' }),
  t({ id: 'word-to-pdf', name: 'Word to PDF', description: 'Convert a Word document (.docx) to PDF with its text, tables and images.', tagline: 'Turn a .docx into a PDF with selectable text, headings, lists, tables, images, headers and page numbers.', category: 'convert-to', input: 'none', keywords: 'word docx doc to pdf convert microsoft office document' }),
  // Convert from PDF
  t({ id: 'pdf-to-jpg', name: 'PDF to JPG', description: 'Save PDF pages as JPG images at the resolution you choose.', tagline: 'Turn each page into a JPG image. Download one page or all of them as a ZIP.', category: 'convert-from', input: 'pdf', keywords: 'pdf to jpg jpeg image convert export pages', popular: true }),
  t({ id: 'pdf-to-png', name: 'PDF to PNG', description: 'Save PDF pages as lossless PNG images.', tagline: 'Turn each page into a PNG image. Download one page or all of them as a ZIP.', category: 'convert-from', input: 'pdf', keywords: 'pdf to png image convert export pages' }),
  t({ id: 'pdf-to-text', name: 'PDF to Text', description: 'Extract the text of a PDF into a .txt file.', tagline: 'Copy out the text layer of a PDF as plain text, page by page.', category: 'convert-from', input: 'pdf', keywords: 'pdf to text txt extract copy' }),
  t({ id: 'pdf-to-markdown', name: 'PDF to Markdown', description: 'Convert a PDF’s text into Markdown with headings and lists.', tagline: 'Extract text with basic structure (headings, paragraphs and bullet lists) as a .md file.', category: 'convert-from', input: 'pdf', keywords: 'pdf to markdown md convert' }),
  t({ id: 'pdf-to-word', name: 'PDF to Word', description: 'Convert a PDF into an editable Word document (.docx).', tagline: 'Rebuild a PDF’s paragraphs, headings, tables and images as an editable .docx, with optional OCR for scanned pages.', category: 'convert-from', input: 'pdf', keywords: 'pdf to word docx doc convert editable microsoft office document' }),
  // Edit
  t({ id: 'pdf-reader', name: 'PDF Reader', description: 'Read PDFs with zoom, rotation and text search.', tagline: 'Open a PDF to read it, zoom, rotate the view and search its text.', category: 'edit', input: 'pdf', keywords: 'read view open viewer search find text zoom' }),
  t({ id: 'sign-pdf', name: 'Sign PDF', description: 'Draw, type or import a signature and place it on any page.', tagline: 'Add a visible signature to a PDF: draw it, type it or use an image, then drag it into place.', category: 'edit', input: 'pdf', keywords: 'sign signature esign e-sign autograph', popular: true }),
  t({ id: 'edit-pdf', name: 'Edit PDF', description: 'Add text anywhere, or cover existing text and type a replacement.', tagline: 'Click text to replace it, add new text boxes or cover areas, style the text, then download the edited PDF.', category: 'edit', input: 'pdf', keywords: 'edit pdf text change replace modify correct typo add text whiteout cover editor', popular: false }),
  t({ id: 'annotate-pdf', name: 'Annotate PDF', description: 'Highlight text, draw, and add text or images on top of pages.', tagline: 'Highlight selectable text, draw freehand on scanned pages, and place text boxes and images, then download the copy.', category: 'edit', input: 'pdf', keywords: 'annotate highlight mark draw pen markup text box add image overlay' }),
  t({ id: 'add-page-numbers', name: 'Add page numbers', description: 'Number pages with your choice of position, format and size.', tagline: 'Add page numbers like “Page 3 of 10” to every page or a range.', category: 'edit', input: 'pdf', keywords: 'page numbers numbering footer header' }),
  t({ id: 'add-watermark', name: 'Add watermark', description: 'Stamp text or an image on pages with opacity and rotation.', tagline: 'Add a text or image watermark such as CONFIDENTIAL or your logo.', category: 'edit', input: 'pdf', keywords: 'watermark stamp confidential draft logo' }),
  t({ id: 'crop-pdf', name: 'Crop PDF', description: 'Trim page margins by changing the visible page area.', tagline: 'Drag the crop edges on a page preview and apply them to one page or many.', category: 'edit', input: 'pdf', keywords: 'crop trim margins cut page size' }),
  t({ id: 'fill-pdf-form', name: 'Fill PDF form', description: 'Fill in text boxes, checkboxes and choices in PDF forms.', tagline: 'Type into a PDF’s form fields and download the filled copy, optionally flattened.', category: 'edit', input: 'pdf', keywords: 'fill form fields acroform application' }),
  t({ id: 'compare-pdf', name: 'Compare PDF', description: 'Find text and visual differences between two PDFs.', tagline: 'See words that were added, removed or changed, and a page-by-page visual difference.', category: 'edit', input: 'pdfs', keywords: 'compare diff difference versions changes' }),
  // Security
  t({ id: 'lock-pdf', name: 'Lock PDF', description: 'Protect a PDF with a password using AES-256 encryption.', tagline: 'Encrypt a PDF so it can only be opened with your password.', category: 'security', input: 'pdf', keywords: 'lock password protect encrypt secure' }),
  t({ id: 'unlock-pdf', name: 'Unlock PDF', description: 'Remove a password you know from a protected PDF.', tagline: 'Enter the PDF’s password to save a copy that opens without one.', category: 'security', input: 'pdf', keywords: 'unlock remove password decrypt open' }),
  t({ id: 'redact-pdf', name: 'Redact PDF', description: 'Permanently black out text and areas, removing what’s underneath.', tagline: 'Search for words or draw boxes, then create a copy where that content is permanently removed.', category: 'security', input: 'pdf', keywords: 'redact black out censor hide remove sensitive private' }),
  t({ id: 'pdf-metadata', name: 'PDF metadata', description: 'Inspect, edit or remove a PDF’s title, author and other metadata.', tagline: 'See what a PDF says about itself, edit the fields or strip them all.', category: 'security', input: 'pdf', keywords: 'metadata properties author title producer remove inspect' }),
  // Images
  t({ id: 'resize-image', name: 'Resize image', description: 'Set exact pixel dimensions and export as JPG, PNG or WebP.', tagline: 'Resize an image to exact dimensions, with or without keeping its aspect ratio.', category: 'image', input: 'image', keywords: 'resize scale image photo dimensions width height' }),
  t({ id: 'crop-image', name: 'Crop image', description: 'Crop an image, or straighten a photographed page.', tagline: 'Drag the corners to crop. Tilted areas are straightened with perspective correction.', category: 'image', input: 'image', keywords: 'crop image photo trim cut' }),
  t({ id: 'rotate-image', name: 'Rotate image', description: 'Rotate or flip an image.', tagline: 'Turn an image by 90° steps or flip it, and download it.', category: 'image', input: 'image', keywords: 'rotate flip mirror image photo' }),
  t({ id: 'filter-image', name: 'Image filters', description: 'Apply Enhance, Magic Color, B&W and five more filters.', tagline: 'Apply the eight Snap Scanner filters to an image.', category: 'image', input: 'image', keywords: 'filter enhance black white grayscale sepia sharpen bright photo' }),
  t({ id: 'convert-image', name: 'Convert image', description: 'Convert images between JPG, PNG and WebP.', tagline: 'Change an image’s format, with quality control for JPG and WebP.', category: 'image', input: 'image', keywords: 'convert image format jpg png webp gif bmp' }),
  t({ id: 'image-to-webp', name: 'PNG/JPG to WebP', description: 'Convert PNG and JPG images to WebP in batches, with a quality setting.', tagline: 'Convert PNG and JPG images to WebP with a quality slider, see the size change and download them one by one or as a ZIP.', category: 'image', input: 'images', keywords: 'webp convert png jpg jpeg optimize compress smaller web images batch' }),
  t({ id: 'qr-code-generator', name: 'QR Code Generator', description: 'Create QR codes for links, text, email, phone numbers and Wi-Fi.', tagline: 'Create a QR code for a website, text, email, phone number or Wi-Fi network, style it and download it as PNG or SVG.', category: 'create', input: 'none', keywords: 'qr code generator barcode link url wifi email phone text scan' }),
  // Create
  t({ id: 'resume-builder', name: 'Resume Builder', description: 'Write your resume with 20 templates and 9 color palettes, then export a PDF.', tagline: 'Pick a template, fill in your details with a live preview and download a PDF.', category: 'create', href: '/resume-builder', input: 'none', keywords: 'resume cv builder maker template job', popular: true }),
  t({ id: 'id-card-maker', name: 'ID Card Maker', description: 'Design employee, student and event ID cards with photo, logo and QR code.', tagline: 'Pick one of 26 templates, add a photo and details, and download a PDF or PNG of both sides.', category: 'create', href: '/create/id-cards', input: 'none', keywords: 'id card badge employee student identity staff visitor lanyard maker template' }),
  t({ id: 'invoice-maker', name: 'Invoice Maker', description: 'Create invoices with line items, discounts, taxes and any currency.', tagline: 'Pick one of 25 templates, add line items and taxes, and download a PDF with exact totals.', category: 'create', href: '/create/invoices', input: 'none', keywords: 'invoice bill receipt billing gst vat tax quote estimate maker template' }),
  t({ id: 'business-card-maker', name: 'Business Card Maker', description: 'Design two-sided business cards with bleed guides and a print PDF.', tagline: 'Pick one of 26 templates, add your details and logo, and download a print PDF or PNG.', category: 'create', href: '/create/business-cards', input: 'none', keywords: 'business card visiting card contact print maker template' }),
  t({ id: 'certificate-maker', name: 'Certificate Maker', description: 'Make certificates of achievement and completion with seals and signatures.', tagline: 'Pick one of 26 templates, add names, signatures and a logo, and download a PDF or PNG.', category: 'create', href: '/create/certificates', input: 'none', keywords: 'certificate award achievement completion diploma appreciation maker template' }),
  t({ id: 'photo-collage-maker', name: 'Photo Collage Maker', description: 'Arrange photos in grids, mosaics and scrapbook layouts.', tagline: 'Pick one of 26 layouts, drag photos into frames, add captions and download PNG, JPG or PDF.', category: 'create', href: '/create/photo-collages', input: 'none', keywords: 'photo collage grid mosaic picture layout scrapbook polaroid maker' }),
  t({ id: 'letterhead-maker', name: 'Letterhead Maker', description: 'Design a letterhead with your logo and contact details, and write the letter in it.', tagline: 'Pick one of 27 templates, add your details, write the letter or leave it blank, and download a PDF.', category: 'create', href: '/create/letterheads', input: 'none', keywords: 'letterhead letter head company stationery business letter template maker' }),
  t({ id: 'festival-greeting-maker', name: 'Festival Greeting Maker', description: 'Make Diwali, New Year, Christmas, Holi, Eid and other festival greetings.', tagline: 'Pick one of 32 festival templates, add your wishes, name, photo or logo, and download a PNG, JPG or PDF.', category: 'create', href: '/create/festival-greetings', input: 'none', keywords: 'festival greeting card wishes diwali deepavali new year christmas holi eid ramadan raksha bandhan rakhi ganesh chaturthi navratri dussehra sankranti pongal onam lohri easter thanksgiving lunar chinese new year hanukkah poster status post' }),
]

/**
 * Pages that open another tool with a narrower file filter (JPG, PNG and WebP
 * to PDF are Images to PDF limited to one format). They aren't separate tools.
 */
export const FORMAT_VARIANTS: ToolId[] = ['jpg-to-pdf', 'png-to-pdf', 'webp-to-pdf']

/** Distinct working tools on the website, as advertised in the home page stats. */
export const DISTINCT_TOOL_COUNT = TOOLS.filter((t) => !FORMAT_VARIANTS.includes(t.id)).length

export function tool(id: ToolId): Tool {
  const found = TOOLS.find((x) => x.id === id)
  if (!found) throw new Error(`Unknown tool: ${id}`)
  return found
}

export function toolsIn(category: ToolCategoryId) {
  return TOOLS.filter((x) => x.category === category)
}

/** Case-insensitive match on name, description and keywords; every word must match. */
export function searchTools(query: string, category?: ToolCategoryId | 'all'): Tool[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return TOOLS.filter((x) => {
    if (category && category !== 'all' && x.category !== category) return false
    const hay = `${x.name} ${x.description} ${x.keywords}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}
