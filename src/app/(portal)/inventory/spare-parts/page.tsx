'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, PackagePlus, IndianRupee, AlertTriangle, Boxes, RefreshCw, Search } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useDeepLinkQuery } from '@/lib/useDeepLinkQuery'

type SparePart = {
  id: number
  partName: string
  partCode: string | null
  quantityOnHand: number
  unitPrice: string
  updatedAt: string
}

const LOW_STOCK_THRESHOLD = 5
const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`

export default function SparePartsInventoryPage() {
  const deepLinkQ = useDeepLinkQuery()
  const [parts, setParts] = useState<SparePart[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState(deepLinkQ)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/spare-parts-stock')
    if (!ok) {
      console.error('[SparePartsInventoryPage] failed to load parts:', data.message)
      setLoadError(data.message ?? 'Could not load spare parts')
      setLoading(false)
      return
    }
    setParts(data.parts ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalUnits = parts.reduce((sum, p) => sum + p.quantityOnHand, 0)
  const totalValue = parts.reduce((sum, p) => sum + p.quantityOnHand * Number(p.unitPrice), 0)
  const lowStockCount = parts.filter((p) => p.quantityOnHand <= LOW_STOCK_THRESHOLD).length

  const filteredParts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return parts
    return parts.filter((p) => p.partName.toLowerCase().includes(q) || (p.partCode ?? '').toLowerCase().includes(q))
  }, [parts, search])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Spare Parts" subtitle="Your workshop's own spare-parts stock — this is what gets drawn down every time a mechanic uses a part servicing a vehicle." />

      {loadError && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 !bg-red-50 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Boxes} label="Distinct parts" value={parts.length} />
        <StatTile icon={Boxes} label="Total units on hand" value={totalUnits} />
        <StatTile icon={IndianRupee} label="Stock value" value={money(totalValue)} />
        <StatTile icon={AlertTriangle} label="Low stock" value={lowStockCount} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search part name or code…"
            className="w-full rounded-xl border border-ink/10 bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Add / restock part
        </Button>
      </div>

      {showForm && <NewPartForm onDone={() => { setShowForm(false); load() }} />}

      <Card padding="compact" className="overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Part</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">On hand</th>
              <th className="px-4 py-3 font-medium">Unit price</th>
              <th className="px-4 py-3 font-medium">Stock value</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : filteredParts.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40">{parts.length === 0 ? 'No spare parts on file yet.' : 'No parts match your search.'}</td></tr>
            ) : filteredParts.map((p) => (
              <PartRow key={p.id} part={p} onChanged={load} />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function PartRow({ part, onChanged }: { part: SparePart; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [quantityOnHand, setQuantityOnHand] = useState(String(part.quantityOnHand))
  const [unitPrice, setUnitPrice] = useState(part.unitPrice)
  const [busy, setBusy] = useState(false)
  const low = part.quantityOnHand <= LOW_STOCK_THRESHOLD

  async function save() {
    setBusy(true)
    await crmFetch(`/api/v1/dealer-portal/spare-parts-stock/${part.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantityOnHand, unitPrice }),
    })
    setBusy(false)
    setEditing(false)
    onChanged()
  }

  if (editing) {
    return (
      <tr className="border-b border-ink/[0.05] last:border-0 bg-brand-white">
        <td className="px-4 py-2 text-ink">{part.partName}</td>
        <td className="px-4 py-2 font-mono text-xs text-ink/60">{part.partCode ?? '—'}</td>
        <td className="px-4 py-2"><Input value={quantityOnHand} type="number" onChange={(e) => setQuantityOnHand(e.target.value)} className="w-20 py-1.5" /></td>
        <td className="px-4 py-2"><Input value={unitPrice} type="number" onChange={(e) => setUnitPrice(e.target.value)} className="w-24 py-1.5" /></td>
        <td className="px-4 py-2 tabular-nums text-ink/70">{money(Number(quantityOnHand || 0) * Number(unitPrice || 0))}</td>
        <td className="px-4 py-2">
          <div className="flex gap-1.5">
            <Button size="sm" disabled={busy} loading={busy} onClick={save}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-ink/[0.05] last:border-0">
      <td className="px-4 py-3 text-ink">{part.partName}</td>
      <td className="px-4 py-3 font-mono text-xs text-ink/60">{part.partCode ?? '—'}</td>
      <td className="px-4 py-3 tabular-nums">
        <span className={low ? 'font-medium text-amber-600' : 'text-ink'}>{part.quantityOnHand}</span>
        {low && <span className="ml-1.5 text-[10px] font-semibold uppercase text-amber-600">low</span>}
      </td>
      <td className="px-4 py-3 tabular-nums text-ink/70">{money(part.unitPrice)}</td>
      <td className="px-4 py-3 tabular-nums text-ink/70">{money(part.quantityOnHand * Number(part.unitPrice))}</td>
      <td className="px-4 py-3">
        <button onClick={() => setEditing(true)} className="text-xs font-medium text-slate hover:underline">Edit</button>
      </td>
    </tr>
  )
}

function NewPartForm({ onDone }: { onDone: () => void }) {
  const [partName, setPartName] = useState('')
  const [partCode, setPartCode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/spare-parts-stock', {
      method: 'POST',
      body: JSON.stringify({ partName, partCode: partCode || undefined, quantity, unitPrice: unitPrice || undefined }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not add part'); return }
    onDone()
  }

  const valid = partName && Number(quantity) > 0

  return (
    <Card className="mb-4">
      <p className="mb-3 text-xs text-ink/50">Adding a part that already exists tops up its quantity instead of creating a duplicate.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Input label="Part name" value={partName} onChange={(e) => setPartName(e.target.value)} required />
        <Input label="Part code (optional)" value={partCode} onChange={(e) => setPartCode(e.target.value)} />
        <Input label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        <Input label="Unit price, ₹" type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!valid || saving} loading={saving} onClick={submit}>
        <PackagePlus className="h-4 w-4" /> Save
      </Button>
    </Card>
  )
}
