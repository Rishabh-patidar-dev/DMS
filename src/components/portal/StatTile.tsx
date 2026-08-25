import { LucideIcon } from 'lucide-react'

export function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-card px-4 py-3.5">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent-tint">
        <Icon className="h-4 w-4 shrink-0 text-accent-dark" />
      </div>
      {/* min-h reserves space for 2 lines regardless of whether this
          particular label wraps — without it, a 1-line label ("Open leads")
          and a 2-line label ("Open vehicle orders") push the number below
          to two different heights, so numbers across a row of tiles don't
          line up. flex-1 + mt-auto on the number then pins it to the same
          baseline in every tile no matter the label's actual line count. */}
      <span className="min-h-[2.4em] text-[10px] font-semibold uppercase leading-tight tracking-wider text-ink/60">{label}</span>
      <p className="mt-auto pt-0.5 text-xl font-semibold text-ink">{value}</p>
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
    REQUESTED: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    APPROVED: 'bg-slate/15 text-slate',
    DISPATCHED: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
    DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    REJECTED: 'bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-300',
    CANCELLED: 'bg-ink/10 text-ink/50',
    Close: 'bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-300',
    OPEN: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
    AWAITING_PARTS: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    CLOSED: 'bg-ink/10 text-ink/50',
    SUBMITTED: 'bg-sand/15 text-sand',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    INFO_REQUESTED: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    IN_REPAIR: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
    REIMBURSED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    RECOVERY: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    DRAFT: 'bg-ink/10 text-ink/50',
    SCHEDULED: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    SENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    CONTACTED: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
    CONVERTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    LOST: 'bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-300',
    ACCEPTED: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
    ASSIGNED: 'bg-sand/15 text-sand',
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    ON_LEAVE: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    SUSPENDED: 'bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-300',
    TERMINATED: 'bg-ink/10 text-ink/50',
    PRESENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    ABSENT: 'bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-300',
    HALF_DAY: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    HOLIDAY: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    GENERATED: 'bg-slate/15 text-slate',
    PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    BOOKED: 'bg-sand/15 text-sand',
    CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
    ALLOCATED: 'bg-slate/15 text-slate',
    ISSUED: 'bg-sand/15 text-sand',
    PARTIALLY_PAID: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    VEHICLE_STOCK: 'bg-slate/15 text-slate',
    SPARE_PARTS: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
    OTHER: 'bg-ink/10 text-ink/50',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[status] ?? 'bg-ink/10 text-ink/50'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
