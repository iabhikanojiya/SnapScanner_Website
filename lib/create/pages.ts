// Page copy for the Create Studio tools: titles, descriptions, highlights and FAQs.
import type { FaqItem } from '@/lib/content'
import type { CategoryId } from './registry'

export interface CategoryPageCopy {
  title: string
  metaDescription: string
  heading: string
  intro: string
  highlights: { title: string; text: string }[]
  faq: FaqItem[]
}

const STORAGE_FAQ: FaqItem = {
  question: 'Where are my projects stored?',
  answer:
    'In this browser on this device (IndexedDB). Images you add are processed here and saved inside the project. Nothing is uploaded or synced; clearing your browser’s site data deletes projects. Use Download → Export project file to keep a backup.',
}

const FONT_FAQ: FaqItem = {
  question: 'Why do some characters look different?',
  answer:
    'Designs use the standard PDF fonts (Helvetica, Times and Courier), so the preview, PNG and PDF always match. They cover Latin alphabets; the editor warns you if your text uses characters they can’t draw.',
}

export const CATEGORY_PAGES: Record<CategoryId, CategoryPageCopy> = {
  'festival-greetings': {
    title: 'Free Festival Greeting Maker – Diwali, New Year & More',
    metaDescription: 'Make festival greeting cards and WhatsApp or Instagram posts for Diwali, New Year, Christmas, Holi, Eid, Raksha Bandhan and more. 32 templates, PNG, JPG and PDF. No sign-up.',
    heading: 'Festival Greeting Maker',
    intro: 'Make greeting cards, social posts and status images for Diwali, New Year, Christmas, Holi, Eid, Raksha Bandhan, Ganesh Chaturthi, Navratri, Onam, Pongal and more. Add your wishes, name, photo or business logo, then download.',
    highlights: [
      { title: '32 festival templates', text: 'Wordmarks, arch windows, party tickets, magazine covers, wreaths, medallions and split panels, with diyas, rangoli, lanterns, fireworks, kites and more, all original artwork.' },
      { title: 'Wishes written for you', text: 'Each template has its own greeting, subheading and message. Leave them blank to use them, or write your own.' },
      { title: 'Personal or business', text: 'Add a family photo on the photo templates, or a logo and contact line for greetings to customers.' },
      { title: 'Sized for sharing', text: 'Square and 4:5 posts, 9:16 stories and WhatsApp status, 16:9 banners, and printable A5 and 7 × 5 in cards.' },
    ],
    faq: [
      { question: 'Which festivals are included?', answer: 'Diwali, New Year, Christmas, Holi, Eid and Ramadan, Raksha Bandhan, Ganesh Chaturthi, Navratri, Dussehra, Makar Sankranti, Pongal, Onam, Lohri, Easter, Thanksgiving, Lunar New Year and Hanukkah.' },
      { question: 'Can I write the greeting in Hindi or another script?', answer: 'Not yet. Designs use the standard PDF fonts, which cover Latin-alphabet text such as “Shubh Deepavali” or “Eid Mubarak”. The editor warns you if your text uses characters they can’t draw.' },
      { question: 'What size should I use for WhatsApp status or Instagram?', answer: 'Use Story / WhatsApp status 9:16 for status updates and stories, and Square or Portrait 4:5 for feed posts. These download at their exact pixel size.' },
      STORAGE_FAQ,
    ],
  },
  letterheads: {
    title: 'Free Letterhead Maker – 27 Templates, PDF Download',
    metaDescription: 'Design a business letterhead in your browser with 27 templates. Add your logo and contact details, write the letter, add a signature and download a PDF. No sign-up.',
    heading: 'Letterhead Maker',
    intro: 'Design a professional letterhead with your logo and contact details, then write your letter in it, or download it blank to reuse. Long letters continue onto more pages automatically.',
    highlights: [
      { title: '27 templates', text: 'Classic, centered, banded, sidebar, wave, monogram and minimal designs, each with its own header and footer.' },
      { title: 'Write the letter here', text: 'Date, recipient, subject, body, sign-off, signature image, name and title, laid out and paginated for you.' },
      { title: 'Blank letterheads too', text: 'Turn off the letter to download an empty letterhead you can print or reuse.' },
      { title: 'Real text PDF', text: 'The PDF keeps the letter as selectable text, at A4 or US Letter size.' },
    ],
    faq: [
      { question: 'Can I use the letterhead in Word or Google Docs?', answer: 'Download a blank letterhead as a PNG or PDF and place it as a page background in your word processor, or write the letter here and download the finished PDF.' },
      { question: 'What happens if my letter is long?', answer: 'It continues onto as many pages as needed. Later pages have a short header with your company name and page number, and the same footer.' },
      STORAGE_FAQ,
      FONT_FAQ,
    ],
  },
  'id-cards': {
    title: 'Free ID Card Maker – 26 Templates, PDF & PNG',
    metaDescription: 'Design employee, student, event and membership ID cards in your browser. 26 templates, photo cropping, logo, QR code, front and back, PDF and PNG export. No sign-up.',
    heading: 'ID Card Maker',
    intro: 'Design employee, student, visitor, event and membership cards with a photo, logo and optional QR code. Edit both sides with a live preview and download a PDF or PNG.',
    highlights: [
      { title: '26 distinct layouts', text: 'Sidebars, header bands, photo splits, lanyard badges, visitor passes and more, in landscape and portrait.' },
      { title: 'Front and back', text: 'Every template has a back with contact details, a note and an optional QR code.' },
      { title: 'Photo and logo', text: 'Crop and reposition photos in their frame. Without a logo, the organization’s initials are used.' },
      { title: 'Standard sizes', text: 'CR80 card size (85.6 × 54 mm), event badges or a custom size.' },
    ],
    faq: [
      {
        question: 'Are these official ID cards?',
        answer: 'No. ID Card Maker creates design templates for organizations, events and clubs. Cards made here aren’t government-issued, verified or valid as official identification.',
      },
      { question: 'How is the QR code made?', answer: 'It’s generated on your device from the text or link you enter. No QR service is contacted.' },
      { question: 'Can I print on PVC cards?', answer: 'Download the PDF at actual size (85.6 × 54 mm for standard cards) and print it, or send it to a card printer. Check your printer’s requirements for margins and bleed.' },
      STORAGE_FAQ,
      FONT_FAQ,
    ],
  },
  invoices: {
    title: 'Free Invoice Maker – 25 Templates, PDF Download',
    metaDescription: 'Create professional invoices in your browser with 25 templates, line items, discounts, any tax rates and 22 currencies. Exact calculations and PDF download. No sign-up.',
    heading: 'Invoice Maker',
    intro: 'Create a professional invoice with line items, discounts, the taxes that apply to you and your currency. Totals are calculated exactly, and long invoices continue onto more pages.',
    highlights: [
      { title: '25 templates', text: 'Corporate, minimal, bold and traditional designs, each with its own header, table and totals style.' },
      { title: 'Exact totals', text: 'Amounts are calculated in whole cents (or the currency’s smallest unit), never with floating-point errors.' },
      { title: 'Any tax setup', text: 'No tax, one rate, or several taxes such as VAT, sales tax or CGST + SGST.' },
      { title: '22 currencies', text: 'Including USD, EUR, GBP, INR, JPY (no decimals) and KWD (three decimals).' },
    ],
    faq: [
      {
        question: 'Is this accounting or tax software?',
        answer: 'No. Invoice Maker lays out and totals your invoice. It doesn’t keep books, file taxes or know your local rules: check which tax rates and invoice details your country requires.',
      },
      { question: 'How are amounts rounded?', answer: 'Each line, the discount and each tax are rounded half up to the currency’s smallest unit, then added up, so the printed numbers always add up.' },
      { question: 'What if my invoice has many items?', answer: 'The table continues onto as many pages as needed, with a short header on each page and totals at the end.' },
      STORAGE_FAQ,
      FONT_FAQ,
    ],
  },
  'business-cards': {
    title: 'Free Business Card Maker – 26 Templates, Print PDF',
    metaDescription: 'Design two-sided business cards in your browser. 26 templates, logo and QR code, standard sizes, bleed and safe-area guides, high-resolution PNG and print PDF. No sign-up.',
    heading: 'Business Card Maker',
    intro: 'Design both sides of your business card with your logo, contact details and an optional QR code. Bleed and safe-area guides help you prepare a print-ready PDF.',
    highlights: [
      { title: '26 two-sided designs', text: 'Minimal, corporate, creative, developer, hospitality and photo layouts, horizontal and vertical.' },
      { title: 'Print guides', text: '1/8 in (3.2 mm) bleed with trim and safe-area guides. The PDF sets trim and bleed boxes.' },
      { title: 'Standard sizes', text: 'US (3.5 × 2 in), EU (85 × 55 mm), India, Japan, vertical, square, or a custom size.' },
      { title: 'High-resolution', text: 'PNG and JPG at 300 dpi; PDF with vector text and shapes.' },
    ],
    faq: [
      {
        question: 'Will my print shop accept the PDF?',
        answer:
          'The print PDF follows the common convention of 1/8 in bleed around the trim size, with the PDF trim and bleed boxes set. Print shops differ (some want CMYK, crop marks or specific bleed), so confirm their requirements before ordering.',
      },
      { question: 'What is the safe area?', answer: 'Trimming can be slightly off, so keep important text inside the blue safe-area guide, 1/8 in inside the trim edge.' },
      STORAGE_FAQ,
      FONT_FAQ,
    ],
  },
  certificates: {
    title: 'Free Certificate Maker – 26 Templates, PDF & PNG',
    metaDescription: 'Make certificates of achievement, completion and appreciation in your browser. 26 templates with seals, borders, signatures, logo and optional QR code. PDF and PNG export. No sign-up.',
    heading: 'Certificate Maker',
    intro: 'Make certificates of achievement, completion, participation and appreciation. Add your logo, signatures and an optional certificate ID or QR code, then download a PDF or PNG.',
    highlights: [
      { title: '26 templates', text: 'Formal frames, guilloché borders, laurels, art deco, ribbons, photo awards and more.' },
      { title: 'Signatures', text: 'Two signatories with names, titles and signature images; white backgrounds are removed automatically.' },
      { title: 'Landscape or portrait', text: 'A4 and US Letter in either orientation, or a custom size.' },
      { title: 'Certificate ID and QR', text: 'Add a reference number and a QR code generated on your device.' },
    ],
    faq: [
      {
        question: 'Does a certificate made here prove a qualification?',
        answer: 'No. These are design templates. A certificate is only as meaningful as the organization that issues it; this tool doesn’t accredit, register or verify certificates.',
      },
      { question: 'Can I make one certificate per person?', answer: 'Create one project, then use Duplicate project and change the name. Each copy is saved separately in this browser.' },
      STORAGE_FAQ,
      FONT_FAQ,
    ],
  },
  'photo-collages': {
    title: 'Free Photo Collage Maker – 26 Layouts, PNG & JPG',
    metaDescription: 'Make photo collages in your browser: grids, mosaics, film strips and scrapbook layouts. Drag photos into frames, crop, rotate, add captions and export PNG, JPG or PDF. No uploads.',
    heading: 'Photo Collage Maker',
    intro: 'Arrange photos in grids, mosaics, film strips and scrapbook layouts. Drag photos into frames, crop and rotate them, add a heading and caption, and export for social media or print.',
    highlights: [
      { title: '26 layouts', text: 'From 2 to 9 photos: grids, mosaics, feature layouts, polaroids, taped scrapbooks, film strips and circles.' },
      { title: 'Drag and drop', text: 'Drop photos onto frames, drag between frames to swap, and crop each one with zoom and position.' },
      { title: 'Style controls', text: 'Spacing, borders, corner radius and background color, plus headings and captions.' },
      { title: 'Social and print sizes', text: 'Square, 4:5, story and 16:9 at exact pixel sizes, or photo prints and A4 at 300 dpi.' },
    ],
    faq: [
      { question: 'Are my photos uploaded?', answer: 'No. Photos are decoded and resized in your browser and saved only in this browser’s storage with the project.' },
      { question: 'Why are my photos resized?', answer: 'To keep projects fast and within browser storage limits, photos are scaled to at most 2400 pixels on the longest side, which is enough for every export size offered.' },
      { question: 'Can I use HEIC photos from an iPhone?', answer: 'Most browsers can’t decode HEIC. Convert them to JPG first, or set the iPhone camera to Most Compatible.' },
      STORAGE_FAQ,
    ],
  },
}
