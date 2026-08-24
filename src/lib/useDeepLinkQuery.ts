'use client'

import { useState } from 'react'

// Reads `?q=` once on mount and returns it as the initial value for a page's
// own search state — how a GlobalSearch result (which lands on a list page
// as `{page}?q=<number>`, since most record types have no detail page of
// their own) actually finds its way to the matching row. Read via
// `window.location.search` rather than `useSearchParams()` so pages don't
// need a <Suspense> boundary just to consume this one param (same choice
// already made in EV-CRM-'s order-management page for the same reason).
export function useDeepLinkQuery(): string {
  const [initial] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('q') ?? ''
  })
  return initial
}
