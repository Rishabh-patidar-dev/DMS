'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Paperclip, Upload, X, FileText, RefreshCw } from 'lucide-react'
import { crmFetch, CRM_API_URL } from '@/lib/crm/dealerAuth'

type AttachmentKind = 'CUSTOMER_BILL' | 'SERVICE_TICKET' | 'BOOKING' | 'WARRANTY_CLAIM' | 'FINANCE_CASE' | 'SPARE_PART_RETURN'

type Attachment = {
  id: number
  fileName: string
  fileUrl: string
  mimeType: string | null
  fileSizeBytes: number | null
  createdAt: string
}

const KIND_ROUTE: Record<AttachmentKind, string> = {
  CUSTOMER_BILL: 'customer-bills',
  SERVICE_TICKET: 'service-tickets',
  BOOKING: 'bookings',
  WARRANTY_CLAIM: 'warranty-claims',
  FINANCE_CASE: 'finance-cases',
  SPARE_PART_RETURN: 'spare-part-returns',
}

function resolveUrl(fileUrl: string) {
  return fileUrl.startsWith('http') ? fileUrl : `${CRM_API_URL}${fileUrl}`
}

function formatSize(bytes: number | null) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentUpload({ kind, parentId }: { kind: AttachmentKind; parentId: number }) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const route = KIND_ROUTE[kind]

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { ok, data } = await crmFetch(`/api/v1/dealer-portal/${route}/${parentId}/attachments`)
    if (!ok) {
      console.error('[AttachmentUpload] failed to load attachments:', data.message)
      setLoadError(data.message ?? 'Could not load attachments')
      setLoading(false)
      return
    }
    setAttachments(data.attachments ?? [])
    setLoading(false)
  }, [route, parentId])

  useEffect(() => { load() }, [load])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      const { ok, data } = await crmFetch(`/api/v1/dealer-portal/${route}/${parentId}/attachments`, {
        method: 'POST',
        body: formData,
      })
      if (!ok) { setError(data.message ?? `Could not upload ${file.name}`); break }
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
    load()
  }

  async function remove(id: number) {
    await crmFetch(`/api/v1/dealer-portal/attachments/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="rounded-lg border border-ink/[0.08] bg-brand-white p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
        <Paperclip className="h-3.5 w-3.5" /> Attachments
      </div>

      {loading ? (
        <div className="py-3 text-center text-ink/30"><Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /></div>
      ) : loadError ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
          <span>{loadError}</span>
          <button onClick={load} className="inline-flex shrink-0 items-center gap-1 rounded border border-red-200 bg-card px-2 py-0.5 font-medium text-red-700 hover:bg-red-100">
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      ) : attachments.length === 0 ? (
        <p className="mb-2 text-xs text-ink/40">No files attached yet.</p>
      ) : (
        <div className="mb-2 space-y-1.5">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md bg-card px-2.5 py-1.5 text-sm">
              <a href={resolveUrl(a.fileUrl)} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1.5 text-ink/80 hover:text-slate">
                <FileText className="h-3.5 w-3.5 shrink-0 text-ink/30" />
                <span className="truncate">{a.fileName}</span>
                {a.fileSizeBytes != null && <span className="shrink-0 text-xs text-ink/30">{formatSize(a.fileSizeBytes)}</span>}
              </a>
              <button onClick={() => remove(a.id)} className="shrink-0 text-ink/30 hover:text-red-500" aria-label="Remove attachment">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-ink/15 py-2 text-xs font-medium text-ink/50 hover:border-slate/40 hover:text-slate">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? 'Uploading…' : 'Upload PDF, JPG, XLS…'}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.csv"
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}
