import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <section className="page-container flex min-h-[60vh] flex-col items-start justify-center py-20">
      <p className="eyebrow">404</p>
      <h1 className="heading-display mt-3">Page not found</h1>
      <p className="lead mt-4 max-w-xl">The page you’re looking for doesn’t exist or has moved.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/">Go to the home page</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/tools">Browse tools</Link>
        </Button>
      </div>
    </section>
  )
}
