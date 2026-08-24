'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, ShoppingBag, IndianRupee, CheckCircle2, Car, Paperclip, RefreshCw } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { AttachmentUpload } from '@/components/portal/AttachmentUpload'

type CatalogItem = { model: string; segment: string }
type AvailableUnit = { id: number; vin: string; model: string; segment: string; color: string | null; status: string }
type Booking = {
  id: number
  bookingNumber: string
  customerName: string
  customerPhone: string
  model: string
  segment: string
  color: string | null
  bookingAmount: string
  paymentMode: string
  status: string
  expectedDeliveryDate: string | null
  deliveredAt: string | null
  cancellationReason: string | null
  vehicleUnit: { id: number; vin: string; model: string; status: string } | null
  lead: { id: number; firstName: string; lastName: string | null } | null
}

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'CHEQUE', label: 'Cheque' },
]
const STATUS_FILTERS = ['BOOKED', 'CONFIRMED', 'ALLOCATED', 'DELIVERED', 'CANCELLED']

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/bookings')
    if (!ok) {
      console.error('[BookingsPage] failed to load bookings:', data.message)
      setLoadError(data.message ?? 'Could not load bookings')
      setLoading(false)
      return
    }
    setBookings(data.bookings ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(
    () => statusFilter ? bookings.filter((b) => b.status === statusFilter) : bookings,
    [bookings, statusFilter]
  )
  const activeCount = bookings.filter((b) => ['BOOKED', 'CONFIRMED', 'ALLOCATED'].includes(b.status)).length
  const deliveredCount = bookings.filter((b) => b.status === 'DELIVERED').length
  const totalCollected = bookings.filter((b) => b.status !== 'CANCELLED').reduce((sum, b) => sum + Number(b.bookingAmount), 0)

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Bookings" subtitle="Every customer booking, from token payment to delivery — allocating a unit and delivering it is the same sale Inventory and Warranty see." />

      {loadError && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={ShoppingBag} label="Total bookings" value={bookings.length} />
        <StatTile icon={ShoppingBag} label="Active" value={activeCount} />
        <StatTile icon={CheckCircle2} label="Delivered" value={deliveredCount} />
        <StatTile icon={IndianRupee} label="Booking amount collected" value={`₹${totalCollected.toLocaleString('en-IN')}`} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={STATUS_FILTERS.map((s) => ({ value: s, label: s }))}
          placeholder="All statuses"
          className="w-52"
        />
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New booking
        </Button>
      </div>

      {showForm && <NewBookingForm onDone={() => { setShowForm(false); load() }} />}

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-ink/[0.08] bg-white py-10 text-center text-sm text-ink/40">No bookings yet.</div>
        ) : filtered.map((b) => (
          <BookingCard key={b.id} booking={b} onChanged={load} />
        ))}
      </div>
    </div>
  )
}

function BookingCard({ booking, onChanged }: { booking: Booking; onChanged: () => void }) {
  const [showAllocate, setShowAllocate] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [units, setUnits] = useState<AvailableUnit[]>([])
  const [selectedUnit, setSelectedUnit] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openAllocate = async () => {
    setShowAllocate(true)
    setError(null)
    const { data } = await crmFetch(`/api/v1/dealer-portal/bookings/available-units?model=${encodeURIComponent(booking.model)}`)
    setUnits(data.units ?? [])
  }

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/bookings/${booking.id}`, { method: 'PATCH', body: JSON.stringify(body) })
    setBusy(false)
    if (!ok) { setError(data.message ?? 'Could not update booking'); return }
    setShowAllocate(false)
    onChanged()
  }

  return (
    <div className="rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-ink/50">{booking.bookingNumber}</span>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-sm font-medium text-ink">{booking.customerName} <span className="font-normal text-ink/50">· {booking.customerPhone}</span></p>
          <p className="mt-0.5 text-xs text-ink/60">
            {booking.model} ({booking.segment}){booking.color ? ` · ${booking.color}` : ''} · ₹{Number(booking.bookingAmount).toLocaleString('en-IN')} {booking.paymentMode.replace(/_/g, ' ').toLowerCase()}
            {booking.expectedDeliveryDate && <> · expected {new Date(booking.expectedDeliveryDate).toLocaleDateString()}</>}
          </p>
          {booking.vehicleUnit && (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate"><Car className="h-3 w-3" /> {booking.vehicleUnit.vin}</p>
          )}
          {booking.status === 'CANCELLED' && booking.cancellationReason && (
            <p className="mt-1 text-xs text-red-500">Cancelled: {booking.cancellationReason}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setShowAttachments((v) => !v)}>
            <Paperclip className="h-3.5 w-3.5" /> Attachments
          </Button>
          {!['DELIVERED', 'CANCELLED'].includes(booking.status) && (
            <>
              {booking.status === 'BOOKED' && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => patch({ status: 'CONFIRMED' })}>Confirm</Button>
              )}
              {(booking.status === 'BOOKED' || booking.status === 'CONFIRMED') && (
                <Button size="sm" variant="outline" disabled={busy} onClick={openAllocate}>Allocate unit</Button>
              )}
              {booking.status === 'ALLOCATED' && (
                <Button size="sm" disabled={busy} onClick={() => patch({ status: 'DELIVERED' })}>Mark delivered</Button>
              )}
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => patch({ status: 'CANCELLED', cancellationReason: 'Cancelled by dealer' })}>Cancel</Button>
            </>
          )}
        </div>
      </div>

      {showAttachments && <div className="mt-3"><AttachmentUpload kind="BOOKING" parentId={booking.id} /></div>}

      {showAllocate && (
        <div className="mt-3 rounded-lg border border-ink/[0.08] bg-brand-white p-3">
          {units.length === 0 ? (
            <p className="text-xs text-ink/50">No available {booking.model} units in your stock right now.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <Select
                label="Available units"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                options={units.map((u) => ({ value: String(u.id), label: `${u.vin}${u.color ? ` · ${u.color}` : ''}` }))}
                placeholder="Select VIN"
                className="w-64"
              />
              <Button size="sm" disabled={!selectedUnit || busy} loading={busy} onClick={() => patch({ status: 'ALLOCATED', vehicleUnitId: selectedUnit })}>
                Confirm allocation
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAllocate(false)}>Close</Button>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  )
}

function NewBookingForm({ onDone }: { onDone: () => void }) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [selected, setSelected] = useState('')
  const [color, setColor] = useState('')
  const [bookingAmount, setBookingAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    crmFetch('/api/v1/dealer-portal/vehicle-catalog').then(({ data }) => {
      const items: CatalogItem[] = data?.items ?? []
      setCatalog(items)
      if (items.length > 0) setSelected(`${items[0].model}|${items[0].segment}`)
    })
  }, [])

  const catalogOptions = catalog.map((c) => ({ value: `${c.model}|${c.segment}`, label: `${c.model} (${c.segment})` }))

  const submit = async () => {
    const [model, segment] = selected.split('|')
    if (!model || !segment) return
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/bookings', {
      method: 'POST',
      body: JSON.stringify({
        customerName, customerPhone, customerEmail: customerEmail || undefined, customerAddress: customerAddress || undefined,
        model, segment, color: color || undefined, bookingAmount, paymentMode,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
      }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not create booking'); return }
    onDone()
  }

  const valid = customerName && customerPhone && selected && bookingAmount

  return (
    <div className="mb-4 rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Input label="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        <Input label="Customer phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
        <Input label="Email (optional)" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
        <Select label="Vehicle" value={selected} onChange={(e) => setSelected(e.target.value)} options={catalogOptions} required />
        <Input label="Color (optional)" value={color} onChange={(e) => setColor(e.target.value)} />
        <Input label="Booking amount, ₹" type="number" value={bookingAmount} onChange={(e) => setBookingAmount(e.target.value)} required />
        <Select label="Payment mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} options={PAYMENT_MODES} />
        <Input label="Expected delivery (optional)" type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
        <Input label="Address (optional)" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!valid || saving} loading={saving} onClick={submit}>
        Create booking
      </Button>
    </div>
  )
}
