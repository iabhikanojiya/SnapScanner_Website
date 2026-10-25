import Link from 'next/link'
import Logo from '@/components/Logo'
import { DEVELOPER_NAME, SUPPORT_MAILTO } from '@/lib/site'
import { tool, type ToolId } from '@/lib/tools'

const linkClass = 'text-[0.95rem] text-gray-400 transition-colors hover:text-white focus-visible:text-white'

const CREATE_TOOLS: ToolId[] = ['resume-builder', 'id-card-maker', 'invoice-maker', 'business-card-maker', 'certificate-maker', 'photo-collage-maker']

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Products',
    links: [
      { label: 'PDF Tools', href: '/tools' },
      { label: 'Convert & Image', href: '/tools#cat-convert-to' },
      { label: 'Create Studio', href: '/create' },
      ...CREATE_TOOLS.map((id) => ({ label: tool(id).name, href: tool(id).href })),
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Support', href: '/support' },
      { label: 'Contact Us', href: SUPPORT_MAILTO },
      { label: 'Help / FAQs', href: '/support#support-faq-title' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms and Conditions', href: '/terms' },
    ],
  },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="overflow-hidden bg-[#0B0B0B] text-white">
      <div className="page-container pt-14 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <div className="flex flex-col">
            <Logo tone="light" />
            <p className="mt-6 max-w-xs text-2xl font-semibold leading-tight tracking-tight text-white sm:text-[1.75rem]">Every document. Every tool. One place.</p>
            <p className="mt-6 text-sm text-gray-400 lg:mt-auto">
              © {year} {DEVELOPER_NAME}. Snap Scanner is made by {DEVELOPER_NAME}.
            </p>
          </div>

          <div className="grid border border-white/15 sm:grid-cols-3">
            {COLUMNS.map((col, i) => (
              <nav
                key={col.title}
                aria-label={col.title}
                className={i > 0 ? 'border-t border-white/15 p-6 sm:border-l sm:border-t-0 sm:p-8' : 'p-6 sm:p-8'}
              >
                <h2 className="text-base font-semibold text-white">{col.title}</h2>
                <ul className="mt-5 space-y-3.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      {l.href.startsWith('mailto:') ? (
                        <a href={l.href} className={linkClass}>
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href} className={linkClass}>
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <p className="mt-10 text-xs text-gray-500">Google Play is a trademark of Google LLC.</p>
      </div>

      {/* Decorative oversized wordmark, clipped by the footer. */}
      <div aria-hidden className="pointer-events-none select-none overflow-hidden">
        <p className="page-container -mb-[0.18em] mt-6 whitespace-nowrap text-center text-[clamp(2.75rem,11.2vw,9.75rem)] font-extrabold leading-none tracking-tight text-white/[0.07]">
          SNAP SCANNER
        </p>
      </div>
    </footer>
  )
}
