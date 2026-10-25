// FAQ copy shared by the home page and support page.

export interface FaqItem {
  question: string
  answer: string
}

export const HOME_FAQ: FaqItem[] = [
  {
    question: 'Are my files uploaded to a server?',
    answer:
      'No. The website’s tools run in your browser: PDFs and images are read, processed and saved on your device, and the site has no upload server. A file only leaves your device when you choose to share or send it yourself.',
  },
  {
    question: 'Is it free? Do I need an account?',
    answer: 'Every tool on the website is free to use, with no sign-up, no watermarks and no account.',
  },
  {
    question: 'Where are files in My files stored?',
    answer:
      'In your browser’s storage (IndexedDB) on this device. They stay after you close the tab, but they don’t sync to other devices or to the Android app, your browser may remove them if the device runs low on space, and clearing site data deletes them. Keep copies of important files.',
  },
  {
    question: 'How does Compress PDF make files smaller?',
    answer:
      'It scales down and re-saves the photos and scans inside the PDF as JPEG, removes unused data and saves the file efficiently. Text and vector graphics aren’t changed. If a PDF can’t be made smaller, you’ll be told and the original is kept.',
  },
  {
    question: 'How secure is Lock PDF?',
    answer:
      'Lock PDF encrypts files with AES-256, the strongest password protection in the PDF standard. Your password stays in your browser and isn’t stored, so it can’t be recovered if you forget it.',
  },
  {
    question: 'Is the signature from Sign PDF legally binding?',
    answer:
      'Sign PDF adds a visible electronic signature image to the page. It isn’t a certificate-based digital signature and doesn’t verify identity. Whether it’s accepted depends on the document and the recipient.',
  },
  {
    question: 'Can I search or edit the text of a scanned document?',
    answer:
      'Scanned pages are images. OCR PDF can recognize their text on your device and add an invisible text layer, so the PDF becomes searchable and selectable; recognition isn’t always perfect. Existing PDF text can be highlighted and annotated, but not edited or replaced.',
  },
  {
    question: 'Does the website use paid APIs or AI services?',
    answer:
      'No. Every tool uses free, open-source software that runs in your browser, such as pdf.js, pdf-lib and Tesseract for OCR. There are no paid processing services, AI models or API keys, and OCR language files are downloaded from this website itself.',
  },
  {
    question: 'Can I convert Word, Excel or PowerPoint files?',
    answer:
      'Word documents, yes. Word to PDF turns a .docx into a PDF and PDF to Word turns a PDF into an editable .docx, both on your device. Results are close to the original but not always identical; each tool lists what it can’t reproduce. Excel and PowerPoint files aren’t supported, because they can’t be converted reliably in a browser; export them to PDF from Office first.',
  },
  {
    question: 'Is Snap Assistant an AI chatbot?',
    answer:
      'No. Snap Assistant follows fixed rules to understand requests like “merge these two documents”, searches file names, types, dates and sizes in My files, and opens the right tool. It doesn’t read your documents or send anything to an AI service.',
  },
  {
    question: 'What’s the difference between the website and the Android app?',
    answer:
      'Both offer scanning, the PDF tools and the resume builder. The Android app adds Google’s ML Kit document scanner for automatic edge detection, a library on your phone and saving to Google Drive. Files and drafts don’t sync between the app and the website.',
  },
]
