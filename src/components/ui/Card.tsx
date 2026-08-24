import { ReactNode } from 'react'

// One canonical card — replaces the `rounded-xl border border-ink/[0.08]
// bg-white p-4` block hand-typed on every list page (error banners, inline
// "New X" forms, table wrappers, list-item cards). `default` matches the
// redesign's section-card padding; `compact` matches nested sub-panels
// (per-row expandable detail, parts panels) one step down in scale.
export function Card({
  children,
  padding = 'default',
  className = '',
}: {
  children: ReactNode
  padding?: 'default' | 'compact'
  className?: string
}) {
  return (
    <div className={`rounded-2xl bg-card ${padding === 'compact' ? 'p-3.5' : 'p-5'} ${className}`}>
      {children}
    </div>
  )
}
