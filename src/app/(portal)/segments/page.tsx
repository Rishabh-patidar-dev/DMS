'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

const STATUS_OPTIONS = ['OPEN', 'WORKING', 'QUALIFIED', 'UNQUALIFIED', 'NURTURING', 'CONVERTED']
const SOURCE_OPTIONS = ['IMPORT', 'LANDING_PAGE', 'MANUAL']

interface SegmentRow {
  id: number
  name: string
  description: string | null
  statusFilter: string | null
  sourceFilter: string | null
  stateFilter: string | null
  memberCount: number
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<SegmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await crmFetch('/api/v1/dealer-portal/segments')
    setSegments(data.segments ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const remove = async (id: number) => {
    await crmFetch(`/api/v1/dealer-portal/segments/${id}`, { method: 'DELETE' })
    await load()
  }

  const filterSummary = (s: SegmentRow) => {
    const parts = [
      s.statusFilter && `status: ${s.statusFilter}`,
      s.sourceFilter && `source: ${s.sourceFilter}`,
      s.stateFilter && `state: ${s.stateFilter}`,
    ].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'All my leads'
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Segments"
        subtitle="Saved filters over your own leads — used as the audience for your Email and WhatsApp campaigns. Membership is always live and scoped to your dealership only."
      />

      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New segment
        </Button>
      </div>

      {showForm && <NewSegmentForm onDone={() => { setShowForm(false); load() }} />}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-sm text-ink/50">Loading segments…</p>
        ) : segments.length === 0 ? (
          <p className="text-sm text-ink/50">No segments yet — create one to target a campaign.</p>
        ) : (
          segments.map((s) => (
            <div key={s.id} className="rounded-xl border border-ink/[0.08] bg-white p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="font-semibold text-ink">{s.name}</h2>
                <button onClick={() => remove(s.id)} className="shrink-0 text-ink/30 hover:text-red-500" title="Delete segment">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {s.description && <p className="mb-2 text-xs text-ink/50">{s.description}</p>}
              <p className="mb-3 text-xs text-ink/50">{filterSummary(s)}</p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Users className="h-3.5 w-3.5 text-slate" /> {s.memberCount} leads
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function NewSegmentForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/segments', {
      method: 'POST',
      body: JSON.stringify({
        name, description: description || undefined,
        statusFilter: statusFilter || undefined, sourceFilter: sourceFilter || undefined, stateFilter: stateFilter || undefined,
      }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not create segment'); return }
    onDone()
  }

  return (
    <div className="mb-6 rounded-xl border border-ink/[0.08] bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">New segment</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Input placeholder="Segment name" value={name} onChange={(e) => setName(e.target.value)} className="md:col-span-2" />
        <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="md:col-span-3" />
        <Select placeholder="Any status" options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
        <Select placeholder="Any source" options={SOURCE_OPTIONS.map((s) => ({ value: s, label: s.replace('_', ' ') }))} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} />
        <Input placeholder="State (optional)" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!name || saving} loading={saving} onClick={submit}>
        Create segment
      </Button>
    </div>
  )
}
