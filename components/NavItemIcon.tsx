import { Bot, LayoutTemplate } from 'lucide-react'
import ToolIcon from '@/components/ToolIcon'
import type { NavItem } from '@/lib/navigation'
import { cn } from '@/lib/utils'

/** The registry icon for tools, and matching tiles for non-tool pages. */
export default function NavItemIcon({ item, size = 'sm' }: { item: NavItem; size?: 'sm' | 'md' }) {
  if (item.kind === 'tool') return <ToolIcon id={item.id} size={size} />
  const Icon = item.icon === 'assistant' ? Bot : LayoutTemplate
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center bg-rose-50 text-rose-700', size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-11 w-11 rounded-xl')}>
      <Icon aria-hidden className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
    </span>
  )
}
