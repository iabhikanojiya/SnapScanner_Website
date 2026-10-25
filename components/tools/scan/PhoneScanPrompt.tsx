'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Download, Smartphone } from 'lucide-react'
import PlayStoreQr from '@/components/PlayStoreQr'
import { PLAY_STORE_URL } from '@/lib/site'

/** Desktops and laptops: a precise pointer that can hover (phones and tablets don't match). */
const QUERY = '(pointer: fine) and (hover: hover)'
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/** True on desktops and laptops (false while rendering on the server). */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false)
}

/**
 * On computers, scanning happens on a phone: a QR code opens the Snap Scanner
 * app on Google Play. Photos already on the computer go to Images to PDF.
 */
export default function PhoneScanPrompt() {
  const desktop = useIsDesktop()
  if (!desktop) return null
  return (
    <section aria-labelledby="phone-scan-title" className="cta-gradient relative isolate flex flex-col gap-5 overflow-hidden rounded-2xl p-5 text-white sm:flex-row sm:items-center sm:p-6" data-testid="phone-scan-prompt">
      <div className="mx-auto shrink-0 rounded-2xl bg-white p-2.5 shadow-[0_18px_40px_-12px_rgba(16,10,70,0.55)] sm:mx-0">
        <PlayStoreQr className="h-32 w-32" testId="scan-play-qr" />
      </div>
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
          <Smartphone aria-hidden className="h-3.5 w-3.5" />
          On a computer?
        </p>
        <h2 id="phone-scan-title" className="mt-2 text-xl font-bold">
          Scan with your phone instead
        </h2>
        <p className="mt-1 text-sm text-white/85">
          Point your phone’s camera at the code to get the free Snap Scanner app for Android. It finds page edges automatically and saves clean PDFs.
        </p>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-gray-100"
        >
          <Download aria-hidden className="h-4 w-4 text-brand-600" />
          Get it on Google Play
          <span className="sr-only">(opens Google Play in a new tab)</span>
        </a>
        <p className="mt-3 text-sm text-white/85">
          Already have photos of documents on this computer?{' '}
          <Link href="/tools/image-to-pdf" className="font-semibold text-white underline underline-offset-2">
            Use Images to PDF
          </Link>
        </p>
      </div>
    </section>
  )
}
