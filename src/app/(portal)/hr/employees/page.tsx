'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, UserCog } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

type Employee = {
  id: number
  employeeCode: string
  fullName: string
  gender: string | null
  phone: string
  email: string | null
  department: string
  designation: string
  reportingManager: { id: number; fullName: string } | null
  dateOfJoining: string
  workLocation: string | null
  monthlySalary: string | null
  status: string
}

const DEPARTMENTS = ['Sales', 'Service & Workshop', 'Spare Parts', 'Finance & Accounts', 'Admin', 'HR']
const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On leave' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'TERMINATED', label: 'Terminated' },
]

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deptFilter, setDeptFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await crmFetch('/api/v1/dealer-portal/hr/employees')
    setEmployees(data.employees ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(
    () => deptFilter ? employees.filter((e) => e.department === deptFilter) : employees,
    [employees, deptFilter]
  )
  const activeCount = employees.filter((e) => e.status === 'ACTIVE').length
  const onLeaveCount = employees.filter((e) => e.status === 'ON_LEAVE').length
  const deptCount = new Set(employees.map((e) => e.department)).size

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Employees" subtitle="Your dealership's staff master — every employee, their department, and reporting line." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={UserCog} label="Total staff" value={employees.length} />
        <StatTile icon={UserCog} label="Active" value={activeCount} />
        <StatTile icon={UserCog} label="On leave" value={onLeaveCount} />
        <StatTile icon={UserCog} label="Departments" value={deptCount} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
          placeholder="All departments"
          className="w-56"
        />
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Add employee
        </Button>
      </div>

      {showForm && (
        <NewEmployeeForm
          employees={employees}
          onDone={() => { setShowForm(false); load() }}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-ink/[0.08] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Designation</th>
              <th className="px-4 py-3 font-medium">Reports to</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-ink/40">No employees on file yet.</td></tr>
            ) : filtered.map((e) => (
              <tr key={e.id} className="border-b border-ink/[0.05] last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-ink">{e.employeeCode}</td>
                <td className="px-4 py-3 text-ink">{e.fullName}</td>
                <td className="px-4 py-3 text-ink/70">{e.department}</td>
                <td className="px-4 py-3 text-ink/70">{e.designation}</td>
                <td className="px-4 py-3 text-ink/70">{e.reportingManager?.fullName ?? '—'}</td>
                <td className="px-4 py-3 text-ink/70">{e.phone}</td>
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NewEmployeeForm({ employees, onDone }: { employees: Employee[]; onDone: () => void }) {
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState(DEPARTMENTS[0])
  const [designation, setDesignation] = useState('')
  const [reportingManagerId, setReportingManagerId] = useState('')
  const [dateOfJoining, setDateOfJoining] = useState('')
  const [workLocation, setWorkLocation] = useState('')
  const [monthlySalary, setMonthlySalary] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/hr/employees', {
      method: 'POST',
      body: JSON.stringify({
        fullName, gender: gender || undefined, phone, email: email || undefined,
        department, designation, reportingManagerId: reportingManagerId || undefined,
        dateOfJoining, workLocation: workLocation || undefined,
        monthlySalary: monthlySalary || undefined,
      }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not add employee'); return }
    onDone()
  }

  const valid = fullName && phone && department && designation && dateOfJoining

  return (
    <div className="mb-4 rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Select label="Gender (optional)" value={gender} onChange={(e) => setGender(e.target.value)} options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} placeholder="Select" />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} options={DEPARTMENTS.map((d) => ({ value: d, label: d }))} required />
        <Input label="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Sales Executive" required />
        <Select
          label="Reporting manager (optional)"
          value={reportingManagerId}
          onChange={(e) => setReportingManagerId(e.target.value)}
          options={employees.map((m) => ({ value: String(m.id), label: m.fullName }))}
          placeholder="None"
        />
        <Input label="Date of joining" type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} required />
        <Input label="Work location (optional)" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} placeholder="e.g. Raipur Showroom" />
        <Input label="Monthly salary, ₹ (optional)" type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!valid || saving} loading={saving} onClick={submit}>
        Add employee
      </Button>
    </div>
  )
}
