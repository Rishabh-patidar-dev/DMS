'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Car, Package } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

type StockTransfer = { id: number; requestNumber: string; model: string; segment: string; quantity: number; status: string; notes: string | null; createdAt: string }
type SparePart = { id: number; requestNumber: string; partName: string; partCode: string | null; quantity: number; status: string; createdAt: string }

const SEGMENTS = [
  { value: 'L5', label: 'L5' },
  { value: 'L3', label: 'L3' },
]

export default function OrdersPage() {
  const [tab, setTab] = useState<'vehicles' | 'parts'>('vehicles')
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

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

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Orders" subtitle="Place vehicle stock and spare-part orders — these land directly in the manufacturer's order desk." />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-ink/[0.08] bg-white p-1">
          <button onClick={() => setTab('vehicles')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'vehicles' ? 'bg-stone/15 text-slate' : 'text-ink/50 hover:text-ink'}`}>
            <Car className="h-3.5 w-3.5" /> Vehicles
          </button>
          <button onClick={() => setTab('parts')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'parts' ? 'bg-stone/15 text-slate' : 'text-ink/50 hover:text-ink'}`}>
            <Package className="h-3.5 w-3.5" /> Spare parts
          </button>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New order
        </Button>
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
                  <td className="px-4 py-3 font-mono text-xs text-ink">{t.requestNumber}</td>
                  <td className="px-4 py-3 text-ink">{t.model}</td>
                  <td className="px-4 py-3 text-ink/70">{t.segment}</td>
                  <td className="px-4 py-3 text-ink/70">{t.quantity}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
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
                  <td className="px-4 py-3 font-mono text-xs text-ink">{s.requestNumber}</td>
                  <td className="px-4 py-3 text-ink">{s.partName}</td>
                  <td className="px-4 py-3 text-ink/70">{s.partCode || '—'}</td>
                  <td className="px-4 py-3 text-ink/70">{s.quantity}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function VehicleOrderForm({ onDone }: { onDone: () => void }) {
  const [model, setModel] = useState('')
  const [segment, setSegment] = useState('L5')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!model) return
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/stock-transfers', {
      method: 'POST',
      body: JSON.stringify({ model, segment, quantity: Number(quantity) || 1, notes: notes || undefined }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not place order'); return }
    onDone()
  }

  return (
    <div className="mb-4 rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Input label="Model" placeholder="e.g. Vikas Lifter" value={model} onChange={(e) => setModel(e.target.value)} required />
        <Select label="Segment" options={SEGMENTS} value={segment} onChange={(e) => setSegment(e.target.value)} />
        <Input label="Quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!model || saving} loading={saving} onClick={submit}>
        Place vehicle order
      </Button>
    </div>
  )
}

function SparePartOrderForm({ onDone }: { onDone: () => void }) {
  const [partName, setPartName] = useState('')
  const [partCode, setPartCode] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!partName) return
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/spare-parts', {
      method: 'POST',
      body: JSON.stringify({ partName, partCode: partCode || undefined, quantity: Number(quantity) || 1 }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not place order'); return }
    onDone()
  }

  return (
    <div className="mb-4 rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Input label="Part name" placeholder="e.g. Brake Pad Set" value={partName} onChange={(e) => setPartName(e.target.value)} required />
        <Input label="Part code (optional)" value={partCode} onChange={(e) => setPartCode(e.target.value)} />
        <Input label="Quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!partName || saving} loading={saving} onClick={submit}>
        Place spare-part order
      </Button>
    </div>
  )
}
