import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function Logo({ className, tone = 'dark', current }: { className?: string; tone?: 'dark' | 'light'; current?: boolean }) {
  return (
    <Link href="/" aria-current={current ? 'page' : undefined} className={cn('inline-flex items-center gap-2.5 rounded-lg', className)}>
      <Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-[10px]" />
      <span className={cn('text-lg font-bold tracking-tight', tone === 'light' ? 'text-white' : 'text-ink')}>Snap Scanner</span>
    </Link>
  )
}
