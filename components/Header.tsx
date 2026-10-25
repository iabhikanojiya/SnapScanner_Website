'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Download, Menu, ScanLine, X } from 'lucide-react'
import Logo from '@/components/Logo'
import NavItemIcon from '@/components/NavItemIcon'
import PlayStoreQr from '@/components/PlayStoreQr'
import { Dialog } from '@/components/ui/dialog'
import { NAV_LINKS, PLAY_STORE_URL } from '@/lib/site'
import { CREATE_MENU_DESCRIPTIONS, HEADER_MENUS, itemHref, itemLabel, type HeaderMenu, type NavItem } from '@/lib/navigation'
import { cn } from '@/lib/utils'

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Closes a popover on Escape or a click outside `ref`. */
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, close, ref])
}

type Menu = HeaderMenu

function menuHrefs(menu: Menu) {
  return menu.groups.flatMap((g) => g.items.map(itemHref))
}

/**
 * A menu is active when the page is one of its items (or below one). Its
 * footer link counts too, unless other menus share it (PDF Tools and Convert &
 * Image both link to /tools, which belongs to neither).
 */
function menuActive(menu: Menu, pathname: string) {
  const sharedFooter = HEADER_MENUS.filter((m) => m.footer.href === menu.footer.href).length > 1
  return menuHrefs(menu).some((href) => isActive(pathname, href)) || (!sharedFooter && isActive(pathname, menu.footer.href))
}

/** Red dot before the active navigation label. The element itself carries aria-current, so the state isn't conveyed by colour alone. */
function ActiveDot({ show }: { show: boolean }) {
  // Always takes its space, so selecting a tab never changes the bar's width.
  return (
    <span
      aria-hidden
      className={cn('h-1.5 w-1.5 shrink-0 rounded-full bg-[#E53935] transition-[opacity,transform] duration-200', show ? 'scale-100 opacity-100' : 'scale-0 opacity-0')}
      data-testid={show ? 'active-dot' : undefined}
    />
  )
}

const describe = (item: NavItem) => (item.kind === 'tool' ? CREATE_MENU_DESCRIPTIONS[item.id] : undefined)

interface NavMenuProps {
  menu: Menu
  pathname: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The page belongs to this menu (aria-current). */
  current: boolean
  /** The one highlighted tab: the open menu, otherwise the current one. */
  highlighted: boolean
  /** Called with the destination when a link in this menu is chosen. */
  onPick: (href: string) => void
}

function NavMenu({ menu, pathname, open, onOpenChange, current, highlighted, onPick }: NavMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  useDismiss(open, close, ref)

  // Return focus to the trigger when Escape closes the panel. Capture phase, so
  // it runs before useDismiss closes the menu and this listener is removed.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') buttonRef.current?.focus()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])

  const columns = menu.groups.length

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-current={current ? 'true' : undefined}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-200 hover:text-white focus-visible:ring-offset-black',
          highlighted ? 'text-white' : 'text-gray-400'
        )}
      >
        <ActiveDot show={highlighted} />
        {menu.label}
        <ChevronDown aria-hidden className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className={cn(
          'fixed left-1/2 top-[calc(var(--header-height)+0.25rem)] max-h-[calc(100dvh-var(--header-height)-1rem)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-lift',
          menu.described ? 'w-[min(40rem,calc(100vw-2rem))]' : columns >= 4 ? 'w-[min(68rem,calc(100vw-2rem))]' : 'w-[min(52rem,calc(100vw-2rem))]'
        )}
      >
        {menu.described ? (
          <ul className="grid grid-cols-2 gap-1">
            {menu.groups.flatMap((g) => g.items).map((item) => (
              <li key={itemHref(item)}>
                <Link
                  href={itemHref(item)}
                  onClick={() => {
                    onPick(itemHref(item))
                    close()
                  }}
                  aria-current={isActive(pathname, itemHref(item)) ? 'page' : undefined}
                  className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-gray-50"
                >
                  <NavItemIcon item={item} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{itemLabel(item, menu)}</span>
                    <span className="block text-xs text-ink-muted">{describe(item)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={cn('grid gap-x-6 gap-y-6', columns >= 4 ? 'grid-cols-4' : 'grid-cols-3')}>
            {menu.groups.map((g) => (
              <div key={g.id}>
                <p className="px-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{g.name}</p>
                <ul className="mt-2 space-y-0.5">
                  {g.items.map((item) => (
                    <li key={itemHref(item)}>
                      <Link
                        href={itemHref(item)}
                        onClick={() => {
                          onPick(itemHref(item))
                          close()
                        }}
                        aria-current={pathname === itemHref(item) ? 'page' : undefined}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1 text-sm font-semibold text-ink hover:bg-gray-50"
                      >
                        <NavItemIcon item={item} />
                        {itemLabel(item)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <Link
          href={menu.footer.href}
          onClick={() => {
            onPick(menu.footer.href)
            close()
          }}
          className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-ink hover:bg-gray-100"
        >
          {menu.footer.label}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  )
}

/** Collapsible tool group in the mobile menu. */
function MobileMenuGroup({ menu, onNavigate, pathname, active }: { menu: Menu; onNavigate: (href: string) => void; pathname: string; active: boolean }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  return (
    <div className="border-b border-white/10 py-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-current={active ? 'true' : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn('flex min-h-11 w-full items-center justify-between rounded-xl px-3 font-semibold hover:bg-white/10 focus-visible:ring-offset-black', active ? 'text-white' : 'text-gray-300')}
      >
        <span className="flex items-center gap-2">
          <ActiveDot show={active} />
          {menu.label}
        </span>
        <ChevronDown aria-hidden className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} />
      </button>
      <div id={panelId} hidden={!open} className="pb-2">
        {menu.groups.map((g) => (
          <div key={g.id}>
            {!menu.described && <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">{g.name}</p>}
            <ul className={cn('grid gap-0.5 sm:grid-cols-2', menu.described && 'pt-2')}>
              {g.items.map((item) => (
                <li key={itemHref(item)}>
                  <Link
                    href={itemHref(item)}
                    onClick={() => onNavigate(itemHref(item))}
                    aria-current={isActive(pathname, itemHref(item)) ? 'page' : undefined}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-1 font-semibold text-white hover:bg-white/10 focus-visible:ring-offset-black"
                  >
                    <NavItemIcon item={item} />
                    <span className="min-w-0">
                      <span className="block">{itemLabel(item, menu)}</span>
                      {menu.described && <span className="block text-xs font-normal text-gray-400">{describe(item)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {menu.described && (
          <Link href={menu.footer.href} onClick={() => onNavigate(menu.footer.href)} className="mt-1 flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-[#FF8A80] hover:bg-white/10 focus-visible:ring-offset-black">
            {menu.footer.label} →
          </Link>
        )}
      </div>
    </div>
  )
}

export default function Header() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileRef = useRef<HTMLDivElement>(null)
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  useDismiss(mobileOpen, closeMobile, mobileRef)

  // Close the mobile menu after navigating.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMobileOpen(false)
  }

  // Exactly one tab is active. A tool chosen from a menu makes that menu active;
  // otherwise the page's route decides. While a dropdown is open, it alone is highlighted.
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [picked, setPicked] = useState<{ tab: string; href: string } | null>(null)
  const [appOpen, setAppOpen] = useState(false)
  const appButtonRef = useRef<HTMLButtonElement>(null)
  const routeTab =
    HEADER_MENUS.find((m) => menuActive(m, pathname))?.id ?? NAV_LINKS.find((l) => l.href !== '/tools' && isActive(pathname, l.href))?.href ?? null
  const activeTab = picked && isActive(pathname, picked.href.split('#')[0]) ? picked.tab : routeTab
  const highlightedTab = openMenu ?? activeTab
  const pick = (tab: string) => (href: string) => setPicked({ tab, href })
  const linkActive = (href: string) => activeTab === href

  return (
    // A black tab attached to the top edge of the screen. The strip around it is
    // transparent (and lets clicks through), so the page shows on either side.
    <header className="pointer-events-none sticky top-0 z-50">
      <div ref={mobileRef} className="page-container">
        <nav
          aria-label="Main"
          className="header-tab pointer-events-auto relative mx-auto flex h-14 w-full max-w-max items-center justify-between gap-4 rounded-b-[22px] bg-[#050505] pl-3 pr-2 sm:gap-6 sm:pl-4 lg:gap-8"
        >
          <Logo tone="light" current={pathname === '/'} className="shrink-0 focus-visible:ring-offset-black [&_span]:font-semibold" />

          <div className="hidden items-center gap-0.5 lg:flex">
            {HEADER_MENUS.map((menu) => (
              <NavMenu
                key={menu.id}
                menu={menu}
                pathname={pathname}
                open={openMenu === menu.id}
                onOpenChange={(o) => setOpenMenu((cur) => (o ? menu.id : cur === menu.id ? null : cur))}
                current={activeTab === menu.id}
                highlighted={highlightedTab === menu.id}
                onPick={pick(menu.id)}
              />
            ))}
            {NAV_LINKS.filter((l) => l.href !== '/tools').map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={linkActive(link.href) ? 'page' : undefined}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-200 hover:text-white focus-visible:ring-offset-black',
                  highlightedTab === link.href ? 'text-white' : 'text-gray-400'
                )}
              >
                <ActiveDot show={highlightedTab === link.href} />
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              ref={appButtonRef}
              aria-haspopup="dialog"
              onClick={() => setAppOpen(true)}
              className="hidden h-10 items-center gap-2 rounded-[14px] bg-white px-4 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-gray-200 focus-visible:ring-offset-black sm:inline-flex"
            >
              <ScanLine aria-hidden className="h-4 w-4 text-brand-600" />
              Download app
            </button>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:ring-offset-black lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen((o) => !o)}
            >
              <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
              {mobileOpen ? <X aria-hidden className="h-6 w-6" /> : <Menu aria-hidden className="h-6 w-6" />}
            </button>
          </div>
        </nav>

        <div
          id="mobile-menu"
          hidden={!mobileOpen}
          className="pointer-events-auto mx-auto mt-2 max-h-[calc(100dvh-var(--header-height)-1rem)] w-full max-w-[68rem] overflow-y-auto rounded-[28px] border border-white/10 bg-[#050505] p-3 lg:hidden"
        >
          <ul className="grid gap-1 border-b border-white/10 pb-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeMobile}
                  aria-current={linkActive(link.href) ? 'page' : undefined}
                  className={cn('flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-white/10 focus-visible:ring-offset-black', linkActive(link.href) ? 'text-white' : 'text-gray-300')}
                >
                  <ActiveDot show={linkActive(link.href)} />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {HEADER_MENUS.map((menu) => (
            <MobileMenuGroup
              key={menu.id}
              menu={menu}
              pathname={pathname}
              active={activeTab === menu.id}
              onNavigate={(href) => {
                pick(menu.id)(href)
                closeMobile()
              }}
            />
          ))}
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex h-12 items-center justify-center gap-2 rounded-[18px] bg-white font-semibold text-ink hover:bg-gray-200 focus-visible:ring-offset-black"
          >
            <Download aria-hidden className="h-5 w-5 text-brand-600" />
            Get the Android app
            <span className="sr-only">(opens Google Play in a new tab)</span>
          </a>
        </div>
      </div>
      <AppDownloadDialog open={appOpen} onClose={() => setAppOpen(false)} origin={appButtonRef} />
    </header>
  )
}

/** Transform that places the open popup over `button`, scaled down to its size. */
function fromButton(button: HTMLElement | null) {
  const dialog = document.querySelector<HTMLDialogElement>('dialog.app-dialog')
  if (!dialog || !button || button.offsetParent === null) return null
  const d = dialog.getBoundingClientRect()
  const b = button.getBoundingClientRect()
  const dx = b.left + b.width / 2 - (d.left + d.width / 2)
  const dy = b.top + b.height / 2 - (d.top + d.height / 2)
  const scale = Math.max(0.06, Math.min(b.width / d.width, 1))
  return { dialog, transform: `translate(${dx}px, ${dy}px) scale(${scale})` }
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** "Download our app" popup with a QR code for the Google Play listing. */
function AppDownloadDialog({ open, onClose, origin }: { open: boolean; onClose: () => void; origin: React.RefObject<HTMLElement | null> }) {
  // The popup grows out of the Download app button and shrinks back into it.
  const [closing, setClosing] = useState(false)

  // Opening: animate from the button once the dialog is shown.
  useEffect(() => {
    if (!open || reducedMotion()) return
    const frame = requestAnimationFrame(() => {
      const from = fromButton(origin.current)
      if (!from) return
      from.dialog.animate(
        [
          { transform: from.transform, opacity: 0.2, borderRadius: '14px' },
          { transform: 'none', opacity: 1, borderRadius: '16px' },
        ],
        { duration: 380, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1.08)' }
      )
    })
    return () => cancelAnimationFrame(frame)
  }, [open, origin])

  // Closing: animate back into the button, then close.
  const close = useCallback(() => {
    if (closing || !open) return
    const from = reducedMotion() ? null : fromButton(origin.current)
    if (!from) return onClose()
    setClosing(true)
    const anim = from.dialog.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: from.transform, opacity: 0 },
      ],
      { duration: 260, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' }
    )
    anim.onfinish = () => {
      setClosing(false)
      onClose()
      anim.cancel()
    }
  }, [closing, open, onClose, origin])

  return (
    <div className="pointer-events-auto">
      <Dialog open={open} onClose={close} className={cn('app-dialog', closing && 'is-closing')} title="Download our app" description="Your scanner, PDF tools and resume builder in your pocket. Free on Android.">
        <div className="cta-gradient relative isolate overflow-hidden rounded-2xl px-5 py-6 text-center">
          <span aria-hidden className="cta-pulse absolute left-6 top-5 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_3px_rgba(103,232,249,0.6)]" style={{ '--d': '3.4s' } as React.CSSProperties} />
          <span aria-hidden className="cta-pulse absolute bottom-6 right-7 h-1.5 w-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_10px_3px_rgba(240,171,252,0.6)]" style={{ '--d': '4.2s' } as React.CSSProperties} />
          <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-[0_18px_40px_-12px_rgba(16,10,70,0.55)]">
            <PlayStoreQr className="h-44 w-44" testId="header-play-qr" />
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-white">
            <ScanLine aria-hidden className="h-4 w-4" />
            Point your phone’s camera at the code
          </p>
        </div>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Download aria-hidden className="h-5 w-5" />
          Get it on Google Play
          <span className="sr-only">(opens Google Play in a new tab)</span>
        </a>
        <p className="mt-2 text-center text-xs text-ink-muted">On your phone already? Tap the button instead.</p>
      </Dialog>
    </div>
  )
}
