'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Upload, Scan, FileText, IndianRupee, Receipt, Search, FileStack } from 'lucide-react'
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
// One "Invoices" module, two tabs — the OEM-issued documents this dealer
// receives (order confirmations, dispatch/delivery notes, etc.) and this
// dealer's own logged vendor purchase bills. Different shapes (a
// read-received-document list vs. a dealer-authored OCR-upload-and-log
// flow), so they stay as separate panels under one shared tab switch rather
// than one merged table.
// ============================================================================

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'CONFIRMATION', label: 'Order confirmed' },
  { value: 'DISPATCH', label: 'Dispatched' },
  { value: 'DELIVERY', label: 'Delivered' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
  { value: 'CANCELLATION', label: 'Cancelled' },
  { value: 'CUSTOM', label: 'General' },
]

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

type Tab = 'manufacturer' | 'purchase'

export default function InvoicesPage() {
  const deepLinkQ = useDeepLinkQuery()
  const [tab, setTab] = useState<Tab>('manufacturer')

  // Manufacturer invoices
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('')

  // Purchase invoices
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([])
  const [purchaseLoading, setPurchaseLoading] = useState(true)
  const [purchaseLoadError, setPurchaseLoadError] = useState<string | null>(null)
  const [purchaseSearch, setPurchaseSearch] = useState(deepLinkQ)

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

  const visible = typeFilter ? invoices.filter((i) => i.type === (typeFilter as InvoiceType)) : invoices

  const totalAmount = purchaseInvoices.reduce((sum, i) => sum + Number(i.amount), 0)
  const scannedCount = purchaseInvoices.filter((i) => i.ocrStatus === 'DONE').length
  const filteredPurchaseInvoices = useMemo(() => {
    const q = purchaseSearch.trim().toLowerCase()
    return purchaseInvoices.filter((inv) => !q || inv.vendorName.toLowerCase().includes(q) || inv.invoiceNumber.toLowerCase().includes(q))
  }, [purchaseInvoices, purchaseSearch])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Invoices" subtitle="Manufacturer-issued documents and your own logged vendor purchase bills, in one place." />

      <div className="mb-5 flex items-center gap-1 rounded-xl bg-card p-1">
        <button onClick={() => setTab('manufacturer')} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'manufacturer' ? 'bg-accent text-white' : 'text-ink/50 hover:text-ink'}`}>
          <FileStack className="h-3.5 w-3.5" /> Manufacturer Invoices
        </button>
        <button onClick={() => setTab('purchase')} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'purchase' ? 'bg-accent text-white' : 'text-ink/50 hover:text-ink'}`}>
          <Receipt className="h-3.5 w-3.5" /> Purchase Invoices
        </button>
      </div>

      {tab === 'manufacturer' ? (
        <>
          <p className="mb-5 text-xs text-ink/45">Order confirmations, dispatch and delivery documents, out-of-stock notices, and anything else the manufacturer sends you — every one downloadable as a PDF.</p>

          {loadError && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span>{loadError}</span>
              <Button size="sm" variant="outline" onClick={loadInvoices}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          )}

          <div className="mb-5 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  typeFilter === f.value ? 'border-stone bg-stone/10 text-ink' : 'border-ink/10 text-ink/50 hover:border-ink/20'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-ink/40"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink/15 py-16 text-center text-sm text-ink/40">
              {invoices.length === 0 ? 'No invoices yet.' : 'No invoices match this filter.'}
            </div>
          ) : (
            <div className="space-y-4">
              {visible.map((inv, i) => (
                <InvoiceCard key={`${inv.invoiceNumber}-${i}`} invoice={inv} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mb-5 text-xs text-ink/45">Log invoices from the OEM or spare-parts suppliers — photograph one and the extracted text is right there to copy from while you fill in the real fields.</p>

          {purchaseLoadError && (
            <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 !bg-red-50 text-sm text-red-700">
              <span>{purchaseLoadError}</span>
              <Button size="sm" variant="outline" onClick={loadPurchaseInvoices}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            </Card>
          )}

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={Receipt} label="Invoices logged" value={purchaseInvoices.length} />
            <StatTile icon={IndianRupee} label="Total value" value={money(totalAmount)} />
            <StatTile icon={Scan} label="OCR-scanned" value={scannedCount} />
          </div>

          <LogInvoiceForm onDone={loadPurchaseInvoices} />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
              <input
                value={purchaseSearch}
                onChange={(e) => setPurchaseSearch(e.target.value)}
                placeholder="Search vendor or invoice #…"
                className="w-full rounded-xl border border-ink/10 bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>

          <Card padding="compact" className="overflow-hidden !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/[0.07] text-left text-ink/50">
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">File</th>
                </tr>
              </thead>
              <tbody>
                {purchaseLoading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
                ) : filteredPurchaseInvoices.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40">{purchaseInvoices.length === 0 ? 'No purchase invoices logged yet.' : 'No invoices match your search.'}</td></tr>
                ) : filteredPurchaseInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-ink/[0.05] last:border-0">
                    <td className="px-4 py-3 text-ink">{inv.vendorName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/70">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-ink/70">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 tabular-nums text-ink">{money(inv.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.category} /></td>
                    <td className="px-4 py-3">
                      {inv.fileUrl ? (
                        <a href={resolveUrl(inv.fileUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-slate hover:underline">
                          <FileText className="h-3.5 w-3.5" /> View
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
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
