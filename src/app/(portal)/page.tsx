'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Car, ClipboardList, ShieldCheck, Wrench, Loader2, ArrowRight, Users, PackagePlus, Truck, Package,
  Warehouse, CheckCircle2, PackageMinus, AlertTriangle, XCircle, MessageSquare, PackageCheck,
} from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile } from '@/components/portal/StatTile'
import ChartCard from '@/components/charts/ChartCard'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import ColumnChart from '@/components/charts/ColumnChart'
import type { Overview } from '@/components/portal/PortalShell'
import { VehicleOrderForm, SparePartOrderForm } from '@/components/portal/OrderForms'
import { Button } from '@/components/ui/Button'

const INVOICE_META: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  CONFIRMATION: { label: 'Confirmed', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700' },
  DISPATCH: { label: 'Dispatched', icon: Truck, className: 'bg-emerald-50 text-emerald-700' },
  DELIVERY: { label: 'Delivered', icon: PackageCheck, className: 'bg-emerald-50 text-emerald-700' },
  PARTIAL: { label: 'Partial', icon: PackageMinus, className: 'bg-amber-50 text-amber-700' },
  OUT_OF_STOCK: { label: 'Out of stock', icon: AlertTriangle, className: 'bg-red-50 text-red-700' },
  CANCELLATION: { label: 'Cancelled', icon: XCircle, className: 'bg-red-50 text-red-700' },
  CUSTOM: { label: 'Notice', icon: MessageSquare, className: 'bg-slate-100 text-slate-600' },
}

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

  if (loading) {
    return <div className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-ink/30" /></div>
  }
  if (!overview) return null

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-7 sm:py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={`Welcome back, ${overview.dealer.legalName}`}
          subtitle="Everything you place here reaches the manufacturer instantly — orders, stock, and claims are the same records their team sees."
        />
        <Button onClick={() => setShowOrderForm((v) => !v)}>
          <PackagePlus className="h-4 w-4" /> {showOrderForm ? 'Close order form' : 'Book a New Order'}
        </Button>
      </div>

      {showOrderForm && (
        <div className="mb-6 rounded-2xl bg-white p-5">
          <div className="mb-4 flex items-center gap-1 rounded-lg bg-canvas p-1">
            <button onClick={() => setOrderTab('vehicles')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${orderTab === 'vehicles' ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}`}>
              <Truck className="h-3.5 w-3.5" /> Vehicles
            </button>
            <button onClick={() => setOrderTab('parts')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${orderTab === 'parts' ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}`}>
              <Package className="h-3.5 w-3.5" /> Spare parts
            </button>
          </div>
          {orderTab === 'vehicles' ? (
            <VehicleOrderForm onDone={() => { setShowOrderForm(false); load() }} />
          ) : (
            <SparePartOrderForm onDone={() => { setShowOrderForm(false); load() }} />
          )}
        </div>
      )}

      {/* Hero row — performance snapshot, order-volume trend, fleet summary.
          Mirrors the reference layout's 3-card top row (small stat card /
          wide trend chart / accent hero card), mapped onto this portal's
          actual data instead of unrelated wallet widgets. */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_260px]">
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink/40">Performance</div>
          <PerformanceRow label="Lead conversion" value={overview.leadConversionRate} suffix="%" good={(v) => v >= 20} />
          <PerformanceRow label="Avg. days in stock" value={overview.avgDaysInStock} suffix="d" good={(v) => v <= 30} invert />
          <PerformanceRow label="Warranty claim rate" value={overview.warrantyClaimRate} suffix="%" good={(v) => v <= 5} invert />
        </div>

        <div className="rounded-2xl bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink/40">Units sold</div>
              <div className="text-[11px] text-ink/35">Last 8 weeks, vehicles delivered to your customers</div>
            </div>
          </div>
          {overview.salesTrend.some((d) => d.value > 0) ? (
            <ColumnChart data={overview.salesTrend} />
          ) : (
            <div className="flex h-40 items-center justify-center text-xs text-ink/35">No sales recorded yet.</div>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-accent p-5 text-white">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-white/70">
              <Warehouse className="h-3.5 w-3.5" /> Allocated fleet
            </div>
            <div className="mt-1 text-3xl font-semibold">{overview.vehicleCount}</div>
            <div className="text-xs text-white/60">vehicle units on hand</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/15 pt-4 text-xs">
            <div>
              <div className="text-white/60">Vehicle orders</div>
              <div className="text-base font-semibold">{overview.openTransfers}</div>
            </div>
            <div>
              <div className="text-white/60">Part orders</div>
              <div className="text-base font-semibold">{overview.openSpareParts}</div>
            </div>
          </div>
          <Link href="/inventory" className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-white/15 py-2 text-xs font-semibold transition-colors hover:bg-white/25">
            View inventory <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={Users} label="Open leads" value={overview.openLeads} />
        <StatTile icon={Car} label="Allocated units" value={overview.vehicleCount} />
        <StatTile icon={ClipboardList} label="Open vehicle orders" value={overview.openTransfers} />
        <StatTile icon={ClipboardList} label="Open part orders" value={overview.openSpareParts} />
        <StatTile icon={Wrench} label="Open service tickets" value={overview.openTickets} />
        <StatTile icon={ShieldCheck} label="Open warranty claims" value={overview.openClaims} />
      </div>

      {/* Recent activity — the reference's "Payment History" table, mapped to
          this portal's actual paper trail: the last few invoices the
          manufacturer issued (order confirmations, dispatch/delivery notes,
          out-of-stock/partial notices). */}
      <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="rounded-2xl bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink/40">Recent activity</div>
              <div className="text-[11px] text-ink/35">Latest documents from the manufacturer</div>
            </div>
            <Link href="/invoices" className="flex items-center gap-1 text-xs font-medium text-accent-dark hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {overview.recentInvoices.length === 0 ? (
            <div className="py-10 text-center text-xs text-ink/35">No invoices issued yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ink/35">
                    <th className="pb-2 font-medium">Document</th>
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentInvoices.map((inv) => {
                    const meta = INVOICE_META[inv.type] ?? INVOICE_META.CUSTOM
                    const Icon = meta.icon
                    return (
                      <tr key={inv.id} className="border-t border-ink/[0.05]">
                        <td className="py-3 font-mono text-xs text-ink/60">{inv.invoiceNumber}</td>
                        <td className="py-3 text-ink">{inv.item}</td>
                        <td className="py-3 text-ink/50">{new Date(inv.issuedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.className}`}>
                            <Icon className="h-3 w-3" /> {meta.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ChartCard title="Top-selling models" subtitle="All-time, this dealership">
          {overview.topModelsSold.length > 0 ? (
            <BarChart data={overview.topModelsSold} />
          ) : (
            <p className="py-6 text-center text-xs text-ink/35">No sales recorded yet.</p>
          )}
        </ChartCard>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="My stock, by status" subtitle="Vehicle units currently allocated to you">
          {overview.vehiclesByStatus.some((d) => d.value > 0) ? (
            <DonutChart data={overview.vehiclesByStatus} centerLabel="units" />
          ) : (
            <p className="py-6 text-center text-xs text-ink/35">No stock allocated yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Leads, by follow-up status" subtitle="Everything routed to you, plus your own walk-ins">
          {overview.leadsByStatus.some((d) => d.value > 0) ? (
            <DonutChart data={overview.leadsByStatus} centerLabel="leads" />
          ) : (
            <p className="py-6 text-center text-xs text-ink/35">No leads yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Warranty claims, by status" subtitle="Auto-adjudicated on submission">
          {overview.claimsByStatus.length > 0 ? (
            <BarChart data={overview.claimsByStatus} color="var(--viz-3)" />
          ) : (
            <p className="py-6 text-center text-xs text-ink/35">No claims raised yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Service tickets, by status" subtitle="Open, in progress, and resolved">
          {overview.ticketsByStatus.length > 0 ? (
            <DonutChart data={overview.ticketsByStatus} centerLabel="tickets" />
          ) : (
            <p className="py-6 text-center text-xs text-ink/35">No service tickets yet.</p>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {quickLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center justify-between rounded-2xl bg-white px-5 py-4 transition-colors hover:bg-accent-tint"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-tint text-accent-dark group-hover:bg-white">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-ink">{label}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-ink/25 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-dark" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function PerformanceRow({ label, value, suffix, good, invert }: { label: string; value: number | null; suffix: string; good: (v: number) => boolean; invert?: boolean }) {
  const known = value != null
  const isGood = known && good(value)
  return (
    <div className="flex items-center justify-between border-t border-ink/[0.06] pt-3 first:border-0 first:pt-0">
      <span className="text-xs text-ink/50">{label}</span>
      <span className={`text-sm font-semibold ${known ? (isGood ? 'text-emerald-600' : 'text-amber-600') : 'text-ink/30'}`}>
        {known ? `${value}${suffix}` : '—'}
      </span>
    </div>
  )
}
