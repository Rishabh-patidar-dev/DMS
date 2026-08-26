'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Search, RefreshCw, Landmark, IndianRupee, CheckCircle2, FileWarning, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AttachmentUpload } from '@/components/portal/AttachmentUpload'
import { FormShell } from '@/components/portal/FormShell'
import { useDeepLinkQuery } from '@/lib/useDeepLinkQuery'
import { FINANCE_LAST_SEEN_KEY } from '@/lib/financeSeen'

// ============================================================================
// Finance Management (dealer-facing) — same closed-loop shape as Order
// Management: raise a request here, staff work the pipeline in the CRM
// (NEW -> DOCS_PENDING -> SUBMITTED -> APPROVED -> DISBURSED, or REJECTED),
// every status change comes back as an email + this page's own status badge
// + an unread indicator in the sidebar.
// ============================================================================

type FinanceCase = {
  id: number
  buyerName: string
  buyerPhone: string
  vehicleModel: string | null
  loanAmount: string | null
  financierName: string | null
  status: string
  notes: string | null
  createdAt: string
}

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`

export default function FinancePage() {
  const deepLinkQ = useDeepLinkQuery()
  const [cases, setCases] = useState<FinanceCase[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState(deepLinkQ)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/finance-cases')
    if (!ok) {
      console.error('[FinancePage] failed to load finance cases:', data.message)
      setLoadError(data.message ?? 'Could not load finance cases')
      setLoading(false)
      return
    }
    setCases(data.cases ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Clears the sidebar's unread-finance badge — PortalShell re-checks the
  // count on every route change, so every pipeline move staff made up to
  // this moment no longer counts as unread.
  useEffect(() => {
    try {
      localStorage.setItem(FINANCE_LAST_SEEN_KEY, new Date().toISOString())
    } catch {
      // localStorage unavailable (private mode etc.) — the badge just
      // won't clear locally, not worth surfacing an error for.
    }
  }, [])

  const newCount = useMemo(() => cases.filter((c) => c.status === 'NEW').length, [cases])
  const docsPendingCount = useMemo(() => cases.filter((c) => c.status === 'DOCS_PENDING').length, [cases])
  const approvedCount = useMemo(() => cases.filter((c) => c.status === 'APPROVED' || c.status === 'DISBURSED').length, [cases])
  const totalLoanValue = useMemo(() => cases.reduce((sum, c) => sum + Number(c.loanAmount ?? 0), 0), [cases])

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cases
    return cases.filter((c) => c.buyerName.toLowerCase().includes(q) || c.buyerPhone.includes(q) || (c.vehicleModel ?? '').toLowerCase().includes(q))
  }, [cases, search])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Finance Management" subtitle="Request buyer financing for a sale and track it through the manufacturer's finance desk — from application to disbursal." />

      {loadError && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 !bg-red-50 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Landmark} label="Total requests" value={cases.length} />
        <StatTile icon={FileWarning} label="Docs needed" value={docsPendingCount} />
        <StatTile icon={CheckCircle2} label="Approved / disbursed" value={approvedCount} />
        <StatTile icon={IndianRupee} label="Total loan value" value={money(totalLoanValue)} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyer, phone, or vehicle model…"
            className="w-full rounded-xl border border-ink/10 bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Request financing
        </Button>
      </div>

      {showForm && (
        <div className="mb-4">
          <NewFinanceCaseForm onDone={() => { setShowForm(false); load() }} />
        </div>
      )}

      <Card padding="compact" className="overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Buyer</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Loan amount</th>
              <th className="px-4 py-3 font-medium">Financier</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : filteredCases.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40">{cases.length === 0 ? 'No finance requests raised yet.' : 'No requests match your search.'}</td></tr>
            ) : filteredCases.map((c) => (
              <Fragment key={c.id}>
                <tr className="border-b border-ink/[0.05] last:border-0">
                  <td className="px-4 py-3 text-ink">{c.buyerName}<span className="ml-1.5 text-xs text-ink/40">{c.buyerPhone}</span></td>
                  <td className="px-4 py-3 text-ink/70">{c.vehicleModel ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-ink">{c.loanAmount ? money(c.loanAmount) : '—'}</td>
                  <td className="px-4 py-3 text-ink/70">{c.financierName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={c.status} />
                      {c.status === 'DOCS_PENDING' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)} className="flex items-center gap-1 text-xs text-ink/40 hover:text-slate">
                      {expandedId === c.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} Details
                    </button>
                  </td>
                </tr>
                {expandedId === c.id && (
                  <tr className="border-b border-ink/[0.05] last:border-0">
                    <td colSpan={6} className="bg-brand-white px-4 py-4">
                      {c.status === 'DOCS_PENDING' && (
                        <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-3 text-xs text-amber-700">
                          <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>The buyer&rsquo;s KYC/income documents are needed before this can move forward — upload them below.</span>
                        </div>
                      )}
                      {c.notes && <p className="mb-3 text-xs text-ink/60">{c.notes}</p>}
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">Documents</p>
                      <AttachmentUpload kind="FINANCE_CASE" parentId={c.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function NewFinanceCaseForm({ onDone }: { onDone: () => void }) {
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/finance-cases', {
      method: 'POST',
      body: JSON.stringify({
        buyerName, buyerPhone,
        vehicleModel: vehicleModel || undefined,
        loanAmount: loanAmount || undefined,
        notes: notes || undefined,
      }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not submit request'); return }
    onDone()
  }

  const valid = !!(buyerName && buyerPhone)

  return (
    <FormShell
      title="Request buyer financing"
      description="The manufacturer's finance desk reviews this and works it through to approval and disbursal — you'll see every status change here."
      summary={[
        { label: 'Buyer', value: buyerName },
        { label: 'Phone', value: buyerPhone },
        { label: 'Vehicle model', value: vehicleModel },
        { label: 'Desired loan', value: loanAmount ? money(loanAmount) : undefined },
      ]}
      tip="Financier and final approved amount are set by the finance desk once they've reviewed the case — you'll be notified the moment it moves."
      onSubmit={submit}
      submitLabel="Submit request"
      submitting={saving}
      submitDisabled={!valid}
      error={error}
    >
      <div className="grid grid-cols-2 gap-3">
        <Input label="Buyer name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required />
        <Input label="Buyer phone" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} required />
        <Input label="Vehicle model (optional)" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
        <Input label="Desired loan amount, ₹ (optional)" type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
      </div>
      <div>
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </FormShell>
  )
}
