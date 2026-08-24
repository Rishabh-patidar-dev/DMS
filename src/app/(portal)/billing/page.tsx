'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Receipt, IndianRupee, CheckCircle2, AlertCircle, FileText, Truck, Car, Wrench, Paperclip, RefreshCw, Search } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AttachmentUpload } from '@/components/portal/AttachmentUpload'
import { useDeepLinkQuery } from '@/lib/useDeepLinkQuery'

type BillableBooking = {
  id: number
  bookingNumber: string
  customerName: string
  customerPhone: string
  model: string
  vehicleUnit: { id: number; vin: string; model: string } | null
}
type BillableServiceTicket = {
  id: number
  ticketNumber: string
  customerName: string
  customerPhone: string | null
  vehicleModel: string | null
  chassisNumber: string | null
  partsUsed: { id: number; partName: string; quantityUsed: number; unitPrice: string }[]
  partsAmount: number
}
type EwayBill = {
  id: number
  ewayBillNumber: string
  transporterName: string
  transporterGstin: string | null
  vehicleNumber: string
  transportMode: string
  distanceKm: number
  status: string
  generatedAt: string
  validUntil: string
  cancellationReason: string | null
}
type Bill = {
  id: number
  billNumber: string
  billType: 'VEHICLE_SALE' | 'SERVICE'
  customerName: string
  customerPhone: string
  customerAddress: string | null
  customerState: string | null
  customerGstin: string | null
  model: string
  vin: string | null
  hsnCode: string
  placeOfSupply: string | null
  isInterState: boolean
  cgstAmount: string
  sgstAmount: string
  igstAmount: string
  exShowroomPrice: string
  accessoriesAmount: string
  registrationAmount: string
  insuranceAmount: string
  laborCharge: string
  partsAmount: string
  discountAmount: string
  taxableAmount: string
  gstRate: string
  gstAmount: string
  totalAmount: string
  amountPaid: string
  paymentMode: string
  status: string
  issuedAt: string
  booking: { id: number; bookingNumber: string } | null
  serviceTicket: { id: number; ticketNumber: string } | null
  ewayBill?: EwayBill | null
}

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'CHEQUE', label: 'Cheque' },
]
const STATUS_FILTERS = ['ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
]
const TRANSPORT_MODES = [
  { value: 'ROAD', label: 'Road' },
  { value: 'RAIL', label: 'Rail' },
  { value: 'AIR', label: 'Air' },
  { value: 'SHIP', label: 'Ship' },
]
const EWAY_BILL_THRESHOLD = 50000

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`

type FormTarget = 'none' | { kind: 'manual-vehicle' } | { kind: 'manual-service' } | { kind: 'booking'; id: number } | { kind: 'service'; id: number }
type Tab = 'vehicle' | 'service'

export default function BillingPage() {
  const deepLinkQ = useDeepLinkQuery()
  const [bills, setBills] = useState<Bill[]>([])
  const [billable, setBillable] = useState<BillableBooking[]>([])
  const [billableService, setBillableService] = useState<BillableServiceTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState<FormTarget>('none')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState(deepLinkQ)
  const [tab, setTab] = useState<Tab>('vehicle')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const [b, bb, bs] = await Promise.all([
      crmFetch('/api/v1/dealer-portal/bills'),
      crmFetch('/api/v1/dealer-portal/billable-bookings'),
      crmFetch('/api/v1/dealer-portal/billable-service-tickets'),
    ])
    const errors: string[] = []
    if (b.ok) setBills(b.data.bills ?? [])
    else errors.push(b.data.message ?? 'Could not load bills')
    if (bb.ok) setBillable(bb.data.bookings ?? [])
    else errors.push(bb.data.message ?? 'Could not load bookings awaiting a bill')
    if (bs.ok) setBillableService(bs.data.tickets ?? [])
    else errors.push(bs.data.message ?? 'Could not load service tickets awaiting a bill')
    if (errors.length) {
      console.error('[BillingPage] failed to load:', errors)
      setLoadError(errors.join(' · '))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const vehicleBills = useMemo(() => bills.filter((b) => b.billType === 'VEHICLE_SALE'), [bills])
  const serviceBills = useMemo(() => bills.filter((b) => b.billType === 'SERVICE'), [bills])
  const tabBills = tab === 'vehicle' ? vehicleBills : serviceBills
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tabBills.filter((b) =>
      (!statusFilter || b.status === statusFilter) &&
      (!q || b.billNumber.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q) || b.model.toLowerCase().includes(q) || (b.vin ?? '').toLowerCase().includes(q))
    )
  }, [tabBills, statusFilter, search])
  const totalBilled = tabBills.filter((b) => b.status !== 'CANCELLED').reduce((sum, b) => sum + Number(b.totalAmount), 0)
  const totalCollected = tabBills.filter((b) => b.status !== 'CANCELLED').reduce((sum, b) => sum + Number(b.amountPaid), 0)
  const outstanding = totalBilled - totalCollected

  const activeBooking = typeof showForm === 'object' && showForm.kind === 'booking' ? billable.find((b) => b.id === showForm.id) ?? null : null
  const activeServiceTicket = typeof showForm === 'object' && showForm.kind === 'service' ? billableService.find((t) => t.id === showForm.id) ?? null : null
  const manualServiceMode = typeof showForm === 'object' && showForm.kind === 'manual-service'

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Billing / GST Invoicing" subtitle="GST-compliant sale bills and e-way bills for consignments over ₹50,000 — separated into vehicle sales and workshop servicing, same as Inventory keeps vehicles and spare parts apart." />

      {loadError && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 !bg-red-50 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </Card>
      )}

      <div className="mb-4 flex items-center gap-1 rounded-xl bg-card p-1">
        <button onClick={() => { setTab('vehicle'); setShowForm('none') }} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'vehicle' ? 'bg-accent text-white' : 'text-ink/50 hover:text-ink'}`}>
          <Car className="h-3.5 w-3.5" /> Vehicle Billing
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${tab === 'vehicle' ? 'bg-white/20' : 'bg-ink/[0.06] text-ink/50'}`}>{vehicleBills.length}</span>
        </button>
        <button onClick={() => { setTab('service'); setShowForm('none') }} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'service' ? 'bg-accent text-white' : 'text-ink/50 hover:text-ink'}`}>
          <Wrench className="h-3.5 w-3.5" /> Service Billing
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${tab === 'service' ? 'bg-white/20' : 'bg-ink/[0.06] text-ink/50'}`}>{serviceBills.length}</span>
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Receipt} label="Bills issued" value={tabBills.length} />
        <StatTile icon={IndianRupee} label="Total billed" value={money(totalBilled)} />
        <StatTile icon={CheckCircle2} label="Collected" value={money(totalCollected)} />
        <StatTile icon={AlertCircle} label="Outstanding" value={money(outstanding)} />
      </div>

      {tab === 'vehicle' && billable.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-ink">Delivered bookings awaiting a bill</h3>
          <div className="space-y-2">
            {billable.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3.5 py-2.5 text-sm">
                <div>
                  <span className="font-mono text-xs text-ink/50">{b.bookingNumber}</span>
                  <span className="ml-2 font-medium text-ink">{b.customerName}</span>
                  <span className="ml-2 text-ink/50">{b.model}{b.vehicleUnit ? ` · ${b.vehicleUnit.vin}` : ''}</span>
                </div>
                <Button size="sm" onClick={() => setShowForm({ kind: 'booking', id: b.id })}>Generate bill</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'service' && billableService.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-ink">Resolved service tickets awaiting a bill</h3>
          <div className="space-y-2">
            {billableService.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3.5 py-2.5 text-sm">
                <div>
                  <span className="font-mono text-xs text-ink/50">{t.ticketNumber}</span>
                  <span className="ml-2 font-medium text-ink">{t.customerName}</span>
                  <span className="ml-2 text-ink/50">{t.chassisNumber}{t.partsUsed.length > 0 ? ` · ${t.partsUsed.length} part${t.partsUsed.length > 1 ? 's' : ''} used (${money(t.partsAmount)})` : ' · no parts used'}</span>
                </div>
                <Button size="sm" onClick={() => setShowForm({ kind: 'service', id: t.id })}>Generate bill</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bill #, customer, model, VIN…"
              className="w-full rounded-xl border border-ink/10 bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_FILTERS.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
            placeholder="All statuses"
            className="w-52"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm(showForm !== 'none' ? 'none' : { kind: tab === 'vehicle' ? 'manual-vehicle' : 'manual-service' })}
        >
          <Plus className="h-4 w-4" /> Manual {tab === 'vehicle' ? 'vehicle' : 'service'} bill
        </Button>
      </div>

      {showForm !== 'none' && (
        <BillForm
          booking={activeBooking}
          serviceTicket={activeServiceTicket}
          manualService={manualServiceMode}
          onDone={() => { setShowForm('none'); load() }}
          onCancel={() => setShowForm('none')}
        />
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <Card className="py-10 text-center text-sm text-ink/40">{tabBills.length === 0 ? `No ${tab === 'vehicle' ? 'vehicle sale' : 'service'} bills issued yet.` : 'No bills match your search.'}</Card>
        ) : filtered.map((bill) => (
          <BillCard key={bill.id} bill={bill} onChanged={load} />
        ))}
      </div>
    </div>
  )
}

function BillCard({ bill, onChanged }: { bill: Bill; onChanged: () => void }) {
  const [showPay, setShowPay] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [showEway, setShowEway] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const balance = Number(bill.totalAmount) - Number(bill.amountPaid)
  const eligibleForEway = Number(bill.taxableAmount) > EWAY_BILL_THRESHOLD

  async function pay() {
    setBusy(true)
    setError(null)
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/bills/${bill.id}/payment`, { method: 'PATCH', body: JSON.stringify({ amount }) })
    setBusy(false)
    if (!ok) { setError(data.message ?? 'Could not record payment'); return }
    setShowPay(false)
    setAmount('')
    onChanged()
  }

  async function cancel() {
    setBusy(true)
    setError(null)
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/bills/${bill.id}`, { method: 'PATCH', body: JSON.stringify({}) })
    setBusy(false)
    if (!ok) { setError(data.message ?? 'Could not cancel bill'); return }
    onChanged()
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-ink/50">{bill.billNumber}</span>
            <StatusBadge status={bill.status} />
            {bill.booking && <span className="text-xs text-ink/40">from {bill.booking.bookingNumber}</span>}
            {bill.serviceTicket && <span className="text-xs text-ink/40">from {bill.serviceTicket.ticketNumber}</span>}
            {bill.ewayBill && bill.ewayBill.status === 'GENERATED' && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">E-way bill issued</span>}
          </div>
          <p className="mt-1 text-sm font-medium text-ink">{bill.customerName} <span className="font-normal text-ink/50">· {bill.customerPhone}</span></p>
          <p className="mt-0.5 text-xs text-ink/60">{bill.model}{bill.vin ? ` · ${bill.vin}` : ''} · issued {new Date(bill.issuedAt).toLocaleDateString()}</p>
          <p className="mt-1.5 text-sm text-ink">
            <span className="font-semibold">{money(bill.totalAmount)}</span>
            <span className="ml-2 text-xs text-ink/50">
              {bill.billType === 'SERVICE' ? `labor ${money(bill.laborCharge)} + parts ${money(bill.partsAmount)}` : `ex-showroom ${money(bill.exShowroomPrice)}`} + GST {bill.gstRate}% ({money(bill.gstAmount)})
            </span>
          </p>
          {bill.status !== 'CANCELLED' && (
            <p className="mt-0.5 text-xs text-ink/50">Paid {money(bill.amountPaid)}{balance > 0 && <> · balance {money(balance)}</>}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setShowInvoice((v) => !v)}>
            <FileText className="h-3.5 w-3.5" /> GST invoice
          </Button>
          {bill.status !== 'CANCELLED' && (eligibleForEway || bill.ewayBill) && (
            <Button size="sm" variant="outline" onClick={() => setShowEway((v) => !v)}>
              <Truck className="h-3.5 w-3.5" /> E-way bill
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowAttachments((v) => !v)}>
            <Paperclip className="h-3.5 w-3.5" /> Attachments
          </Button>
          {!['PAID', 'CANCELLED'].includes(bill.status) && (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setShowPay((v) => !v)}>Record payment</Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={cancel}>Cancel</Button>
            </>
          )}
        </div>
      </div>

      {showInvoice && <GstInvoiceDetail bill={bill} />}
      {showEway && <EwayBillPanel bill={bill} onChanged={onChanged} />}
      {showAttachments && <div className="mt-3"><AttachmentUpload kind="CUSTOMER_BILL" parentId={bill.id} /></div>}

      {showPay && (
        <Card padding="compact" className="mt-3 flex flex-wrap items-end gap-2">
          <Input label={`Amount received (balance ${money(balance)})`} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-56" />
          <Button size="sm" disabled={!amount || busy} loading={busy} onClick={pay}>Save payment</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowPay(false)}>Close</Button>
        </Card>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </Card>
  )
}

function GstInvoiceDetail({ bill }: { bill: Bill }) {
  return (
    <Card padding="compact" className="mt-3 text-sm">
      <div className="mb-3 flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Bill to</p>
          <p className="mt-1 text-ink">{bill.customerName}</p>
          {bill.customerAddress && <p className="text-ink/60">{bill.customerAddress}</p>}
          {bill.customerState && <p className="text-ink/60">{bill.customerState}</p>}
          <p className="text-ink/60">GSTIN: {bill.customerGstin || '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Invoice details</p>
          <p className="mt-1 text-ink">{bill.billNumber}</p>
          <p className="text-ink/60">HSN {bill.hsnCode}</p>
          <p className="text-ink/60">Place of supply: {bill.placeOfSupply || '—'}</p>
          <p className="text-ink/60">{bill.isInterState ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)'}</p>
        </div>
      </div>
      <div className="space-y-1 border-t border-ink/[0.08] pt-3">
        {bill.billType === 'SERVICE' ? (
          <>
            <div className="flex justify-between text-ink/60"><span>Labor charge</span><span>{money(bill.laborCharge)}</span></div>
            <div className="flex justify-between text-ink/60"><span>Spare parts used</span><span>{money(bill.partsAmount)}</span></div>
          </>
        ) : (
          <>
            <div className="flex justify-between text-ink/60"><span>Ex-showroom price</span><span>{money(bill.exShowroomPrice)}</span></div>
            {Number(bill.accessoriesAmount) > 0 && <div className="flex justify-between text-ink/60"><span>Accessories</span><span>{money(bill.accessoriesAmount)}</span></div>}
            {Number(bill.registrationAmount) > 0 && <div className="flex justify-between text-ink/60"><span>Registration</span><span>{money(bill.registrationAmount)}</span></div>}
            {Number(bill.insuranceAmount) > 0 && <div className="flex justify-between text-ink/60"><span>Insurance</span><span>{money(bill.insuranceAmount)}</span></div>}
          </>
        )}
        {Number(bill.discountAmount) > 0 && <div className="flex justify-between text-ink/60"><span>Discount</span><span>-{money(bill.discountAmount)}</span></div>}
        <div className="flex justify-between font-medium text-ink"><span>Taxable value</span><span>{money(bill.taxableAmount)}</span></div>
        {bill.isInterState ? (
          <div className="flex justify-between text-ink/60"><span>IGST ({bill.gstRate}%)</span><span>{money(bill.igstAmount)}</span></div>
        ) : (
          <>
            <div className="flex justify-between text-ink/60"><span>CGST ({(Number(bill.gstRate) / 2).toFixed(1)}%)</span><span>{money(bill.cgstAmount)}</span></div>
            <div className="flex justify-between text-ink/60"><span>SGST ({(Number(bill.gstRate) / 2).toFixed(1)}%)</span><span>{money(bill.sgstAmount)}</span></div>
          </>
        )}
        <div className="flex justify-between border-t border-ink/[0.08] pt-1 text-base font-semibold text-ink"><span>Total</span><span>{money(bill.totalAmount)}</span></div>
      </div>
    </Card>
  )
}

function EwayBillPanel({ bill, onChanged }: { bill: Bill; onChanged: () => void }) {
  const [transporterName, setTransporterName] = useState('')
  const [transporterGstin, setTransporterGstin] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [transportMode, setTransportMode] = useState('ROAD')
  const [distanceKm, setDistanceKm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setBusy(true)
    setError(null)
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/bills/${bill.id}/eway-bill`, {
      method: 'POST',
      body: JSON.stringify({ transporterName, transporterGstin: transporterGstin || undefined, vehicleNumber, transportMode, distanceKm }),
    })
    setBusy(false)
    if (!ok) { setError(data.message ?? 'Could not generate e-way bill'); return }
    onChanged()
  }

  async function cancel() {
    if (!bill.ewayBill) return
    setBusy(true)
    setError(null)
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/eway-bills/${bill.ewayBill.id}`, { method: 'PATCH', body: JSON.stringify({ reason: 'Cancelled by dealer' }) })
    setBusy(false)
    if (!ok) { setError(data.message ?? 'Could not cancel e-way bill'); return }
    onChanged()
  }

  if (bill.ewayBill) {
    const eb = bill.ewayBill
    return (
      <Card padding="compact" className="mt-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-xs text-ink/50">{eb.ewayBillNumber}</p>
            <StatusBadge status={eb.status} />
          </div>
          {eb.status === 'GENERATED' && <Button size="sm" variant="ghost" disabled={busy} onClick={cancel}>Cancel e-way bill</Button>}
        </div>
        <p className="mt-2 text-ink/70">{eb.transporterName} · {eb.vehicleNumber} · {eb.transportMode.toLowerCase()} · {eb.distanceKm} km</p>
        <p className="mt-0.5 text-xs text-ink/50">Valid until {new Date(eb.validUntil).toLocaleString()}</p>
        {eb.cancellationReason && <p className="mt-1 text-xs text-red-500">{eb.cancellationReason}</p>}
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </Card>
    )
  }

  return (
    <Card padding="compact" className="mt-3">
      <p className="mb-2 text-xs text-ink/50">Taxable value {money(bill.taxableAmount)} exceeds ₹{EWAY_BILL_THRESHOLD.toLocaleString('en-IN')} — an e-way bill is required for transport.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Input label="Transporter name" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} required />
        <Input label="Transporter GSTIN (optional)" value={transporterGstin} onChange={(e) => setTransporterGstin(e.target.value)} />
        <Input label="Vehicle number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} required />
        <Select label="Transport mode" value={transportMode} onChange={(e) => setTransportMode(e.target.value)} options={TRANSPORT_MODES} />
        <Input label="Distance, km" type="number" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} required />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!transporterName || !vehicleNumber || !distanceKm || busy} loading={busy} onClick={generate}>
        Generate e-way bill
      </Button>
    </Card>
  )
}

function BillForm({ booking, serviceTicket, manualService, onDone, onCancel }: {
  booking: BillableBooking | null
  serviceTicket: BillableServiceTicket | null
  manualService: boolean
  onDone: () => void
  onCancel: () => void
}) {
  const isService = serviceTicket != null || manualService
  const isManual = booking == null && serviceTicket == null
  const [customerName, setCustomerName] = useState(booking?.customerName ?? serviceTicket?.customerName ?? '')
  const [customerPhone, setCustomerPhone] = useState(booking?.customerPhone ?? serviceTicket?.customerPhone ?? '')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerState, setCustomerState] = useState('')
  const [customerGstin, setCustomerGstin] = useState('')
  const [model, setModel] = useState(booking?.model ?? serviceTicket?.vehicleModel ?? '')
  const [vin, setVin] = useState(booking?.vehicleUnit?.vin ?? serviceTicket?.chassisNumber ?? '')
  const [exShowroomPrice, setExShowroomPrice] = useState('')
  const [accessoriesAmount, setAccessoriesAmount] = useState('')
  const [registrationAmount, setRegistrationAmount] = useState('')
  const [insuranceAmount, setInsuranceAmount] = useState('')
  const [laborCharge, setLaborCharge] = useState('')
  const [manualPartsAmount, setManualPartsAmount] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [gstRate, setGstRate] = useState('5')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const partsAmount = serviceTicket?.partsAmount ?? (manualService ? Number(manualPartsAmount) || 0 : 0)
  const taxable = isService
    ? (Number(laborCharge) || 0) + partsAmount - (Number(discountAmount) || 0)
    : (Number(exShowroomPrice) || 0) + (Number(accessoriesAmount) || 0) + (Number(registrationAmount) || 0) + (Number(insuranceAmount) || 0) - (Number(discountAmount) || 0)
  const gst = Math.round(taxable * (Number(gstRate) || 0) / 100)
  const total = taxable + gst

  const submit = async () => {
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/bills', {
      method: 'POST',
      body: JSON.stringify({
        bookingId: booking?.id,
        serviceTicketId: serviceTicket?.id,
        billType: manualService ? 'SERVICE' : undefined,
        customerName: isManual ? customerName : undefined,
        customerPhone: isManual ? customerPhone : undefined,
        model: isManual ? model : undefined,
        vin: isManual ? (vin || undefined) : undefined,
        customerAddress: customerAddress || undefined,
        customerState: customerState || undefined,
        customerGstin: customerGstin || undefined,
        exShowroomPrice: isService ? undefined : exShowroomPrice,
        laborCharge: isService ? laborCharge : undefined,
        partsAmount: manualService ? (manualPartsAmount || undefined) : undefined,
        accessoriesAmount: accessoriesAmount || undefined, registrationAmount: registrationAmount || undefined,
        insuranceAmount: insuranceAmount || undefined, discountAmount: discountAmount || undefined, gstRate, paymentMode,
      }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not create bill'); return }
    onDone()
  }

  const valid = isService
    ? (!!laborCharge && (!isManual || (customerName && customerPhone && model)))
    : (!!exShowroomPrice && (booking || (customerName && customerPhone && model)))

  return (
    <Card className="mb-4">
      {booking ? (
        <p className="mb-3 text-sm text-ink/70">Billing <span className="font-medium text-ink">{booking.customerName}</span> for {booking.model}{booking.vehicleUnit ? ` (${booking.vehicleUnit.vin})` : ''} — booking {booking.bookingNumber}</p>
      ) : serviceTicket ? (
        <div className="mb-3">
          <p className="text-sm text-ink/70">Billing <span className="font-medium text-ink">{serviceTicket.customerName}</span> for {serviceTicket.chassisNumber} — ticket {serviceTicket.ticketNumber}</p>
          {serviceTicket.partsUsed.length > 0 && (
            <ul className="mt-2 space-y-0.5 rounded-xl bg-canvas p-2.5 text-xs text-ink/60">
              {serviceTicket.partsUsed.map((p) => (
                <li key={p.id} className="flex justify-between"><span>{p.partName} × {p.quantityUsed}</span><span>{money(Number(p.unitPrice) * p.quantityUsed)}</span></li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Input label="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          <Input label="Customer phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
          <Input label="Vehicle model" value={model} onChange={(e) => setModel(e.target.value)} required />
          <Input label="VIN / vehicle number (optional)" value={vin} onChange={(e) => setVin(e.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {isService ? (
          <>
            <Input label="Labor charge, ₹" type="number" value={laborCharge} onChange={(e) => setLaborCharge(e.target.value)} required />
            {manualService && <Input label="Spare parts used, ₹ (optional)" type="number" value={manualPartsAmount} onChange={(e) => setManualPartsAmount(e.target.value)} />}
          </>
        ) : (
          <>
            <Input label="Ex-showroom price, ₹" type="number" value={exShowroomPrice} onChange={(e) => setExShowroomPrice(e.target.value)} required />
            <Input label="Accessories, ₹ (optional)" type="number" value={accessoriesAmount} onChange={(e) => setAccessoriesAmount(e.target.value)} />
            <Input label="Registration, ₹ (optional)" type="number" value={registrationAmount} onChange={(e) => setRegistrationAmount(e.target.value)} />
            <Input label="Insurance, ₹ (optional)" type="number" value={insuranceAmount} onChange={(e) => setInsuranceAmount(e.target.value)} />
          </>
        )}
        <Input label="Discount, ₹ (optional)" type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
        <Input label="GST rate, %" type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} />
        <Select label="Payment mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} options={PAYMENT_MODES} />
        <Select label="Customer state (for GST place of supply)" value={customerState} onChange={(e) => setCustomerState(e.target.value)} options={INDIAN_STATES.map((s) => ({ value: s, label: s }))} placeholder="Select state" />
        <Input label="Customer GSTIN (optional)" value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} />
        <Input label="Address (optional)" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
      </div>

      <Card padding="compact" className="mt-3 text-sm">
        {isService && partsAmount > 0 && <div className="flex justify-between text-ink/60"><span>Spare parts used</span><span>{money(partsAmount)}</span></div>}
        <div className="flex justify-between text-ink/60"><span>Taxable amount</span><span>{money(taxable)}</span></div>
        <div className="flex justify-between text-ink/60"><span>GST ({gstRate || 0}%)</span><span>{money(gst)}</span></div>
        <div className="mt-1 flex justify-between border-t border-ink/[0.08] pt-1 font-semibold text-ink"><span>Total</span><span>{money(total)}</span></div>
      </Card>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" disabled={!valid || saving} loading={saving} onClick={submit}>Issue bill</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  )
}
