'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Search, CheckCircle2, XCircle } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type Claim = {
  id: number
  claimNumber: string
  customerName: string
  issueDescription: string
  status: string
  submittedAt: string
  componentUnit: { serialNumber: string; componentType: string } | null
  vehicleUnit: { vin: string; model: string } | null
}

export default function WarrantyPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await crmFetch('/api/v1/dealer-portal/warranty-claims')
    setClaims(data.claims ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Warranty Claims" subtitle="Check coverage on a VIN and raise a claim — it's adjudicated automatically and lands in the manufacturer's Claims & Coverage queue." />

      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Raise a claim
        </Button>
      </div>

      {showForm && <NewClaimForm onDone={() => { setShowForm(false); load() }} />}

      <div className="overflow-hidden rounded-xl border border-ink/[0.08] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Claim</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Component</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : claims.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40">No warranty claims raised yet.</td></tr>
            ) : claims.map((c) => (
              <tr key={c.id} className="border-b border-ink/[0.05] last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-ink">{c.claimNumber}</td>
                <td className="px-4 py-3 text-ink/70">{c.vehicleUnit ? `${c.vehicleUnit.model} · ${c.vehicleUnit.vin}` : '—'}</td>
                <td className="px-4 py-3 text-ink/70">{c.componentUnit?.componentType ?? '—'}</td>
                <td className="px-4 py-3 text-ink">{c.customerName}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NewClaimForm({ onDone }: { onDone: () => void }) {
  const [vin, setVin] = useState('')
  const [checking, setChecking] = useState(false)
  const [coverage, setCoverage] = useState<any | null>(null)
  const [coverageError, setCoverageError] = useState<string | null>(null)
  const [componentUnitId, setComponentUnitId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [odometerReading, setOdometerReading] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)

  const checkCoverage = async () => {
    if (!vin.trim()) return
    setChecking(true)
    setCoverageError(null)
    setCoverage(null)
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/warranty-coverage/${encodeURIComponent(vin.trim())}`)
    setChecking(false)
    if (!ok) { setCoverageError(data.message ?? 'Vehicle not found in your allocated stock'); return }
    setCoverage(data)
  }

  const submit = async () => {
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/warranty-claims', {
      method: 'POST',
      body: JSON.stringify({
        componentUnitId: componentUnitId || undefined,
        customerName,
        issueDescription,
        odometerReading: odometerReading ? Number(odometerReading) : undefined,
      }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not submit claim'); return }
    setResult(data)
  }

  if (result) {
    return (
      <div className="mb-4 rounded-xl border border-slate/30 bg-slate/5 p-4 text-sm">
        <p className="font-medium text-ink">Claim {result.claimNumber} submitted — auto-adjudicated to <b>{result.status.replace(/_/g, ' ')}</b>.</p>
        <p className="mt-1 text-xs text-ink/60">{result.adjudication?.reasons?.join(' ')}</p>
        <button onClick={onDone} className="mt-3 rounded-md border border-ink/10 px-3 py-1.5 text-xs text-ink/70 hover:bg-sand/10">Done</button>
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="mb-4 flex gap-2">
        <Input placeholder="Enter the vehicle's VIN…" value={vin} onChange={(e) => setVin(e.target.value)} prefix={<Search className="h-4 w-4" />} />
        <Button size="sm" onClick={checkCoverage} loading={checking}>Check coverage</Button>
      </div>

      {coverageError && <p className="mb-3 text-xs text-red-500">{coverageError}</p>}

      {coverage && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium text-ink/60">{coverage.vehicle.model} · {coverage.vehicle.vin}</p>
          {coverage.components.map((c: any) => (
            <label key={c.id} className="flex items-center justify-between rounded-lg border border-ink/[0.08] px-3 py-2 text-sm cursor-pointer hover:border-slate/40">
              <span className="flex items-center gap-2">
                <input type="radio" name="component" checked={componentUnitId === String(c.id)} onChange={() => setComponentUnitId(String(c.id))} />
                {c.componentType} <span className="font-mono text-xs text-ink/40">{c.serialNumber}</span>
              </span>
              {c.inWarranty ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3 w-3" /> In warranty</span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-red-500"><XCircle className="h-3 w-3" /> Expired</span>
              )}
            </label>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        <Input label="Odometer (km, optional)" type="number" value={odometerReading} onChange={(e) => setOdometerReading(e.target.value)} />
      </div>
      <div className="mt-3">
        <label htmlFor="issueDescription" className="mb-1.5 block text-sm font-medium text-ink/70">Issue description</label>
        <textarea
          id="issueDescription"
          value={issueDescription}
          onChange={(e) => setIssueDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-ink/10 bg-brand-white px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-slate/40"
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!customerName || !issueDescription || saving} loading={saving} onClick={submit}>
        Submit claim (auto-adjudicated)
      </Button>
    </div>
  )
}
