'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Send, Calendar, RefreshCw, Search } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useDeepLinkQuery } from '@/lib/useDeepLinkQuery'

export type CampaignChannel = 'EMAIL' | 'WHATSAPP'

interface Segment {
  id: number
  name: string
  memberCount: number
}

interface Campaign {
  id: number
  name: string
  channel: CampaignChannel
  subject: string | null
  message: string
  status: 'DRAFT' | 'SCHEDULED' | 'SENT'
  segment: { id: number; name: string } | null
  scheduledAt: string | null
  sentAt: string | null
  audienceCount: number | null
}

export default function CampaignListView({ channel, title, subtitle }: { channel: CampaignChannel; title: string; subtitle: string }) {
  const deepLinkQ = useDeepLinkQuery()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState(deepLinkQ)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const [campaignsRes, segmentsRes] = await Promise.all([
      crmFetch(`/api/v1/dealer-portal/campaigns?channel=${channel}`),
      crmFetch('/api/v1/dealer-portal/segments'),
    ])
    const errors: string[] = []
    if (campaignsRes.ok) setCampaigns(campaignsRes.data.campaigns ?? [])
    else errors.push(campaignsRes.data.message ?? 'Could not load campaigns')
    if (segmentsRes.ok) setSegments(segmentsRes.data.segments ?? [])
    else errors.push(segmentsRes.data.message ?? 'Could not load segments')
    if (errors.length) {
      console.error('[CampaignListView] failed to load:', errors)
      setLoadError(errors.join(' · '))
    }
    setLoading(false)
  }, [channel])

  useEffect(() => { load() }, [load])

  const setStatus = async (id: number, status: string) => {
    await crmFetch(`/api/v1/dealer-portal/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
    await load()
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return campaigns
    return campaigns.filter((c) => c.name.toLowerCase().includes(q) || (c.subject ?? '').toLowerCase().includes(q))
  }, [campaigns, search])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title={title} subtitle={subtitle} />

      {loadError && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 !bg-red-50 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaign name or subject…"
            className="w-full rounded-xl border border-ink/10 bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New campaign
        </Button>
      </div>

      {showForm && (
        <div className="mb-4">
          <NewCampaignForm channel={channel} segments={segments} onDone={() => { setShowForm(false); load() }} />
        </div>
      )}

      <Card padding="compact" className="overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Campaign</th>
              <th className="px-4 py-3 font-medium">Segment</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Audience</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40">Loading campaigns…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40">{campaigns.length === 0 ? 'No campaigns yet.' : 'No campaigns match your search.'}</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="border-b border-ink/[0.05] last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{c.name}</div>
                  {c.subject && <div className="text-xs text-ink/40">{c.subject}</div>}
                </td>
                <td className="px-4 py-3 text-ink/60">{c.segment?.name ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 tabular-nums text-ink">{c.audienceCount ?? (c.segment ? segments.find((s) => s.id === c.segment!.id)?.memberCount ?? '—' : '—')}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    {c.status === 'DRAFT' && (
                      <button onClick={() => setStatus(c.id, 'SCHEDULED')} className="inline-flex items-center gap-1 rounded border border-ink/10 px-2 py-1 text-xs text-ink/70 hover:bg-mint/30">
                        <Calendar className="h-3 w-3" /> Schedule
                      </button>
                    )}
                    {c.status !== 'SENT' && (
                      <button onClick={() => setStatus(c.id, 'SENT')} className="inline-flex items-center gap-1 rounded border border-ink/10 px-2 py-1 text-xs text-ink/70 hover:bg-mint/30">
                        <Send className="h-3 w-3" /> Send now
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function NewCampaignForm({ channel, segments, onDone }: { channel: CampaignChannel; segments: Segment[]; onDone: () => void }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name, channel, subject: subject || undefined, message, segmentId: segmentId || undefined }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not create campaign'); return }
    onDone()
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-ink">New {channel === 'EMAIL' ? 'email' : 'WhatsApp'} campaign</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Input placeholder="Campaign name" value={name} onChange={(e) => setName(e.target.value)} />
        {channel === 'EMAIL' && (
          <Input placeholder="Subject line" value={subject} onChange={(e) => setSubject(e.target.value)} className="md:col-span-2" />
        )}
        <Select
          placeholder="No segment (audience TBD)"
          options={segments.map((s) => ({ value: String(s.id), label: `${s.name} · ${s.memberCount} leads` }))}
          value={segmentId}
          onChange={(e) => setSegmentId(e.target.value)}
          className={channel === 'EMAIL' ? '' : 'md:col-span-3'}
        />
        <textarea
          placeholder={channel === 'EMAIL' ? 'Email body' : 'WhatsApp message'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="col-span-2 rounded-xl border border-ink/10 bg-brand-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 md:col-span-4"
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!name || !message || saving} loading={saving} onClick={submit}>
        Create campaign
      </Button>
    </Card>
  )
}
