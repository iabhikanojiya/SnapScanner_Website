import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

// The site loads nothing from third parties: pdf.js and its worker, fonts and
// decoders are self-hosted (public/pdfjs). connect-src 'self' also guarantees
// that no script on the page can send a document to another origin.
// Next.js injects inline scripts for hydration, which requires 'unsafe-inline'
// without per-request nonces (nonces would force every page to render
// dynamically). pdf.js's JPEG 2000/JBIG2 decoders need 'wasm-unsafe-eval';
// dev mode also needs eval.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' blob: data:${isDev ? ' ws:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The camera is used only by Scan to PDF, and only after the browser asks.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    // Local images only; no remote patterns and no SVG optimization.
    minimumCacheTTL: 2678400,
  },
  async redirects() {
    return [
      { source: '/features', destination: '/tools', permanent: true },
      { source: '/pdf-scanner', destination: '/tools/scan-pdf', permanent: true },
    ]
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/:dir(resume-templates|brand|pdfjs|word-fonts)/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
      {
        source: '/og-image.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ]
  },
}

export default nextConfig
