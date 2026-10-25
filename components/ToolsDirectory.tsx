import Link from 'next/link'
import NavItemIcon from '@/components/NavItemIcon'
import { DIRECTORY_GROUPS, itemHref, itemLabel } from '@/lib/navigation'

/** Every tool, grouped by category; shown on the home page above the footer. */
export default function ToolsDirectory() {
  return (
    <section aria-labelledby="all-tools-directory" className="border-t border-gray-200 bg-white">
      <div className="page-container py-14">
        <h2 id="all-tools-directory" className="text-2xl font-bold text-ink">
          All Snap Scanner tools
        </h2>
        <div className="mt-8 columns-1 gap-x-10 sm:columns-2 lg:columns-4" data-testid="tools-directory">
          {DIRECTORY_GROUPS.map((group) => (
            <div key={group.id} className="mb-8 break-inside-avoid">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{group.name}</h3>
              <ul className="mt-3 space-y-0.5">
                {group.items.map((item) => (
                  <li key={itemHref(item)}>
                    <Link href={itemHref(item)} className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink hover:bg-gray-50 hover:text-brand-700">
                      <NavItemIcon item={item} />
                      {itemLabel(item)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
