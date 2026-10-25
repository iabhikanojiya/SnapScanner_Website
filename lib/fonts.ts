// Handwriting fonts for typed signatures. next/font downloads them at build
// time and serves them from this site, so no request goes to Google.
import { Caveat, Dancing_Script, Homemade_Apple } from 'next/font/google'

export const caveat = Caveat({ subsets: ['latin'], weight: '600', display: 'swap' })
export const dancing = Dancing_Script({ subsets: ['latin'], weight: '600', display: 'swap' })
export const homemade = Homemade_Apple({ subsets: ['latin'], weight: '400', display: 'swap' })

export const SIGNATURE_FONTS = [
  { id: 'caveat', label: 'Casual', font: caveat },
  { id: 'dancing', label: 'Elegant', font: dancing },
  { id: 'homemade', label: 'Handwritten', font: homemade },
] as const
