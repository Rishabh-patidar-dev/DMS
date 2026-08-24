'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Upload, Scan, FileText, IndianRupee, Receipt, RefreshCw } from 'lucide-react'
import { crmFetch, CRM_API_URL } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

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

export default function PurchaseInvoicesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/purchase-invoices')
    if (!ok) {
      console.error('[PurchaseInvoicesPage] failed to load invoices:', data.message)
      setLoadError(data.message ?? 'Could not load purchase invoices')
      setLoading(false)
      return
    }
    setInvoices(data.invoices ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalAmount = invoices.reduce((sum, i) => sum + Number(i.amount), 0)
  const scannedCount = invoices.filter((i) => i.ocrStatus === 'DONE').length

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Purchase Invoices" subtitle="Log invoices from the OEM or spare-parts suppliers — photograph one and the extracted text is right there to copy from while you fill in the real fields." />

      {loadError && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Receipt} label="Invoices logged" value={invoices.length} />
        <StatTile icon={IndianRupee} label="Total value" value={money(totalAmount)} />
        <StatTile icon={Scan} label="OCR-scanned" value={scannedCount} />
      </div>

      <LogInvoiceForm onDone={load} />

      <div className="overflow-hidden rounded-xl border border-ink/[0.08] bg-white">
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
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40">No purchase invoices logged yet.</td></tr>
            ) : invoices.map((inv) => (
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
      </div>
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

  return (
    <div className="mb-6 rounded-xl border border-ink/[0.08] bg-white p-4">
      {!preview ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink/15 py-10 text-center hover:border-slate/40">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-slate" /> : <Upload className="h-6 w-6 text-ink/30" />}
          <span className="text-sm font-medium text-ink/70">{uploading ? 'Uploading & scanning…' : 'Upload an invoice photo or PDF'}</span>
          <span className="text-xs text-ink/40">JPG/PNG photos get OCR'd automatically and the fields below get a best-effort pre-fill — always double-check before saving</span>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" disabled={uploading} onChange={(e) => handleFile(e.target.files)} />
        </label>
      ) : (
        <div>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
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
          <div className="mt-3">
            <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {saveError && <p className="mt-2 text-xs text-red-500">{saveError}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={!valid || saving} loading={saving} onClick={submit}>Save invoice</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setPreview(null)
                setVendorName(''); setVendorGstin(''); setInvoiceNumber(''); setInvoiceDate(''); setAmount(''); setCategory('OTHER'); setNotes('')
              }}
            >
              Start over
            </Button>
          </div>
        </div>
      )}
      {previewError && <p className="mt-2 text-xs text-red-500">{previewError}</p>}
    </div>
  )
}
