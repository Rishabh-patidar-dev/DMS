'use client'

// Extracted from app/(portal)/orders/page.tsx so the Overview page can book
// a new order inline too, without duplicating this logic — both pages now
// import the exact same VehicleOrderForm/SparePartOrderForm. Behavior is
// unchanged: each form is self-contained (fetches its own catalog where
// needed, POSTs directly, calls onDone() on success) and takes no props
// beyond that callback.
import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormShell } from '@/components/portal/FormShell'

type CatalogItem = { model: string; segment: string; application: string }

// One dropdown, not a free-text Model field + separate Segment picker — a
// dealer can only ever pick a real {model, segment} pair straight from the
// manufacturer's own catalog, so Check Inventory's exact-match comparison
// can never silently miss due to a typo or a model paired with the wrong
// segment.
type VehicleLine = { selected: string; quantity: string; notes: string }
let lineKeySeq = 0
function newLineKey() { return ++lineKeySeq }

export function VehicleOrderForm({ onDone }: { onDone: () => void }) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [lines, setLines] = useState<{ key: number; line: VehicleLine }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    crmFetch('/api/v1/dealer-portal/vehicle-catalog').then(({ data }) => {
      const items: CatalogItem[] = data?.items ?? []
      setCatalog(items)
      const first = items.length > 0 ? `${items[0].model}|${items[0].segment}` : ''
      setLines([{ key: newLineKey(), line: { selected: first, quantity: '1', notes: '' } }])
      setLoadingCatalog(false)
    })
  }, [])

  const catalogOptions = catalog.map((c) => ({ value: `${c.model}|${c.segment}`, label: `${c.model} (${c.segment})` }))
  const defaultSelected = catalogOptions[0]?.value ?? ''

  function updateLine(key: number, patch: Partial<VehicleLine>) {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, line: { ...l.line, ...patch } } : l))
  }
  function addLine() {
    setLines((prev) => [...prev, { key: newLineKey(), line: { selected: defaultSelected, quantity: '1', notes: '' } }])
  }
  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const validLines = lines.filter((l) => l.line.selected)

  const submit = async () => {
    if (validLines.length === 0) return
    setSaving(true)
    setError(null)
    const failures: string[] = []
    for (const { line } of validLines) {
      const [model, segment] = line.selected.split('|')
      if (!model || !segment) continue
      const { ok, data } = await crmFetch('/api/v1/dealer-portal/stock-transfers', {
        method: 'POST',
        body: JSON.stringify({ model, segment, quantity: Number(line.quantity) || 1, notes: line.notes || undefined }),
      })
      if (!ok) failures.push(`${model}: ${data.message ?? 'failed'}`)
    }
    setSaving(false)
    if (failures.length > 0) { setError(failures.join('; ')); return }
    onDone()
  }

  const modelSummary = validLines
    .map(({ line }) => line.selected.split('|')[0])
    .filter(Boolean)
    .join(', ')
  const totalQuantity = validLines.reduce((sum, { line }) => sum + (Number(line.quantity) || 0), 0)

  return (
    <FormShell
      title="Order vehicles"
      description="Add one or more vehicles from the manufacturer's catalog to this order."
      summary={[
        { label: 'Vehicles', value: validLines.length || '—' },
        { label: 'Model(s)', value: modelSummary },
        { label: 'Total quantity', value: totalQuantity || '—' },
      ]}
      onSubmit={submit}
      submitLabel={`Place order${validLines.length > 1 ? ` (${validLines.length} vehicles)` : ''}`}
      submitting={saving}
      submitDisabled={validLines.length === 0}
      error={error}
    >
      <div className="space-y-3">
        {lines.map(({ key, line }) => (
          <div key={key} className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
            <Select
              label="Vehicle"
              options={catalogOptions}
              value={line.selected}
              onChange={(e) => updateLine(key, { selected: e.target.value })}
              disabled={loadingCatalog || catalogOptions.length === 0}
              hint={loadingCatalog ? 'Loading catalog…' : undefined}
            />
            <Input label="Quantity" type="number" min={1} value={line.quantity} onChange={(e) => updateLine(key, { quantity: e.target.value })} />
            <Input label="Notes (optional)" value={line.notes} onChange={(e) => updateLine(key, { notes: e.target.value })} />
            {lines.length > 1 && (
              <button onClick={() => removeLine(key)} className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-md text-ink/30 hover:bg-red-50 hover:text-red-500" aria-label="Remove line">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button onClick={addLine} className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate hover:underline">
        <Plus className="h-3.5 w-3.5" /> Add another vehicle
      </button>
    </FormShell>
  )
}

type SparePartLine = { partName: string; partCode: string; quantity: string }

export function SparePartOrderForm({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<{ key: number; line: SparePartLine }[]>(() => [
    { key: newLineKey(), line: { partName: '', partCode: '', quantity: '1' } },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateLine(key: number, patch: Partial<SparePartLine>) {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, line: { ...l.line, ...patch } } : l))
  }
  function addLine() {
    setLines((prev) => [...prev, { key: newLineKey(), line: { partName: '', partCode: '', quantity: '1' } }])
  }
  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const validLines = lines.filter((l) => l.line.partName.trim())

  const submit = async () => {
    if (validLines.length === 0) return
    setSaving(true)
    setError(null)
    const failures: string[] = []
    for (const { line } of validLines) {
      const { ok, data } = await crmFetch('/api/v1/dealer-portal/spare-parts', {
        method: 'POST',
        body: JSON.stringify({ partName: line.partName, partCode: line.partCode || undefined, quantity: Number(line.quantity) || 1 }),
      })
      if (!ok) failures.push(`${line.partName}: ${data.message ?? 'failed'}`)
    }
    setSaving(false)
    if (failures.length > 0) { setError(failures.join('; ')); return }
    onDone()
  }

  const partSummary = validLines.map(({ line }) => line.partName.trim()).filter(Boolean).join(', ')
  const totalQuantity = validLines.reduce((sum, { line }) => sum + (Number(line.quantity) || 0), 0)

  return (
    <FormShell
      title="Order spare parts"
      description="Add one or more spare parts to this order."
      summary={[
        { label: 'Parts', value: validLines.length || '—' },
        { label: 'Name(s)', value: partSummary },
        { label: 'Total quantity', value: totalQuantity || '—' },
      ]}
      onSubmit={submit}
      submitLabel={`Place order${validLines.length > 1 ? ` (${validLines.length} parts)` : ''}`}
      submitting={saving}
      submitDisabled={validLines.length === 0}
      error={error}
    >
      <div className="space-y-3">
        {lines.map(({ key, line }) => (
          <div key={key} className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
            <Input label="Part name" placeholder="e.g. Brake Pad Set" value={line.partName} onChange={(e) => updateLine(key, { partName: e.target.value })} required />
            <Input label="Part code (optional)" value={line.partCode} onChange={(e) => updateLine(key, { partCode: e.target.value })} />
            <Input label="Quantity" type="number" min={1} value={line.quantity} onChange={(e) => updateLine(key, { quantity: e.target.value })} />
            {lines.length > 1 && (
              <button onClick={() => removeLine(key)} className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-md text-ink/30 hover:bg-red-50 hover:text-red-500" aria-label="Remove line">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button onClick={addLine} className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate hover:underline">
        <Plus className="h-3.5 w-3.5" /> Add another part
      </button>
    </FormShell>
  )
}
