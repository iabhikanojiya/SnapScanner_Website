import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'error' | 'success' | 'info' | 'warning'

const tones: Record<Tone, string> = {
  error: 'border-brand-200 bg-brand-50 text-brand-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  info: 'border-gray-200 bg-gray-50 text-ink-soft',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
}

const icons = { error: AlertCircle, success: CheckCircle2, info: Info, warning: AlertCircle }

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone
  title?: string
  children?: React.ReactNode
  className?: string
}) {
  const Icon = icons[tone]
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-xl border px-4 py-3 text-sm', tones[tone], className)}
    >
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'break-words')}>{children}</div>}
      </div>
    </div>
  )
}

export function ErrorList({ errors, onDismiss }: { errors: string[]; onDismiss?: () => void }) {
  if (errors.length === 0) return null
  return (
    <Alert tone="error" title={errors.length === 1 ? 'Something went wrong' : `${errors.length} files couldn’t be added`}>
      {errors.length === 1 ? (
        errors[0]
      ) : (
        <ul className="list-disc space-y-1 pl-4">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="mt-2 font-semibold underline underline-offset-2">
          Dismiss
        </button>
      )}
    </Alert>
  )
}

/** Progress based on completed work units. Indeterminate when `total` is 0. */
export function Progress({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : undefined
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-semibold text-ink">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin text-brand-600" />
          {label}
        </span>
        {pct !== undefined && (
          <span className="tabular-nums text-ink-muted">
            {done} of {total}
          </span>
        )}
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className={cn('h-full rounded-full bg-brand-600 transition-[width]', pct === undefined && 'w-1/3 animate-pulse')}
          style={pct !== undefined ? { width: `${Math.max(4, pct)}%` } : undefined}
        />
      </div>
    </div>
  )
}

export function Spinner({ label, className }: { label: string; className?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-sm text-ink-muted', className)}>
      <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      {label}
    </span>
  )
}
