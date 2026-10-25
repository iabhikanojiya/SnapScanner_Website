import { Download, LayoutGrid, Star } from 'lucide-react'
import SectionHeading from '@/components/SectionHeading'
import { PLAY_LISTING, PLAY_REVIEWS, type PlayReview } from '@/lib/play-store'
import { DISTINCT_TOOL_COUNT } from '@/lib/tools'
import { cn } from '@/lib/utils'

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden className={cn('h-4 w-4', i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200')} />
      ))}
    </span>
  )
}

function Byline({ review }: { review: PlayReview }) {
  return (
    <figcaption className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-gray-100 pt-4 text-sm">
      <span>
        <span className="font-semibold text-ink">{review.name}</span>
        <span className="text-ink-muted"> · </span>
        <time dateTime={review.date} className="text-ink-muted">
          {fmtDate(review.date)}
        </time>
      </span>
      <a href={review.source} target="_blank" rel="noopener noreferrer" className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:bg-gray-200 hover:text-ink">
        Google Play review
        <span className="sr-only"> (opens the app listing in a new tab)</span>
      </a>
    </figcaption>
  )
}

/** Verified Google Play reviews of the app, with the listing's figures and the website's tool count. */
export default function PlayReviews() {
  const [featured, ...others] = PLAY_REVIEWS
  return (
    <section aria-labelledby="reviews" className="section relative isolate overflow-hidden border-t border-gray-200 bg-white">
      <div aria-hidden className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-brand-50 blur-3xl" />
      <div className="page-container">
        <SectionHeading
          id="reviews"
          eyebrow="From Google Play"
          title="What people say about Snap Scanner"
          description="Reviews of the Snap Scanner Android app, quoted as written on its Google Play listing."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_1fr] lg:gap-6">
          {featured && (
            <figure className="relative flex flex-col justify-between rounded-3xl bg-ink p-7 text-white shadow-card sm:p-10 motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:-translate-y-1">
              <span aria-hidden className="pointer-events-none absolute right-7 top-2 select-none font-serif text-[9rem] leading-none text-brand-500/40 sm:right-10">
                “
              </span>
              <div>
                <Stars rating={featured.rating} />
                <blockquote className="mt-5 text-xl font-semibold leading-snug tracking-tight sm:text-2xl lg:text-[1.7rem]">
                  <p>{featured.text}</p>
                </blockquote>
              </div>
              <figcaption className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-sm">
                <span>
                  <span className="font-semibold">{featured.name}</span>
                  <span className="text-gray-400"> · </span>
                  <time dateTime={featured.date} className="text-gray-300">
                    {fmtDate(featured.date)}
                  </time>
                </span>
                <a href={featured.source} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/20 hover:text-white focus-visible:ring-white">
                  Google Play review
                  <span className="sr-only"> (opens the app listing in a new tab)</span>
                </a>
              </figcaption>
            </figure>
          )}
          <div className="grid gap-5 lg:gap-6">
            {others.map((r, i) => (
              <figure
                key={r.name}
                className={cn(
                  'flex flex-col justify-between rounded-3xl border border-gray-200 bg-white p-6 shadow-card sm:p-7 motion-safe:transition motion-safe:duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:border-brand-200',
                  i === 1 && 'lg:ml-8'
                )}
              >
                <div>
                  <Stars rating={r.rating} />
                  <blockquote className="mt-4 text-lg font-medium leading-relaxed text-ink">
                    <p>{r.text}</p>
                  </blockquote>
                </div>
                <Byline review={r} />
              </figure>
            ))}
          </div>
        </div>

        {/* Verified figures: the listing's, and the website's own tool count. */}
        <dl className="mt-8 grid overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 sm:grid-cols-3">
          <div className="flex items-center gap-4 p-5 sm:justify-center">
            <Download aria-hidden className="h-6 w-6 shrink-0 text-brand-600" />
            <div>
              <dt className="text-sm text-ink-muted">App downloads</dt>
              <dd className="text-2xl font-extrabold tracking-tight text-ink">{PLAY_LISTING.downloads}</dd>
            </div>
          </div>
          <div className="flex items-center gap-4 border-t border-gray-200 p-5 sm:justify-center sm:border-l sm:border-t-0">
            <Star aria-hidden className="h-6 w-6 shrink-0 fill-amber-400 text-amber-400" />
            <div>
              <dt className="text-sm text-ink-muted">Google Play rating</dt>
              <dd className="text-2xl font-extrabold tracking-tight text-ink">
                {PLAY_LISTING.rating.toFixed(1)}
                <span className="text-base font-semibold text-ink-muted"> / 5</span>
                <span className="ml-2 text-sm font-medium text-ink-muted">
                  {`from ${PLAY_LISTING.ratingCount} ${PLAY_LISTING.ratingCount === 1 ? 'rating' : 'ratings'}`}
                </span>
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-4 border-t border-gray-200 p-5 sm:justify-center sm:border-l sm:border-t-0">
            <LayoutGrid aria-hidden className="h-6 w-6 shrink-0 text-brand-600" />
            <div>
              <dt className="text-sm text-ink-muted">Free tools on this website</dt>
              <dd className="text-2xl font-extrabold tracking-tight text-ink">{DISTINCT_TOOL_COUNT}</dd>
            </div>
          </div>
        </dl>

      </div>
    </section>
  )
}
