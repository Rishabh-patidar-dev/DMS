'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Wallet, IndianRupee } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type Payslip = {
  id: number
  periodMonth: number
  periodYear: number
  basicPay: string
  allowances: string
  deductions: string
  daysPresent: number
  daysOnLeave: number
  netPay: string
  status: string
  employee: { id: number; fullName: string; employeeCode: string; department: string }
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function currentPeriod() {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export default function PayrollPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [{ month, year }, setPeriod] = useState(currentPeriod())
  const [generating, setGenerating] = useState(false)
  const [allowances, setAllowances] = useState('')
  const [deductions, setDeductions] = useState('')
  const [skipped, setSkipped] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (m: number, y: number) => {
    setLoading(true)
    const { data } = await crmFetch(`/api/v1/dealer-portal/hr/payroll?month=${m}&year=${y}`)
    setPayslips(data.payslips ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load(month, year) }, [month, year, load])

  const totalNet = payslips.reduce((sum, p) => sum + Number(p.netPay), 0)
  const paidCount = payslips.filter((p) => p.status === 'PAID').length

  async function generate() {
    setGenerating(true)
    setError(null)
    setSkipped([])
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/hr/payroll/generate', {
      method: 'POST',
      body: JSON.stringify({ month, year, allowances: allowances || undefined, deductions: deductions || undefined }),
    })
    setGenerating(false)
    if (!ok) { setError(data.message ?? 'Could not generate payroll'); return }
    setSkipped(data.skipped ?? [])
    load(month, year)
  }

  async function markPaid(id: number) {
    await crmFetch(`/api/v1/dealer-portal/hr/payroll/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'PAID' }) })
    load(month, year)
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Payroll" subtitle="Payslips computed from actual attendance for the selected month — no attendance, no payslip." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Wallet} label="Payslips this period" value={payslips.length} />
        <StatTile icon={Wallet} label="Paid" value={paidCount} />
        <StatTile icon={IndianRupee} label="Total net pay" value={`₹${totalNet.toLocaleString('en-IN')}`} />
        <StatTile icon={Wallet} label="Period" value={`${MONTH_NAMES[month]} ${year}`} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-ink/[0.08] bg-white p-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink/80">Month</label>
          <select value={month} onChange={(e) => setPeriod({ month: Number(e.target.value), year })} className="rounded-md border border-ink/10 bg-brand-white px-3 py-2.5 text-sm text-ink">
            {MONTH_NAMES.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink/80">Year</label>
          <select value={year} onChange={(e) => setPeriod({ month, year: Number(e.target.value) })} className="rounded-md border border-ink/10 bg-brand-white px-3 py-2.5 text-sm text-ink">
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <Input label="Allowances, ₹ (optional, applied to all)" type="number" value={allowances} onChange={(e) => setAllowances(e.target.value)} className="w-56" />
        <Input label="Deductions, ₹ (optional, applied to all)" type="number" value={deductions} onChange={(e) => setDeductions(e.target.value)} className="w-56" />
        <Button size="sm" onClick={generate} loading={generating} disabled={generating}>
          Generate payroll
        </Button>
      </div>

      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      {skipped.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
          <p className="mb-1 font-semibold">Skipped (needs attention before payroll can run for them):</p>
          <ul className="list-inside list-disc space-y-0.5">
            {skipped.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-ink/[0.08] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Days present</th>
              <th className="px-4 py-3 font-medium">Days on leave</th>
              <th className="px-4 py-3 font-medium">Basic</th>
              <th className="px-4 py-3 font-medium">Allowances</th>
              <th className="px-4 py-3 font-medium">Deductions</th>
              <th className="px-4 py-3 font-medium">Net pay</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : payslips.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-ink/40">No payslips generated for this period yet.</td></tr>
            ) : payslips.map((p) => (
              <tr key={p.id} className="border-b border-ink/[0.05] last:border-0">
                <td className="px-4 py-3 text-ink">{p.employee.fullName}</td>
                <td className="px-4 py-3 tabular-nums text-ink/70">{p.daysPresent}</td>
                <td className="px-4 py-3 tabular-nums text-ink/70">{p.daysOnLeave}</td>
                <td className="px-4 py-3 tabular-nums text-ink/70">₹{Number(p.basicPay).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 tabular-nums text-ink/70">₹{Number(p.allowances).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 tabular-nums text-ink/70">₹{Number(p.deductions).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 font-semibold tabular-nums text-ink">₹{Number(p.netPay).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3">
                  {p.status !== 'PAID' && (
                    <button onClick={() => markPaid(p.id)} className="text-xs font-medium text-slate hover:underline">Mark paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
