'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Car, Package, AlertTriangle, CalendarClock, Printer, CheckCircle2, RefreshCw, Search } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatusBadge } from '@/components/portal/StatTile'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { VehicleOrderForm, SparePartOrderForm } from '@/components/portal/OrderForms'
import { useDeepLinkQuery } from '@/lib/useDeepLinkQuery'

type StockNotice = {
  status: 'OPEN' | 'SENT' | 'RESOLVED'
  requestedQuantity: number
  availableQuantity: number
  expectedRestockDate: string | null
  message: string | null
  sentAt: string | null
  offeredQuantity: number | null
  dealerResponse: 'PENDING' | 'ACCEPTED' | 'DECLINED'
}
type StockTransfer = { id: number; requestNumber: string; model: string; segment: string; quantity: number; status: string; notes: string | null; createdAt: string; stockNotice?: StockNotice | null }
type SparePart = { id: number; requestNumber: string; partName: string; partCode: string | null; quantity: number; status: string; createdAt: string; stockNotice?: StockNotice | null }

// Opens a clean, self-contained printable slip in a new tab — deliberately
// not relying on the portal's own print stylesheet (sidebar/topbar chrome),
// so this reads as a standalone document a dealer can save/print, same as a
// real out-of-stock notice would.
function printNotice(orderNumber: string, item: string, notice: StockNotice) {
  const w = window.open('', '_blank', 'width=640,height=720')
  if (!w) return
  const restock = notice.expectedRestockDate ? new Date(notice.expectedRestockDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed'
  w.document.write(`<!doctype html><html><head><title>Out-of-stock notice — ${orderNumber}</title>
    <style>
      body{font-family:ui-sans-serif,system-ui,sans-serif;color:#1c1c1a;padding:40px;max-width:560px;margin:0 auto}
      h1{font-size:18px;margin:0 0 4px}
      .muted{color:#6b6a63;font-size:12px}
      table{width:100%;border-collapse:collapse;margin-top:24px}
      td{padding:8px 0;border-bottom:1px solid #eceae4;font-size:13px}
      td:first-child{color:#6b6a63;width:40%}
      .msg{margin-top:20px;padding:14px;background:#fdeceb;border-radius:8px;font-size:13px;line-height:1.5}
      .foot{margin-top:32px;font-size:11px;color:#9a988f}
    </style></head><body>
    <h1>Out-of-stock notice</h1>
    <div class="muted">Order ${orderNumber}</div>
    <table>
      <tr><td>Item</td><td>${item}</td></tr>
      <tr><td>Requested quantity</td><td>${notice.requestedQuantity}</td></tr>
      <tr><td>Available at manufacturer</td><td>${notice.availableQuantity}</td></tr>
      <tr><td>Expected date for order renewal</td><td>${restock}</td></tr>
    </table>
    ${notice.message ? `<div class="msg">${notice.message}</div>` : ''}
    <div class="foot">This notice replaces the order-confirmation invoice until stock is available.</div>
    <script>window.onload = () => window.print()</script>
    </body></html>`)
  w.document.close()
}

function OutOfStockNoticeCard({
  orderNumber, item, notice, orderId, endpoint, onResponded,
}: {
  orderNumber: string
  item: string
  notice: StockNotice
  orderId: number
  endpoint: 'stock-transfers' | 'spare-parts'
  onResponded: () => void
}) {
  const [responding, setResponding] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasOffer = notice.offeredQuantity != null

  const respond = async (response: 'ACCEPTED' | 'DECLINED') => {
    setResponding(true)
    setError(null)
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/${endpoint}/${orderId}/notice-response`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    })
    setResponding(false)
    if (!ok) { setError(data.message ?? 'Could not send your response'); return }
    if (response === 'ACCEPTED') {
      setResult(data.backorder ? `Confirmed ${notice.offeredQuantity} now — ${data.backorder.requestNumber} raised for the remaining ${data.backorder.quantity}.` : `Confirmed ${notice.offeredQuantity} now.`)
    }
    onResponded()
  }

  return (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-ink">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" /> Out of stock — order on hold
        </div>
        <button onClick={() => printNotice(orderNumber, item, notice)} className="flex items-center gap-1 rounded-md border border-red-200 bg-card px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100">
          <Printer className="h-3 w-3" /> Print notice
        </button>
      </div>
      <p className="text-ink/70">{notice.requestedQuantity - notice.availableQuantity} short of the {notice.requestedQuantity} requested ({notice.availableQuantity} currently available).</p>
      {notice.expectedRestockDate && (
        <p className="mt-1 flex items-center gap-1 font-medium text-red-700">
          <CalendarClock className="h-3 w-3" /> Expected back in stock {new Date(notice.expectedRestockDate).toLocaleDateString()}
        </p>
      )}
      {notice.message && <p className="mt-1.5 text-ink/80">{notice.message}</p>}

      {hasOffer && (
        <div className="mt-2 rounded-md border border-red-200 bg-card p-2.5">
          <p className="font-semibold text-ink">We can fulfil {notice.offeredQuantity} of {notice.requestedQuantity} now.</p>
          {notice.dealerResponse === 'PENDING' && !result && (
            <>
              <p className="mt-0.5 text-ink/60">Accept to confirm {notice.offeredQuantity} now — the remaining {notice.requestedQuantity - (notice.offeredQuantity ?? 0)} will be raised as a new backorder.</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => respond('ACCEPTED')} disabled={responding} className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                  {responding ? 'Confirming…' : `Accept ${notice.offeredQuantity} now`}
                </button>
                <button onClick={() => respond('DECLINED')} disabled={responding} className="rounded-md border border-ink/15 bg-card px-2.5 py-1 text-[11px] font-medium text-ink/70 hover:bg-ink/5 disabled:opacity-60">
                  Decline — wait for full order
                </button>
              </div>
            </>
          )}
          {notice.dealerResponse === 'ACCEPTED' && !result && <p className="mt-1 font-medium text-emerald-700">Accepted.</p>}
          {notice.dealerResponse === 'DECLINED' && <p className="mt-1 font-medium text-ink/60">Declined — waiting for the full order.</p>}
          {result && <p className="mt-1 font-medium text-emerald-700">{result}</p>}
          {error && <p className="mt-1 text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

function ConfirmedNote() {
  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> Order confirmed by manufacturer
    </div>
  )
}

const STATUS_OPTIONS = ['REQUESTED', 'APPROVED', 'DISPATCHED', 'DELIVERED', 'Close', 'REJECTED', 'CANCELLED']

export default function OrdersPage() {
  const deepLinkQ = useDeepLinkQuery()
  const [tab, setTab] = useState<'vehicles' | 'parts'>('vehicles')
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState(deepLinkQ)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const [t, s] = await Promise.all([
      crmFetch('/api/v1/dealer-portal/stock-transfers'),
      crmFetch('/api/v1/dealer-portal/spare-parts'),
    ])
    const errors: string[] = []
    const nextTransfers: StockTransfer[] = t.ok ? t.data.transfers ?? [] : []
    const nextSpareParts: SparePart[] = s.ok ? s.data.spareParts ?? [] : []
    if (t.ok) setTransfers(nextTransfers)
    else errors.push(t.data.message ?? 'Could not load vehicle orders')
    if (s.ok) setSpareParts(nextSpareParts)
    else errors.push(s.data.message ?? 'Could not load spare-part orders')
    if (errors.length) {
      console.error('[OrdersPage] failed to load orders:', errors)
      setLoadError(errors.join(' · '))
    }
    // A GlobalSearch deep link doesn't know which tab its match lives on —
    // if the term only shows up in spare parts, jump the tab there so the
    // result is actually visible instead of landing on an empty vehicles list.
    if (deepLinkQ && !nextTransfers.some((x) => x.requestNumber === deepLinkQ) && nextSpareParts.some((x) => x.requestNumber === deepLinkQ)) {
      setTab('parts')
    }
    setLoading(false)
  }, [deepLinkQ])

  useEffect(() => { load() }, [load])

  const filteredTransfers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transfers.filter((t) =>
      (!statusFilter || t.status === statusFilter) &&
      (!q || t.requestNumber.toLowerCase().includes(q) || t.model.toLowerCase().includes(q))
    )
  }, [transfers, statusFilter, search])
  const filteredSpareParts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return spareParts.filter((s) =>
      (!statusFilter || s.status === statusFilter) &&
      (!q || s.requestNumber.toLowerCase().includes(q) || s.partName.toLowerCase().includes(q) || (s.partCode ?? '').toLowerCase().includes(q))
    )
  }, [spareParts, statusFilter, search])
  const openCount = tab === 'vehicles'
    ? transfers.filter((t) => ['REQUESTED', 'APPROVED', 'DISPATCHED', 'Close'].includes(t.status)).length
    : spareParts.filter((s) => ['REQUESTED', 'APPROVED', 'DISPATCHED', 'Close'].includes(s.status)).length

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Orders" subtitle="Place vehicle stock and spare-part orders — these land directly in the manufacturer's order desk." />

      {loadError && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 !bg-red-50 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-card p-1">
          <button onClick={() => { setTab('vehicles'); setStatusFilter('') }} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'vehicles' ? 'bg-accent text-white' : 'text-ink/50 hover:text-ink'}`}>
            <Car className="h-3.5 w-3.5" /> Vehicles
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${tab === 'vehicles' ? 'bg-white/20' : 'bg-ink/[0.06] text-ink/50'}`}>{transfers.length}</span>
          </button>
          <button onClick={() => { setTab('parts'); setStatusFilter('') }} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'parts' ? 'bg-accent text-white' : 'text-ink/50 hover:text-ink'}`}>
            <Package className="h-3.5 w-3.5" /> Spare parts
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${tab === 'parts' ? 'bg-white/20' : 'bg-ink/[0.06] text-ink/50'}`}>{spareParts.length}</span>
          </button>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New order
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, model, or part…"
            className="w-full rounded-xl border border-ink/10 bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-ink/10 bg-card px-3 py-2 text-xs text-ink/70 focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All statuses ({openCount} open)</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="mb-4">
          {tab === 'vehicles'
            ? <VehicleOrderForm onDone={() => { setShowForm(false); load() }} />
            : <SparePartOrderForm onDone={() => { setShowForm(false); load() }} />}
        </div>
      )}

      {tab === 'vehicles' ? (
        <Card padding="compact" className="overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/[0.07] text-left text-ink/50">
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
              ) : filteredTransfers.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40">{transfers.length === 0 ? 'No vehicle orders placed yet.' : 'No orders match your search.'}</td></tr>
              ) : filteredTransfers.map((t) => (
                <tr key={t.id} className="border-b border-ink/[0.05] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-ink align-top">{t.requestNumber}</td>
                  <td className="px-4 py-3 text-ink align-top">{t.model}</td>
                  <td className="px-4 py-3 text-ink/70 align-top">{t.segment}</td>
                  <td className="px-4 py-3 text-ink/70 align-top">{t.quantity}</td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={t.status} />
                    {t.status === 'Close' && t.stockNotice?.status === 'SENT' && (
                      <OutOfStockNoticeCard orderNumber={t.requestNumber} item={`${t.model} (${t.segment})`} notice={t.stockNotice} orderId={t.id} endpoint="stock-transfers" onResponded={load} />
                    )}
                    {t.status === 'APPROVED' && <ConfirmedNote />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card padding="compact" className="overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/[0.07] text-left text-ink/50">
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Part</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
              ) : filteredSpareParts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40">{spareParts.length === 0 ? 'No spare-part orders placed yet.' : 'No orders match your search.'}</td></tr>
              ) : filteredSpareParts.map((s) => (
                <tr key={s.id} className="border-b border-ink/[0.05] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-ink align-top">{s.requestNumber}</td>
                  <td className="px-4 py-3 text-ink align-top">{s.partName}</td>
                  <td className="px-4 py-3 text-ink/70 align-top">{s.partCode || '—'}</td>
                  <td className="px-4 py-3 text-ink/70 align-top">{s.quantity}</td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={s.status} />
                    {s.status === 'Close' && s.stockNotice?.status === 'SENT' && (
                      <OutOfStockNoticeCard orderNumber={s.requestNumber} item={s.partName} notice={s.stockNotice} orderId={s.id} endpoint="spare-parts" onResponded={load} />
                    )}
                    {s.status === 'APPROVED' && <ConfirmedNote />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

