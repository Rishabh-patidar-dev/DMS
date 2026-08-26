'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Upload, Scan, FileText, IndianRupee, Receipt, Search, Plus, X } from 'lucide-react'
import { crmFetch, CRM_API_URL } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { InvoiceCard } from '@/components/portal/InvoiceCard'
import { FormShell } from '@/components/portal/FormShell'
import type { InvoiceDoc, InvoiceType } from '@/lib/invoicePdf'
import { INVOICE_LAST_SEEN_KEY } from '@/lib/invoicesSeen'
import { useDeepLinkQuery } from '@/lib/useDeepLinkQuery'

// ============================================================================
// One "Invoices" module, one list — an invoice is an invoice regardless of
// which side wrote it, so manufacturer-issued documents and this dealer's
// own logged vendor purchase bills are shown together, sorted by date, not
// split behind a tab switch.
// ============================================================================

const TYPE_LABEL: Record<InvoiceType, string> = {
  CONFIRMATION: 'Order confirmed',
  DISPATCH: 'Dispatched',
  DELIVERY: 'Delivered',
  PARTIAL: 'Partial',
  OUT_OF_STOCK: 'Out of stock',
  CANCELLATION: 'Cancelled',
  CUSTOM: 'General',
}

type PurchaseInvoice = {
  id: number
  vendorName: string
  vendorGstin: string | null
  invoiceNumber: string
  invoiceDate: string
  amount: string
  category: string
  notes: string | null
  fileUrl: string | null
  fileName: string | null
  mimeType: string | null
  ocrExtractedText: string | null
  ocrStatus: string | null
  createdAt: string
}

type SuggestedFields = {
  vendorName?: string
  vendorGstin?: string
  invoiceNumber?: string
  invoiceDate?: string
  amount?: string
}
type OcrPreview = {
  fileUrl: string
  storagePath: string
  fileName: string
  mimeType: string
  ocrExtractedText: string | null
  ocrStatus: 'DONE' | 'FAILED' | 'SKIPPED'
  suggested?: SuggestedFields
}

const CATEGORIES = [
  { value: 'VEHICLE_STOCK', label: 'Vehicle stock' },
  { value: 'SPARE_PARTS', label: 'Spare parts' },
  { value: 'OTHER', label: 'Other' },
]

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`
const resolveUrl = (url: string) => (url.startsWith('http') ? url : `${CRM_API_URL}${url}`)

// One normalized row shape for both sources — this is what actually makes
// them "just invoices" instead of two separate tables.
type Row = {
  key: string
  date: string
  number: string
  party: string
  subject: string
  amount: number | null
  statusLabel: string
  onView: () => void
}

export default function InvoicesPage() {
  const deepLinkQ = useDeepLinkQuery()

  const [invoices, setInvoices] = useState<InvoiceDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([])
  const [purchaseLoading, setPurchaseLoading] = useState(true)
  const [purchaseLoadError, setPurchaseLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState(deepLinkQ)
  const [showLogForm, setShowLogForm] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceDoc | null>(null)
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseInvoice | null>(null)

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/invoices')
    if (!ok) {
      console.error('[InvoicesPage] failed to load invoices:', data.message)
      setLoadError(data.message ?? 'Could not load invoices')
      setLoading(false)
      return
    }
    setInvoices(data.invoices ?? [])
    setLoading(false)
  }, [])

  const loadPurchaseInvoices = useCallback(async () => {
    setPurchaseLoading(true)
    setPurchaseLoadError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/purchase-invoices')
    if (!ok) {
      console.error('[InvoicesPage] failed to load purchase invoices:', data.message)
      setPurchaseLoadError(data.message ?? 'Could not load purchase invoices')
      setPurchaseLoading(false)
      return
    }
    setPurchaseInvoices(data.invoices ?? [])
    setPurchaseLoading(false)
  }, [])

  useEffect(() => { loadInvoices() }, [loadInvoices])
  useEffect(() => { loadPurchaseInvoices() }, [loadPurchaseInvoices])

  // Clears the sidebar's unread-invoices badge — PortalShell re-checks the
  // count on every route change, so the next time it does, everything
  // issued up to this moment no longer counts as unread.
  useEffect(() => {
    try {
      localStorage.setItem(INVOICE_LAST_SEEN_KEY, new Date().toISOString())
    } catch {
      // localStorage unavailable (private mode etc.) — the badge just
      // won't clear locally, not worth surfacing an error for.
    }
  }, [])

  const rows: Row[] = useMemo(() => {
    const fromInvoices: Row[] = invoices.map((inv, i) => ({
      key: `inv-${inv.invoiceNumber}-${i}`,
      date: inv.issuedAt,
      number: inv.invoiceNumber,
      party: 'Manufacturer',
      subject: inv.item,
      amount: inv.unitPrice != null && inv.fulfilledQuantity != null ? Number(inv.unitPrice) * inv.fulfilledQuantity : null,
      statusLabel: TYPE_LABEL[inv.type] ?? inv.type,
      onView: () => setViewingInvoice(inv),
    }))
    const fromPurchases: Row[] = purchaseInvoices.map((p) => ({
      key: `pur-${p.id}`,
      date: p.invoiceDate,
      number: p.invoiceNumber,
      party: p.vendorName,
      subject: CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category,
      amount: Number(p.amount),
      statusLabel: 'Purchase',
      onView: () => setViewingPurchase(p),
    }))
    return [...fromInvoices, ...fromPurchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [invoices, purchaseInvoices])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.number.toLowerCase().includes(q) || r.party.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q))
  }, [rows, search])

  const totalValue = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0)
  const scannedCount = purchaseInvoices.filter((i) => i.ocrStatus === 'DONE').length
  const anyLoading = loading || purchaseLoading
  const anyError = loadError || purchaseLoadError

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Invoices" subtitle="Every invoice the business touches — manufacturer documents and vendor purchase bills, together in one list." />

      {anyError && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError || purchaseLoadError}</span>
          <Button size="sm" variant="outline" onClick={() => { loadInvoices(); loadPurchaseInvoices() }}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Receipt} label="Total invoices" value={rows.length} />
        <StatTile icon={IndianRupee} label="Total value" value={money(totalValue)} />
        <StatTile icon={Scan} label="Purchase bills scanned" value={scannedCount} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, party, or subject…"
            className="w-full rounded-xl border border-ink/10 bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <Button size="sm" variant={showLogForm ? 'primary' : 'outline'} onClick={() => setShowLogForm((v) => !v)}>
          {showLogForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Log purchase invoice
        </Button>
      </div>

      {showLogForm && <LogInvoiceForm onDone={() => { setShowLogForm(false); loadPurchaseInvoices() }} />}

      <Card padding="compact" className="overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Invoice #</th>
              <th className="px-4 py-3 font-medium">Party</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {anyLoading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : filteredRows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-ink/40">{rows.length === 0 ? 'No invoices yet.' : 'No invoices match your search.'}</td></tr>
            ) : filteredRows.map((r) => (
              <tr key={r.key} className="border-b border-ink/[0.05] last:border-0">
                <td className="px-4 py-3 text-ink/70">{new Date(r.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink">{r.number}</td>
                <td className="px-4 py-3 text-ink">{r.party}</td>
                <td className="px-4 py-3 text-ink/70">{r.subject}</td>
                <td className="px-4 py-3"><StatusBadge status={r.statusLabel} /></td>
                <td className="px-4 py-3 tabular-nums text-ink">{r.amount != null ? money(r.amount) : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={r.onView} className="text-xs font-medium text-slate hover:underline">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setViewingInvoice(null)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <InvoiceCard invoice={viewingInvoice} />
          </div>
        </div>
      )}

      {viewingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setViewingPurchase(null)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <Card>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-ink/50">{viewingPurchase.invoiceNumber}</p>
                  <p className="text-base font-semibold text-ink">{viewingPurchase.vendorName}</p>
                </div>
                <button onClick={() => setViewingPurchase(null)} className="text-ink/40 hover:text-ink"><X className="h-4 w-4" /></button>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-ink/50">Date</dt><dd className="text-ink">{new Date(viewingPurchase.invoiceDate).toLocaleDateString()}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/50">Amount</dt><dd className="text-ink">{money(viewingPurchase.amount)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/50">Category</dt><dd className="text-ink">{CATEGORIES.find((c) => c.value === viewingPurchase.category)?.label ?? viewingPurchase.category}</dd></div>
                {viewingPurchase.vendorGstin && <div className="flex justify-between"><dt className="text-ink/50">Vendor GSTIN</dt><dd className="text-ink">{viewingPurchase.vendorGstin}</dd></div>}
                {viewingPurchase.notes && <div><dt className="text-ink/50">Notes</dt><dd className="mt-1 text-ink">{viewingPurchase.notes}</dd></div>}
              </dl>
              {viewingPurchase.fileUrl && (
                <a href={resolveUrl(viewingPurchase.fileUrl)} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-1.5 text-sm font-medium text-slate hover:underline">
                  <FileText className="h-4 w-4" /> View uploaded file
                </a>
              )}
              {viewingPurchase.ocrExtractedText && (
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">Extracted text</p>
                  <p className="whitespace-pre-wrap rounded-lg bg-brand-white px-3 py-2 text-xs text-ink/70">{viewingPurchase.ocrExtractedText}</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function LogInvoiceForm({ onDone }: { onDone: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<OcrPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [vendorName, setVendorName] = useState('')
  const [vendorGstin, setVendorGstin] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleFile(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setUploading(true)
    setPreviewError(null)
    setPreview(null)
    const formData = new FormData()
    formData.append('file', file)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/purchase-invoices/ocr-preview', { method: 'POST', body: formData })
    setUploading(false)
    if (!ok) { setPreviewError(data.message ?? 'Could not upload file'); return }
    setPreview(data)
    // Best-effort guesses from the scan — pre-fill but leave every field
    // fully editable, since a heuristic reading a real invoice (especially
    // one with a customer name on it too) can genuinely get one wrong.
    const s: SuggestedFields = data.suggested ?? {}
    if (s.vendorName) setVendorName(s.vendorName)
    if (s.vendorGstin) setVendorGstin(s.vendorGstin)
    if (s.invoiceNumber) setInvoiceNumber(s.invoiceNumber)
    if (s.invoiceDate) setInvoiceDate(s.invoiceDate)
    if (s.amount) setAmount(s.amount)
  }

  const hasSuggestions = !!(preview?.suggested && Object.values(preview.suggested).some(Boolean))

  const submit = async () => {
    if (!preview) return
    setSaving(true)
    setSaveError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/purchase-invoices', {
      method: 'POST',
      body: JSON.stringify({
        vendorName, vendorGstin: vendorGstin || undefined, invoiceNumber, invoiceDate, amount, category, notes: notes || undefined,
        fileUrl: preview.fileUrl, storagePath: preview.storagePath, fileName: preview.fileName, mimeType: preview.mimeType,
        ocrExtractedText: preview.ocrExtractedText, ocrStatus: preview.ocrStatus,
      }),
    })
    setSaving(false)
    if (!ok) { setSaveError(data.message ?? 'Could not save invoice'); return }
    setPreview(null)
    setVendorName(''); setVendorGstin(''); setInvoiceNumber(''); setInvoiceDate(''); setAmount(''); setCategory('OTHER'); setNotes('')
    onDone()
  }

  const valid = vendorName && invoiceNumber && invoiceDate && amount
  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label ?? category

  const startOver = () => {
    setPreview(null)
    setVendorName(''); setVendorGstin(''); setInvoiceNumber(''); setInvoiceDate(''); setAmount(''); setCategory('OTHER'); setNotes('')
  }

  if (!preview) {
    return (
      <Card className="mb-6">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink/15 py-10 text-center hover:border-slate/40">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-slate" /> : <Upload className="h-6 w-6 text-ink/30" />}
          <span className="text-sm font-medium text-ink/70">{uploading ? 'Uploading & scanning…' : 'Upload an invoice photo or PDF'}</span>
          <span className="text-xs text-ink/40">JPG/PNG photos get OCR'd automatically and the fields below get a best-effort pre-fill — always double-check before saving</span>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" disabled={uploading} onChange={(e) => handleFile(e.target.files)} />
        </label>
        {previewError && <p className="mt-2 text-xs text-red-500">{previewError}</p>}
      </Card>
    )
  }

  return (
    <div className="mb-6">
      <FormShell
        title="Log purchase invoice"
        description="Best-effort fields from the scan are pre-filled below — check each one against the photo before saving."
        summary={[
          { label: 'Vendor', value: vendorName },
          { label: 'Invoice #', value: invoiceNumber },
          { label: 'Amount', value: amount ? money(amount) : undefined },
          { label: 'Category', value: categoryLabel },
        ]}
        onSubmit={submit}
        onCancel={startOver}
        submitLabel="Save invoice"
        submitting={saving}
        submitDisabled={!valid}
        error={saveError}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">Uploaded file</p>
            {preview.mimeType.startsWith('image/') ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={resolveUrl(preview.fileUrl)} alt={preview.fileName} className="max-h-64 w-full rounded-lg border border-ink/[0.08] object-contain" />
            ) : (
              <a href={resolveUrl(preview.fileUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-ink/[0.08] px-3 py-4 text-sm text-slate hover:underline">
                <FileText className="h-4 w-4" /> {preview.fileName}
              </a>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
              Extracted text {preview.ocrStatus === 'SKIPPED' && '(not available for PDFs)'}{preview.ocrStatus === 'FAILED' && '(scan failed)'}
            </p>
            <textarea
              readOnly
              value={preview.ocrExtractedText ?? ''}
              placeholder="No text extracted"
              rows={9}
              className="w-full rounded-lg border border-ink/[0.08] bg-brand-white px-3 py-2 text-xs text-ink/70"
            />
          </div>
        </div>

        {hasSuggestions && (
          <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <Scan className="h-3.5 w-3.5 shrink-0" /> Pre-filled from the scan — this is a best-effort read, please check each field against the photo before saving.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Input label="Vendor name" value={vendorName} onChange={(e) => setVendorName(e.target.value)} required />
          <Input label="Vendor GSTIN (optional)" value={vendorGstin} onChange={(e) => setVendorGstin(e.target.value)} />
          <Input label="Invoice number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
          <Input label="Invoice date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
          <Input label="Amount, ₹" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES} />
        </div>
        <div>
          <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </FormShell>
    </div>
  )
}
