'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader } from '@/components/portal/StatTile'
import { Button } from '@/components/ui/Button'
import { InvoiceCard } from '@/components/portal/InvoiceCard'
import type { InvoiceDoc, InvoiceType } from '@/lib/invoicePdf'

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'CONFIRMATION', label: 'Order confirmed' },
  { value: 'DISPATCH', label: 'Dispatched' },
  { value: 'DELIVERY', label: 'Delivered' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
  { value: 'CANCELLATION', label: 'Cancelled' },
  { value: 'CUSTOM', label: 'General' },
]

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { ok, data } = await crmFetch('/api/v1/dealer-portal/invoices')
    if (!ok) {
      console.error('[InvoicesPage] failed to load invoices:', data.message)
      setLoadError(data.message ?? 'Could not load invoices')
      setLoading(false)
      return
    }
    setInvoices(data.invoices ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const visible = typeFilter ? invoices.filter((i) => i.type === (typeFilter as InvoiceType)) : invoices

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Invoices" subtitle="Order confirmations, dispatch and delivery documents, out-of-stock notices, and anything else the manufacturer sends you — every one downloadable as a PDF." />

      {loadError && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              typeFilter === f.value ? 'border-stone bg-stone/10 text-ink' : 'border-ink/10 text-ink/50 hover:border-ink/20'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-ink/40"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/15 py-16 text-center text-sm text-ink/40">
          {invoices.length === 0 ? 'No invoices yet.' : 'No invoices match this filter.'}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((inv, i) => (
            <InvoiceCard key={`${inv.invoiceNumber}-${i}`} invoice={inv} />
          ))}
        </div>
      )}
    </div>
  )
}
