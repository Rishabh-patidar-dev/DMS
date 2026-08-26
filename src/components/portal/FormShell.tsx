'use client'

// ============================================================================
// FormShell — the "professional ERP" two-column form layout
// ============================================================================
// Every "New X" intake form in DMS used to be one flat card: fields, then a
// single submit button jammed underneath. That reads as a quick add-on, not
// part of an ERP. This is the same pattern real form-builder/ERP products
// use: the fields live in a main card on the left, and a live summary of
// what's being entered sits in a sticky sidebar on the right, with the
// primary action pinned there too — so the action is always in view without
// scrolling back down through the fields, and the summary doubles as a
// "does this look right" check before submitting.
//
// This is layout/chrome only — every form keeps its own field state, its
// own validation, and its own submit handler exactly as before. FormShell
// just gives them one consistent shape instead of each hand-rolling its own.
// ============================================================================
import { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export interface SummaryRow {
  label: string
  value: ReactNode
}

export function FormShell({
  title,
  description,
  children,
  summary,
  summaryTitle = 'Summary',
  tip,
  onSubmit,
  onCancel,
  submitLabel,
  submitting,
  submitDisabled,
  error,
}: {
  title: string
  description?: string
  children: ReactNode
  summary: SummaryRow[]
  summaryTitle?: string
  tip?: string
  onSubmit: () => void
  onCancel?: () => void
  submitLabel: string
  submitting?: boolean
  submitDisabled?: boolean
  error?: string | null
}) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
      <Card>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="mt-1.5 text-xs leading-relaxed text-ink/50">{description}</p>}
        <div className="mt-6 space-y-5">{children}</div>
      </Card>

      <div className="flex flex-col gap-5 lg:sticky lg:top-4">
        <Card padding="compact" className="!bg-canvas">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">{summaryTitle}</h4>
          <dl className="mt-4 space-y-3">
            {summary.map((s) => (
              <div key={s.label} className="flex items-start justify-between gap-3 text-sm">
                <dt className="shrink-0 text-ink/50">{s.label}</dt>
                <dd className="min-w-0 truncate text-right font-medium text-ink">{s.value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {tip && (
          <div className="flex items-start gap-2.5 rounded-xl bg-mint px-4 py-3.5 text-xs leading-relaxed text-slate">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{tip}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3.5 text-xs leading-relaxed text-red-600">{error}</div>
        )}

        <div className="flex flex-col gap-2.5">
          <Button onClick={onSubmit} disabled={submitDisabled || submitting} loading={submitting} fullWidth>
            {submitLabel}
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} fullWidth>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Consistent field-label styling for anything a form renders itself instead
// of via the shared Input/Select (e.g. a raw <textarea>) — matches Input.tsx.
export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-ink/70">
      {children}
      {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
    </label>
  )
}
