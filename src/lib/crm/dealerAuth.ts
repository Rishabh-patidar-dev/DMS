// Client-side helper for the DMS portal — every call goes straight to the
// CRM's own API, browser to server. Same session mechanism the Ev Landing
// onboarding dashboard uses, so a dealer signed in there is already signed
// in here — but note DMS has its OWN localStorage (different origin), so a
// dealer still needs to log in once on each app to get its own token.
//
// Strip a trailing slash defensively — a NEXT_PUBLIC_CRM_API_URL like
// "https://host.com/" plus a path like "/api/v1/..." produces a double
// slash, which most routers 404 on. Better to normalize here than rely on
// every env var everywhere being entered exactly right.
export const CRM_API_URL = (process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:4000').replace(/\/+$/, '')

// The dealer_session cookie is still sent (credentials: 'include') for
// browsers where it works, but it's a cross-site cookie by construction —
// this app and the API are on two different deployed domains. Modern
// browsers increasingly block that kind of cookie by default, which shows
// up as: login succeeds, then the very next request looks signed-out. The
// token below is the real, unblockable session carrier — stored after
// login, sent as an Authorization header on every call.
const TOKEN_KEY = 'dealer_token'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // localStorage unavailable (private mode etc.) — session then relies
    // solely on the cookie, same as before this fix existed.
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // nothing to do — see storeToken
  }
}

// A request that never settles leaves its panel spinning for the rest of the
// session with no error and no way for the dealer to tell it apart from slow
// data. fetch() has no built-in timeout, so this supplies one.
const REQUEST_TIMEOUT_MS = 30_000

// Uploads and OCR previews legitimately take much longer than a JSON call —
// timing those out at 30s would break a feature that is merely slow.
const UPLOAD_TIMEOUT_MS = 120_000

let redirectingToLogin = false

/**
 * Sends the dealer to the login screen after their session lapses.
 *
 * The dealer_session JWT lasts 30 days, so this is uncommon — but when it does
 * happen, every panel on the page fails at once with no explanation. Clearing
 * the dead token and bouncing to /login is the only recoverable outcome.
 */
function handleExpiredSession() {
  if (typeof window === 'undefined' || redirectingToLogin) return
  if (window.location.pathname.startsWith('/login')) return
  redirectingToLogin = true
  clearStoredToken()
  const next = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.href = `/login?next=${next}`
}

export async function crmFetch(path: string, init?: RequestInit) {
  const isUpload = init?.body instanceof FormData
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), isUpload ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS)

  try {
    const token = getStoredToken()
    const res = await fetch(`${CRM_API_URL}${path}`, {
      ...init,
      credentials: 'include',
      signal: init?.signal ?? controller.signal,
      headers: {
        ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
    const data = await res.json().catch(() => ({}))

    if (res.status === 401) handleExpiredSession()

    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    // fetch() throws (not a rejected-with-response) on network failure, a
    // CORS-blocked response, or an abort — the browser gives no detail either
    // way. Surface it as a clean failed result instead of an unhandled
    // rejection, so callers can show a real error instead of hanging on a
    // loading spinner forever.
    const timedOut = err instanceof DOMException && err.name === 'AbortError'
    return {
      ok: false,
      status: 0,
      data: {
        message: timedOut
          ? 'That took too long and was cancelled. Please try again.'
          : "Can't reach the server. Check your connection and try again.",
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}
