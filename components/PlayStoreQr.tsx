import qrcode from 'qrcode-generator'
import { PLAY_STORE_URL } from '@/lib/site'
import { cn } from '@/lib/utils'

/** QR code modules for the Google Play listing as one SVG path (with a 2-module quiet zone). */
function playStoreQr() {
  const qr = qrcode(0, 'M')
  qr.addData(PLAY_STORE_URL)
  qr.make()
  const n = qr.getModuleCount()
  let d = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`
  return { d, size: n + 4 }
}

/** A scannable QR code that opens Snap Scanner on Google Play. */
export default function PlayStoreQr({ className, testId = 'play-qr' }: { className?: string; testId?: string }) {
  const qr = playStoreQr()
  return (
    <svg
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      className={cn('shrink-0', className)}
      role="img"
      aria-label="QR code that opens Snap Scanner on Google Play"
      shapeRendering="crispEdges"
      data-testid={testId}
      data-qr-data={PLAY_STORE_URL}
    >
      <rect width={qr.size} height={qr.size} fill="#FFFFFF" />
      <path d={qr.d} fill="#111827" />
    </svg>
  )
}
