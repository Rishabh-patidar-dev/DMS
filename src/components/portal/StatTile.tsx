import { LucideIcon } from 'lucide-react'

export function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink/[0.08] bg-white px-4 py-3">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-slate" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">{label}</span>
      </div>
      <p className="text-xl font-semibold text-ink">{value}</p>
    </div>
  )
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink/60">{subtitle}</p>}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    REQUESTED: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-slate/15 text-slate',
    DISPATCHED: 'bg-blue-100 text-blue-700',
    DELIVERED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-600',
    CANCELLED: 'bg-ink/10 text-ink/50',
    Close: 'bg-red-100 text-red-600',
    OPEN: 'bg-amber-100 text-amber-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    AWAITING_PARTS: 'bg-amber-100 text-amber-700',
    RESOLVED: 'bg-emerald-100 text-emerald-700',
    CLOSED: 'bg-ink/10 text-ink/50',
    SUBMITTED: 'bg-sand/15 text-sand',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700',
    INFO_REQUESTED: 'bg-amber-100 text-amber-700',
    IN_REPAIR: 'bg-blue-100 text-blue-700',
    REIMBURSED: 'bg-emerald-100 text-emerald-700',
    RECOVERY: 'bg-amber-100 text-amber-700',
    DRAFT: 'bg-ink/10 text-ink/50',
    SCHEDULED: 'bg-amber-100 text-amber-700',
    SENT: 'bg-emerald-100 text-emerald-700',
    CONTACTED: 'bg-blue-100 text-blue-700',
    CONVERTED: 'bg-emerald-100 text-emerald-700',
    LOST: 'bg-red-100 text-red-600',
    ACCEPTED: 'bg-blue-100 text-blue-700',
    ASSIGNED: 'bg-sand/15 text-sand',
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    ON_LEAVE: 'bg-amber-100 text-amber-700',
    SUSPENDED: 'bg-red-100 text-red-600',
    TERMINATED: 'bg-ink/10 text-ink/50',
    PRESENT: 'bg-emerald-100 text-emerald-700',
    ABSENT: 'bg-red-100 text-red-600',
    HALF_DAY: 'bg-amber-100 text-amber-700',
    HOLIDAY: 'bg-blue-100 text-blue-700',
    PENDING: 'bg-amber-100 text-amber-700',
    GENERATED: 'bg-slate/15 text-slate',
    PAID: 'bg-emerald-100 text-emerald-700',
    BOOKED: 'bg-sand/15 text-sand',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    ALLOCATED: 'bg-slate/15 text-slate',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[status] ?? 'bg-ink/10 text-ink/50'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
