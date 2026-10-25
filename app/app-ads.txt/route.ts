import { APP_ADS_TXT } from '@/lib/site'

// Generated once at build time and served as a static file.
export const dynamic = 'force-static'

export function GET() {
  return new Response(APP_ADS_TXT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Cached, but not `immutable`: crawlers must see changes if the
      // authorized sellers ever change.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  })
}
