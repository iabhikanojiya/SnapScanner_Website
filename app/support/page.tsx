import Link from 'next/link'
import { ExternalLink, Mail, Settings, ShieldCheck } from 'lucide-react'
import FaqList from '@/components/FaqList'
import SectionHeading from '@/components/SectionHeading'
import type { FaqItem } from '@/lib/content'
import { pageMetadata } from '@/lib/metadata'
import { PLAY_STORE_URL, SITE_DOMAIN, SUPPORT_EMAIL, supportMailto } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Support',
  description:
    'Get help with the Snap Scanner website tools and Android app: contact the developer, report a bug, and find answers about saved files, PDF passwords and camera access.',
  path: '/support',
})

const WEBSITE_FAQ: FaqItem[] = [
  {
    question: 'A tool on the website says my file can’t be opened.',
    answer:
      'The file may be damaged, password-protected or not the type the tool expects (for example a HEIC photo, which most browsers can’t decode). Try opening it in another app first. For protected PDFs, enter the password when asked, or use Unlock PDF.',
  },
  {
    question: 'My saved files or resume drafts disappeared from the website.',
    answer:
      'They’re stored only in the browser where you created them. Using another browser, a private window, or clearing site data shows an empty library. Browsers can also remove site data when the device is low on space. We have no copy, so keep downloads of important files and export resume drafts as JSON.',
  },
  {
    question: 'The camera doesn’t start in Scan to PDF.',
    answer:
      `Allow camera access for ${SITE_DOMAIN} in your browser’s site settings and reload the page. Some browsers and devices don’t offer a camera to websites; upload photos instead, or on a phone use Take photo.`,
  },
  {
    question: 'Large files are slow or the tab crashes.',
    answer:
      'Everything runs on your device, so very large or image-heavy PDFs need a lot of memory. Close other tabs, try a desktop browser, or split the file first. PDFs up to 150 MB and 1,000 pages are accepted.',
  },
  {
    question: 'Which browsers are supported?',
    answer: 'Current versions of Chrome, Edge, Firefox and Safari on desktop, Android and iOS.',
  },
]

const SUPPORT_FAQ: FaqItem[] = [
  {
    question: 'How do I report a bug?',
    answer: `Email ${SUPPORT_EMAIL} with what you were doing, what you expected and what happened instead. Include your phone model, Android version and Snap Scanner version, plus a screenshot if you can.`,
  },
  {
    question: 'How do I request a feature?',
    answer: `Use Settings → Feedback in the app, or email ${SUPPORT_EMAIL}. Tell us what you’re trying to get done; that helps more than a feature name.`,
  },
  {
    question: 'Where are my PDFs and resumes stored?',
    answer:
      'On your phone, inside the app’s library. Snap Scanner has no cloud storage or account, so we can’t restore files for you. Files you exported, shared or saved to Google Drive stay where you put them.',
  },
  {
    question: 'I reinstalled the app and my files are gone. Can you recover them?',
    answer:
      'Uninstalling can remove the app’s private storage, and because nothing is stored on our servers we have no copy to restore. Copies you previously exported, shared or uploaded to Google Drive are unaffected. Export important files before uninstalling.',
  },
  {
    question: 'I forgot the password to a PDF I locked. Can you unlock it?',
    answer:
      'No. Passwords are never sent to us, so there’s no way to recover one. Locking creates a protected copy and leaves the original file unchanged, so check your library for the unlocked original.',
  },
  {
    question: 'Scanning doesn’t start. What should I check?',
    answer:
      'Make sure Snap Scanner has camera permission in your phone’s settings. On Android, scanning uses Google’s ML Kit document scanner from Google Play services, which may need to download once over the internet. You can also use Image to PDF with photos from your gallery.',
  },
  {
    question: 'How do I change my ad privacy choices?',
    answer:
      'Where your region requires it, Snap Scanner shows a consent message from Google. To review or change your choice later, open Settings → Privacy Options in the app (shown only where it applies).',
  },
  {
    question: 'Do I need an account to get support?',
    answer: 'No. Snap Scanner has no accounts. Just email us from any address.',
  },
]

const FEEDBACK_CHECKLIST = [
  'What you were trying to do, and the steps that led to the problem',
  'Your phone model and Android version',
  'Your Snap Scanner version (Android Settings → Apps → Snap Scanner)',
  'A screenshot or screen recording, if it helps',
]

export default function SupportPage() {
  return (
    <>
      <section aria-labelledby="support-title" className="border-b border-gray-200 bg-gray-50">
        <div className="page-container py-12 sm:py-16">
          <p className="eyebrow">Support</p>
          <h1 id="support-title" className="heading-display mt-3 max-w-3xl">
            How can we help?
          </h1>
          <p className="lead mt-5 max-w-2xl">
            Questions about the website tools or the Android app, bug reports and feature ideas all go to the Snap Scanner
            team at {SUPPORT_EMAIL}. We read every message.
          </p>
        </div>
      </section>

      <section aria-labelledby="contact-title" className="section pb-0 sm:pb-0">
        <div className="page-container">
          <h2 id="contact-title" className="sr-only">
            Contact options
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            <li className="card flex flex-col p-6">
              <span className="icon-tile">
                <Mail aria-hidden className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">Email support</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                The fastest way to reach us about bugs, files or anything else.
              </p>
              <a href={supportMailto('Snap Scanner support')} className="text-link mt-auto break-all pt-5 text-sm">
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li className="card flex flex-col p-6">
              <span className="icon-tile">
                <Settings aria-hidden className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">Feedback from the app</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                In Snap Scanner, open <strong className="font-semibold text-ink">Settings → Feedback</strong>. Your email
                app opens with our address and subject already filled in.
              </p>
              <a href={supportMailto('Feedback for Snap Scanner')} className="text-link mt-auto pt-5 text-sm">
                Or send feedback by email
              </a>
            </li>
            <li className="card flex flex-col p-6">
              <span className="icon-tile">
                <ExternalLink aria-hidden className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">Google Play</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Install or update the app, see what’s new, or leave a rating and review.
              </p>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-link mt-auto pt-5 text-sm">
                Open the Google Play listing<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="feedback-title" className="section">
        <div className="page-container grid gap-6 lg:grid-cols-2">
          <div className="card p-6 sm:p-8">
            <h2 id="feedback-title" className="text-2xl font-bold text-ink">
              Reporting a problem
            </h2>
            <p className="mt-3 text-ink-soft">Include these details so we can reproduce it quickly:</p>
            <ol className="mt-5 list-decimal space-y-2 pl-5 text-ink-soft marker:font-semibold marker:text-brand-700">
              {FEEDBACK_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <p className="mt-5 rounded-xl bg-gray-100 px-4 py-3 text-sm text-ink-soft">
              Please don’t attach sensitive documents. If a specific file causes the problem, describe it (page count,
              size, where it came from) instead.
            </p>
          </div>
          <div className="card p-6 sm:p-8">
            <span className="icon-tile">
              <ShieldCheck aria-hidden className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-bold text-ink">Privacy</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              The website’s tools process files in your browser and store saved files on your device. The Android app
              stores documents on your phone and uses Firebase Analytics, Firebase Crashlytics and Google AdMob. The
              privacy policy explains both.
            </p>
            <Link href="/privacy-policy" className="text-link mt-5 inline-block">
              Read the privacy policy
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="support-faq-title" className="section border-t border-gray-200 bg-gray-50">
        <div className="page-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading id="support-faq-title" eyebrow="FAQ" title="Common questions" />
          <div className="space-y-8">
            <div>
              <h3 className="mb-3 text-lg font-bold text-ink">Website tools</h3>
              <FaqList items={WEBSITE_FAQ} headingLevel={4} />
            </div>
            <div>
              <h3 className="mb-3 text-lg font-bold text-ink">Android app</h3>
              <FaqList items={SUPPORT_FAQ} headingLevel={4} />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
