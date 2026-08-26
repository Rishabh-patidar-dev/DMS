'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Search, CheckCircle2, XCircle, RefreshCw, ClipboardList, Clock, Wallet, ChevronDown, ChevronUp } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AttachmentUpload } from '@/components/portal/AttachmentUpload'
import { FormShell, FieldLabel } from '@/components/portal/FormShell'
import { useDeepLinkQuery } from '@/lib/useDeepLinkQuery'
import { WARRANTY_LAST_SEEN_KEY } from '@/lib/warrantySeen'

type Claim = {
  id: number
  claimNumber: string
  customerName: string
  issueDescription: string
  status: string
  submittedAt: string
  componentUnit: { serialNumber: string; componentType: string } | null
  vehicleUnit: { vin: string; model: string } | null
  supplierRecovery: { status: string } | null
}

type ClaimEvent = {
  id: number
  fromStatus: string | null
  toStatus: string
  note: string | null
  createdAt: string
}

type ClaimDetail = Claim & {
  approvedAmount: string | number | null
  rejectionReason: string | null
  adjudicationNotes: string | null
  voidReason: string | null
  events: ClaimEvent[]
}

const CHARGER_TYPES = ['AC Type 2', 'DC CCS2', 'DC CHAdeMO', 'Manufacturer OEM charger', 'Other']

const UNDER_REVIEW_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED']
const APPROVED_STATUSES = ['APPROVED', 'IN_REPAIR']

export default function WarrantyPage() {
  const deepLinkQ = useDeepLinkQuery()
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState(deepLinkQ)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/warranty-claims')
    if (!ok) {
      console.error('[WarrantyPage] failed to load claims:', data.message)
      setLoadError(data.message ?? 'Could not load warranty claims')
      setLoading(false)
      return
    }
    setClaims(data.claims ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Clears the sidebar's unread-warranty badge — PortalShell re-checks the
  // count on every route change, so the next time it does, every status
  // change staff made up to this moment no longer counts as unread.
  useEffect(() => {
    try {
      localStorage.setItem(WARRANTY_LAST_SEEN_KEY, new Date().toISOString())
    } catch {
      // localStorage unavailable (private mode etc.) — the badge just
      // won't clear locally, not worth surfacing an error for.
    }
  }, [])

  const underReviewCount = useMemo(() => claims.filter((c) => UNDER_REVIEW_STATUSES.includes(c.status)).length, [claims])
  const approvedCount = useMemo(() => claims.filter((c) => APPROVED_STATUSES.includes(c.status)).length, [claims])
  const reimbursedCount = useMemo(() => claims.filter((c) => c.status === 'REIMBURSED').length, [claims])

  const filteredClaims = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return claims
    return claims.filter((c) =>
      c.claimNumber.toLowerCase().includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      (c.vehicleUnit?.vin ?? '').toLowerCase().includes(q)
    )
  }, [claims, search])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Warranty Claims" subtitle="Check coverage on a VIN and raise a claim — it's adjudicated automatically and lands in the manufacturer's Claims & Coverage queue." />

      {loadError && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 !bg-red-50 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={ClipboardList} label="Total claims" value={claims.length} />
        <StatTile icon={Clock} label="Under review" value={underReviewCount} />
        <StatTile icon={CheckCircle2} label="Approved" value={approvedCount} />
        <StatTile icon={Wallet} label="Reimbursed" value={reimbursedCount} />
      </div>

      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Raise a claim
        </Button>
      </div>

      {showForm && (
        <div className="mb-4">
          <NewClaimForm onDone={() => { setShowForm(false); load() }} />
        </div>
      )}

      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search claim #, customer, or VIN…"
          className="w-full max-w-sm rounded-xl border border-ink/10 bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <Card padding="compact" className="overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Claim</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Component</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : filteredClaims.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40">{claims.length === 0 ? 'No warranty claims raised yet.' : 'No claims match your search.'}</td></tr>
            ) : filteredClaims.map((c) => (
              <Fragment key={c.id}>
                <tr className="border-b border-ink/[0.05] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-ink">{c.claimNumber}</td>
                  <td className="px-4 py-3 text-ink/70">{c.vehicleUnit ? `${c.vehicleUnit.model} · ${c.vehicleUnit.vin}` : '—'}</td>
                  <td className="px-4 py-3 text-ink/70">{c.componentUnit?.componentType ?? '—'}</td>
                  <td className="px-4 py-3 text-ink">{c.customerName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={c.status} />
                      {c.supplierRecovery && <span className="text-[10px] font-medium uppercase text-ink/40">Recovery: {c.supplierRecovery.status}</span>}
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
                      <ClaimDetailPanel claimId={c.id} />
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

const EVENT_LABEL = (s: string | null) => s ? s.replace(/_/g, ' ') : 'Submitted'

function ClaimDetailPanel({ claimId }: { claimId: number }) {
  const [detail, setDetail] = useState<ClaimDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    crmFetch(`/api/v1/dealer-portal/warranty-claims/${claimId}`).then(({ ok, data }) => {
      if (!active) return
      if (!ok) { setError(data.message ?? 'Could not load claim detail'); setLoading(false); return }
      setDetail(data)
      setLoading(false)
    })
    return () => { active = false }
  }, [claimId])

  if (loading) return <div className="flex justify-center py-6 text-ink/40"><Loader2 className="h-4 w-4 animate-spin" /></div>
  if (error || !detail) return <p className="text-xs text-red-500">{error ?? 'Could not load claim detail'}</p>

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Claim details</p>
        <dl className="space-y-1.5 text-sm">
          {detail.approvedAmount != null && (
            <div className="flex justify-between"><dt className="text-ink/50">Approved amount</dt><dd className="font-medium text-ink">₹{Number(detail.approvedAmount).toLocaleString('en-IN')}</dd></div>
          )}
          {detail.rejectionReason && (
            <div><dt className="text-ink/50">Rejection reason</dt><dd className="mt-0.5 rounded-lg bg-red-50 px-3 py-2 text-red-700">{detail.rejectionReason}</dd></div>
          )}
          {detail.adjudicationNotes && (
            <div><dt className="text-ink/50">Adjudication notes</dt><dd className="mt-0.5 text-ink/70">{detail.adjudicationNotes}</dd></div>
          )}
          {detail.supplierRecovery && (
            <div className="flex justify-between"><dt className="text-ink/50">Supplier recovery</dt><dd className="font-medium text-ink">{detail.supplierRecovery.status}</dd></div>
          )}
        </dl>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-ink/40">Attachments</p>
        <AttachmentUpload kind="WARRANTY_CLAIM" parentId={claimId} />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Timeline</p>
        <ol className="space-y-3">
          {detail.events.map((e) => (
            <li key={e.id} className="flex gap-3 text-sm">
              <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <div>
                <p className="text-ink">{EVENT_LABEL(e.fromStatus)} → <span className="font-medium">{EVENT_LABEL(e.toStatus)}</span></p>
                {e.note && <p className="mt-0.5 text-xs text-ink/60">{e.note}</p>}
                <p className="mt-0.5 text-[11px] text-ink/40">{new Date(e.createdAt).toLocaleString()}</p>
              </div>
            </li>
          ))}
        </ol>
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
  const [measuredSohPct, setMeasuredSohPct] = useState('')
  const [chargerType, setChargerType] = useState('')
  const [serviceRecordsComplete, setServiceRecordsComplete] = useState(true)
  const [claimAmount, setClaimAmount] = useState('')
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
        measuredSohPct: measuredSohPct ? Number(measuredSohPct) : undefined,
        chargerType: chargerType || undefined,
        serviceRecordsComplete,
        claimAmount: claimAmount ? Number(claimAmount) : undefined,
      }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not submit claim'); return }
    setResult(data)
  }

  if (result) {
    return (
      <Card className="!bg-slate/5 text-sm">
        <p className="font-medium text-ink">Claim {result.claimNumber} submitted — auto-adjudicated to <b>{result.status.replace(/_/g, ' ')}</b>.</p>
        <p className="mt-1 text-xs text-ink/60">{result.adjudication?.reasons?.join(' ')}</p>
        <button onClick={onDone} className="mt-3 rounded-md border border-ink/10 px-3 py-1.5 text-xs text-ink/70 hover:bg-sand/10">Done</button>
      </Card>
    )
  }

  const selectedComponent = coverage?.components?.find((c: any) => String(c.id) === componentUnitId)
  const valid = !!(customerName && issueDescription)

  return (
    <FormShell
      title="Raise a warranty claim"
      description="Check coverage on a VIN, then log the issue — the claim is auto-adjudicated the moment you submit."
      summary={[
        { label: 'VIN', value: coverage?.vehicle?.vin ?? (vin || undefined) },
        { label: 'Component', value: selectedComponent?.componentType },
        { label: 'Customer', value: customerName },
        { label: 'Odometer', value: odometerReading ? `${odometerReading} km` : undefined },
        { label: 'Claim amount', value: claimAmount ? `₹${Number(claimAmount).toLocaleString('en-IN')}` : undefined },
      ]}
      tip="Coverage is checked automatically and the claim is auto-adjudicated the instant you submit — there's no separate manual review step here."
      onSubmit={submit}
      submitLabel="Submit claim (auto-adjudicated)"
      submitting={saving}
      submitDisabled={!valid}
      error={error}
    >
      <div className="flex gap-2">
        <Input placeholder="Enter the vehicle's VIN…" value={vin} onChange={(e) => setVin(e.target.value)} prefix={<Search className="h-4 w-4" />} />
        <Button size="sm" onClick={checkCoverage} loading={checking}>Check coverage</Button>
      </div>

      {coverageError && <p className="text-xs text-red-500">{coverageError}</p>}

      {coverage && (
        <div className="space-y-2">
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
      <div>
        <FieldLabel>Issue description</FieldLabel>
        <textarea
          id="issueDescription"
          value={issueDescription}
          onChange={(e) => setIssueDescription(e.target.value)}
          rows={2}
          placeholder="What's the reported issue?"
          className="w-full rounded-xl border-2 border-transparent bg-sand/[0.07] px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 focus:border-accent focus:bg-white focus:outline-none"
        />
      </div>

      {/* Same adjudication evidence fields the manufacturer's own claim-intake
          form asks for — a battery claim raised without these can never
          auto-approve or auto-void, it always lands in manual review
          regardless of how clean-cut it actually is. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Input label="Measured SoH % (battery claims)" type="number" min={0} max={100} value={measuredSohPct} onChange={(e) => setMeasuredSohPct(e.target.value)} />
        <Select label="Charger type (charger claims)" placeholder="Not applicable" options={CHARGER_TYPES.map((c) => ({ value: c, label: c }))} value={chargerType} onChange={(e) => setChargerType(e.target.value)} />
        <Input label="Claim amount, ₹ (optional)" type="number" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} />
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input type="checkbox" checked={serviceRecordsComplete} onChange={(e) => setServiceRecordsComplete(e.target.checked)} className="h-4 w-4 rounded border-ink/20" />
            Service records complete
          </label>
        </div>
      </div>
    </FormShell>
  )
}
