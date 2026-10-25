// Verified figures and reviews from the official Google Play listing of the
// Snap Scanner Android app, shown on the home page. Nothing here is fetched at
// runtime. To refresh it:
//   1. Open PLAY_STORE_URL (with &hl=en) in a private window.
//   2. Copy the rating, the rating count and the downloads range shown under
//      the app name, and the reviews under "Ratings and reviews", exactly as
//      displayed. Keep only reviews that are still publicly listed.
//   3. Update LAST_VERIFIED. Never round a rating up or add reviews from
//      anywhere else.
// The reviews are of the Android app, not the website, and the page says so.
import { PLAY_STORE_URL } from '@/lib/site'

/** Date the figures and reviews below were last checked on the listing (ISO). */
export const LAST_VERIFIED = '2026-10-25'

export const PLAY_LISTING = {
  appName: 'Snap Scanner: PDF & Resume',
  developer: 'Fusix',
  url: PLAY_STORE_URL,
  /** Average rating as displayed on the listing (one decimal). */
  rating: 4.7,
  /**
   * Number of ratings behind the average. The listing labels it “14 reviews”,
   * and its structured data reports it as ratingCount, so it's shown as ratings.
   */
  ratingCount: 14,
  /**
   * Set by the owner (Fusix Studio, 25 Oct 2026), who reports almost 10,000 installs.
   * Not from the public listing, which showed “1K+ Downloads” on that date. Shown as
   * downloads, not users.
   */
  downloads: '10K+',
}

export interface PlayReview {
  /** First name and last initial of the reviewer's public Google Play display name. */
  name: string
  /** Star rating shown with the review (1–5). */
  rating: 1 | 2 | 3 | 4 | 5
  /** Review date as displayed on the listing (ISO). */
  date: string
  /** The review text, verbatim (not shortened). */
  text: string
  /** Where the review is published. Google Play has no per-review links. */
  source: string
}

export const PLAY_REVIEWS: PlayReview[] = [
  {
    name: 'Kishan R.',
    rating: 5,
    date: '2026-09-28',
    text: 'Excellent PDF scanner app! Very easy to use, fast scanning, and the document quality is really good. I especially like the clean and modern interface and how easy it is to organize documents. Great app for scanning and managing PDFs. Highly recommended.',
    source: PLAY_STORE_URL,
  },
  {
    name: 'Punit V.',
    rating: 5,
    date: '2026-10-04',
    text: 'Great PDF scanner app! Simple, fast, and easy to use. The document scanning quality is really good. Highly recommended!',
    source: PLAY_STORE_URL,
  },
  {
    name: 'Aaju P.',
    rating: 5,
    date: '2026-09-30',
    text: "It's helpful app for daily uses and it's new features are too good 😊.",
    source: PLAY_STORE_URL,
  },
]
