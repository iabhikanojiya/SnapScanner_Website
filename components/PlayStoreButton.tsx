import { PLAY_STORE_URL } from '@/lib/site'
import { cn } from '@/lib/utils'

interface PlayStoreButtonProps {
  variant?: 'dark' | 'light' | 'primary'
  size?: 'md' | 'lg'
  className?: string
}

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M4.6 2.3c-.4.3-.6.8-.6 1.4v16.6c0 .6.2 1.1.6 1.4l9.3-9.7-9.3-9.7Zm10.8 11.3-2.3 2.4-7.6 7.9c.4.2 1 .1 1.5-.2l10.6-6-2.2-4.1Zm4.7-3.1-3.3-1.9-2.5 2.6 2.5 2.6 3.3-1.9c1-.6 1-1.8 0-2.4ZM6.5 1.1c-.5-.3-1.1-.4-1.5-.2l7.6 7.9 2.3 2.4 2.2-1.6-10.6-8.5Z" />
    </svg>
  )
}

/** The primary conversion action: opens the official Google Play listing. */
export default function PlayStoreButton({ variant = 'dark', size = 'lg', className }: PlayStoreButtonProps) {
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get Snap Scanner on Google Play (opens in a new tab)"
      className={cn(
        'inline-flex items-center gap-3 rounded-xl pl-4 pr-5 font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        size === 'lg' ? 'h-14' : 'h-12',
        variant === 'dark' && 'bg-ink text-white hover:bg-ink-soft focus-visible:ring-ink',
        variant === 'light' && 'bg-white text-ink hover:bg-gray-100 focus-visible:ring-white focus-visible:ring-offset-ink',
        variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-600',
        className
      )}
    >
      <PlayGlyph className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />
      <span className="flex flex-col items-start leading-none">
        <span className="text-[0.65rem] font-medium uppercase tracking-[0.08em] opacity-80">Get it on</span>
        <span className={size === 'lg' ? 'mt-1 text-lg' : 'mt-0.5 text-base'}>Google Play</span>
      </span>
    </a>
  )
}
