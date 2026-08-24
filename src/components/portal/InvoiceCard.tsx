'use client'

// ============================================================================
// InvoiceCard
// ============================================================================
// The "informative card" view of an invoice — same data as the downloadable
// PDF (lib/invoicePdf.ts). Every invoice the manufacturer issues (order
// confirmation, dispatch note, delivery receipt, out-of-stock/partial notice,
// cancellation, general notice) renders as one of these on the Invoices page.
// ============================================================================
import { Download, Mail, Phone, Building2, CheckCircle2, PackageMinus, AlertTriangle, XCircle, MessageSquare, Truck, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { downloadInvoicePdf, type InvoiceDoc, type InvoiceType } from '@/lib/invoicePdf'

const TYPE_META: Record<InvoiceType, { label: string; icon: typeof CheckCircle2; className: string }> = {
  CONFIRMATION: { label: 'Order confirmed', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DISPATCH: { label: 'Order dispatched', icon: Truck, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DELIVERY: { label: 'Order delivered', icon: PackageCheck, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PARTIAL: { label: 'Partial fulfillment', icon: PackageMinus, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  OUT_OF_STOCK: { label: 'Out of stock', icon: AlertTriangle, className: 'bg-red-50 text-red-700 border-red-200' },
  CANCELLATION: { label: 'Order cancellation', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
  CUSTOM: { label: 'General notice', icon: MessageSquare, className: 'bg-slate-50 text-slate-700 border-slate-200' },
}

const PRICED_TYPES = new Set<InvoiceType>(['CONFIRMATION', 'DISPATCH', 'DELIVERY', 'PARTIAL'])
const GST_RATE = 0.18
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function InvoiceCard({ invoice }: { invoice: InvoiceDoc }) {
  const meta = TYPE_META[invoice.type]
  const Icon = meta.icon
  const priced = PRICED_TYPES.has(invoice.type)
  const qty = invoice.fulfilledQuantity ?? invoice.requestedQuantity ?? 0
  const unitPrice = Number(invoice.unitPrice ?? 0)
  const subtotal = priced ? unitPrice * qty : 0
  const gst = subtotal * GST_RATE
  const total = subtotal + gst
  const d = invoice.dealer

  return (
    <div className="overflow-hidden rounded-xl border border-ink/[0.08] bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/[0.07] bg-ink/[0.02] p-5">
        <div>
          <div className="text-lg font-semibold tracking-tight text-ink">Luxus Green Mobility</div>
          <div className="mt-0.5 text-xs text-ink/50">Electric Vehicles · Manufacturer &amp; OEM</div>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
            <Icon className="h-3 w-3" /> {meta.label}
          </span>
          <div className="mt-1.5 font-mono text-xs text-ink/50">{invoice.invoiceNumber}</div>
          <div className="text-xs text-ink/40">{new Date(invoice.issuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-ink/40">Bill to</div>
          {d ? (
            <div className="mt-1.5 space-y-0.5 text-sm text-ink">
              <div className="flex items-center gap-1.5 font-medium"><Building2 className="h-3.5 w-3.5 text-ink/40" /> {d.tradeName || d.legalName}</div>
              <div className="text-xs text-ink/50">{d.dealerCode} · {d.state}</div>
              {d.phone && <div className="flex items-center gap-1.5 text-xs text-ink/50"><Phone className="h-3 w-3" /> {d.phone}</div>}
              {d.email && <div className="flex items-center gap-1.5 text-xs text-ink/50"><Mail className="h-3 w-3" /> {d.email}</div>}
              {d.gstNumber && <div className="text-xs text-ink/50">GSTIN {d.gstNumber}</div>}
            </div>
          ) : (
            <div className="mt-1.5 text-sm text-ink/40">—</div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-ink/40">Order</div>
          <div className="mt-1.5 space-y-0.5 text-sm text-ink">
            <div>{invoice.orderKind === 'VEHICLE' ? 'Vehicle stock' : invoice.orderKind === 'SPARE_PART' ? 'Spare part' : 'General'}</div>
            {invoice.expectedRestockDate && (
              <div className="text-xs text-ink/50">
                Expected {new Date(invoice.expectedRestockDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-ink/[0.07] px-5 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink/40">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Unit price</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-ink/[0.06]">
              <td className="py-2.5 pr-2 text-ink">{invoice.item}</td>
              <td className="py-2.5 tabular-nums text-ink">
                {qty}
                {invoice.requestedQuantity != null && invoice.fulfilledQuantity != null && invoice.requestedQuantity !== invoice.fulfilledQuantity && (
                  <span className="ml-1 text-xs text-ink/40">/ {invoice.requestedQuantity}</span>
                )}
              </td>
              <td className="py-2.5 text-right tabular-nums text-ink">{priced ? inr(unitPrice) : '—'}</td>
              <td className="py-2.5 text-right tabular-nums text-ink">{priced ? inr(subtotal) : '—'}</td>
            </tr>
          </tbody>
        </table>

        {priced && (
          <div className="ml-auto mt-3 w-full max-w-[240px] space-y-1 text-sm">
            <div className="flex justify-between text-ink/50"><span>Subtotal</span><span className="tabular-nums">{inr(subtotal)}</span></div>
            <div className="flex justify-between text-ink/50"><span>CGST (9%)</span><span className="tabular-nums">{inr(gst / 2)}</span></div>
            <div className="flex justify-between text-ink/50"><span>SGST (9%)</span><span className="tabular-nums">{inr(gst / 2)}</span></div>
            <div className="flex justify-between border-t border-ink/[0.08] pt-1.5 text-base font-semibold text-stone">
              <span>Total due</span><span className="tabular-nums">{inr(total)}</span>
            </div>
          </div>
        )}

        {invoice.message && (
          <div className="mt-4 rounded-lg bg-ink/[0.03] p-3 text-sm leading-relaxed text-ink/80">{invoice.message}</div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ink/[0.07] bg-ink/[0.02] px-5 py-3">
        <span className="text-[11px] text-ink/40">Issued by the manufacturer — Luxus Green Mobility.</span>
        <Button size="sm" onClick={() => downloadInvoicePdf(invoice)}>
          <Download className="h-3.5 w-3.5" /> Download PDF
        </Button>
      </div>
    </div>
  )
}
