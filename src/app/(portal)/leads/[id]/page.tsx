'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { StatusBadge } from '@/components/portal/StatTile'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

type Remark = { id: number; remark: string; createdAt: string; user: { firstName: string; lastName: string | null } | null }
type LeadDetail = {
  id: number
  firstName: string
  lastName: string | null
  email: string
  phone: string | null
  city: string | null
  state: string | null
  source: string | null
  status: string
  createdAt: string
  remarks: Remark[]
  assignment: { id: number; status: string; assignedAt: string; outcome: string | null }
}

const NEXT_STATUS: Record<string, string[]> = {
  ASSIGNED: ['ACCEPTED'],
  ACCEPTED: ['CONTACTED', 'LOST'],
  CONTACTED: ['CONVERTED', 'LOST'],
  CONVERTED: [],
  LOST: [],
  REASSIGNED: [],
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [remark, setRemark] = useState('')
  const [posting, setPosting] = useState(false)
  const [outcome, setOutcome] = useState('')

  const load = useCallback(async () => {
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/leads/${id}`)
    if (ok) setLead(data)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const setStatus = async (status: string) => {
    await crmFetch(`/api/v1/dealer-portal/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, outcome: status === 'LOST' ? outcome || undefined : undefined }),
    })
    load()
  }

  const postRemark = async () => {
    if (!remark.trim()) return
    setPosting(true)
    await crmFetch(`/api/v1/dealer-portal/leads/${id}/remarks`, {
      method: 'POST',
      body: JSON.stringify({ remark }),
    })
    setRemark('')
    setPosting(false)
    load()
  }

  if (loading) {
    return <div className="py-20 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-ink/40" /></div>
  }
  if (!lead) {
    return <div className="py-20 text-center text-sm text-ink/50">Lead not found.</div>
  }

  const nextStatuses = NEXT_STATUS[lead.assignment.status] ?? []

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <button onClick={() => router.push('/leads')} className="mb-4 flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to leads
      </button>

      <Card className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink">{lead.firstName} {lead.lastName ?? ''}</h1>
            <p className="mt-1 text-sm text-ink/65">{lead.email}{lead.phone ? ` · ${lead.phone}` : ''}</p>
            {(lead.city || lead.state) && <p className="mt-0.5 text-xs text-ink/50">{[lead.city, lead.state].filter(Boolean).join(', ')}</p>}
          </div>
          <StatusBadge status={lead.assignment.status} />
        </div>
        <p className="mt-3 text-xs text-ink/50">Source: {(lead.source ?? 'MANUAL').replace(/_/g, ' ')} · Assigned {new Date(lead.assignment.assignedAt).toLocaleDateString()}</p>

        {nextStatuses.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/[0.07] pt-4">
            {nextStatuses.includes('LOST') && (
              <input
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Reason if marking lost…"
                className="rounded-md border border-ink/10 bg-brand-white px-3 py-1.5 text-xs text-ink"
              />
            )}
            {nextStatuses.map((s) => (
              <Button key={s} size="sm" variant={s === 'LOST' ? 'outline' : 'primary'} onClick={() => setStatus(s)}>
                Mark {s.toLowerCase()}
              </Button>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Follow-up notes</h2>
        <div className="mb-4 flex gap-2">
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && postRemark()}
            placeholder="Log a call, visit, or update…"
            className="flex-1 rounded-md border border-ink/10 bg-brand-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-slate/40"
          />
          <Button size="sm" onClick={postRemark} loading={posting} disabled={!remark.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="space-y-3">
          {lead.remarks.length === 0 ? (
            <p className="text-xs text-ink/50">No follow-up notes yet.</p>
          ) : lead.remarks.map((r) => (
            <div key={r.id} className="border-b border-ink/[0.05] pb-3 last:border-0">
              <p className="text-sm text-ink">{r.remark}</p>
              <p className="mt-1 text-[11px] text-ink/50">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
