import type { Metadata } from 'next'
import { APP_NAME, OG_IMAGE, SITE_URL } from '@/lib/site'

interface PageMetaInput {
  /** Page title without the site name; the root layout's template appends it. */
  title: string
  description: string
  path: `/${string}`
  /** Use the title as-is, without the " | Snap Scanner" suffix. */
  absoluteTitle?: boolean
}

/**
 * Metadata for one route. Next.js replaces (rather than merges) nested
 * `openGraph` and `twitter` objects, so each page sets them in full here.
 */
export function pageMetadata({ title, description, path, absoluteTitle = false }: PageMetaInput): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${APP_NAME}`
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: APP_NAME,
      url: `${SITE_URL}${path === '/' ? '' : path}`,
      title: fullTitle,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [OG_IMAGE.url],
    },
  }
}

/** BreadcrumbList structured data matching a page's visible breadcrumb trail. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.path === '/' ? SITE_URL : `${SITE_URL}${item.path}`,
    })),
  }
}

/** FAQPage structured data for questions that are shown on the page. */
export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  }
}
