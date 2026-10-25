import Link from 'next/link'
import LegalPage, { External } from '@/components/LegalPage'
import { pageMetadata } from '@/lib/metadata'
import { DEVELOPER_NAME, PRIVACY_POLICY_SOURCE_URL, SITE_DOMAIN, SITE_URL, SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/site'

const VERCEL_PRIVACY = 'https://vercel.com/legal/privacy-policy'

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description:
    'How the Snap Scanner website handles your files and data: tools run in your browser, files aren’t uploaded, and there are no accounts, analytics, ads or tracking cookies.',
  path: '/privacy-policy',
})

// Written from an audit of the website's code. Review it whenever a feature,
// third-party service, hosting setup or browser-storage use changes.
const UPDATED = 'October 25, 2026'
const UPDATED_ISO = '2026-10-25'

const TOC: [string, string][] = [
  ['scope', '1. Who we are and what this covers'],
  ['collect', '2. Information we collect'],
  ['files', '3. How the tools handle your files'],
  ['storage', '4. Memory, browser storage and downloads'],
  ['cookies', '5. Cookies and similar technologies'],
  ['third-parties', '6. Hosting, links and other third parties'],
  ['sharing', '7. Sharing and selling'],
  ['retention', '8. Data retention'],
  ['security', '9. Security'],
  ['children', '10. Children'],
  ['rights', '11. Your choices and rights'],
  ['changes', '12. Changes to this policy'],
  ['contact', '13. Contact'],
]

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      id="privacy"
      title="Privacy Policy"
      updated={UPDATED}
      updatedIso={UPDATED_ISO}
      intro={
        <p>
          This policy covers the Snap Scanner website at {SITE_URL.replace('https://', '')} and its browser-based tools. The Snap Scanner mobile app has its own{' '}
          <External href={PRIVACY_POLICY_SOURCE_URL}>privacy policy</External>. The app uses Firebase Analytics, Crashlytics and Google AdMob; the website uses none of them.
        </p>
      }
      summary={[
        'The website’s tools process your PDFs, images, Word documents and other files inside your browser. The website doesn’t upload them, and we never receive them.',
        'There are no accounts, sign-up forms, analytics, advertising or tracking cookies on the website.',
        'Files you choose to save in My files, resume drafts and Create Studio projects are stored in your browser on your device. We can’t see, recover or delete them.',
        'Like every website, our hosting provider, Vercel, receives technical information (such as your IP address and the pages you request) to deliver the site.',
        'The Snap Scanner Android app has a separate privacy policy. It uses Firebase Analytics, Crashlytics and AdMob; the website doesn’t use Firebase, AdMob or any analytics.',
        'If you email us, we receive your email address and whatever you include in your message.',
      ]}
      toc={TOC}
    >
      <h2 id="scope">1. Who we are and what this covers</h2>
      <p>
        The Snap Scanner website (“the website”, “we”, “us”) is made by {DEVELOPER_NAME}, based in India. You can contact us at <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>.
      </p>
      <p>
        This policy applies to the pages and tools at {SITE_URL.replace('https://', '')}: the PDF, image and conversion tools, My files, Snap Assistant, the Resume Builder and Create Studio (including the QR
        Code Generator).
      </p>
      <p>
        It doesn’t apply to the Snap Scanner Android app, which is covered by the separate <External href={PRIVACY_POLICY_SOURCE_URL}>Snap Scanner app privacy policy</External>. The app and
        the website are different products with different data practices: the app uses Firebase Analytics, Firebase Crashlytics and Google AdMob advertising, while the website uses no Firebase
        services, no AdMob or other advertising, and no analytics. Files on the website and in the app are separate; they don’t sync with each other.
      </p>

      <h2 id="collect">2. Information we collect</h2>
      <h3>Information we don’t collect</h3>
      <p>The website has no accounts, logins, payments, newsletter, contact forms or comment features. It doesn’t ask for your name, email address or phone number.</p>
      <p>
        The website doesn’t include analytics, advertising, session-recording, error-reporting or social-media scripts, and it doesn’t load scripts, fonts or other code from third-party servers. Its
        Content Security Policy only allows the page to connect to this website itself, which also prevents scripts from sending data to other servers.
      </p>
      <h3>Your files and what you type</h3>
      <p>
        Files you open in a tool, and text you enter (such as resume details, invoice items, greeting messages, PDF passwords or Snap Assistant requests), are processed in your browser. They aren’t sent to
        us. Section 3 explains this for each tool.
      </p>
      <h3>Technical information received by our hosting provider</h3>
      <p>
        When your browser requests a page, script, font or OCR language file from the website, our hosting provider, Vercel, automatically receives standard technical information, such as your IP address, the
        date and time, the address requested (including any query string), the referring page and your browser’s user agent. This is needed to deliver the website and protect it from abuse, and it’s
        handled under the provider’s own policies (see section 6). These requests don’t contain the contents of your files.
      </p>
      <p>
        When you open a file from My files in a tool, the tool’s address can include a randomly generated identifier for that file (for example, <code>?files=…</code>). The identifier is created in your
        browser and reveals nothing about the file’s name or contents, but like any address it may appear in hosting logs.
      </p>
      <h3>Emails you send us</h3>
      <p>
        If you contact us by email, we receive your email address, your message and anything you attach, and we use them to reply and to provide support. Please don’t send sensitive documents unless
        they’re needed to resolve your request.
      </p>

      <h2 id="files">3. How the tools handle your files</h2>
      <p>
        We checked every tool on the website. All of them process files in your browser using code served by the website. None of them uploads your files or their contents to our servers or to a third
        party.
      </p>
      <ul>
        <li>
          <strong>PDF tools</strong> (merge, split, organize, rotate, compress, repair, crop, page numbers, watermarks, sign, edit, annotate, fill forms, compare, redact, lock, unlock, metadata and the PDF
          reader): read and write PDFs in your browser using open-source libraries (pdf.js and pdf-lib). Passwords you enter to lock or unlock a PDF are used only in the open tab and aren’t stored.
        </li>
        <li>
          <strong>Conversions</strong> (images to PDF, PDF to JPG/PNG, PDF to text and Markdown, PDF to Word, Word to PDF): run in your browser. Word to PDF downloads its fonts from this website when
          needed. HTML to PDF shows your HTML in an isolated preview and uses your browser’s own print dialog to save the PDF.
        </li>
        <li>
          <strong>OCR</strong> (OCR PDF and scanned pages in PDF to Word): uses Tesseract in your browser. The language model is downloaded from this website the first time you use a language, and your
          browser may keep it in its cache. No page images are sent anywhere for recognition.
        </li>
        <li>
          <strong>Scan to PDF</strong>: uses your camera only after you allow it in your browser’s permission prompt. Camera frames stay in the page; an image is kept only when you capture a page. You
          can also choose photos from your device instead.
        </li>
        <li>
          <strong>Image tools</strong> (resize, crop, rotate, filters, format conversion and WebP conversion): process images in your browser.
        </li>
        <li>
          <strong>Resume Builder and Create Studio</strong> (ID cards, invoices, business cards, certificates, photo collages, letterheads, festival greetings and the QR Code Generator): what you type and
          the photos, logos and signatures you add stay in your browser. QR codes are generated on your device; the website doesn’t visit or check the link or text you encode.
        </li>
        <li>
          <strong>Snap Assistant</strong>: follows fixed rules in your browser. It reads only the names, types, dates and sizes of files saved in My files to answer your requests, doesn’t read file
          contents and doesn’t use an AI service.
        </li>
      </ul>
      <p>
        A file leaves your device only when you send it somewhere yourself, for example with a Share button (which hands the file to your device’s share sheet and the app you choose), by copying output to
        your clipboard, or by uploading a downloaded file elsewhere.
      </p>

      <h2 id="storage">4. Memory, browser storage and downloads</h2>
      <h3>Files open in a tool</h3>
      <p>
        Files you open in a tool are held in your browser’s memory while you work. They aren’t saved anywhere unless you choose to. Closing or refreshing the tab, or leaving the tool, discards them, so
        download or save anything you want to keep.
      </p>
      <h3>Saved in this browser</h3>
      <p>The following are saved in your browser’s storage (IndexedDB) on your device, and stay there until you delete them or your browser removes them:</p>
      <ul>
        <li>files you choose to save in My files, and your folders;</li>
        <li>Resume Builder drafts, which are saved automatically as you edit;</li>
        <li>Create Studio projects, including any photos, logos and signatures you add, which are saved automatically as you edit.</li>
      </ul>
      <p>
        This storage belongs to your browser profile on this device. It isn’t synced to other devices or to the app, and we have no access to it, so we can’t recover anything for you. Browsers may delete
        site storage when the device is low on space, after a period without visits, in private or incognito windows, or when you clear browsing data. When you add files in My files, the website asks your
        browser to keep its data persistently, but whether it does is up to the browser.
      </p>
      <p>
        You can delete individual items in My files, the Resume Builder and Create Studio, delete everything with <strong>Clear all local data</strong> in{' '}
        <Link href="/files">My files</Link>, or clear this site’s data in your browser settings.
      </p>
      <h3>Downloads and exported files</h3>
      <p>
        Downloaded files go wherever your browser or device saves downloads, and deleting data on the website doesn’t delete them. PDFs the tools create record “Snap Scanner ({SITE_DOMAIN})” as the
        producing application, and edited PDFs keep the document information (such as title and author) that the original file already contained. You can review or remove it with the{' '}
        <Link href="/tools/pdf-metadata">PDF metadata</Link> tool. Create Studio project files you export contain the images in the project.
      </p>

      <h2 id="cookies">5. Cookies and similar technologies</h2>
      <p>
        The website’s own code doesn’t set cookies, and the website doesn’t use cookies or other identifiers for analytics, advertising or tracking. Because it doesn’t use non-essential cookies, it doesn’t
        show a cookie banner.
      </p>
      <p>The website does use your browser’s storage for the features described in section 4, and your browser’s normal cache may keep copies of the website’s files (pages, scripts, fonts and OCR models) to load them faster. Clearing this site’s data in your browser removes both.</p>

      <h2 id="third-parties">6. Hosting, links and other third parties</h2>
      <ul>
        <li>
          <strong>Hosting provider.</strong> The website is currently hosted and delivered by Vercel Inc., which processes the technical request information described in section 2 to deliver and
          secure the site, under its own <External href={VERCEL_PRIVACY}>privacy policy</External>. Vercel’s servers and network may be located outside India, so this request information may be
          processed in other countries. Vercel doesn’t receive the contents of your files. The website doesn’t use Vercel Analytics, Speed Insights or other Vercel tracking products.
        </li>
        <li>
          <strong>Open-source software.</strong> The tools are built with open-source libraries such as pdf.js, pdf-lib, Tesseract.js and docx. They run in your browser from this website’s servers; they
          aren’t services and don’t send your data to their authors.
        </li>
        <li>
          <strong>Fonts.</strong> All fonts are served from this website. Fonts that originate from Google Fonts are downloaded when the website is built, so your browser doesn’t contact Google.
        </li>
        <li>
          <strong>Links to other services.</strong> Links to Google Play, to the app’s privacy policy and to other websites take you to services we don’t operate, with their own privacy policies. Contact
          links open your own email app or service.
        </li>
      </ul>
      <p>
        The website publishes an <code>app-ads.txt</code> file that authorizes advertising sellers for the Android app. It doesn’t put advertising on the website.
      </p>

      <h2 id="sharing">7. Sharing and selling</h2>
      <p>
        We don’t sell or rent personal information, and we don’t share it for advertising. We don’t receive your files, so we can’t share them. We would disclose the limited information we do hold (such
        as support emails) only if required by law or to protect the rights and safety of users or the website.
      </p>

      <h2 id="retention">8. Data retention</h2>
      <ul>
        <li>Files in tools: kept in your browser’s memory only while the page is open.</li>
        <li>My files, resume drafts and Create Studio projects: kept in your browser until you or your browser delete them (section 4). We hold no copies.</li>
        <li>Support emails: kept for as long as needed to handle your request and any follow-up, then deleted when no longer needed, unless we must keep them longer by law.</li>
        <li>Hosting request logs: kept by Vercel for the period set by its own policies and our hosting plan.</li>
      </ul>

      <h2 id="security">9. Security</h2>
      <p>
        The website is served only over HTTPS and uses security headers, including a Content Security Policy that blocks connections to other servers and prevents the site from being embedded in other
        pages. Keeping processing in your browser means your files aren’t transmitted or stored on our side.
      </p>
      <p>
        No system is completely secure, and anyone with access to your device or browser profile may be able to see files saved in this browser. On a shared or public computer, avoid saving files and use{' '}
        <strong>Clear all local data</strong> in My files when you finish. Keep your browser up to date.
      </p>

      <h2 id="children">10. Children</h2>
      <p>
        The website isn’t directed to children under 13, and we don’t knowingly collect personal information from them. The tools don’t ask for personal information, and anything typed into them stays on
        the device. If you believe a child has sent us personal information by email, contact us and we’ll delete it.
      </p>

      <h2 id="rights">11. Your choices and rights</h2>
      <p>
        You control the files and information you use with the website: you choose what to open, what to save in your browser and what to download or share, and you can delete saved data at any time as
        described in section 4. You can block or revoke camera access in your browser settings.
      </p>
      <p>
        Depending on where you live, including under India’s Digital Personal Data Protection Act, 2023 where it applies, you may have rights to access, correct or erase personal information we hold
        about you, to withdraw consent, and to raise a grievance. The only personal information we may hold is support email correspondence; email us to make a request or raise a grievance, and we’ll
        respond within a reasonable time. For request information processed by Vercel, you can also refer to <External href={VERCEL_PRIVACY}>Vercel’s privacy policy</External>. You may also have the
        right to complain to the data protection authority where you live.
      </p>

      <h2 id="changes">12. Changes to this policy</h2>
      <p>
        We’ll update this policy when the website’s features or data practices change, for example if we add a service that processes data differently. Changes are published on this page with a new “Last
        updated” date. If a change significantly affects how your information is handled, we’ll also make it clear on the website before it takes effect.
      </p>

      <h2 id="contact">13. Contact</h2>
      <p>For questions or requests about privacy on the website, contact {DEVELOPER_NAME}:</p>
      <ul>
        <li>
          Email: <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
        </li>
        <li>
          Support page: <Link href="/support">Snap Scanner support</Link>
        </li>
      </ul>
      <p>
        See also the website’s <Link href="/terms">Terms and Conditions</Link>.
      </p>
    </LegalPage>
  )
}
