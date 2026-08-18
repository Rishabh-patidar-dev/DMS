'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

type Ticket = {
  id: number
  ticketNumber: string
  customerName: string
  vehicleModel: string | null
  chassisNumber: string | null
  issue: string
  priority: string
  status: string
  createdAt: string
}

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

export default function ServicePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await crmFetch('/api/v1/dealer-portal/service-tickets')
    setTickets(data.tickets ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Service Tickets" subtitle="Log a customer service issue — the manufacturer's after-sales team sees it immediately." />

      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Log a ticket
        </Button>
      </div>

      {showForm && <NewTicketForm onDone={() => { setShowForm(false); load() }} />}

      <div className="overflow-hidden rounded-xl border border-ink/[0.08] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Ticket</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Issue</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40">No service tickets logged yet.</td></tr>
            ) : tickets.map((t) => (
              <tr key={t.id} className="border-b border-ink/[0.05] last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-ink">{t.ticketNumber}</td>
                <td className="px-4 py-3 text-ink">{t.customerName}</td>
                <td className="px-4 py-3 text-ink/70">{t.issue}</td>
                <td className="px-4 py-3 text-ink/70">{t.priority}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
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
        chassisNumber: chassisNumber || undefined,
        issue,
        priority,
      }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not log ticket'); return }
    onDone()
  }

  return (
    <div className="mb-4 rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Input label="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        <Input label="Customer phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        <Select label="Priority" options={PRIORITIES} value={priority} onChange={(e) => setPriority(e.target.value)} />
        <Input label="Vehicle model (optional)" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
        <Input label="Chassis number (optional)" value={chassisNumber} onChange={(e) => setChassisNumber(e.target.value)} />
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
      <Button size="sm" className="mt-3" disabled={!customerName || !issue || saving} loading={saving} onClick={submit}>
        Log ticket
      </Button>
    </div>
  )
}
