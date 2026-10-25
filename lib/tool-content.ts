// Extra copy for each /tools page: supported formats, typical uses and a short
// FAQ. Shown on the page (and as FAQPage structured data), so every answer must
// describe what the tool really does. Limits come from lib/limits.ts.
import type { FaqItem } from '@/lib/content'
import type { ToolId } from '@/lib/tools'

export interface ToolContent {
  /** What the tool accepts and what it produces. */
  formats: { input: string; output: string }
  /** Real situations the tool helps with. */
  uses: string[]
  /** Questions specific to this tool. */
  faq: FaqItem[]
}

const PDF_IN = 'PDF, up to 150 MB'
const IMAGE_IN = 'JPG, PNG, WebP, GIF (first frame) or BMP, up to 40 MB'

const NEEDS_PASSWORD: FaqItem = {
  question: 'Does it work with password-protected PDFs?',
  answer: 'Yes, if you know the password: you’re asked for it when the file opens. The result is saved without a password, so use Lock PDF afterwards if it needs protecting again.',
}

/** Content for every tool under /tools. Create tools have their own landing pages. */
export const TOOL_CONTENT: Partial<Record<ToolId, ToolContent>> = {
  'merge-pdf': {
    formats: { input: 'Two or more PDFs, up to 60 files of 150 MB each', output: 'One combined PDF' },
    uses: ['Put a cover letter, CV and certificates into one application file', 'Combine monthly statements or invoices for your records', 'Join chapters or scanned sections of a report'],
    faq: [
      { question: 'Can I change the order of the files before merging?', answer: 'Yes. Drag the files into the order you want, or use the arrow buttons. The pages of each file stay in their original order; use Organize PDF afterwards to reorder individual pages.' },
      { question: 'Does merging reduce the quality of my PDFs?', answer: 'No. Pages are copied as they are, without re-compressing images, so text stays selectable and quality doesn’t change. The merged file is roughly the size of the originals added together.' },
      NEEDS_PASSWORD,
    ],
  },
  'split-pdf': {
    formats: { input: PDF_IN, output: 'One PDF per range, downloaded separately or as a ZIP' },
    uses: ['Send only the relevant chapter of a long report', 'Break a scanned batch into separate documents', 'Split a file that’s too large to email into smaller parts'],
    faq: [
      { question: 'How do I write page ranges?', answer: 'Separate ranges with commas, for example 1-3, 5, 8-10. Each range becomes its own PDF. Write “4-” to go from page 4 to the end.' },
      { question: 'What’s the difference between Split PDF and Extract pages?', answer: 'Split PDF is for cutting a document into several files. Extract pages is for pulling a selection of pages out into one new PDF.' },
      NEEDS_PASSWORD,
    ],
  },
  'remove-pages': {
    formats: { input: PDF_IN, output: 'The same PDF without the deleted pages' },
    uses: ['Delete blank pages left over from double-sided scanning', 'Remove a cover sheet or terms pages before sharing', 'Drop outdated pages from a document'],
    faq: [
      { question: 'Is my original file changed?', answer: 'No. You download a new copy without the selected pages; the file on your device stays as it was.' },
      { question: 'Can I remove every page?', answer: 'No, at least one page has to remain. To take a few pages out into their own file instead, use Extract pages.' },
    ],
  },
  'extract-pages': {
    formats: { input: PDF_IN, output: 'A new PDF with only the chosen pages, or one PDF per custom range' },
    uses: ['Pull the signed page out of a contract', 'Save one receipt from a multi-page scan', 'Share a single section of a manual'],
    faq: [
      { question: 'Can I link to this tool with pages already chosen?', answer: 'Yes. Add ?pages= to the address, for example /tools/extract-pages?pages=2-5, and those pages are preselected when you open a PDF.' },
      { question: 'Are extracted pages re-compressed?', answer: 'No. Pages are copied without re-encoding, so text and images look exactly as they did.' },
    ],
  },
  'organize-pdf': {
    formats: { input: PDF_IN, output: 'A PDF with the new page order' },
    uses: ['Fix pages that were scanned out of order', 'Duplicate a form page to fill it in twice', 'Rotate sideways pages and delete extras in one pass'],
    faq: [
      { question: 'Can I reorder pages on a phone?', answer: 'Yes. Drag thumbnails by touch, or use the arrow buttons under each page. Keyboard users can pick a page up with Space and move it with the arrow keys.' },
      { question: 'Is rotation saved in the file?', answer: 'Yes. The rotation is written into the PDF, so every viewer shows the page the right way up.' },
    ],
  },
  'rotate-pdf': {
    formats: { input: PDF_IN, output: 'The same PDF with rotated pages' },
    uses: ['Fix landscape pages that show up sideways', 'Turn upside-down scanned pages', 'Rotate a whole document for printing'],
    faq: [
      { question: 'Does rotating a PDF lower its quality?', answer: 'No. Only the page’s rotation setting changes; the text and images inside aren’t re-encoded.' },
      { question: 'Can I rotate just one page?', answer: 'Yes. Use the buttons under each thumbnail to rotate single pages, or rotate all pages at once.' },
    ],
  },
  'compress-pdf': {
    formats: { input: PDF_IN, output: 'A smaller PDF, if it can be made smaller' },
    uses: ['Get a scanned PDF under an email or upload size limit', 'Shrink photo-heavy reports before sharing', 'Save storage on large image PDFs'],
    faq: [
      { question: 'How much smaller will my PDF get?', answer: 'It depends on what’s inside. PDFs made of photos or scans usually shrink the most; text-only PDFs often can’t get much smaller. You see both sizes before downloading, and if the result isn’t smaller the original is kept.' },
      { question: 'Which compression level should I pick?', answer: 'High gives the smallest file and is fine for reading on screen. Medium is a balance. Low keeps images closest to the original, which suits printing.' },
      { question: 'Will the text become blurry?', answer: 'No. Only photos and scans inside the PDF are recompressed. Text, fonts and vector graphics are left untouched.' },
    ],
  },
  'repair-pdf': {
    formats: { input: 'A damaged PDF, up to 150 MB', output: 'A rebuilt PDF, or the readable pages as an image-based PDF' },
    uses: ['Open a PDF that viewers say is damaged', 'Recover pages from an interrupted download', 'Rescue what’s readable from a corrupt attachment'],
    faq: [
      { question: 'Can every damaged PDF be repaired?', answer: 'No. Broken cross-reference tables and damaged trailers can often be fixed. Truncated or overwritten content usually can’t be recovered, because the data is no longer in the file.' },
      { question: 'What does the image fallback do?', answer: 'If rebuilding fails, it renders every page that can still be read into a new PDF. The pages look the same, but their text is no longer selectable; OCR PDF can make it searchable again.' },
    ],
  },
  'ocr-pdf': {
    formats: { input: 'A scanned PDF, up to 150 MB; English, Spanish, French, German, Portuguese or Hindi', output: 'A searchable PDF and a .txt file of the recognized text' },
    uses: ['Search inside scanned contracts and letters', 'Copy text out of a scanned page', 'Prepare a scan for PDF to Word or Compare PDF'],
    faq: [
      { question: 'Is OCR done on a server?', answer: 'No. Text is recognized by Tesseract, an open-source OCR engine, running in your browser. The language model is downloaded from this website the first time you use a language.' },
      { question: 'How accurate is the OCR?', answer: 'Clear, printed text at a good resolution is usually recognized well. Handwriting, low-resolution scans and unusual fonts produce more errors, so check important text.' },
      { question: 'Does it work with Hindi?', answer: 'Hindi text is recognized and included in the .txt file. The PDF’s searchable layer uses a Latin font, so Hindi words may not be searchable inside the PDF itself.' },
    ],
  },
  'scan-pdf': {
    formats: { input: 'Your camera, or JPG, PNG, WebP, GIF or BMP photos (up to 60 pages)', output: 'A multipage PDF' },
    uses: ['Scan receipts and bills for expenses', 'Turn photos of a signed form into one PDF', 'Digitize handwritten notes or whiteboards'],
    faq: [
      { question: 'Do I need to install an app to scan?', answer: 'No. Scan to PDF works in a mobile or desktop browser with your camera or existing photos. The Android app adds Google’s ML Kit scanner for more reliable automatic edge detection.' },
      { question: 'Why isn’t the camera working?', answer: 'The browser needs your permission and a secure (https) connection. If the camera is blocked or unavailable, upload photos instead; on phones, Take photo opens your camera app.' },
      { question: 'Which filter is best for documents?', answer: 'B&W gives crisp black text on white and handles uneven lighting well. Enhance and Magic Color keep colour while improving contrast, which suits forms with stamps or highlights.' },
    ],
  },
  'image-to-pdf': {
    formats: { input: `${IMAGE_IN}; up to 60 images`, output: 'One PDF, one image per page' },
    uses: ['Combine photos of documents into one file', 'Make a PDF portfolio from screenshots or designs', 'Send several pictures as a single attachment'],
    faq: [
      { question: 'Can I convert iPhone HEIC photos?', answer: 'Most browsers can’t read HEIC, so convert the photos to JPG first (iPhones can do this when sharing, or set Camera → Formats → Most Compatible).' },
      { question: 'What page size should I choose?', answer: 'Fit image makes each page exactly the size of its image. A4 or Letter scales images to fit inside the margins, which is best for printing.' },
    ],
  },
  'jpg-to-pdf': {
    formats: { input: 'JPG or JPEG images, up to 40 MB each and 60 per PDF', output: 'One PDF, one photo per page' },
    uses: ['Turn phone photos into a PDF for a form or application', 'Combine scanned JPG pages into one document'],
    faq: [
      { question: 'Will my photos be rotated correctly?', answer: 'Yes. The camera orientation stored in the photo (EXIF) is applied automatically, and you can rotate any image before converting.' },
      { question: 'Can I mix JPG and PNG files?', answer: 'Not on this page, which only accepts JPG. Use Images to PDF to combine JPG, PNG, WebP, GIF and BMP files.' },
    ],
  },
  'png-to-pdf': {
    formats: { input: 'PNG images, up to 40 MB each and 60 per PDF', output: 'One PDF, one image per page' },
    uses: ['Save a series of screenshots as one PDF', 'Turn exported diagrams or slides into a document'],
    faq: [
      { question: 'What happens to transparent areas?', answer: 'Transparent parts of a PNG are placed on a white page.' },
      { question: 'Can I mix PNG and JPG files?', answer: 'Not on this page, which only accepts PNG. Use Images to PDF to combine different formats.' },
    ],
  },
  'webp-to-pdf': {
    formats: { input: 'WebP images, up to 40 MB each and 60 per PDF', output: 'One PDF, one image per page' },
    uses: ['Save images downloaded from websites (often WebP) as a PDF', 'Combine WebP product photos into a catalogue'],
    faq: [
      { question: 'Are animated WebP files supported?', answer: 'They’re converted using their first frame.' },
      { question: 'Can I mix WebP with other formats?', answer: 'Not on this page, which only accepts WebP. Use Images to PDF to combine different formats.' },
    ],
  },
  'html-to-pdf': {
    formats: { input: 'Pasted HTML or an .html file', output: 'A PDF saved with your browser’s print dialog' },
    uses: ['Turn an HTML email template or report into a PDF', 'Save generated HTML (receipts, exports) as a document'],
    faq: [
      { question: 'Can I convert a website by entering its URL?', answer: 'No. This tool converts HTML you paste or open. It doesn’t fetch live web pages; to save a page you’re viewing, use your browser’s Print → Save as PDF.' },
      { question: 'Why are my images missing?', answer: 'For safety, content from other websites isn’t loaded. Embed images as data URLs in the HTML and they will appear.' },
    ],
  },
  'word-to-pdf': {
    formats: { input: 'Word documents (.docx); older .doc files aren’t supported', output: 'A PDF with selectable text' },
    uses: ['Send a CV or cover letter as a PDF', 'Share a report that looks the same on every device', 'Convert a document when Word isn’t installed'],
    faq: [
      { question: 'Will the PDF look exactly like Word?', answer: 'Usually very close. Text, tables, images, headers, footers and page numbers are kept, and fonts with the same widths as Calibri, Cambria, Arial, Times New Roman and Courier New are used, so lines usually break where Word breaks them, but not always.' },
      { question: 'What isn’t converted?', answer: 'Charts and SmartArt appear as labelled placeholders; shapes and equations aren’t drawn. Floating images and text boxes are placed in line, footnotes move to the end, and multi-column sections become one column.' },
      { question: 'Can I convert a .doc file?', answer: 'Not directly. Open it in Word, LibreOffice or Google Docs and save it as .docx first. Password-protected documents need to be saved without a password too.' },
    ],
  },
  'pdf-to-jpg': {
    formats: { input: PDF_IN, output: 'JPG images at 72, 150 or 300 dpi, one per page, or a ZIP' },
    uses: ['Post a PDF page on social media or in a chat', 'Insert a page into a presentation as a picture', 'Make thumbnails or previews of documents'],
    faq: [
      { question: 'Which resolution should I choose?', answer: '150 dpi is a good default for sharing on screen. 300 dpi suits printing but makes larger files. 72 dpi gives small previews.' },
      { question: 'Can I convert only some pages?', answer: 'Yes. Choose which pages to convert, then download them one by one or all together as a ZIP.' },
    ],
  },
  'pdf-to-png': {
    formats: { input: PDF_IN, output: 'Lossless PNG images at 72, 150 or 300 dpi, or a ZIP' },
    uses: ['Get sharp images of diagrams and text pages', 'Capture a page for documentation or slides'],
    faq: [
      { question: 'Should I use PNG or JPG?', answer: 'PNG is lossless, so text and line drawings stay crisp, but files are larger. JPG is smaller and better for photos.' },
      { question: 'Why are some very large pages scaled down?', answer: 'Huge pages at high resolution can exceed what a browser can hold in memory, so they’re reduced to a size your device can handle.' },
    ],
  },
  'pdf-to-text': {
    formats: { input: PDF_IN, output: 'A plain .txt file, or text copied to the clipboard' },
    uses: ['Copy the text of a report into another app', 'Feed document text into a search or notes tool', 'Quote passages without retyping'],
    faq: [
      { question: 'Why is the output empty?', answer: 'The PDF is probably a scan, so its pages are images with no text layer. Run OCR PDF first, then convert.' },
      { question: 'Is the text changed or summarized?', answer: 'No. Only the text that’s really in the PDF is extracted, page by page; nothing is guessed or rewritten. Columns and tables may need tidying.' },
    ],
  },
  'pdf-to-markdown': {
    formats: { input: PDF_IN, output: 'A Markdown (.md) file' },
    uses: ['Move document text into a wiki, README or notes app', 'Prepare PDF content for a static site or docs'],
    faq: [
      { question: 'How are headings detected?', answer: 'Lines in a larger font than the body text become headings, and lines starting with bullets or numbers become lists.' },
      { question: 'Are tables and images converted?', answer: 'No. Tables, columns, images and links aren’t converted to Markdown; their text comes through as paragraphs where it can be read.' },
    ],
  },
  'pdf-to-word': {
    formats: { input: PDF_IN, output: 'An editable Word document (.docx)' },
    uses: ['Update an old CV or letter you only have as a PDF', 'Reuse text and tables from a report', 'Make corrections that need real editing in Word'],
    faq: [
      { question: 'Can it convert scanned PDFs to Word?', answer: 'Yes, with OCR. Text on scanned pages is recognized on your device and added as editable text. Without OCR, scanned pages are added as pictures.' },
      { question: 'Will the layout be exactly the same?', answer: 'Paragraphs, headings, bold and italic, lists, simple tables, two-column layouts and images are rebuilt. Text colours, charts, lines, shapes and form fields aren’t, and complex layouts such as magazines may need tidying.' },
      NEEDS_PASSWORD,
    ],
  },
  'pdf-reader': {
    formats: { input: PDF_IN, output: 'Nothing is saved unless you annotate or open another tool' },
    uses: ['Read a PDF on a computer without a PDF app', 'Find a word in a long document', 'Check a file before signing or sending it'],
    faq: [
      { question: 'Why can’t I search a scanned PDF?', answer: 'Scanned pages are pictures, so they have no text to search. Run OCR PDF to add a searchable text layer.' },
      { question: 'Does rotating the view change my file?', answer: 'No. Rotation in the reader only changes how you see the page. Use Rotate PDF to save a rotation.' },
    ],
  },
  'sign-pdf': {
    formats: { input: `${PDF_IN}; signature drawn, typed or as an image`, output: 'A signed copy of the PDF' },
    uses: ['Sign a rental agreement or offer letter', 'Add your signature to a form without printing it', 'Initial several pages of a document'],
    faq: [
      { question: 'Is the signature legally valid?', answer: 'It’s a visible electronic signature image. It isn’t a certificate-based digital signature and doesn’t verify identity. Many recipients accept it, but some contracts and forms require a specific type, so check what’s needed.' },
      { question: 'Is my signature saved?', answer: 'No. Signatures you create stay in this tab only and are discarded when you leave the page.' },
    ],
  },
  'edit-pdf': {
    formats: { input: PDF_IN, output: 'An edited copy of the PDF' },
    uses: ['Fix a typo or date in a PDF you can’t edit at the source', 'Add a note, address or reference number to a page', 'Cover an old value and type a new one'],
    faq: [
      { question: 'Does replacing text delete the old text?', answer: 'No. The old text is covered with a solid colour and the new text is drawn on top, so the old words may still be found by search or copying. To remove content permanently, use Redact PDF.' },
      { question: 'Will new text match the document’s font?', answer: 'New text uses the standard PDF fonts (Helvetica, Times and Courier), so it may not match exactly. Pick the closest one and adjust the size and colour.' },
      { question: 'Can I change text on a scanned page?', answer: 'Click-to-replace needs real text in the PDF. On scanned pages, drag around the area to cover it and type over it, or run OCR PDF first.' },
    ],
  },
  'annotate-pdf': {
    formats: { input: PDF_IN, output: 'An annotated copy of the PDF' },
    uses: ['Highlight key passages while studying', 'Mark up a draft with comments and drawings', 'Circle details on a scanned page'],
    faq: [
      { question: 'Can I highlight a scanned PDF?', answer: 'Text highlighting needs selectable text. On scanned pages, use the Marker to draw highlights by hand.' },
      { question: 'Can annotations be edited later?', answer: 'No. They’re drawn into the pages of the new copy, so they look the same everywhere but aren’t separate, editable comments.' },
    ],
  },
  'add-page-numbers': {
    formats: { input: PDF_IN, output: 'A PDF with page numbers drawn on the pages' },
    uses: ['Number a thesis, report or legal bundle', 'Add “Page X of Y” before printing', 'Start numbering after a cover page'],
    faq: [
      { question: 'Can I skip the cover page?', answer: 'Yes. Choose which pages to number and set the first number, so numbering can start on page 2 with “1”.' },
      { question: 'Which formats can I use?', answer: '“3”, “Page 3”, “3 of 10”, “Page 3 of 10” or “- 3 -”, in the position, size and colour you choose.' },
    ],
  },
  'add-watermark': {
    formats: { input: `${PDF_IN}; text, or a JPG or PNG image`, output: 'A watermarked copy of the PDF' },
    uses: ['Mark drafts as DRAFT or CONFIDENTIAL', 'Brand documents with your logo', 'Discourage reuse of shared copies'],
    faq: [
      { question: 'Can a watermark be removed?', answer: 'It’s drawn into the page content, which discourages copying, but someone with PDF editing tools can still remove it. For stronger protection, combine it with Lock PDF.' },
      { question: 'Can I watermark only some pages?', answer: 'Yes. Choose the pages, then set position, size, opacity and rotation.' },
    ],
  },
  'crop-pdf': {
    formats: { input: PDF_IN, output: 'A PDF with a smaller visible page area' },
    uses: ['Trim wide white margins for reading on a phone', 'Cut scanner borders from pages', 'Focus on one part of a page'],
    faq: [
      { question: 'Is cropped content deleted?', answer: 'No. Cropping changes the visible page area (CropBox); content outside it is hidden and can be restored in other editors. Use Redact PDF to remove content permanently.' },
      { question: 'Can I crop all pages the same way?', answer: 'Yes. Set the crop on one page and apply it to that page, a range or every page.' },
    ],
  },
  'fill-pdf-form': {
    formats: { input: 'A PDF form with fillable (AcroForm) fields, up to 150 MB', output: 'A filled PDF, optionally flattened' },
    uses: ['Complete an application or registration form', 'Fill in a tax or HR form without printing'],
    faq: [
      { question: 'Why are no fields shown?', answer: 'The PDF probably has no interactive fields, or uses XFA, a format some government forms use that browsers can’t fill. For flat forms, add text with Annotate PDF or Edit PDF.' },
      { question: 'What does flattening do?', answer: 'It makes your answers part of the page, so they can no longer be changed in the form fields.' },
    ],
  },
  'compare-pdf': {
    formats: { input: 'Two PDFs, up to 150 MB each', output: 'A highlighted text comparison and a page-by-page visual difference' },
    uses: ['Check what changed between two contract drafts', 'Review edits in a returned document', 'Spot layout changes between versions'],
    faq: [
      { question: 'Can I compare scanned PDFs?', answer: 'The visual comparison works on any PDF. Text comparison needs a text layer, so run OCR PDF on scans first.' },
      { question: 'Is the comparison suitable for legal review?', answer: 'It’s a helpful guide, not a certified comparison. Reflowed text can appear as removed and added, so check important changes yourself.' },
    ],
  },
  'lock-pdf': {
    formats: { input: PDF_IN, output: 'A password-protected PDF (AES-256)' },
    uses: ['Protect payslips, bank statements or ID copies before emailing', 'Share confidential reports', 'Store personal documents more safely'],
    faq: [
      { question: 'How strong is the encryption?', answer: 'Files are encrypted with AES-256, the strongest password protection in the PDF standard. A long, unique password matters as much as the encryption.' },
      { question: 'What if I forget the password?', answer: 'It can’t be recovered. The password isn’t stored or sent anywhere, so keep it somewhere safe.' },
      { question: 'Will the locked PDF open everywhere?', answer: 'Adobe Acrobat, Chrome, Edge, Firefox, macOS Preview and current PDF apps open it with the password. Very old readers without AES-256 support may not.' },
    ],
  },
  'unlock-pdf': {
    formats: { input: 'A password-protected PDF (AES-256, AES-128 or RC4) and its password', output: 'A copy that opens without a password' },
    uses: ['Stop typing the password every time you open your own statement', 'Prepare a protected file for merging or compressing'],
    faq: [
      { question: 'Can it unlock a PDF if I don’t know the password?', answer: 'No. You must enter the current password. The tool doesn’t guess, crack or bypass passwords.' },
      { question: 'Why won’t my PDF unlock?', answer: 'Check the password, including capital letters. PDFs protected with certificates or digital rights management (DRM) can’t be unlocked here.' },
    ],
  },
  'redact-pdf': {
    formats: { input: PDF_IN, output: 'A redacted copy, checked for the marked text' },
    uses: ['Hide account or ID numbers before sharing a statement', 'Remove names from documents for privacy', 'Black out confidential sections of a contract'],
    faq: [
      { question: 'Is redacted text really removed?', answer: 'Yes. Each page with a redaction is rebuilt as an image with the black boxes burned in, so the text underneath is gone, and the copy is checked to confirm searched words no longer appear.' },
      { question: 'What happens to pages without redactions?', answer: 'They’re copied unchanged and keep their selectable text. Redacted pages lose selectable text, and the original’s metadata, bookmarks and attachments aren’t carried over.' },
    ],
  },
  'pdf-metadata': {
    formats: { input: PDF_IN, output: 'A copy with edited or removed metadata' },
    uses: ['Remove the author name before publishing a PDF', 'Set a proper title for documents shown in browsers', 'Check a suspicious PDF for attachments or scripts'],
    faq: [
      { question: 'What does removing metadata delete?', answer: 'The document information (title, author, subject, keywords, creator, producer and dates) and XMP metadata. Text on the pages isn’t changed.' },
      { question: 'Why does it show JavaScript and attachments?', answer: 'PDFs can carry scripts and embedded files. They’re listed so you can decide whether to trust a document before opening it elsewhere.' },
    ],
  },
  'resize-image': {
    formats: { input: IMAGE_IN, output: 'JPG, PNG or WebP, up to 8000 px on each side' },
    uses: ['Meet the photo size required by an application form', 'Shrink photos for email or a website', 'Make images a consistent size for a gallery'],
    faq: [
      { question: 'Can I resize without stretching the image?', answer: 'Yes. Keep the aspect ratio locked and enter a width or height; the other side updates automatically.' },
      { question: 'Does enlarging an image add detail?', answer: 'No. A larger image will look softer, because detail that wasn’t captured can’t be created.' },
    ],
  },
  'crop-image': {
    formats: { input: IMAGE_IN, output: 'JPG, PNG or WebP' },
    uses: ['Crop a photo of a document to the page', 'Straighten a photographed whiteboard or poster', 'Cut out a part of a screenshot'],
    faq: [
      { question: 'Can it straighten a tilted page?', answer: 'Yes. Drag the four corners onto the page’s corners; non-rectangular areas are straightened with perspective correction.' },
      { question: 'Is there a size limit?', answer: 'Images up to 40 MB open, and images larger than 4000 px on the long side are scaled down for editing.' },
    ],
  },
  'rotate-image': {
    formats: { input: IMAGE_IN, output: 'JPG, PNG or WebP' },
    uses: ['Fix a sideways phone photo', 'Mirror a selfie or a scanned image'],
    faq: [
      { question: 'Why does my photo already look upright?', answer: 'The camera’s orientation (EXIF) is applied when the image opens, so you only need to rotate if it still looks wrong.' },
      { question: 'Can I flip an image?', answer: 'Yes, horizontally or vertically, as well as rotating it in 90° steps.' },
    ],
  },
  'filter-image': {
    formats: { input: IMAGE_IN, output: 'JPG, PNG or WebP' },
    uses: ['Make a photographed document easier to read', 'Turn a photo black and white or sepia', 'Brighten a dark picture of a page'],
    faq: [
      { question: 'Which filters are available?', answer: 'Enhance, Original, Magic Color, Sharpen, Bright, Grayscale, B&W and Sepia: the same eight filters as the Snap Scanner app.' },
      { question: 'Which filter is best for text?', answer: 'B&W uses adaptive thresholding, which keeps text sharp even when the lighting is uneven.' },
    ],
  },
  'convert-image': {
    formats: { input: IMAGE_IN, output: 'JPG, PNG or WebP' },
    uses: ['Turn a PNG screenshot into a smaller JPG', 'Convert a WebP download to JPG or PNG', 'Change a BMP or GIF into a modern format'],
    faq: [
      { question: 'Does converting to JPG keep transparency?', answer: 'No. JPG has no transparency, so transparent areas become white. Choose PNG or WebP to keep them.' },
      { question: 'Can I convert several images at once?', answer: 'This tool converts one image at a time. To convert many PNG or JPG files to WebP, use PNG/JPG to WebP, which works in batches.' },
    ],
  },
  'image-to-webp': {
    formats: { input: 'PNG and JPG images, in batches', output: 'WebP images, one by one or as a ZIP' },
    uses: ['Make website images smaller for faster pages', 'Convert a folder of product photos for an online shop'],
    faq: [
      { question: 'Will WebP always be smaller?', answer: 'Usually, but not always. Already-optimized images can get larger; the real size of each file is shown and you’re told when that happens.' },
      { question: 'Is transparency kept?', answer: 'Yes. Transparent areas in PNGs stay transparent in the WebP.' },
    ],
  },
  'qr-code-generator': {
    formats: { input: 'A link, text, email, phone number or Wi-Fi details', output: 'A QR code as PNG or SVG' },
    uses: ['Share Wi-Fi with guests', 'Link a poster, menu or business card to a website', 'Let people email or call you with one scan'],
    faq: [
      { question: 'Do the QR codes expire?', answer: 'No. The information is stored in the code itself, not on a server, so it works as long as the link or details inside it are valid. That also means it can’t be edited after printing.' },
      { question: 'Should I download PNG or SVG?', answer: 'SVG stays sharp at any size, which is best for printing and design software. PNG is easiest for documents, chats and social media.' },
      { question: 'Why won’t my QR code scan?', answer: 'Use a dark code on a light background, keep a clear margin around it and print it large enough. Always test it with a phone before printing.' },
    ],
  },
}
