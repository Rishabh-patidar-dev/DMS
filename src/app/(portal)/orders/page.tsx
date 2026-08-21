'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Car, Package, AlertTriangle, CalendarClock, Printer, CheckCircle2, X } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

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
        <button onClick={() => printNotice(orderNumber, item, notice)} className="flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100">
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
        <div className="mt-2 rounded-md border border-red-200 bg-white p-2.5">
          <p className="font-semibold text-ink">We can fulfil {notice.offeredQuantity} of {notice.requestedQuantity} now.</p>
          {notice.dealerResponse === 'PENDING' && !result && (
            <>
              <p className="mt-0.5 text-ink/60">Accept to confirm {notice.offeredQuantity} now — the remaining {notice.requestedQuantity - (notice.offeredQuantity ?? 0)} will be raised as a new backorder.</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => respond('ACCEPTED')} disabled={responding} className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                  {responding ? 'Confirming…' : `Accept ${notice.offeredQuantity} now`}
                </button>
                <button onClick={() => respond('DECLINED')} disabled={responding} className="rounded-md border border-ink/15 bg-white px-2.5 py-1 text-[11px] font-medium text-ink/70 hover:bg-ink/5 disabled:opacity-60">
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
  const [tab, setTab] = useState<'vehicles' | 'parts'>('vehicles')
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [t, s] = await Promise.all([
      crmFetch('/api/v1/dealer-portal/stock-transfers'),
      crmFetch('/api/v1/dealer-portal/spare-parts'),
    ])
    setTransfers(t.data.transfers ?? [])
    setSpareParts(s.data.spareParts ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredTransfers = useMemo(
    () => statusFilter ? transfers.filter((t) => t.status === statusFilter) : transfers,
    [transfers, statusFilter]
  )
  const filteredSpareParts = useMemo(
    () => statusFilter ? spareParts.filter((s) => s.status === statusFilter) : spareParts,
    [spareParts, statusFilter]
  )
  const openCount = tab === 'vehicles'
    ? transfers.filter((t) => ['REQUESTED', 'APPROVED', 'DISPATCHED', 'Close'].includes(t.status)).length
    : spareParts.filter((s) => ['REQUESTED', 'APPROVED', 'DISPATCHED', 'Close'].includes(s.status)).length

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Orders" subtitle="Place vehicle stock and spare-part orders — these land directly in the manufacturer's order desk." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-ink/[0.08] bg-white p-1">
          <button onClick={() => { setTab('vehicles'); setStatusFilter('') }} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'vehicles' ? 'bg-stone/15 text-slate' : 'text-ink/50 hover:text-ink'}`}>
            <Car className="h-3.5 w-3.5" /> Vehicles
            <span className="rounded-full bg-ink/[0.06] px-1.5 py-0.5 text-[10px] tabular-nums text-ink/50">{transfers.length}</span>
          </button>
          <button onClick={() => { setTab('parts'); setStatusFilter('') }} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'parts' ? 'bg-stone/15 text-slate' : 'text-ink/50 hover:text-ink'}`}>
            <Package className="h-3.5 w-3.5" /> Spare parts
            <span className="rounded-full bg-ink/[0.06] px-1.5 py-0.5 text-[10px] tabular-nums text-ink/50">{spareParts.length}</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-ink/[0.08] bg-white px-3 py-2 text-xs text-ink/70"
          >
            <option value="">All statuses ({openCount} open)</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> New order
          </Button>
        </div>
      </div>

      {showForm && (
        tab === 'vehicles'
          ? <VehicleOrderForm onDone={() => { setShowForm(false); load() }} />
          : <SparePartOrderForm onDone={() => { setShowForm(false); load() }} />
      )}

      {tab === 'vehicles' ? (
        <div className="overflow-hidden rounded-xl border border-ink/[0.08] bg-white">
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
              ) : transfers.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40">No vehicle orders placed yet.</td></tr>
              ) : transfers.map((t) => (
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
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink/[0.08] bg-white">
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
              ) : spareParts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40">No spare-part orders placed yet.</td></tr>
              ) : spareParts.map((s) => (
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
        </div>
      )}
    </div>
  )
}

type CatalogItem = { model: string; segment: string; application: string }

// One dropdown, not a free-text Model field + separate Segment picker — a
// dealer can only ever pick a real {model, segment} pair straight from the
// manufacturer's own catalog, so Check Inventory's exact-match comparison
// can never silently miss due to a typo or a model paired with the wrong
// segment.
type VehicleLine = { selected: string; quantity: string; notes: string }
let lineKeySeq = 0
function newLineKey() { return ++lineKeySeq }

function VehicleOrderForm({ onDone }: { onDone: () => void }) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [lines, setLines] = useState<{ key: number; line: VehicleLine }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    crmFetch('/api/v1/dealer-portal/vehicle-catalog').then(({ data }) => {
      const items: CatalogItem[] = data?.items ?? []
      setCatalog(items)
      const first = items.length > 0 ? `${items[0].model}|${items[0].segment}` : ''
      setLines([{ key: newLineKey(), line: { selected: first, quantity: '1', notes: '' } }])
      setLoadingCatalog(false)
    })
  }, [])

  const catalogOptions = catalog.map((c) => ({ value: `${c.model}|${c.segment}`, label: `${c.model} (${c.segment})` }))
  const defaultSelected = catalogOptions[0]?.value ?? ''

  function updateLine(key: number, patch: Partial<VehicleLine>) {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, line: { ...l.line, ...patch } } : l))
  }
  function addLine() {
    setLines((prev) => [...prev, { key: newLineKey(), line: { selected: defaultSelected, quantity: '1', notes: '' } }])
  }
  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const validLines = lines.filter((l) => l.line.selected)

  const submit = async () => {
    if (validLines.length === 0) return
    setSaving(true)
    setError(null)
    const failures: string[] = []
    for (const { line } of validLines) {
      const [model, segment] = line.selected.split('|')
      if (!model || !segment) continue
      const { ok, data } = await crmFetch('/api/v1/dealer-portal/stock-transfers', {
        method: 'POST',
        body: JSON.stringify({ model, segment, quantity: Number(line.quantity) || 1, notes: line.notes || undefined }),
      })
      if (!ok) failures.push(`${model}: ${data.message ?? 'failed'}`)
    }
    setSaving(false)
    if (failures.length > 0) { setError(failures.join('; ')); return }
    onDone()
  }

  return (
    <div className="mb-4 rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="space-y-3">
        {lines.map(({ key, line }) => (
          <div key={key} className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
            <Select
              label="Vehicle"
              options={catalogOptions}
              value={line.selected}
              onChange={(e) => updateLine(key, { selected: e.target.value })}
              disabled={loadingCatalog || catalogOptions.length === 0}
              hint={loadingCatalog ? 'Loading catalog…' : undefined}
            />
            <Input label="Quantity" type="number" min={1} value={line.quantity} onChange={(e) => updateLine(key, { quantity: e.target.value })} />
            <Input label="Notes (optional)" value={line.notes} onChange={(e) => updateLine(key, { notes: e.target.value })} />
            {lines.length > 1 && (
              <button onClick={() => removeLine(key)} className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-md text-ink/30 hover:bg-red-50 hover:text-red-500" aria-label="Remove line">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button onClick={addLine} className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate hover:underline">
        <Plus className="h-3.5 w-3.5" /> Add another vehicle
      </button>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={validLines.length === 0 || saving} loading={saving} onClick={submit}>
        Place order{validLines.length > 1 ? ` (${validLines.length} vehicles)` : ''}
      </Button>
    </div>
  )
}

type SparePartLine = { partName: string; partCode: string; quantity: string }

function SparePartOrderForm({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<{ key: number; line: SparePartLine }[]>(() => [
    { key: newLineKey(), line: { partName: '', partCode: '', quantity: '1' } },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateLine(key: number, patch: Partial<SparePartLine>) {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, line: { ...l.line, ...patch } } : l))
  }
  function addLine() {
    setLines((prev) => [...prev, { key: newLineKey(), line: { partName: '', partCode: '', quantity: '1' } }])
  }
  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const validLines = lines.filter((l) => l.line.partName.trim())

  const submit = async () => {
    if (validLines.length === 0) return
    setSaving(true)
    setError(null)
    const failures: string[] = []
    for (const { line } of validLines) {
      const { ok, data } = await crmFetch('/api/v1/dealer-portal/spare-parts', {
        method: 'POST',
        body: JSON.stringify({ partName: line.partName, partCode: line.partCode || undefined, quantity: Number(line.quantity) || 1 }),
      })
      if (!ok) failures.push(`${line.partName}: ${data.message ?? 'failed'}`)
    }
    setSaving(false)
    if (failures.length > 0) { setError(failures.join('; ')); return }
    onDone()
  }

  return (
    <div className="mb-4 rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="space-y-3">
        {lines.map(({ key, line }) => (
          <div key={key} className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
            <Input label="Part name" placeholder="e.g. Brake Pad Set" value={line.partName} onChange={(e) => updateLine(key, { partName: e.target.value })} required />
            <Input label="Part code (optional)" value={line.partCode} onChange={(e) => updateLine(key, { partCode: e.target.value })} />
            <Input label="Quantity" type="number" min={1} value={line.quantity} onChange={(e) => updateLine(key, { quantity: e.target.value })} />
            {lines.length > 1 && (
              <button onClick={() => removeLine(key)} className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-md text-ink/30 hover:bg-red-50 hover:text-red-500" aria-label="Remove line">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button onClick={addLine} className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate hover:underline">
        <Plus className="h-3.5 w-3.5" /> Add another part
      </button>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={validLines.length === 0 || saving} loading={saving} onClick={submit}>
        Place order{validLines.length > 1 ? ` (${validLines.length} parts)` : ''}
      </Button>
    </div>
  )
}
