'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Search, PenLine, ScanLine, Plus, Upload, X } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormShell } from '@/components/portal/FormShell'
import ChartCard from '@/components/charts/ChartCard'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import { VEHICLE_IMAGES } from '@/lib/vehicleCatalog'
import { useDeepLinkQuery } from '@/lib/useDeepLinkQuery'

type VehicleUnit = {
  id: number
  vin: string
  model: string
  segment: string
  color: string | null
  status: string
  isDemoUnit: boolean
  batteryHealthPct: number | null
  allocatedAt: string | null
  soldAt: string | null
  buyerName: string | null
  createdAt: string
}

// Kept out of the gallery on request — not part of the dealer-facing lineup
// this dealership actually sells.
const GALLERY_EXCLUDED = new Set(['LX DV Mega', 'Queen Mini DLX'])

function daysInStock(u: VehicleUnit): number | null {
  if (u.status === 'SOLD') return null
  const since = u.allocatedAt ?? u.createdAt
  return Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000)
}

export default function InventoryPage() {
  const deepLinkQ = useDeepLinkQuery()
  const [units, setUnits] = useState<VehicleUnit[]>([])
  const [byStatus, setByStatus] = useState<{ label: string; value: number }[]>([])
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState(deepLinkQ)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState<'none' | 'manual' | 'scan'>('none')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const params = new URLSearchParams({ limit: '100' })
    if (status) params.set('status', status)
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/vehicle-units?${params}`)
    if (!ok) {
      console.error('[InventoryPage] failed to load vehicle units:', data.message)
      setLoadError(data.message ?? 'Could not load inventory')
      setLoading(false)
      return
    }
    setUnits(data.units ?? [])
    setByStatus(data.byStatus ?? [])
    setLoading(false)
  }, [status])

  useEffect(() => { load() }, [load])

  // Active (non-sold) stock, grouped by model — the gallery figure, same
  // "what's actually on hand" convention the CRM's Vehicle Inventory page
  // uses for its own photo gallery.
  const galleryByModel = useMemo(() => {
    const rows: Record<string, { segment: string; quantity: number }> = {}
    for (const u of units) {
      if (u.status === 'SOLD' || !VEHICLE_IMAGES[u.model] || GALLERY_EXCLUDED.has(u.model)) continue
      rows[u.model] = rows[u.model] ?? { segment: u.segment, quantity: 0 }
      rows[u.model].quantity++
    }
    return Object.entries(rows).map(([model, r]) => ({ model, ...r })).sort((a, b) => b.quantity - a.quantity)
  }, [units])

  const byModel = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const u of units) counts[u.model] = (counts[u.model] ?? 0) + 1
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [units])

  const statuses = ['IN_TRANSIT', 'IN_STOCK', 'ALLOCATED', 'DEMO', 'SOLD', 'SERVICE_HOLD', 'DAMAGED']

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return units
    return units.filter((u) => u.vin.toLowerCase().includes(q) || u.model.toLowerCase().includes(q))
  }, [units, search])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="My Inventory" subtitle="Vehicle units currently allocated to your dealership by the manufacturer." />

      {loadError && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 !bg-red-50 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </Card>
      )}

      {/* Gallery — photo + count only, no card chrome, same treatment as
          the manufacturer's own Vehicle Inventory page. */}
      {galleryByModel.length > 0 && (
        <div className="mb-8">
          <div className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {galleryByModel.map((m) => (
              <div key={m.model} className="flex flex-col items-center text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={VEHICLE_IMAGES[m.model]} alt={m.model} className="h-16 w-full object-contain drop-shadow-sm sm:h-20" />
                <div className="mt-2.5 text-xs font-medium leading-tight text-ink">{m.model}</div>
                <div className="text-[10px] text-ink/40">{m.segment}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-ink">{m.quantity}</div>
                <div className="text-[10px] text-ink/40">on hand</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && units.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Stock by status" subtitle="Where every allocated unit currently stands">
            <DonutChart data={byStatus} centerLabel="units" />
          </ChartCard>
          <ChartCard title="Stock by model" subtitle="Allocated units, grouped by model">
            <BarChart data={byModel} color="var(--viz-2)" />
          </ChartCard>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search VIN or model…"
            className="w-full rounded-xl border border-ink/10 bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-ink/10 bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <div className="flex gap-2">
          <Button size="sm" variant={showForm === 'manual' ? 'primary' : 'outline'} onClick={() => setShowForm((v) => v === 'manual' ? 'none' : 'manual')}>
            <PenLine className="h-4 w-4" /> Add manually
          </Button>
          <Button size="sm" variant={showForm === 'scan' ? 'primary' : 'outline'} onClick={() => setShowForm((v) => v === 'scan' ? 'none' : 'scan')}>
            <ScanLine className="h-4 w-4" /> Scan bill
          </Button>
        </div>
      </div>

      {showForm === 'manual' && <div className="mb-4"><AddVehiclesManualForm onDone={() => { setShowForm('none'); load() }} /></div>}
      {showForm === 'scan' && <div className="mb-4"><ScanVehicleBillForm onDone={() => { setShowForm('none'); load() }} /></div>}

      <Card padding="compact" className="overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">VIN</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Segment</th>
              <th className="px-4 py-3 font-medium">Battery</th>
              <th className="px-4 py-3 font-medium">Days in stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : filteredUnits.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40">{units.length === 0 ? 'No vehicles allocated to your dealership yet.' : 'No vehicles match your search.'}</td></tr>
            ) : (
              filteredUnits.map((u) => {
                const days = daysInStock(u)
                return (
                  <tr key={u.id} className="border-b border-ink/[0.05] last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-ink">{u.vin}</td>
                    <td className="px-4 py-3 text-ink">{u.model}{u.isDemoUnit && <span className="ml-1.5 text-xs text-ink/40">(demo)</span>}</td>
                    <td className="px-4 py-3 text-ink/70">{u.segment}</td>
                    <td className="px-4 py-3 text-ink/70">{u.batteryHealthPct != null ? `${u.batteryHealthPct}%` : '—'}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {days == null ? '—' : (
                        <span className={days > 60 ? 'font-medium text-red-600' : days > 30 ? 'font-medium text-amber-600' : 'text-ink/70'}>
                          {days}d
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add vehicles to my inventory — same "Add manually" / "Scan bill" pattern
// as the Spare Parts inventory page, applied to VIN-level units instead of
// quantities: each line is one specific vehicle (VIN + catalog model), not a
// count, since a VehicleUnit is always one physical unit.
// ---------------------------------------------------------------------------

type CatalogItem = { model: string; segment: string; application: string }
type VehicleLine = { vin: string; selected: string; color: string; batteryHealthPct: string }
let lineKeySeq = 0
function newLineKey() { return ++lineKeySeq }
function blankVehicleLine(selected = ''): VehicleLine { return { vin: '', selected, color: '', batteryHealthPct: '' } }

async function saveVehicleLines(lines: { key: number; line: VehicleLine }[], source: 'MANUAL_ADD' | 'SCAN_BILL'): Promise<string[]> {
  const failures: string[] = []
  for (const { line } of lines) {
    const vin = line.vin.trim()
    const [model, segment] = line.selected.split('|')
    if (!vin || !model || !segment) continue
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/vehicle-units', {
      method: 'POST',
      body: JSON.stringify({ vin, model, segment, color: line.color.trim() || undefined, batteryHealthPct: line.batteryHealthPct || undefined, source }),
    })
    if (!ok) failures.push(`${vin || model}: ${data.message ?? 'failed'}`)
  }
  return failures
}

function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  useEffect(() => {
    crmFetch('/api/v1/dealer-portal/vehicle-catalog').then(({ data }) => {
      setCatalog(data?.items ?? [])
      setLoadingCatalog(false)
    })
  }, [])
  const options = catalog.map((c) => ({ value: `${c.model}|${c.segment}`, label: `${c.model} (${c.segment})` }))
  return { options, loadingCatalog }
}

function VehicleLineRow({ line, options, loadingCatalog, onChange, onRemove, removable }: {
  line: VehicleLine
  options: { value: string; label: string }[]
  loadingCatalog: boolean
  onChange: (patch: Partial<VehicleLine>) => void
  onRemove: () => void
  removable: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.3fr_1.6fr_1fr_1fr_auto] md:items-end">
      <Input label="VIN" placeholder="17-character VIN" value={line.vin} onChange={(e) => onChange({ vin: e.target.value.toUpperCase() })} required />
      <Select
        label="Vehicle"
        options={options}
        value={line.selected}
        onChange={(e) => onChange({ selected: e.target.value })}
        disabled={loadingCatalog || options.length === 0}
        hint={loadingCatalog ? 'Loading catalog…' : undefined}
      />
      <Input label="Color (optional)" value={line.color} onChange={(e) => onChange({ color: e.target.value })} />
      <Input label="Battery % (optional)" type="number" min={0} max={100} value={line.batteryHealthPct} onChange={(e) => onChange({ batteryHealthPct: e.target.value })} />
      {removable && (
        <button onClick={onRemove} className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-md text-ink/30 hover:bg-red-50 hover:text-red-500" aria-label="Remove line">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function AddVehiclesManualForm({ onDone }: { onDone: () => void }) {
  const { options, loadingCatalog } = useCatalog()
  const [lines, setLines] = useState<{ key: number; line: VehicleLine }[]>([{ key: newLineKey(), line: blankVehicleLine() }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (options.length === 0) return
    setLines((prev) => prev.map((l) => l.line.selected ? l : { ...l, line: { ...l.line, selected: options[0].value } }))
  }, [options])

  function updateLine(key: number, patch: Partial<VehicleLine>) {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, line: { ...l.line, ...patch } } : l))
  }
  function addLine() {
    setLines((prev) => [...prev, { key: newLineKey(), line: blankVehicleLine(options[0]?.value ?? '') }])
  }
  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const validLines = lines.filter((l) => l.line.vin.trim() && l.line.selected)

  const submit = async () => {
    if (validLines.length === 0) return
    setSaving(true)
    setError(null)
    const failures = await saveVehicleLines(validLines, 'MANUAL_ADD')
    setSaving(false)
    if (failures.length > 0) { setError(failures.join('; ')); return }
    onDone()
  }

  const modelSummary = validLines.map(({ line }) => line.selected.split('|')[0]).filter(Boolean).join(', ')

  return (
    <FormShell
      title="Add vehicles manually"
      description="Add vehicles bought outside a manufacturer stock transfer, or reconcile a physical unit that's already on your lot. Add as many as you like in one go."
      summary={[
        { label: 'Vehicles', value: validLines.length || '—' },
        { label: 'Model(s)', value: modelSummary },
      ]}
      onSubmit={submit}
      submitLabel={`Add to inventory${validLines.length > 1 ? ` (${validLines.length} vehicles)` : ''}`}
      submitting={saving}
      submitDisabled={validLines.length === 0}
      error={error}
    >
      <div className="space-y-3">
        {lines.map(({ key, line }) => (
          <VehicleLineRow key={key} line={line} options={options} loadingCatalog={loadingCatalog} onChange={(patch) => updateLine(key, patch)} onRemove={() => removeLine(key)} removable={lines.length > 1} />
        ))}
      </div>
      <button onClick={addLine} className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate hover:underline">
        <Plus className="h-3.5 w-3.5" /> Add another vehicle
      </button>
    </FormShell>
  )
}

type VehicleOcrPreview = { ocrExtractedText: string | null; ocrStatus: 'DONE' | 'FAILED' | 'SKIPPED'; items: { vin: string; model: string; segment: string }[] }

function ScanVehicleBillForm({ onDone }: { onDone: () => void }) {
  const { options, loadingCatalog } = useCatalog()
  const [uploading, setUploading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<VehicleOcrPreview | null>(null)
  const [lines, setLines] = useState<{ key: number; line: VehicleLine }[]>([])
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
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/vehicle-units/ocr-preview', { method: 'POST', body: formData })
    setUploading(false)
    if (!ok) { setPreviewError(data.message ?? 'Could not scan bill'); return }
    setPreview(data)
    const items: VehicleOcrPreview['items'] = data.items ?? []
    setLines(
      items.length > 0
        ? items.map((it) => ({ key: newLineKey(), line: { vin: it.vin, selected: it.model && it.segment ? `${it.model}|${it.segment}` : '', color: '', batteryHealthPct: '' } }))
        : [{ key: newLineKey(), line: blankVehicleLine() }]
    )
  }

  function updateLine(key: number, patch: Partial<VehicleLine>) {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, line: { ...l.line, ...patch } } : l))
  }
  function addLine() {
    setLines((prev) => [...prev, { key: newLineKey(), line: blankVehicleLine(options[0]?.value ?? '') }])
  }
  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const validLines = lines.filter((l) => l.line.vin.trim() && l.line.selected)

  const startOver = () => {
    setPreview(null)
    setImageUrl(null)
    setLines([])
  }

  const submit = async () => {
    if (validLines.length === 0) return
    setSaving(true)
    setSaveError(null)
    const failures = await saveVehicleLines(validLines, 'SCAN_BILL')
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
          <span className="text-xs text-ink/40">VINs get pulled out automatically as a first guess, with a model match where the bill text mentions one — you'll review every line before it's added</span>
          <input type="file" accept=".jpg,.jpeg,.png" className="hidden" disabled={uploading} onChange={(e) => handleFile(e.target.files)} />
        </label>
        {previewError && <p className="mt-2 text-xs text-red-500">{previewError}</p>}
      </Card>
    )
  }

  const modelSummary = validLines.map(({ line }) => line.selected.split('|')[0]).filter(Boolean).join(', ')

  return (
    <div className="mb-6">
      <FormShell
        title="Confirm scanned vehicles"
        description={preview.items.length > 0
          ? 'Best-effort VIN read from the bill photo — check every VIN and confirm the matching model before adding it to your inventory.'
          : "Couldn't confidently read a VIN from this bill — enter vehicles below using the extracted text as a reference."}
        summary={[
          { label: 'Vehicles', value: validLines.length || '—' },
          { label: 'Model(s)', value: modelSummary },
        ]}
        onSubmit={submit}
        onCancel={startOver}
        submitLabel={`Add to inventory${validLines.length > 1 ? ` (${validLines.length} vehicles)` : ''}`}
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
            <VehicleLineRow key={key} line={line} options={options} loadingCatalog={loadingCatalog} onChange={(patch) => updateLine(key, patch)} onRemove={() => removeLine(key)} removable={lines.length > 1} />
          ))}
        </div>
        <button onClick={addLine} className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate hover:underline">
          <Plus className="h-3.5 w-3.5" /> Add another vehicle
        </button>
      </FormShell>
    </div>
  )
}
