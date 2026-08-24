'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LogOut, Loader2, LayoutGrid, Car, ClipboardList, ShieldCheck, Wrench, Users, WifiOff,
  Target, Mail, MessageCircle, FileText, ChevronDown, Menu, X, ShoppingBag, Receipt, PackagePlus, Scan,
  Bell,
} from 'lucide-react'
import { crmFetch, clearStoredToken } from '@/lib/crm/dealerAuth'
import { GlobalSearch } from './GlobalSearch'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

type ChartSeries = { label: string; value: number }[]

type Overview = {
  dealer: { id: number; dealerCode: string; legalName: string; status: string }
  vehicleCount: number
  openTransfers: number
  openSpareParts: number
  openTickets: number
  openClaims: number
  openLeads: number
  vehiclesByStatus: ChartSeries
  leadsByStatus: ChartSeries
  ordersByStatus: ChartSeries
  claimsByStatus: ChartSeries
  ticketsByStatus: ChartSeries
  salesTrend: ChartSeries
  topModelsSold: ChartSeries
  invoicesByType: ChartSeries
  recentInvoices: { id: number; invoiceNumber: string; type: string; item: string; totalAmount: number | string; issuedAt: string }[]
  leadConversionRate: number | null
  avgDaysInStock: number | null
  warrantyClaimRate: number | null
}

type NavIcon = React.ComponentType<{ className?: string }>
type NavItem = { href: string; label: string; icon: NavIcon }
type NavEntry = ({ kind: 'link' } & NavItem) | { kind: 'group'; id: string; group: string; items: NavItem[] }

// Every module with more than one screen is a collapsible group with its
// screens nested underneath — nothing but true single-screen modules sits
// directly in the top-level list.
const NAV: NavEntry[] = [
  { kind: 'link', href: '/', label: 'Overview', icon: LayoutGrid },
  {
    kind: 'group',
    id: 'leads',
    group: 'Leads',
    items: [
      { href: '/leads', label: 'Leads', icon: Users },
      { href: '/segments', label: 'Segments', icon: Target },
      { href: '/campaigns/email', label: 'Email Campaigns', icon: Mail },
      { href: '/campaigns/whatsapp', label: 'WhatsApp Campaigns', icon: MessageCircle },
    ],
  },
  {
    kind: 'group',
    id: 'inventory',
    group: 'Inventory & Stock',
    items: [
      { href: '/inventory', label: 'My Inventory', icon: Car },
      { href: '/inventory/spare-parts', label: 'Spare Parts', icon: PackagePlus },
    ],
  },
  {
    kind: 'group',
    id: 'order-management',
    group: 'Order Management',
    items: [
      { href: '/orders', label: 'Stock Orders', icon: ClipboardList },
      { href: '/invoices', label: 'Invoices', icon: FileText },
      { href: '/purchase-invoices', label: 'Purchase Invoices', icon: Scan },
    ],
  },
  {
    kind: 'group',
    id: 'sales-booking',
    group: 'Sales & Booking',
    items: [
      { href: '/bookings', label: 'Bookings', icon: ShoppingBag },
    ],
  },
  {
    kind: 'group',
    id: 'billing',
    group: 'Billing',
    items: [
      { href: '/billing', label: 'Customer Bills', icon: Receipt },
    ],
  },
  {
    kind: 'group',
    id: 'service',
    group: 'Service',
    items: [
      { href: '/warranty', label: 'Warranty Claims', icon: ShieldCheck },
      { href: '/service', label: 'Service Tickets', icon: Wrench },
    ],
  },
]

export function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'unreachable'>('loading')
  const [signingOut, setSigningOut] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['leads']))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const load = useCallback(async () => {
    const { ok, status, data } = await crmFetch('/api/v1/dealer-portal/overview')
    if (status === 0) {
      // crmFetch() couldn't reach the API at all — wrong API URL, CORS
      // rejection, or the API is down.
      setState('unreachable')
      return
    }
    if (status === 401) {
      clearStoredToken()
      router.push('/login')
      return
    }
    if (!ok) {
      // Any other failure (5xx, unexpected shape) — same "can't reach"
      // treatment rather than a dead-end screen; a reload usually recovers.
      setState('unreachable')
      return
    }
    setOverview(data)
    setState('ready')
  }, [router])

  useEffect(() => { load() }, [load])
  useEffect(() => { setMobileNavOpen(false) }, [pathname])

  async function handleSignOut() {
    setSigningOut(true)
    await crmFetch('/api/v1/dealer-auth/logout', { method: 'POST' })
    clearStoredToken()
    router.push('/login')
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page-bg">
        <Loader2 className="h-5 w-5 animate-spin text-ink/40" />
      </div>
    )
  }

  if (state === 'unreachable') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page-bg p-8">
        <div className="max-w-md rounded-2xl bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <WifiOff className="h-5 w-5 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-ink">Can&rsquo;t reach the server</h1>
          <p className="mt-2 text-sm text-ink/60">
            This usually means the CRM API URL is misconfigured for this deployment, or the API
            isn&rsquo;t allowing requests from this site yet. Try reloading — if it keeps happening,
            this needs an admin to check the environment configuration.
          </p>
          <button onClick={() => window.location.reload()} className="mt-5 text-sm font-medium text-accent-dark hover:underline">
            Reload
          </button>
        </div>
      </div>
    )
  }

  // min-h-0 is required on <nav> — without it, a flex child ignores its
  // parent's height and grows to fit its content instead, which previously
  // pushed content below the sidebar's rounded bottom edge.
  const navList = (onNavigate?: () => void) => (
    <nav className="scrollbar-none min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3">
      {NAV.map((entry) =>
        entry.kind === 'link' ? (
          <PortalNavLink key={entry.href} {...entry} active={pathname === entry.href} onClick={onNavigate} />
        ) : (
          <div key={entry.id} className="mb-1 mt-2 first:mt-0">
            <button
              onClick={() => toggleGroup(entry.id)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-ink/60 transition-colors hover:text-ink/85"
            >
              <span>{entry.group}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openGroups.has(entry.id) ? '' : '-rotate-90'}`} />
            </button>
            {openGroups.has(entry.id) && (
              <div className="space-y-0.5">
                {entry.items.map((item) => (
                  <PortalNavLink
                    key={item.href}
                    {...item}
                    active={pathname === item.href || pathname?.startsWith(item.href + '/')}
                    onClick={onNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        )
      )}
    </nav>
  )

  const initials = (overview?.dealer.legalName ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <div className="min-h-screen bg-page-bg p-2.5 sm:p-4">
      <div className="flex h-[calc(100vh-1.25rem)] gap-4 sm:h-[calc(100vh-2rem)]">
        <aside className="hidden min-h-0 w-64 shrink-0 flex-col overflow-hidden rounded-2xl bg-card p-4 lg:flex">
          <div className="flex items-center gap-2.5 px-1.5 pb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-tint">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/luxus-green-logo.webp" alt="Luxus Green Mobility" className="h-6 w-6 object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-ink">Luxus Green</p>
              <p className="text-[11px] leading-tight text-ink/55">Dealer Portal</p>
            </div>
          </div>

          {navList()}
        </aside>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNavOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] min-h-0 flex-col overflow-hidden bg-card shadow-xl">
              <div className="flex items-center justify-between px-5 py-5">
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/luxus-green-logo.webp" alt="Luxus Green Mobility" className="h-7 w-7 object-contain" />
                  <p className="text-sm font-semibold text-ink">Luxus Green DMS</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <ThemeToggle />
                  <button onClick={() => setMobileNavOpen(false)} className="text-ink/60 hover:text-ink" aria-label="Close menu">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="px-2 pb-3"><GlobalSearch /></div>
              {navList(() => setMobileNavOpen(false))}
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Desktop top bar — search is the centerpiece, matching the "find
              anything from here" brief; notification bell is a static affordance
              for now (no notification backend exists yet). */}
          <header className="hidden shrink-0 items-center gap-4 rounded-2xl bg-card px-5 py-3 lg:flex">
            <GlobalSearch />
            <div className="ml-auto flex shrink-0 items-center gap-3">
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink/50 transition-colors hover:text-ink" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </button>
              <ThemeToggle />
              <div className="border-l border-ink/[0.08] pl-3">
                <AccountMenu
                  legalName={overview?.dealer.legalName}
                  dealerCode={overview?.dealer.dealerCode}
                  initials={initials}
                  onSignOut={handleSignOut}
                  signingOut={signingOut}
                  showNameInline
                />
              </div>
            </div>
          </header>

          {/* Mobile top bar */}
          <header className="flex shrink-0 items-center justify-between rounded-2xl bg-card px-4 py-3 lg:hidden">
            <button onClick={() => setMobileNavOpen(true)} className="text-ink/60 hover:text-ink" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/luxus-green-logo.webp" alt="Luxus Green Mobility" className="h-5 w-5 object-contain" />
              <span className="text-sm font-semibold text-ink">Luxus Green DMS</span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <AccountMenu
                legalName={overview?.dealer.legalName}
                dealerCode={overview?.dealer.dealerCode}
                initials={initials}
                onSignOut={handleSignOut}
                signingOut={signingOut}
              />
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-2xl bg-canvas">{children}</main>
        </div>
      </div>
    </div>
  )
}

function PortalNavLink({ href, label, icon: Icon, active, onClick }: NavItem & { active?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        active ? 'bg-accent text-white shadow-sm shadow-accent/25' : 'text-ink/75 hover:bg-canvas hover:text-ink',
      ].join(' ')}
    >
      <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-ink/55'}`} />
      {label}
    </Link>
  )
}

// Account avatar in the top bar — click opens the same dealer-info + sign-
// out card that used to sit permanently pinned at the bottom of the
// sidebar, same idea as a Google-style account menu: the trigger is always
// visible, the actual info/actions only take up space when opened.
function AccountMenu({
  legalName,
  dealerCode,
  initials,
  onSignOut,
  signingOut,
  showNameInline,
}: {
  legalName?: string
  dealerCode?: string
  initials: string
  onSignOut: () => void
  signingOut: boolean
  showNameInline?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full py-0.5 pl-0.5 pr-1 transition-colors hover:bg-canvas"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
          {initials || '—'}
        </span>
        {showNameInline && (
          <div className="hidden text-left xl:block">
            <p className="max-w-[140px] truncate text-xs font-semibold leading-tight text-ink">{legalName}</p>
            <p className="text-[10px] leading-tight text-ink/55">{dealerCode}</p>
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-2xl border border-ink/[0.08] bg-card p-2 shadow-xl">
          <div className="flex items-center gap-2.5 rounded-xl p-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
              {initials || '—'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{legalName}</p>
              <p className="truncate font-mono text-[11px] text-ink/55">{dealerCode}</p>
            </div>
          </div>
          <div className="my-1 border-t border-ink/[0.08]" />
          <button
            onClick={onSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:bg-canvas hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}

export type { Overview }
