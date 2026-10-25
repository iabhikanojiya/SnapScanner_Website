import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  align?: 'left' | 'center'
  id?: string
  as?: 'h1' | 'h2'
  className?: string
  /** Light text for dark sections. */
  tone?: 'light' | 'dark'
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  id,
  as: Heading = 'h2',
  className,
  tone = 'light',
}: SectionHeadingProps) {
  const dark = tone === 'dark'
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && <p className={cn('eyebrow', dark && 'text-rose-300')}>{eyebrow}</p>}
      <Heading id={id} className={cn(Heading === 'h1' ? 'heading-display' : 'heading-section', eyebrow && 'mt-3', dark && 'text-white')}>
        {title}
      </Heading>
      {description && <p className={cn('lead mt-4', dark && 'text-white/70')}>{description}</p>}
    </div>
  )
}
