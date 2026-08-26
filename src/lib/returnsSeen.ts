// Shared localStorage key for the Spare Parts page's quality-returns
// "unread" badge (components/portal/PortalShell.tsx) and the page itself,
// which clears it on mount. Same pattern as warrantySeen.ts's
// WARRANTY_LAST_SEEN_KEY.
export const RETURNS_LAST_SEEN_KEY = "returns:lastSeenAt";
