'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Zap, LogOut, Loader2, LayoutGrid, Car, ClipboardList, ShieldCheck, Wrench, Lock, Users, WifiOff,
} from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'

type Overview = {
  dealer: { id: number; dealerCode: string; legalName: string; status: string }
  vehicleCount: number
  openTransfers: number
  openSpareParts: number
  openTickets: number
  openClaims: number
  openLeads: number
}

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutGrid },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/inventory', label: 'My Inventory', icon: Car },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/warranty', label: 'Warranty Claims', icon: ShieldCheck },
  { href: '/service', label: 'Service Tickets', icon: Wrench },
]

export function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'locked' | 'unreachable'>('loading')
  const [signingOut, setSigningOut] = useState(false)

  const load = useCallback(async () => {
    const { ok, status, data } = await crmFetch('/api/v1/dealer-portal/overview')
    if (status === 0) {
      // crmFetch() couldn't reach the API at all — wrong API URL, CORS
      // rejection, or the API is down. Distinct from "locked" (a real
      // response saying access isn't unlocked yet) so the message tells the
      // dealer/admin what's actually wrong.
      setState('unreachable')
      return
    }
    if (status === 401) {
      router.push('/login')
      return
    }
    if (status === 403 || !ok) {
      setState('locked')
      return
    }
    setOverview(data)
    setState('ready')
  }, [router])

  useEffect(() => { load() }, [load])

  async function handleSignOut() {
    setSigningOut(true)
    await crmFetch('/api/v1/dealer-auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-white">
        <Loader2 className="h-5 w-5 animate-spin text-ink/40" />
      </div>
    )
  }

  if (state === 'unreachable') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-white p-8">
        <div className="max-w-md rounded-2xl border border-ink/[0.08] bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <WifiOff className="h-5 w-5 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-ink">Can&rsquo;t reach the server</h1>
          <p className="mt-2 text-sm text-ink/60">
            This usually means the CRM API URL is misconfigured for this deployment, or the API
            isn&rsquo;t allowing requests from this site yet. Try reloading — if it keeps happening,
            this needs an admin to check the environment configuration.
          </p>
          <button onClick={() => window.location.reload()} className="mt-5 text-sm font-medium text-slate hover:underline">
            Reload
          </button>
        </div>
      </div>
    )
  }

  if (state === 'locked') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-white p-8">
        <div className="max-w-md rounded-2xl border border-ink/[0.08] bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sand/15">
            <Lock className="h-5 w-5 text-sand" />
          </div>
          <h1 className="text-lg font-semibold text-ink">Portal not unlocked yet</h1>
          <p className="mt-2 text-sm text-ink/60">
            The dealer portal opens once your dealership finishes onboarding and goes live on the
            network. Check your onboarding status, or sign out and try a different account.
          </p>
          <button onClick={handleSignOut} className="mt-5 text-sm font-medium text-slate hover:underline">
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-brand-white">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink/[0.07] bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone/25">
            <Zap className="h-4 w-4 text-slate" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-ink">Voltmark DMS</p>
            <p className="text-[11px] leading-tight text-sand">Dealer Portal</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-stone/15 text-slate' : 'text-ink/60 hover:bg-sand/10 hover:text-ink',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-ink/[0.07] p-4">
          <p className="truncate text-xs font-semibold text-ink">{overview?.dealer.legalName}</p>
          <p className="mt-0.5 font-mono text-[11px] text-sand">{overview?.dealer.dealerCode}</p>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-3 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-sand transition-colors hover:bg-sand/10 hover:text-ink"
          >
            <LogOut className="h-3.5 w-3.5" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink/[0.07] bg-white px-6 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-slate" />
            <span className="text-sm font-semibold text-ink">Voltmark DMS</span>
          </div>
          <button onClick={handleSignOut} className="text-xs text-sand hover:text-ink">Sign out</button>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

export type { Overview }
