'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Search, Users, Gauge, CheckCircle2, RefreshCw } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatusBadge, StatTile } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type Lead = {
  id: number
  firstName: string
  lastName: string | null
  email: string
  phone: string | null
  source: string | null
  status: string
  score: number
  createdAt: string
  assignment: { id: number; status: string; assignedAt: string; outcome: string | null }
}

const ASSIGNMENT_STATUSES = ['ASSIGNED', 'ACCEPTED', 'CONTACTED', 'CONVERTED', 'LOST', 'REASSIGNED']

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('search', search)
    const qs = params.toString()
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/leads${qs ? `?${qs}` : ''}`)
    if (!ok) {
      console.error('[LeadsPage] failed to load leads:', data.message)
      setLoadError(data.message ?? 'Could not load leads')
      setLoading(false)
      return
    }
    setLeads(data.leads ?? [])
    setLoading(false)
  }, [statusFilter, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  const stats = useMemo(() => {
    const needsFollowUp = leads.filter((l) => ['ASSIGNED', 'ACCEPTED', 'CONTACTED'].includes(l.assignment.status)).length
    const converted = leads.filter((l) => l.assignment.status === 'CONVERTED').length
    const avgScore = leads.length ? Math.round(leads.reduce((s, l) => s + (l.score ?? 0), 0) / leads.length) : 0
    return { total: leads.length, needsFollowUp, converted, avgScore }
  }, [leads])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Leads" subtitle="Leads the manufacturer has routed to your dealership, plus any walk-in enquiries you log yourself." />

      {loadError && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Users} label="Total leads" value={stats.total} />
        <StatTile icon={Users} label="Needs follow-up" value={stats.needsFollowUp} />
        <StatTile icon={CheckCircle2} label="Converted" value={stats.converted} />
        <StatTile icon={Gauge} label="Average score" value={stats.avgScore} />
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-full rounded-md border border-ink/10 bg-white py-2 pl-9 pr-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-slate/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm text-ink"
        >
          <option value="">All follow-up statuses</option>
          {ASSIGNMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="ml-auto">
          <Plus className="h-4 w-4" /> Log walk-in lead
        </Button>
      </div>

      {showForm && <NewLeadForm onDone={() => { setShowForm(false); load() }} />}

      <div className="overflow-hidden rounded-xl border border-ink/[0.08] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40">No leads match these filters.</td></tr>
            ) : leads.map((l) => (
              <tr key={l.id} onClick={() => router.push(`/leads/${l.id}`)} className="cursor-pointer border-b border-ink/[0.05] last:border-0 hover:bg-mint/40">
                <td className="px-4 py-3 text-ink">{l.firstName} {l.lastName ?? ''}</td>
                <td className="px-4 py-3 text-ink/70">{l.email}{l.phone ? ` · ${l.phone}` : ''}</td>
                <td className="px-4 py-3 text-ink/70">{(l.source ?? 'MANUAL').replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 tabular-nums text-ink/70">{l.score}</td>
                <td className="px-4 py-3"><StatusBadge status={l.assignment.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NewLeadForm({ onDone }: { onDone: () => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/leads', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName: lastName || undefined, email, phone: phone || undefined, city: city || undefined }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not log lead'); return }
    onDone()
  }

  return (
    <div className="mb-4 rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <Input label="Last name (optional)" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!firstName || !email || saving} loading={saving} onClick={submit}>
        Log lead
      </Button>
    </div>
  )
}
