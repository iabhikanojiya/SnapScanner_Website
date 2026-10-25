import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { TOOLS } from '@/lib/tools'

// Dates are when each page's content last changed. Update them with the content
// rather than using the build time, so crawlers get a meaningful signal.
const UPDATED = '2026-10-23'
// Tool pages gained formats, uses and FAQs.
const TOOLS_UPDATED = '2026-10-25'
const CREATE_UPDATED = '2026-10-24'
const LEGAL_UPDATED = '2026-10-25'

const PAGES: { path: string; lastModified: string; changeFrequency: 'monthly' | 'yearly'; priority: number }[] = [
  { path: '/', lastModified: UPDATED, changeFrequency: 'monthly', priority: 1 },
  { path: '/tools', lastModified: TOOLS_UPDATED, changeFrequency: 'monthly', priority: 0.9 },
  ...TOOLS.filter((t) => t.href.startsWith('/tools/')).map((t) => ({ path: t.href, lastModified: TOOLS_UPDATED, changeFrequency: 'monthly' as const, priority: t.popular ? 0.9 : 0.8 })),
  { path: '/resume-builder', lastModified: UPDATED, changeFrequency: 'monthly', priority: 0.9 },
  { path: '/create', lastModified: CREATE_UPDATED, changeFrequency: 'monthly', priority: 0.9 },
  ...TOOLS.filter((t) => t.href.startsWith('/create/')).map((t) => ({ path: t.href, lastModified: CREATE_UPDATED, changeFrequency: 'monthly' as const, priority: 0.8 })),
  { path: '/files', lastModified: UPDATED, changeFrequency: 'monthly', priority: 0.6 },
  { path: '/assistant', lastModified: UPDATED, changeFrequency: 'monthly', priority: 0.6 },
  { path: '/support', lastModified: UPDATED, changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy-policy', lastModified: LEGAL_UPDATED, changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', lastModified: LEGAL_UPDATED, changeFrequency: 'yearly', priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({
    url: p.path === '/' ? SITE_URL : `${SITE_URL}${p.path}`,
    lastModified: p.lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))
}
