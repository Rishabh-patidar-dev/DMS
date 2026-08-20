'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, FileText, Printer, CheckCircle2, AlertTriangle, PackageMinus, XCircle, MessageSquare } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'
import { PageHeader } from '@/components/portal/StatTile'

type Invoice = {
  id: number
  invoiceNumber: string
  type: 'CONFIRMATION' | 'OUT_OF_STOCK' | 'PARTIAL' | 'CANCELLATION' | 'CUSTOM'
  item: string
  requestedQuantity: number | null
  fulfilledQuantity: number | null
  expectedRestockDate: string | null
  message: string | null
  issuedAt: string
}

const TYPE_META: Record<Invoice['type'], { label: string; icon: typeof FileText; className: string }> = {
  CONFIRMATION: { label: 'Order confirmed', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PARTIAL: { label: 'Partial fulfillment', icon: PackageMinus, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  OUT_OF_STOCK: { label: 'Out of stock', icon: AlertTriangle, className: 'bg-red-50 text-red-700 border-red-200' },
  CANCELLATION: { label: 'Order cancellation', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
  CUSTOM: { label: 'General notice', icon: MessageSquare, className: 'bg-slate-50 text-slate-700 border-slate-200' },
}

function printInvoice(inv: Invoice) {
  const w = window.open('', '_blank', 'width=640,height=760')
  if (!w) return
  const meta = TYPE_META[inv.type]
  const restock = inv.expectedRestockDate
    ? new Date(inv.expectedRestockDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null
  w.document.write(`<!doctype html><html><head><title>${inv.invoiceNumber}</title>
    <style>
      body{font-family:ui-sans-serif,system-ui,sans-serif;color:#1c1c1a;padding:40px;max-width:560px;margin:0 auto}
      h1{font-size:18px;margin:0 0 4px}
      .muted{color:#6b6a63;font-size:12px}
      table{width:100%;border-collapse:collapse;margin-top:24px}
      td{padding:8px 0;border-bottom:1px solid #eceae4;font-size:13px}
      td:first-child{color:#6b6a63;width:45%}
      .msg{margin-top:20px;padding:14px;background:#f4f3ee;border-radius:8px;font-size:13px;line-height:1.5}
      .foot{margin-top:32px;font-size:11px;color:#9a988f}
    </style></head><body>
    <h1>${meta.label}</h1>
    <div class="muted">${inv.invoiceNumber} · issued ${new Date(inv.issuedAt).toLocaleDateString()}</div>
    <table>
      <tr><td>Subject</td><td>${inv.item}</td></tr>
      ${inv.requestedQuantity != null ? `<tr><td>Requested quantity</td><td>${inv.requestedQuantity}</td></tr>` : ''}
      ${inv.fulfilledQuantity != null ? `<tr><td>${inv.type === 'CONFIRMATION' ? 'Confirmed quantity' : 'Fulfilled now'}</td><td>${inv.fulfilledQuantity}</td></tr>` : ''}
      ${restock ? `<tr><td>Expected date</td><td>${restock}</td></tr>` : ''}
    </table>
    ${inv.message ? `<div class="msg">${inv.message}</div>` : ''}
    <div class="foot">Issued by Order Management — Luxus Green Mobility.</div>
    <script>window.onload = () => window.print()</script>
    </body></html>`)
  w.document.close()
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await crmFetch('/api/v1/dealer-portal/invoices')
    setInvoices(data.invoices ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader title="Invoices" subtitle="Order confirmations, out-of-stock notices, partial-fulfillment offers, and any other document the manufacturer sends you." />

      <div className="overflow-hidden rounded-xl border border-ink/[0.08] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.07] text-left text-ink/50">
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Issued</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/40">No invoices yet.</td></tr>
            ) : invoices.map((inv) => {
              const meta = TYPE_META[inv.type]
              const Icon = meta.icon
              return (
                <tr key={inv.id} className="border-b border-ink/[0.05] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-ink">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink">{inv.item}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {inv.requestedQuantity != null || inv.fulfilledQuantity != null ? `${inv.fulfilledQuantity ?? '—'} / ${inv.requestedQuantity ?? '—'}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-ink/50">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => printInvoice(inv)} className="inline-flex items-center gap-1 rounded-md border border-ink/15 bg-white px-2 py-1 text-[11px] font-medium text-ink/70 hover:bg-ink/5">
                      <Printer className="h-3 w-3" /> Print
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
