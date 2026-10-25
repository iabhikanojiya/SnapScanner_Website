import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import JsonLd from '@/components/JsonLd'
import { APP_NAME, DEVELOPER_NAME, PLAY_STORE_URL, SITE_URL, SUPPORT_EMAIL } from '@/lib/site'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Snap Scanner – Free PDF Tools & Resume Builder',
    template: '%s | Snap Scanner',
  },
  description:
    'Free PDF tools and a resume builder that run in your browser: scan, convert, merge, split, compress, sign, lock and annotate PDFs. Also on Android.',
  applicationName: APP_NAME,
  authors: [{ name: DEVELOPER_NAME }],
  creator: DEVELOPER_NAME,
  publisher: DEVELOPER_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
  formatDetection: { telephone: false, email: false, address: false },
}

export const viewport: Viewport = {
  themeColor: '#E53935',
  width: 'device-width',
  initialScale: 1,
}

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: DEVELOPER_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  email: SUPPORT_EMAIL,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: SUPPORT_EMAIL,
  },
}

const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: APP_NAME,
  url: SITE_URL,
  publisher: { '@type': 'Organization', name: DEVELOPER_NAME },
  about: { '@type': 'MobileApplication', name: APP_NAME, operatingSystem: 'Android', installUrl: PLAY_STORE_URL },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
        <JsonLd data={organization} />
        <JsonLd data={website} />
      </body>
    </html>
  )
}
