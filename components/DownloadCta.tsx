import { Download } from 'lucide-react'
import PlayStoreQr from '@/components/PlayStoreQr'
import { PLAY_STORE_URL } from '@/lib/site'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Decorative illustrations (original SVG, hidden from assistive technology)

function GoldDoc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 60" className={className}>
      <defs>
        <linearGradient id="cta-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE58A" />
          <stop offset="0.55" stopColor="#F5B92E" />
          <stop offset="1" stopColor="#D98A0B" />
        </linearGradient>
      </defs>
      <path d="M6 2h26l14 14v38a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z" fill="url(#cta-gold)" />
      <path d="M32 2v10a4 4 0 0 0 4 4h10z" fill="#FFF3C4" opacity="0.85" />
      <path d="M10 28h22M10 35h28M10 42h18" stroke="#B26F06" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <path d="M7 6h14" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

function PdfSheet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 60" className={className}>
      <defs>
        <linearGradient id="cta-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E7E4FB" />
        </linearGradient>
      </defs>
      <path d="M6 2h26l14 14v38a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z" fill="url(#cta-paper)" />
      <path d="M32 2v10a4 4 0 0 0 4 4h10z" fill="#D5D0F5" />
      <path d="M10 14h14M10 21h20" stroke="#C3BDEB" strokeWidth="3" strokeLinecap="round" />
      <rect x="6" y="32" width="32" height="16" rx="4" fill="#E53935" />
      <text x="22" y="44" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF" fontFamily="Arial, Helvetica, sans-serif">
        PDF
      </text>
    </svg>
  )
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="cta-sparkle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#9EE7FF" />
        </linearGradient>
      </defs>
      <path d="M12 0c1 6 5 10 12 12-7 2-11 6-12 12-1-6-5-10-12-12C7 10 11 6 12 0z" fill="url(#cta-sparkle)" />
    </svg>
  )
}

function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 22" className={className}>
      <defs>
        <linearGradient id="cta-heart" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB3E6" />
          <stop offset="1" stopColor="#B57CFF" />
        </linearGradient>
      </defs>
      <path d="M12 21C5 15.5 0 11.6 0 6.5 0 2.9 2.7 0 6.2 0 8.6 0 10.8 1.4 12 3.5 13.2 1.4 15.4 0 17.8 0 21.3 0 24 2.9 24 6.5c0 5.1-5 9-12 14.5z" fill="url(#cta-heart)" />
    </svg>
  )
}

const Dot = ({ className }: { className?: string }) => <span className={cn('block rounded-full', className)} />

/** Each decoration: what it is, where it floats, and its motion. Some are hidden on small screens. */
const DECORATIONS: { el: React.ReactNode; pos: string; motion: string; style: React.CSSProperties }[] = [
  {
    el: <GoldDoc className="h-full w-full" />,
    pos: 'right-[6%] top-[5%] h-11 w-9 md:right-auto md:left-[46%] md:top-[12%] md:h-14 md:w-11',
    motion: 'cta-float',
    style: { '--r': '-14deg', '--d': '7s' } as React.CSSProperties,
  },
  {
    el: <PdfSheet className="h-full w-full" />,
    pos: 'left-[53%] bottom-[12%] hidden h-16 w-12 md:block',
    motion: 'cta-float',
    style: { '--r': '12deg', '--d': '8s', animationDelay: '-2s' } as React.CSSProperties,
  },
  { el: <Sparkle className="h-full w-full" />, pos: 'right-[18%] top-[18%] h-5 w-5 md:right-auto md:left-[52%] md:top-[42%] md:h-6 md:w-6', motion: 'cta-pulse', style: { '--d': '3.2s' } as React.CSSProperties },
  {
    el: <Sparkle className="h-full w-full" />,
    pos: 'left-[3%] bottom-[8%] hidden h-4 w-4 md:block',
    motion: 'cta-pulse',
    style: { '--d': '4s', animationDelay: '-1.5s' } as React.CSSProperties,
  },
  {
    el: <Heart className="h-full w-full" />,
    pos: 'left-[44%] top-[54%] hidden h-5 w-5 md:block',
    motion: 'cta-float',
    style: { '--r': '-12deg', '--d': '5.5s', animationDelay: '-2.5s' } as React.CSSProperties,
  },
  {
    el: <Dot className="h-2.5 w-2.5 bg-cyan-300 shadow-[0_0_12px_4px_rgba(103,232,249,0.6)]" />,
    pos: 'left-[38%] top-[12%] hidden md:block',
    motion: 'cta-drift',
    style: { '--d': '6s' } as React.CSSProperties,
  },
  {
    el: <Dot className="h-2 w-2 bg-fuchsia-300 shadow-[0_0_10px_3px_rgba(240,171,252,0.6)]" />,
    pos: 'right-[8%] bottom-[5%] md:right-auto md:left-[61%] md:bottom-[28%]',
    motion: 'cta-drift',
    style: { '--d': '7s', animationDelay: '-3s' } as React.CSSProperties,
  },
  {
    el: <Dot className="h-1.5 w-1.5 bg-cyan-200 shadow-[0_0_8px_3px_rgba(165,243,252,0.6)]" />,
    pos: 'left-[49%] bottom-[6%] hidden lg:block',
    motion: 'cta-pulse',
    style: { '--d': '3.6s', animationDelay: '-1s' } as React.CSSProperties,
  },
  {
    el: <Dot className="h-2 w-2 bg-violet-300 shadow-[0_0_10px_3px_rgba(196,181,253,0.7)]" />,
    pos: 'right-[2%] top-[6%] hidden lg:block',
    motion: 'cta-pulse',
    style: { '--d': '4.4s' } as React.CSSProperties,
  },
]

/**
 * App download call to action in a rounded box: headline on the left, download
 * card on the right (stacked on phones). `small` uses a smaller headline for
 * pages other than the home page.
 */
export default function DownloadCta({ small, className = 'section' }: { small?: boolean; className?: string }) {
  return (
    <section aria-labelledby="download-cta-title" className={className}>
      <div className="page-container">
        <div className={cn('cta-gradient relative isolate overflow-hidden rounded-3xl px-6 sm:px-10 lg:px-14', small ? 'py-8 sm:py-10' : 'py-10 sm:py-12')}>
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            {DECORATIONS.map((d, i) => (
              <span key={i} className={cn('absolute drop-shadow-[0_8px_14px_rgba(20,10,80,0.35)]', d.pos, d.motion)} style={d.style}>
                {d.el}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <h2
              id="download-cta-title"
              className={cn(
                'max-w-[16ch] font-extrabold leading-[1.08] tracking-tight text-white',
                small ? 'text-[1.5rem] sm:text-[1.75rem] lg:text-[2rem]' : 'text-[2rem] sm:text-[2.25rem] lg:text-[2.75rem]'
              )}
            >
              Scan smarter. <br />
              Create faster. <br />
              Get started today.
            </h2>

            <div className="flex w-full max-w-[20rem] shrink-0 items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-[0_18px_40px_-12px_rgba(16,10,70,0.55)]">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-ink">Get Snap Scanner</p>
                <p className="mt-0.5 text-xs leading-snug text-ink-soft">Scan, edit and manage PDFs</p>
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                >
                  <Download aria-hidden className="h-4 w-4" />
                  Download App
                  <span className="sr-only">(opens Google Play in a new tab)</span>
                </a>
              </div>
              <PlayStoreQr className="h-24 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
