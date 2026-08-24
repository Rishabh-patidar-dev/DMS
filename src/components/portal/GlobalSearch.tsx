'use client'

// ============================================================================
// GlobalSearch
// ============================================================================
// The portal-wide search — every record type a dealer can see anywhere in
// DMS (inventory, stock/spare-part orders, invoices, leads, warranty claims,
// service tickets, bookings, customer bills, purchase invoices), one box,
// debounced, grouped by type, keyboard-navigable (↑/↓/Enter/Esc), opens with
// Ctrl/Cmd+K from anywhere in the portal. Most record types have no detail
// page yet — a result without its own `href` (from the API) lands on its
// list page with `?q=<number>` so that page can filter straight to it.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, ArrowRight, X } from 'lucide-react'
import { crmFetch } from '@/lib/crm/dealerAuth'

interface SearchResult {
  id: number
  title: string
  subtitle: string
  href?: string
  q?: string
}
interface SearchGroup {
  type: string
  label: string
  href: string
  results: SearchResult[]
}

function resultHref(group: SearchGroup, result: SearchResult): string {
  if (result.href) return result.href
  const q = result.q ?? result.title
  return `${group.href}?q=${encodeURIComponent(q)}`
}

export function GlobalSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const flatResults = useMemo(
    () => groups.flatMap((g) => g.results.map((r) => ({ group: g, result: r }))),
    [groups]
  )

  const runSearch = useCallback((q: string) => {
    if (q.trim().length < 2) {
      setGroups([])
      setLoading(false)
      return
    }
    setLoading(true)
    crmFetch(`/api/v1/dealer-portal/search?q=${encodeURIComponent(q.trim())}`).then(({ ok, data }) => {
      setGroups(ok ? data.groups ?? [] : [])
      setLoading(false)
    })
  }, [])

  // Debounced as-you-type search — 250ms, cancels any in-flight timer on
  // every keystroke so only the latest query's request actually fires.
  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 250)
    return () => clearTimeout(t)
  }, [query, runSearch])

  useEffect(() => { setActiveIndex(0) }, [groups])

  // Global Ctrl/Cmd+K to jump into search from anywhere in the portal, and
  // Escape to back out — the "robust, find anything" experience the search
  // is meant to deliver shouldn't require reaching for the mouse.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        requestAnimationFrame(() => inputRef.current?.focus())
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function go(group: SearchGroup, result: SearchResult) {
    router.push(resultHref(group, result))
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const picked = flatResults[activeIndex]
      if (picked) go(picked.group, picked.result)
    }
  }

  const showPanel = open && query.trim().length >= 2
  let runningIndex = -1

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full border border-ink/[0.08] bg-canvas px-4 py-2.5 transition-colors focus-within:border-accent/40 focus-within:bg-card">
        <Search className="h-4 w-4 shrink-0 text-ink/45" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search orders, invoices, leads, bills, anything…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink/45 focus:outline-none"
        />
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-ink/30" />
        ) : query ? (
          <button onClick={() => { setQuery(''); setGroups([]) }} className="shrink-0 text-ink/40 hover:text-ink/70" aria-label="Clear search">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded-md border border-ink/10 bg-card px-1.5 py-0.5 text-[10px] font-medium text-ink/45 sm:inline-block">⌘K</kbd>
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-ink/[0.08] bg-card p-2 shadow-xl">
          {loading && groups.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink/50">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : groups.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink/50">No matches for &ldquo;{query}&rdquo;.</div>
          ) : (
            groups.map((g) => (
              <div key={g.type} className="mb-1 last:mb-0">
                <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink/50">{g.label}</div>
                {g.results.map((r) => {
                  runningIndex += 1
                  const isActive = runningIndex === activeIndex
                  return (
                    <button
                      key={`${g.type}-${r.id}`}
                      onMouseEnter={() => setActiveIndex(runningIndex)}
                      onClick={() => go(g, r)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-accent-tint' : 'hover:bg-ink/[0.03]'}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{r.title}</span>
                        <span className="block truncate text-xs text-ink/45">{r.subtitle}</span>
                      </span>
                      <ArrowRight className={`h-3.5 w-3.5 shrink-0 transition-opacity ${isActive ? 'text-accent opacity-100' : 'text-ink/20 opacity-0 group-hover:opacity-100'}`} />
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
