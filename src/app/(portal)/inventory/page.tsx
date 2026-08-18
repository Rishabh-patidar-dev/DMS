'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatusBadge } from '@/components/portal/StatTile'
import ChartCard from '@/components/charts/ChartCard'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'

type VehicleUnit = {
  id: number
  vin: string
  model: string
  segment: string
  color: string | null
  status: string
  isDemoUnit: boolean
  batteryHealthPct: number | null
  soldAt: string | null
  buyerName: string | null
  createdAt: string
}

export default function InventoryPage() {
  const [units, setUnits] = useState<VehicleUnit[]>([])
  const [byStatus, setByStatus] = useState<{ label: string; value: number }[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (status) params.set('status', status)
    const { data } = await crmFetch(`/api/v1/dealer-portal/vehicle-units?${params}`)
    setUnits(data.units ?? [])
    setByStatus(data.byStatus ?? [])
    setLoading(false)
  }, [status])

  useEffect(() => { load() }, [load])

  const byModel = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const u of units) counts[u.model] = (counts[u.model] ?? 0) + 1
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [units])

  const statuses = ['IN_TRANSIT', 'IN_STOCK', 'ALLOCATED', 'DEMO', 'SOLD', 'SERVICE_HOLD', 'DAMAGED']

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="My Inventory" subtitle="Vehicle units currently allocated to your dealership by the manufacturer." />

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

      <div className="mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm text-ink"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink/[0.08] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">VIN</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Segment</th>
              <th className="px-4 py-3 font-medium">Battery</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : units.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40">No vehicles allocated to your dealership yet.</td></tr>
            ) : (
              units.map((u) => (
                <tr key={u.id} className="border-b border-ink/[0.05] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-ink">{u.vin}</td>
                  <td className="px-4 py-3 text-ink">{u.model}{u.isDemoUnit && <span className="ml-1.5 text-xs text-ink/40">(demo)</span>}</td>
                  <td className="px-4 py-3 text-ink/70">{u.segment}</td>
                  <td className="px-4 py-3 text-ink/70">{u.batteryHealthPct != null ? `${u.batteryHealthPct}%` : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
