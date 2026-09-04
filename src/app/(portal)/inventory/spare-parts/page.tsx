'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, IndianRupee, AlertTriangle, Boxes, RefreshCw, Search, ScanLine, PenLine, Upload, X } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormShell } from '@/components/portal/FormShell'
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
  const [showForm, setShowForm] = useState<'none' | 'manual' | 'scan'>('none')
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
        <div className="flex gap-2">
          <Button size="sm" variant={showForm === 'manual' ? 'primary' : 'outline'} onClick={() => setShowForm((v) => v === 'manual' ? 'none' : 'manual')}>
            <PenLine className="h-4 w-4" /> Add manually
          </Button>
          <Button size="sm" variant={showForm === 'scan' ? 'primary' : 'outline'} onClick={() => setShowForm((v) => v === 'scan' ? 'none' : 'scan')}>
            <ScanLine className="h-4 w-4" /> Scan bill
          </Button>
        </div>
      </div>

      {showForm === 'manual' && <AddManualStockForm onDone={() => { setShowForm('none'); load() }} />}
      {showForm === 'scan' && <ScanBillForm onDone={() => { setShowForm('none'); load() }} />}

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
              <PartRow
                key={p.id}
                part={p}
                onChanged={load}
              />
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
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => setEditing(true)} className="text-xs font-medium text-slate hover:underline">Edit</button>
        </div>
      </td>
    </tr>
  )
}

// Shared row shape for both the manual multi-line form and the scan-bill
// review table — same fields either way, since scanning just pre-fills what
// the dealer would otherwise type in by hand.
type StockLine = { partName: string; partCode: string; quantity: string; unitPrice: string }
let lineKeySeq = 0
function newLineKey() { return ++lineKeySeq }
function blankLine(): StockLine { return { partName: '', partCode: '', quantity: '1', unitPrice: '' } }

// POSTing to spare-parts-stock (not the order-placement /spare-parts
// endpoint) is what makes this an inventory top-up: that endpoint upserts by
// part name, incrementing quantityOnHand on an existing row instead of
// creating a duplicate — see dealerPortal.controller.ts#upsertDealerSparePart.
async function saveStockLines(lines: { key: number; line: StockLine }[], source: 'MANUAL_ADD' | 'SCAN_BILL'): Promise<string[]> {
  const failures: string[] = []
  for (const { line } of lines) {
    if (!line.partName.trim() || !(Number(line.quantity) > 0)) continue
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/spare-parts-stock', {
      method: 'POST',
      body: JSON.stringify({ partName: line.partName.trim(), partCode: line.partCode.trim() || undefined, quantity: line.quantity, unitPrice: line.unitPrice || undefined, source }),
    })
    if (!ok) failures.push(`${line.partName}: ${data.message ?? 'failed'}`)
  }
  return failures
}

function StockLineRow({ line, onChange, onRemove, removable }: { line: StockLine; onChange: (patch: Partial<StockLine>) => void; onRemove: () => void; removable: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
      <Input label="Part name" placeholder="e.g. Brake Pad Set" value={line.partName} onChange={(e) => onChange({ partName: e.target.value })} required />
      <Input label="Part code (optional)" value={line.partCode} onChange={(e) => onChange({ partCode: e.target.value })} />
      <Input label="Quantity" type="number" min={1} value={line.quantity} onChange={(e) => onChange({ quantity: e.target.value })} required />
      <Input label="Unit price, ₹" type="number" value={line.unitPrice} onChange={(e) => onChange({ unitPrice: e.target.value })} />
      {removable && (
        <button onClick={onRemove} className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-md text-ink/30 hover:bg-red-50 hover:text-red-500" aria-label="Remove line">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function AddManualStockForm({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<{ key: number; line: StockLine }[]>(() => [{ key: newLineKey(), line: blankLine() }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateLine(key: number, patch: Partial<StockLine>) {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, line: { ...l.line, ...patch } } : l))
  }
  function addLine() {
    setLines((prev) => [...prev, { key: newLineKey(), line: blankLine() }])
  }
  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const validLines = lines.filter((l) => l.line.partName.trim() && Number(l.line.quantity) > 0)

  const submit = async () => {
    if (validLines.length === 0) return
    setSaving(true)
    setError(null)
    const failures = await saveStockLines(validLines, 'MANUAL_ADD')
    setSaving(false)
    if (failures.length > 0) { setError(failures.join('; ')); return }
    onDone()
  }

  const partSummary = validLines.map(({ line }) => line.partName.trim()).filter(Boolean).join(', ')
  const totalQuantity = validLines.reduce((sum, { line }) => sum + (Number(line.quantity) || 0), 0)

  return (
    <FormShell
      title="Add stock manually"
      description="Adding a part that already exists tops up its quantity instead of creating a duplicate. Add as many parts as you like in one go."
      summary={[
        { label: 'Parts', value: validLines.length || '—' },
        { label: 'Name(s)', value: partSummary },
        { label: 'Total quantity', value: totalQuantity || '—' },
      ]}
      onSubmit={submit}
      submitLabel={`Save${validLines.length > 1 ? ` (${validLines.length} parts)` : ''}`}
      submitting={saving}
      submitDisabled={validLines.length === 0}
      error={error}
    >
      <div className="space-y-3">
        {lines.map(({ key, line }) => (
          <StockLineRow key={key} line={line} onChange={(patch) => updateLine(key, patch)} onRemove={() => removeLine(key)} removable={lines.length > 1} />
        ))}
      </div>
      <button onClick={addLine} className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate hover:underline">
        <Plus className="h-3.5 w-3.5" /> Add another part
      </button>
    </FormShell>
  )
}

type OcrPreview = { ocrExtractedText: string | null; ocrStatus: 'DONE' | 'FAILED' | 'SKIPPED'; items: { partName: string; quantity: number; unitPrice: string }[] }

function ScanBillForm({ onDone }: { onDone: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<OcrPreview | null>(null)
  const [lines, setLines] = useState<{ key: number; line: StockLine }[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleFile(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setUploading(true)
    setPreviewError(null)
    setImageUrl(URL.createObjectURL(file))
    const formData = new FormData()
    formData.append('file', file)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/spare-parts-stock/ocr-preview', { method: 'POST', body: formData })
    setUploading(false)
    if (!ok) { setPreviewError(data.message ?? 'Could not scan bill'); return }
    setPreview(data)
    const items: OcrPreview['items'] = data.items ?? []
    setLines(
      items.length > 0
        ? items.map((it) => ({ key: newLineKey(), line: { partName: it.partName, partCode: '', quantity: String(it.quantity), unitPrice: it.unitPrice } }))
        : [{ key: newLineKey(), line: blankLine() }]
    )
  }

  function updateLine(key: number, patch: Partial<StockLine>) {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, line: { ...l.line, ...patch } } : l))
  }
  function addLine() {
    setLines((prev) => [...prev, { key: newLineKey(), line: blankLine() }])
  }
  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const validLines = lines.filter((l) => l.line.partName.trim() && Number(l.line.quantity) > 0)

  const startOver = () => {
    setPreview(null)
    setImageUrl(null)
    setLines([])
  }

  const submit = async () => {
    if (validLines.length === 0) return
    setSaving(true)
    setSaveError(null)
    const failures = await saveStockLines(validLines, 'SCAN_BILL')
    setSaving(false)
    if (failures.length > 0) { setSaveError(failures.join('; ')); return }
    onDone()
  }

  if (!preview) {
    return (
      <Card className="mb-6">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink/15 py-10 text-center hover:border-slate/40">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-slate" /> : <Upload className="h-6 w-6 text-ink/30" />}
          <span className="text-sm font-medium text-ink/70">{uploading ? 'Scanning bill…' : 'Upload a photo of the purchase bill'}</span>
          <span className="text-xs text-ink/40">Quantity and price get pulled out automatically as a first guess — you'll review every line before it's added to stock</span>
          <input type="file" accept=".jpg,.jpeg,.png" className="hidden" disabled={uploading} onChange={(e) => handleFile(e.target.files)} />
        </label>
        {previewError && <p className="mt-2 text-xs text-red-500">{previewError}</p>}
      </Card>
    )
  }

  const partSummary = validLines.map(({ line }) => line.partName.trim()).filter(Boolean).join(', ')
  const totalQuantity = validLines.reduce((sum, { line }) => sum + (Number(line.quantity) || 0), 0)

  return (
    <div className="mb-6">
      <FormShell
        title="Confirm scanned stock"
        description={preview.items.length > 0
          ? 'Best-effort read from the bill photo — check every line (especially quantity and price) before adding it to stock.'
          : "Couldn't confidently read any line items from this bill — enter them below using the extracted text as a reference."}
        summary={[
          { label: 'Parts', value: validLines.length || '—' },
          { label: 'Name(s)', value: partSummary },
          { label: 'Total quantity', value: totalQuantity || '—' },
        ]}
        onSubmit={submit}
        onCancel={startOver}
        submitLabel={`Add to stock${validLines.length > 1 ? ` (${validLines.length} parts)` : ''}`}
        submitting={saving}
        submitDisabled={validLines.length === 0}
        error={saveError}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">Uploaded bill</p>
            {imageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={imageUrl} alt="Uploaded bill" className="max-h-64 w-full rounded-lg border border-ink/[0.08] object-contain" />
            )}
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
              Extracted text {preview.ocrStatus === 'FAILED' && '(scan failed)'}
            </p>
            <textarea
              readOnly
              value={preview.ocrExtractedText ?? ''}
              placeholder="No text extracted"
              rows={9}
              className="w-full rounded-lg border border-ink/[0.08] bg-brand-white px-3 py-2 text-xs text-ink/60"
            />
          </div>
        </div>

        <div className="space-y-3">
          {lines.map(({ key, line }) => (
            <StockLineRow key={key} line={line} onChange={(patch) => updateLine(key, patch)} onRemove={() => removeLine(key)} removable={lines.length > 1} />
          ))}
        </div>
        <button onClick={addLine} className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate hover:underline">
          <Plus className="h-3.5 w-3.5" /> Add another part
        </button>
      </FormShell>
    </div>
  )
}
