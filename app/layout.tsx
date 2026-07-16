import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SchemaMarkup from '@/components/SchemaMarkup'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Snap Scanner - Scan Documents, Convert Images to PDF & Edit PDFs',
    template: '%s - Snap Scanner',
  },
  description:
    'Snap Scanner is the ultimate Android app for scanning documents, converting images to PDF, merging, splitting, compressing, signing, and protecting PDFs. Free, fast, and works offline.',
  keywords: [
    'PDF scanner',
    'document scanner',
    'image to PDF',
    'merge PDF',
    'split PDF',
    'compress PDF',
    'PDF editor',
    'Android scanner app',
    'Snap Scanner',
  ],
  metadataBase: new URL('https://snapscanner.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Snap Scanner',
    title: 'Snap Scanner - Your Smart PDF Scanner',
    description:
      'Scan documents, convert images into PDF, merge, split, compress, sign and protect PDFs — all from one simple app.',
    url: 'https://snapscanner.app',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Snap Scanner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Snap Scanner - Your Smart PDF Scanner',
    description:
      'Scan documents, convert images into PDF, merge, split, compress, sign and protect PDFs — all from one simple app.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <Header />
        {children}
        <Footer />
        <SchemaMarkup />
      </body>
    </html>
  )
}
