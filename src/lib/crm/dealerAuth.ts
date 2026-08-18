// Client-side helper for the DMS portal — every call goes straight to the
// CRM's own API, browser to server, credentials included so the CRM's
// dealer_session cookie rides along. Same cookie the Ev Landing onboarding
// dashboard uses, so a dealer signed in there is already signed in here.
//
// Strip a trailing slash defensively — a NEXT_PUBLIC_CRM_API_URL like
// "https://host.com/" plus a path like "/api/v1/..." produces a double
// slash, which most routers 404 on. Better to normalize here than rely on
// every env var everywhere being entered exactly right.
export const CRM_API_URL = (process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:4000').replace(/\/+$/, '')

export async function crmFetch(path: string, init?: RequestInit) {
  try {
    const res = await fetch(`${CRM_API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: { ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  } catch {
    // fetch() throws (not a rejected-with-response) on network failure or a
    // CORS-blocked response — the browser gives no detail either way. Surface
    // it as a clean failed result instead of an unhandled rejection, so
    // callers can show a real error instead of hanging on a loading spinner
    // forever.
    return { ok: false, status: 0, data: { message: "Can't reach the server. Check your connection and try again." } }
  }
}
