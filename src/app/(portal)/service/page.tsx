'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Wrench, ClipboardList, CheckCircle2, PackagePlus, X, Paperclip } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { AttachmentUpload } from '@/components/portal/AttachmentUpload'

type PartUsage = { id: number; partName: string; quantityUsed: number; unitPrice: string; usedAt: string }
type Ticket = {
  id: number
  ticketNumber: string
  customerName: string
  customerPhone: string | null
  vehicleModel: string | null
  chassisNumber: string | null
  issue: string
  priority: string
  status: string
  resolvedAt: string | null
  createdAt: string
  partsUsed: PartUsage[]
  bill: { id: number; billNumber: string } | null
}
type SparePart = { id: number; partName: string; partCode: string | null; quantityOnHand: number; unitPrice: string }

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`

export default function ServicePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [t, sp] = await Promise.all([
      crmFetch('/api/v1/dealer-portal/service-tickets'),
      crmFetch('/api/v1/dealer-portal/spare-parts-stock'),
    ])
    setTickets(t.data.tickets ?? [])
    setSpareParts(sp.data.parts ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openCount = tickets.filter((t) => t.status === 'OPEN').length
  const inProgressCount = tickets.filter((t) => ['IN_PROGRESS', 'AWAITING_PARTS'].includes(t.status)).length
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Service & Workshop" subtitle="Check a vehicle in with just the vehicle number, name, and issue. Parts get added one by one as the mechanic actually uses them — each one comes straight out of your spare-parts stock." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={ClipboardList} label="Total tickets" value={tickets.length} />
        <StatTile icon={Wrench} label="Checked in" value={openCount} />
        <StatTile icon={Wrench} label="Being serviced" value={inProgressCount} />
        <StatTile icon={CheckCircle2} label="Resolved" value={resolvedCount} />
      </div>

      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Check in a vehicle
        </Button>
      </div>

      {showForm && <NewTicketForm onDone={() => { setShowForm(false); load() }} />}

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
        ) : tickets.length === 0 ? (
          <div className="rounded-xl border border-ink/[0.08] bg-white py-10 text-center text-sm text-ink/40">No vehicles checked in yet.</div>
        ) : tickets.map((t) => (
          <TicketCard key={t.id} ticket={t} spareParts={spareParts} onChanged={load} />
        ))}
      </div>
    </div>
  )
}

function NewTicketForm({ onDone }: { onDone: () => void }) {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [chassisNumber, setChassisNumber] = useState('')
  const [issue, setIssue] = useState('')
  const [priority, setPriority] = useState('NORMAL')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/service-tickets', {
      method: 'POST',
      body: JSON.stringify({
        customerName,
        customerPhone: customerPhone || undefined,
        vehicleModel: vehicleModel || undefined,
        chassisNumber,
        issue,
        priority,
      }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not check in vehicle'); return }
    onDone()
  }

  const valid = customerName && chassisNumber && issue

  return (
    <div className="mb-4 rounded-xl border border-ink/[0.08] bg-white p-4">
      <p className="mb-3 text-xs text-ink/50">Just the essentials at intake — what parts it'll take is figured out once servicing starts.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Input label="Vehicle number" value={chassisNumber} onChange={(e) => setChassisNumber(e.target.value)} required />
        <Input label="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        <Input label="Customer phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        <Input label="Vehicle model (optional)" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
        <Select label="Priority" options={PRIORITIES} value={priority} onChange={(e) => setPriority(e.target.value)} />
      </div>
      <div className="mt-3">
        <label htmlFor="issue" className="mb-1.5 block text-sm font-medium text-ink/70">Issue</label>
        <textarea
          id="issue"
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-ink/10 bg-brand-white px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-slate/40"
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!valid || saving} loading={saving} onClick={submit}>
        Check in
      </Button>
    </div>
  )
}

const NEXT_STATUS: Record<string, { status: string; label: string }[]> = {
  OPEN: [{ status: 'IN_PROGRESS', label: 'Start servicing' }],
  IN_PROGRESS: [{ status: 'AWAITING_PARTS', label: 'Mark awaiting parts' }, { status: 'RESOLVED', label: 'Mark resolved' }],
  AWAITING_PARTS: [{ status: 'IN_PROGRESS', label: 'Resume servicing' }, { status: 'RESOLVED', label: 'Mark resolved' }],
  RESOLVED: [{ status: 'CLOSED', label: 'Close ticket' }],
  CLOSED: [],
}

function TicketCard({ ticket, spareParts, onChanged }: { ticket: Ticket; spareParts: SparePart[]; onChanged: () => void }) {
  const [showParts, setShowParts] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canAddParts = ['IN_PROGRESS', 'AWAITING_PARTS'].includes(ticket.status)
  const partsTotal = ticket.partsUsed.reduce((sum, p) => sum + Number(p.unitPrice) * p.quantityUsed, 0)

  async function setStatus(status: string) {
    setBusy(true)
    setError(null)
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/service-tickets/${ticket.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
    setBusy(false)
    if (!ok) { setError(data.message ?? 'Could not update status'); return }
    onChanged()
  }

  return (
    <div className="rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-ink/50">{ticket.ticketNumber}</span>
            <StatusBadge status={ticket.status} />
            {ticket.priority !== 'NORMAL' && <span className="text-xs text-ink/40">{ticket.priority}</span>}
            {ticket.bill && <span className="text-xs text-emerald-600">billed ({ticket.bill.billNumber})</span>}
          </div>
          <p className="mt-1 text-sm font-medium text-ink">{ticket.chassisNumber} <span className="font-normal text-ink/50">· {ticket.customerName}{ticket.customerPhone ? ` · ${ticket.customerPhone}` : ''}</span></p>
          {ticket.vehicleModel && <p className="text-xs text-ink/50">{ticket.vehicleModel}</p>}
          <p className="mt-1 text-sm text-ink/70">{ticket.issue}</p>
          {ticket.partsUsed.length > 0 && (
            <p className="mt-1 text-xs text-ink/50">{ticket.partsUsed.length} part{ticket.partsUsed.length > 1 ? 's' : ''} used · {money(partsTotal)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(canAddParts || ticket.partsUsed.length > 0) && (
            <Button size="sm" variant="outline" onClick={() => setShowParts((v) => !v)}>
              <PackagePlus className="h-3.5 w-3.5" /> Parts
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowAttachments((v) => !v)}>
            <Paperclip className="h-3.5 w-3.5" /> Attachments
          </Button>
          {NEXT_STATUS[ticket.status]?.map((n) => (
            <Button key={n.status} size="sm" variant={n.status === 'RESOLVED' ? 'primary' : 'outline'} disabled={busy} onClick={() => setStatus(n.status)}>
              {n.label}
            </Button>
          ))}
        </div>
      </div>

      {showParts && (
        <PartsPanel
          ticket={ticket}
          spareParts={spareParts}
          canAdd={canAddParts}
          onChanged={onChanged}
        />
      )}
      {showAttachments && <div className="mt-3"><AttachmentUpload kind="SERVICE_TICKET" parentId={ticket.id} /></div>}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function PartsPanel({ ticket, spareParts, canAdd, onChanged }: { ticket: Ticket; spareParts: SparePart[]; canAdd: boolean; onChanged: () => void }) {
  const [partId, setPartId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPart = spareParts.find((p) => String(p.id) === partId)

  async function addPart() {
    setBusy(true)
    setError(null)
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/service-tickets/${ticket.id}/parts`, {
      method: 'POST',
      body: JSON.stringify({ dealerSparePartId: partId, quantityUsed: quantity }),
    })
    setBusy(false)
    if (!ok) { setError(data.message ?? 'Could not add part'); return }
    setPartId(''); setQuantity('1')
    onChanged()
  }

  async function removePart(usageId: number) {
    setBusy(true)
    setError(null)
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/service-tickets/${ticket.id}/parts/${usageId}`, { method: 'DELETE' })
    setBusy(false)
    if (!ok && data?.message) { setError(data.message); return }
    onChanged()
  }

  return (
    <div className="mt-3 rounded-lg border border-ink/[0.08] bg-brand-white p-3">
      {ticket.partsUsed.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {ticket.partsUsed.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-ink/70">{p.partName} × {p.quantityUsed}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums text-ink">{money(Number(p.unitPrice) * p.quantityUsed)}</span>
                {canAdd && (
                  <button onClick={() => removePart(p.id)} disabled={busy} className="text-ink/30 hover:text-red-500" title="Remove (restocks the part)">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {canAdd ? (
        <div className="flex flex-wrap items-end gap-2">
          <Select
            label="Spare part"
            value={partId}
            onChange={(e) => setPartId(e.target.value)}
            options={spareParts.map((p) => ({ value: String(p.id), label: `${p.partName} (${p.quantityOnHand} on hand)` }))}
            placeholder="Select part"
            className="w-64"
          />
          <Input label="Qty" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-20" />
          <Button size="sm" disabled={!partId || busy || (selectedPart != null && Number(quantity) > selectedPart.quantityOnHand)} loading={busy} onClick={addPart}>
            Add part used
          </Button>
          {selectedPart != null && Number(quantity) > selectedPart.quantityOnHand && (
            <span className="text-xs text-red-500">Only {selectedPart.quantityOnHand} in stock</span>
          )}
        </div>
      ) : ticket.partsUsed.length === 0 ? (
        <p className="text-xs text-ink/40">No parts used yet.</p>
      ) : null}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  )
}
