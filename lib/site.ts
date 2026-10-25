// Shared site configuration. Every link to Google Play, the support inbox or
// the published privacy policy comes from here, so each lives in one place.

export const SITE_DOMAIN = 'snapscanner.vercel.app'
export const SITE_URL = `https://${SITE_DOMAIN}`

export const APP_NAME = 'Snap Scanner'
export const PLAY_STORE_TITLE = 'Snap Scanner: PDF & Resume'
export const DEVELOPER_NAME = 'Fusix Studio'

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.antigravity.snapscanner.snap_scanner&hl=en_IN'

export const SUPPORT_EMAIL = 'fusionsix.tech@gmail.com'
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`

export function supportMailto(subject: string) {
  return `${SUPPORT_MAILTO}?subject=${encodeURIComponent(subject)}`
}

/** The Android app's privacy policy (the in-app "Privacy Policy" link opens it). The website's own policy is /privacy-policy. */
export const PRIVACY_POLICY_SOURCE_URL = 'https://sites.google.com/view/snapscanner/home'

/** AdMob app-ads.txt authorization line. Must stay exactly as issued by AdMob. */
export const APP_ADS_TXT = 'google.com, pub-8348005705345032, DIRECT, f08c47fec0942fa0\n'

export const OG_IMAGE = {
  url: '/og-image.png',
  width: 1200,
  height: 630,
  alt: 'Snap Scanner – free PDF tools and resume builder in your browser, plus the Android app',
}

export const NAV_LINKS = [
  { href: '/tools', label: 'All tools' },
  { href: '/files', label: 'My files' },
  { href: '/assistant', label: 'Assistant' },
] as const
