'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import ToolIcon from '@/components/ToolIcon'
import { TOOL_CATEGORIES, TOOLS, searchTools, type ToolCategoryId } from '@/lib/tools'
import { cn } from '@/lib/utils'

interface ToolDirectoryProps {
  /** Search box id, unique per page. */
  id: string
  /** Show only popular tools until the user searches or filters. */
  popularFirst?: boolean
  autoFocus?: boolean
  headingLevel?: 'h2' | 'h3'
}

export default function ToolDirectory({ id, popularFirst = false, autoFocus, headingLevel: H = 'h3' }: ToolDirectoryProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ToolCategoryId | 'all'>('all')
  const results = useMemo(() => searchTools(query, category), [query, category])
  const showingPopular = popularFirst && !query.trim() && category === 'all'
  const shown = showingPopular ? TOOLS.filter((t) => t.popular) : results

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (results[0]) router.push(results[0].href)
        }}
      >
        <label htmlFor={id} className="sr-only">
          Search tools
        </label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
          <input
            id={id}
            type="search"
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools: merge, compress, sign, resume…"
            className="h-14 w-full rounded-2xl border border-gray-300 bg-white pl-12 pr-4 text-base text-ink shadow-card placeholder:text-gray-500 hover:border-gray-400 focus-visible:border-brand-600 focus-visible:ring-1 focus-visible:ring-offset-0"
            aria-describedby={`${id}-count`}
          />
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Tool categories">
        {[{ id: 'all' as const, name: 'All tools' }, ...TOOL_CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
            className={cn(
              'h-9 rounded-full border px-4 text-sm font-semibold transition-colors',
              category === c.id ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white text-ink-soft hover:border-gray-400 hover:text-ink'
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <p id={`${id}-count`} className="sr-only" role="status">
        {showingPopular ? 'Showing popular tools' : `${shown.length} tool${shown.length === 1 ? '' : 's'} found`}
      </p>

      {shown.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-6 py-10 text-center text-ink-soft">
          No tools match “{query}”. Try “merge”, “compress” or “image”.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="tool-results">
          {shown.map((t) => (
            <li key={t.id}>
              <Link href={t.href} className="card-link group flex h-full items-start gap-4 p-5">
                <ToolIcon id={t.id} />
                <span className="min-w-0">
                  <H className="font-bold text-ink group-hover:text-brand-700">{t.name}</H>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{t.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {showingPopular && (
        <p className="mt-4 text-sm">
          <Link href="/tools" className="text-link">
            See all {TOOLS.length} tools
          </Link>
        </p>
      )}
    </div>
  )
}
