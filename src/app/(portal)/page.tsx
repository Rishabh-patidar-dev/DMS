'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Car, ClipboardList, ShieldCheck, Wrench, Loader2, ArrowRight, Users, TrendingUp, PackagePlus, Truck, Package } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile } from '@/components/portal/StatTile'
import ChartCard from '@/components/charts/ChartCard'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import type { Overview } from '@/components/portal/PortalShell'
import { VehicleOrderForm, SparePartOrderForm } from '@/components/portal/OrderForms'
import { Button } from '@/components/ui/Button'

export default function OverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderTab, setOrderTab] = useState<'vehicles' | 'parts'>('vehicles')

  const load = useCallback(() => {
    crmFetch('/api/v1/dealer-portal/overview').then(({ data }) => {
      setOverview(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  const quickLinks = [
    { href: '/leads', label: 'Follow up on leads', icon: Users },
    { href: '/inventory', label: 'View allocated stock', icon: Car },
    { href: '/orders', label: 'Place an order', icon: ClipboardList },
    { href: '/warranty', label: 'Raise a warranty claim', icon: ShieldCheck },
    { href: '/service', label: 'Log a service ticket', icon: Wrench },
  ]

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        title={`Welcome back${overview ? `, ${overview.dealer.legalName}` : ''}`}
        subtitle="Everything you place here reaches the manufacturer instantly — orders, stock, and claims are the same records their team sees."
      />

      {/* Direct order booking — the exact same form/flow as Order Management,
          just reachable without leaving Overview first. */}
      <div className="mb-6 rounded-xl border border-ink/[0.08] bg-white p-4">
        {!showOrderForm ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone/15 text-slate">
                <PackagePlus className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-ink">Need vehicle stock or spare parts?</span>
            </span>
            <Button size="sm" onClick={() => setShowOrderForm(true)}>
              <PackagePlus className="h-4 w-4" /> Book a New Order
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-lg border border-ink/[0.08] bg-brand-white p-1">
                <button onClick={() => setOrderTab('vehicles')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${orderTab === 'vehicles' ? 'bg-stone/15 text-slate' : 'text-ink/50 hover:text-ink'}`}>
                  <Truck className="h-3.5 w-3.5" /> Vehicles
                </button>
                <button onClick={() => setOrderTab('parts')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${orderTab === 'parts' ? 'bg-stone/15 text-slate' : 'text-ink/50 hover:text-ink'}`}>
                  <Package className="h-3.5 w-3.5" /> Spare parts
                </button>
              </div>
              <button onClick={() => setShowOrderForm(false)} className="text-xs font-medium text-ink/50 hover:text-ink">Cancel</button>
            </div>
            {orderTab === 'vehicles' ? (
              <VehicleOrderForm onDone={() => { setShowOrderForm(false); load() }} />
            ) : (
              <SparePartOrderForm onDone={() => { setShowOrderForm(false); load() }} />
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-ink/40" /></div>
      ) : overview ? (
        <>
          {/* Dealer Performance KPIs — same definitions the OEM's own Dealer
              Performance Dashboard spec uses, so this reads consistently
              with whatever the manufacturer sees about this dealership. */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <PerformanceTile label="Lead conversion rate" value={overview.leadConversionRate} suffix="%" good={(v) => v >= 20} />
            <PerformanceTile label="Avg. days in stock" value={overview.avgDaysInStock} suffix="d" good={(v) => v <= 30} invert />
            <PerformanceTile label="Warranty claim rate" value={overview.warrantyClaimRate} suffix="%" good={(v) => v <= 5} invert />
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile icon={Users} label="Open leads" value={overview.openLeads} />
            <StatTile icon={Car} label="Allocated units" value={overview.vehicleCount} />
            <StatTile icon={ClipboardList} label="Open vehicle orders" value={overview.openTransfers} />
            <StatTile icon={ClipboardList} label="Open part orders" value={overview.openSpareParts} />
            <StatTile icon={Wrench} label="Open service tickets" value={overview.openTickets} />
            <StatTile icon={ShieldCheck} label="Open warranty claims" value={overview.openClaims} />
          </div>

          <div className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <TrendingUp className="h-4 w-4 text-slate" /> Sales
          </div>
          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Units sold, last 8 weeks" subtitle="Vehicles delivered to your customers" className="lg:col-span-2">
              {overview.salesTrend.some((d) => d.value > 0) ? (
                <BarChart data={overview.salesTrend} color="var(--viz-1)" />
              ) : (
                <p className="py-6 text-center text-xs text-ink/40">No sales recorded yet.</p>
              )}
            </ChartCard>
            <ChartCard title="Top-selling models" subtitle="All-time, this dealership">
              {overview.topModelsSold.length > 0 ? (
                <BarChart data={overview.topModelsSold} color="var(--viz-2)" />
              ) : (
                <p className="py-6 text-center text-xs text-ink/40">No sales recorded yet.</p>
              )}
            </ChartCard>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="My stock, by status" subtitle="Vehicle units currently allocated to you">
              {overview.vehiclesByStatus.some((d) => d.value > 0) ? (
                <DonutChart data={overview.vehiclesByStatus} centerLabel="units" />
              ) : (
                <p className="py-6 text-center text-xs text-ink/40">No stock allocated yet.</p>
              )}
            </ChartCard>
            <ChartCard title="Leads, by follow-up status" subtitle="Everything routed to you, plus your own walk-ins">
              {overview.leadsByStatus.some((d) => d.value > 0) ? (
                <DonutChart data={overview.leadsByStatus} centerLabel="leads" />
              ) : (
                <p className="py-6 text-center text-xs text-ink/40">No leads yet.</p>
              )}
            </ChartCard>
            <ChartCard title="My orders, by status" subtitle="Vehicle + spare-part orders combined">
              {overview.ordersByStatus.length > 0 ? (
                <BarChart data={overview.ordersByStatus} />
              ) : (
                <p className="py-6 text-center text-xs text-ink/40">No orders placed yet.</p>
              )}
            </ChartCard>
            <ChartCard title="Warranty claims, by status" subtitle="Auto-adjudicated on submission">
              {overview.claimsByStatus.length > 0 ? (
                <BarChart data={overview.claimsByStatus} color="var(--viz-3)" />
              ) : (
                <p className="py-6 text-center text-xs text-ink/40">No claims raised yet.</p>
              )}
            </ChartCard>
            <ChartCard title="Invoices, by type" subtitle="Order confirmations, out-of-stock and partial-fulfillment notices">
              {overview.invoicesByType.some((d) => d.value > 0) ? (
                <DonutChart data={overview.invoicesByType} centerLabel="invoices" />
              ) : (
                <p className="py-6 text-center text-xs text-ink/40">No invoices issued yet.</p>
              )}
            </ChartCard>
            <ChartCard title="Service tickets, by status" subtitle="Open, in progress, and resolved">
              {overview.ticketsByStatus.length > 0 ? (
                <DonutChart data={overview.ticketsByStatus} centerLabel="tickets" />
              ) : (
                <p className="py-6 text-center text-xs text-ink/40">No service tickets yet.</p>
              )}
            </ChartCard>
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {quickLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center justify-between rounded-xl border border-ink/[0.08] bg-white px-5 py-4 transition-colors hover:border-slate/40"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone/15 text-slate">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-ink">{label}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-ink/30 transition-transform group-hover:translate-x-0.5 group-hover:text-slate" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function PerformanceTile({ label, value, suffix, good, invert }: { label: string; value: number | null; suffix: string; good: (v: number) => boolean; invert?: boolean }) {
  const known = value != null
  const isGood = known && good(value)
  return (
    <div className="rounded-xl border border-ink/[0.08] bg-white px-5 py-4">
      <div className="text-xs font-medium text-ink/50">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${known ? (isGood ? 'text-emerald-600' : 'text-amber-600') : 'text-ink/30'}`}>
        {known ? `${value}${suffix}` : '—'}
      </div>
      {known && <div className="mt-0.5 text-[11px] text-ink/40">{isGood ? (invert ? 'On track' : 'Healthy') : (invert ? 'Needs attention' : 'Below target')}</div>}
    </div>
  )
}
