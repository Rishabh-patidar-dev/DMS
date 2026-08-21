'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, CalendarCheck, ClipboardList } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader, StatTile, StatusBadge } from '@/components/portal/StatTile'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

type Employee = { id: number; fullName: string; employeeCode: string; department: string }
type AttendanceRecord = {
  id: number
  date: string
  status: string
  checkIn: string | null
  checkOut: string | null
  employee: { id: number; fullName: string; employeeCode: string; department: string }
}
type LeaveRequest = {
  id: number
  leaveType: string
  startDate: string
  endDate: string
  reason: string | null
  status: string
  employee: { id: number; fullName: string; employeeCode: string }
}

const ATTENDANCE_STATUSES = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'HALF_DAY', label: 'Half day' },
  { value: 'ON_LEAVE', label: 'On leave' },
  { value: 'HOLIDAY', label: 'Holiday' },
]
const LEAVE_TYPES = [
  { value: 'CASUAL', label: 'Casual' },
  { value: 'SICK', label: 'Sick' },
  { value: 'EARNED', label: 'Earned' },
  { value: 'UNPAID', label: 'Unpaid' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [date, setDate] = useState(today())
  const [loading, setLoading] = useState(true)
  const [showMark, setShowMark] = useState(false)
  const [showLeave, setShowLeave] = useState(false)

  const load = useCallback(async (d: string) => {
    setLoading(true)
    const [emp, att] = await Promise.all([
      crmFetch('/api/v1/dealer-portal/hr/employees'),
      crmFetch(`/api/v1/dealer-portal/hr/attendance?date=${d}`),
    ])
    setEmployees(emp.data.employees ?? [])
    setRecords(att.data.records ?? [])
    setLeaveRequests(att.data.leaveRequests ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load(date) }, [date, load])

  const markedIds = useMemo(() => new Set(records.map((r) => r.employee.id)), [records])
  const unmarked = useMemo(() => employees.filter((e) => !markedIds.has(e.id)), [employees, markedIds])
  const presentCount = records.filter((r) => r.status === 'PRESENT').length
  const absentCount = records.filter((r) => r.status === 'ABSENT').length
  const onLeaveCount = records.filter((r) => r.status === 'ON_LEAVE').length
  const pendingLeave = leaveRequests.filter((l) => l.status === 'PENDING')

  async function decideLeave(id: number, status: 'APPROVED' | 'REJECTED') {
    await crmFetch(`/api/v1/dealer-portal/hr/leave-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
    load(date)
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Attendance & Leave" subtitle="Daily attendance, plus leave requests awaiting your decision." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={CalendarCheck} label="Present" value={presentCount} />
        <StatTile icon={CalendarCheck} label="Absent" value={absentCount} />
        <StatTile icon={CalendarCheck} label="On leave" value={onLeaveCount} />
        <StatTile icon={ClipboardList} label="Pending leave requests" value={pendingLeave.length} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowLeave((v) => !v)}>
            <Plus className="h-4 w-4" /> Log leave request
          </Button>
          <Button size="sm" onClick={() => setShowMark((v) => !v)}>
            <Plus className="h-4 w-4" /> Mark attendance
          </Button>
        </div>
      </div>

      {showMark && (
        <MarkAttendanceForm
          employees={unmarked.length > 0 ? unmarked : employees}
          date={date}
          onDone={() => { setShowMark(false); load(date) }}
        />
      )}
      {showLeave && (
        <LeaveRequestForm employees={employees} onDone={() => { setShowLeave(false); load(date) }} />
      )}

      {pendingLeave.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-ink">Pending leave requests</h3>
          <div className="space-y-2">
            {pendingLeave.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-ink">{l.employee.fullName}</span>
                  <span className="ml-2 text-ink/50">{l.leaveType} · {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</span>
                  {l.reason && <span className="ml-2 text-ink/40">"{l.reason}"</span>}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => decideLeave(l.id, 'REJECTED')}>Reject</Button>
                  <Button size="sm" onClick={() => decideLeave(l.id, 'APPROVED')}>Approve</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-ink/[0.08] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Check-in</th>
              <th className="px-4 py-3 font-medium">Check-out</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink/40">No attendance marked for this date yet.</td></tr>
            ) : records.map((r) => (
              <tr key={r.id} className="border-b border-ink/[0.05] last:border-0">
                <td className="px-4 py-3 text-ink">{r.employee.fullName}</td>
                <td className="px-4 py-3 text-ink/70">{r.employee.department}</td>
                <td className="px-4 py-3 text-ink/70">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td className="px-4 py-3 text-ink/70">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MarkAttendanceForm({ employees, date, onDone }: { employees: Employee[]; date: string; onDone: () => void }) {
  const [employeeId, setEmployeeId] = useState('')
  const [status, setStatus] = useState('PRESENT')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/hr/attendance', {
      method: 'POST',
      body: JSON.stringify({
        employeeId, date, status,
        checkIn: checkIn ? `${date}T${checkIn}:00` : undefined,
        checkOut: checkOut ? `${date}T${checkOut}:00` : undefined,
      }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not mark attendance'); return }
    onDone()
  }

  return (
    <div className="mb-4 rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Select label="Employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} options={employees.map((e) => ({ value: String(e.id), label: e.fullName }))} placeholder="Select" required />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={ATTENDANCE_STATUSES} />
        <Input label="Check-in (optional)" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        <Input label="Check-out (optional)" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!employeeId || saving} loading={saving} onClick={submit}>
        Save attendance
      </Button>
    </div>
  )
}

function LeaveRequestForm({ employees, onDone }: { employees: Employee[]; onDone: () => void }) {
  const [employeeId, setEmployeeId] = useState('')
  const [leaveType, setLeaveType] = useState('CASUAL')
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/hr/leave-requests', {
      method: 'POST',
      body: JSON.stringify({ employeeId, leaveType, startDate, endDate, reason: reason || undefined }),
    })
    setSaving(false)
    if (!ok) { setError(data.message ?? 'Could not log leave request'); return }
    onDone()
  }

  return (
    <div className="mb-4 rounded-xl border border-ink/[0.08] bg-white p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Select label="Employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} options={employees.map((e) => ({ value: String(e.id), label: e.fullName }))} placeholder="Select" required />
        <Select label="Leave type" value={leaveType} onChange={(e) => setLeaveType(e.target.value)} options={LEAVE_TYPES} />
        <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        <Input label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
      </div>
      <div className="mt-3">
        <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <Button size="sm" className="mt-3" disabled={!employeeId || saving} loading={saving} onClick={submit}>
        Submit leave request
      </Button>
    </div>
  )
}
