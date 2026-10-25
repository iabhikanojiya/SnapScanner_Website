import Link from 'next/link'
import LegalPage, { External } from '@/components/LegalPage'
import { pageMetadata } from '@/lib/metadata'
import { DEVELOPER_NAME, PRIVACY_POLICY_SOURCE_URL, SITE_URL, SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/site'
import { LIMITS, formatBytes } from '@/lib/limits'

export const metadata = pageMetadata({
  title: 'Terms and Conditions',
  description:
    'The terms for using the Snap Scanner website’s free, browser-based PDF, image, conversion and document-creation tools: your files, accuracy, acceptable use and liability.',
  path: '/terms',
})

const UPDATED = 'October 25, 2026'
const UPDATED_ISO = '2026-10-25'

const TOC: [string, string][] = [
  ['acceptance', '1. About these terms'],
  ['services', '2. The services'],
  ['free', '3. Free access and limits'],
  ['files', '4. Your files and responsibility'],
  ['accuracy', '5. Results, accuracy and limitations'],
  ['use', '6. Acceptable use'],
  ['ip', '7. Intellectual property'],
  ['open-source', '8. Open-source software and third parties'],
  ['availability', '9. Availability and changes'],
  ['disclaimers', '10. Disclaimers'],
  ['liability', '11. Limitation of liability'],
  ['suspension', '12. Suspension and termination'],
  ['law', '13. Governing law and disputes'],
  ['changes', '14. Changes to these terms'],
  ['contact', '15. Contact'],
]

const LIBRARIES = [
  ['pdf.js', 'Apache-2.0'],
  ['pdf-lib (Cantoo fork) and fontkit', 'MIT'],
  ['Tesseract.js and Tesseract language data', 'Apache-2.0'],
  ['docx', 'MIT'],
  ['fflate', 'MIT'],
  ['qrcode-generator', 'MIT'],
  ['React and Next.js', 'MIT'],
  ['Carlito, Caladea, Arimo, Tinos, Cousine, Noto Sans Devanagari and other bundled fonts', 'SIL Open Font License 1.1'],
]

export default function TermsPage() {
  return (
    <LegalPage
      id="terms"
      title="Terms and Conditions"
      updated={UPDATED}
      updatedIso={UPDATED_ISO}
      intro={
        <p>
          These terms apply to the Snap Scanner website at {SITE_URL.replace('https://', '')}. The Snap Scanner mobile app is distributed through app stores under their terms and its own policies.
        </p>
      }
      summary={[
        'The website’s tools are free to use, with no account. They run in your browser and don’t upload your files.',
        'Your documents remain yours. You’re responsible for having the right to use them, and for keeping your own copies.',
        'Conversions, OCR, compression and other results can differ from the original. Check important output before relying on it.',
        'Don’t use the website for anything unlawful, harmful or abusive.',
        'The website is provided as it is, without guarantees, to the extent the law allows.',
      ]}
      toc={TOC}
    >
      <h2 id="acceptance">1. About these terms</h2>
      <p>
        These Terms and Conditions (“terms”) govern your use of the Snap Scanner website and its tools (together, “the website”), made by {DEVELOPER_NAME}, based in India (“we”, “us”). By using the website, you agree
        to these terms. If you don’t agree, please don’t use it.
      </p>
      <p>
        If you use the website on behalf of an organization, you confirm that you’re allowed to accept these terms for it. If you’re under the age at which you can enter a binding agreement where you
        live, please use the website with the involvement of a parent or guardian. Our <Link href="/privacy-policy">Privacy Policy</Link> explains how information is handled.
      </p>

      <h2 id="services">2. The services</h2>
      <p>The website currently offers tools that run in your web browser, including:</p>
      <ul>
        <li>
          <strong>PDF tools:</strong> merge, split, remove and extract pages, organize, rotate, compress, repair, OCR, crop, add page numbers and watermarks, sign, edit text, annotate, fill forms, compare,
          redact, lock, unlock, view and edit metadata, and a PDF reader.
        </li>
        <li>
          <strong>Conversion:</strong> scan to PDF with a camera or photos; JPG, PNG, WebP and other images to PDF; HTML to PDF (using your browser’s print dialog); Word (.docx) to PDF; and PDF to JPG,
          PNG, text, Markdown and Word (.docx).
        </li>
        <li>
          <strong>Image tools:</strong> resize, crop, rotate, filters, format conversion and PNG/JPG to WebP.
        </li>
        <li>
          <strong>Create:</strong> the Resume Builder; Create Studio makers for ID cards, invoices, business cards, certificates, photo collages, letterheads and festival greetings; and the QR Code
          Generator.
        </li>
        <li>
          <strong>Organization:</strong> My files, a document library stored in your browser, and Snap Assistant, a rule-based helper that finds saved files and opens tools.
        </li>
      </ul>
      <p>The tools available may change over time (section 9).</p>

      <h2 id="free">3. Free access and limits</h2>
      <p>
        The website’s tools are currently free to use. There are no accounts, subscriptions, paid plans or in-website purchases, and the website doesn’t add watermarks to your output. We may change this
        in the future; if we ever introduce paid features, we’ll say so clearly before you use them, and these terms will be updated.
      </p>
      <p>
        Because files are processed on your device, what you can do depends on your device’s memory, storage and browser. The tools also have practical limits to keep the website reliable, which currently
        include:
      </p>
      <ul>
        <li>
          PDFs up to {formatBytes(LIMITS.pdfBytes)}, and up to {LIMITS.pdfPages.toLocaleString()} pages for tools that display every page;
        </li>
        <li>
          images up to {formatBytes(LIMITS.imageBytes)}, scaled to at most {LIMITS.imageMaxSide.toLocaleString()} pixels on the longest side for editing;
        </li>
        <li>up to {LIMITS.filesPerJob} files in one merge, image-to-PDF or scanning session;</li>
        <li>Word documents up to 100 MB for Word to PDF;</li>
        <li>
          files up to {formatBytes(LIMITS.libraryFileBytes)} each in My files, within the storage space your browser allows for this website.
        </li>
      </ul>
      <p>Tools show a message when a file is outside these limits. The limits may change.</p>

      <h2 id="files">4. Your files and responsibility</h2>
      <ul>
        <li>You keep all rights to the files you open and the documents you create. We don’t receive them and claim no ownership of them.</li>
        <li>
          You’re responsible for your files and your use of the output, including having the necessary rights or permission to process, convert, edit, unlock or share documents, images and other content
          that belong to someone else.
        </li>
        <li>
          Keep your own copies of important documents. Files open in a tool are lost when you close or refresh the page, and data saved in your browser (My files, resume drafts and Create Studio projects)
          can be deleted by you, by your browser or by clearing site data. We can’t recover it.
        </li>
        <li>
          Passwords for locked PDFs can’t be recovered by us or by the website. If you forget a password you set with Lock PDF, the file can’t be opened. Unlock PDF only works with the correct password.
        </li>
      </ul>

      <h2 id="accuracy">5. Results, accuracy and limitations</h2>
      <p>The tools aim for accurate results, but every file is different. In particular:</p>
      <ul>
        <li>
          <strong>Conversions</strong> between formats (such as PDF to Word, Word to PDF, PDF to text or Markdown, and HTML to PDF) can change fonts, layout, spacing, page breaks, images and other
          formatting. Some content, such as charts, shapes, equations, form fields or right-to-left text, may be simplified, replaced by placeholders or left out. Each tool page describes its known
          limitations.
        </li>
        <li>
          <strong>OCR</strong> can misread text, especially in low-quality scans, handwriting, unusual fonts or languages other than the one selected. Scanned pages have no text until OCR is run.
        </li>
        <li>
          <strong>Damaged, encrypted or unusual files</strong> may not open or may be only partly recovered. Compression may not reduce every file, and image quality can be reduced.
        </li>
        <li>
          <strong>Redact PDF</strong> removes only what you mark, and text search only finds text that is in the PDF’s text layer. Check the result before sharing it.
        </li>
        <li>
          <strong>Sign PDF</strong> adds a visible signature image. It isn’t a certificate-based digital signature and doesn’t verify anyone’s identity; whether it’s accepted depends on the document and
          the recipient.
        </li>
        <li>
          <strong>Create Studio and Resume Builder</strong> documents are design templates. ID cards and certificates made here aren’t official, government-issued, accredited or verified documents.
          Invoice Maker calculates totals from the figures you enter but isn’t accounting or tax software; check tax rates and legal requirements yourself.
        </li>
        <li>
          <strong>Snap Assistant</strong> follows fixed rules and may misunderstand requests. It doesn’t read or summarize documents.
        </li>
      </ul>
      <p>Always review important output, such as legal, financial, medical or official documents, before relying on or sharing it.</p>

      <h2 id="use">6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the website for anything unlawful, or to create, process or share content that is illegal or infringes anyone’s rights, including copyright, trademark and privacy rights;</li>
        <li>create forged, fraudulent or misleading documents, such as fake identity documents, certificates or invoices intended to deceive;</li>
        <li>remove protection from documents you aren’t authorized to unlock, or bypass restrictions that protect other people’s rights;</li>
        <li>attempt to disrupt, overload, probe or compromise the website, its hosting or other users, or to introduce malicious code into the website;</li>
        <li>use automated means to make excessive requests to the website, or copy and redistribute the website’s code, templates or assets in a way these terms don’t allow (section 7).</li>
      </ul>

      <h2 id="ip">7. Intellectual property</h2>
      <p>
        The website, including its design, text, the Snap Scanner name and logo, its software (other than the open-source components in section 8), and the templates, layouts and illustrations in the
        Resume Builder and Create Studio, belongs to {DEVELOPER_NAME} or its licensors and is protected by intellectual property laws.
      </p>
      <p>
        You may use the website to make documents for your personal and business purposes, and you may use, print, share and sell the documents you create with the templates (for example, your own
        invoices, cards, certificates or greetings). You may not resell, redistribute or publish the templates or their artwork themselves as templates, or present them as your own design product.
      </p>
      <p>We don’t claim ownership of your files, the content you enter or the documents you create.</p>

      <h2 id="open-source">8. Open-source software and third parties</h2>
      <p>
        The tools use open-source software that runs in your browser and is served from this website, including the components below. Each is used under its own licence, and those licences apply to the
        components themselves. The full licence notices for all the open-source software the website includes are published in the{' '}
        <a href="/third-party-notices.txt">third-party notices</a>.
      </p>
      <ul>
        {LIBRARIES.map(([name, licence]) => (
          <li key={name}>
            {name}: {licence}
          </li>
        ))}
      </ul>
      <p>
        Open-source authors don’t operate or endorse the website. Links to third-party websites and services, such as Google Play and the{' '}
        <External href={PRIVACY_POLICY_SOURCE_URL}>Snap Scanner app’s privacy policy</External>, are provided for convenience; we don’t control them, and their own terms apply. The website is delivered by
        Vercel, a third-party hosting provider.
      </p>

      <h2 id="availability">9. Availability and changes</h2>
      <p>
        We try to keep the website available and working, but we don’t guarantee that it will always be available, uninterrupted or error-free, or that every tool will work with every file, device or
        browser. Some features need a recent browser and enough device memory; very large files may be slow or fail.
      </p>
      <p>We may add, change, limit or remove tools or features, change limits, or stop offering the website, at any time. Because nothing you process is stored by us, keep copies of anything important.</p>

      <h2 id="disclaimers">10. Disclaimers</h2>
      <p>
        To the extent permitted by law, the website is provided “as is” and “as available”, without warranties of any kind, whether express or implied, including warranties of merchantability, fitness
        for a particular purpose, accuracy and non-infringement. We don’t warrant that results will be accurate, complete or suitable for any particular purpose.
      </p>
      <p>Some jurisdictions don’t allow certain warranties to be excluded, so some of these exclusions may not apply to you. Nothing in these terms affects rights you have under consumer protection laws that can’t be waived.</p>

      <h2 id="liability">11. Limitation of liability</h2>
      <p>
        To the extent permitted by law, {DEVELOPER_NAME} isn’t liable for indirect, incidental, special or consequential losses, or for loss of data, files, profits or business, arising from your use of,
        or inability to use, the website, including losses caused by inaccurate conversions or OCR, files that can’t be opened, or data removed from your browser’s storage.
      </p>
      <p>
        Nothing in these terms excludes or limits liability that can’t be excluded or limited by law, such as liability for fraud or, where applicable, for death or personal injury caused by negligence.
      </p>

      <h2 id="suspension">12. Suspension and termination</h2>
      <p>
        The website has no accounts, so you can stop using it at any time. We may restrict or block access to the website, or to particular tools, if we reasonably believe it’s being misused, to protect
        the website and its users, or to comply with the law.
      </p>

      <h2 id="law">13. Governing law and disputes</h2>
      <p>
        These terms are governed by the laws of India. Subject to that, the courts of India have jurisdiction over disputes arising from these terms or your use of the website. This doesn’t take away
        any mandatory consumer protection rights you have under the laws of the country where you live. If you have a concern, please contact us first so we can try to resolve it informally.
      </p>

      <h2 id="changes">14. Changes to these terms</h2>
      <p>
        We may update these terms, for example when the website’s features change. Updates are published on this page with a new “Last updated” date. If a change is significant, we’ll also make it clear
        on the website. Continuing to use the website after an update means you accept the updated terms.
      </p>
      <p>If any part of these terms is found unenforceable, the rest remains in effect.</p>

      <h2 id="contact">15. Contact</h2>
      <p>Questions about these terms can be sent to {DEVELOPER_NAME}:</p>
      <ul>
        <li>
          Email: <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
        </li>
        <li>
          Support page: <Link href="/support">Snap Scanner support</Link>
        </li>
      </ul>
    </LegalPage>
  )
}
