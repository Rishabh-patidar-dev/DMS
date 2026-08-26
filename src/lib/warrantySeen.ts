// Shared localStorage key for the Warranty Management sidebar "unread"
// badge (components/portal/PortalShell.tsx) and the page that clears it
// (app/(portal)/warranty/page.tsx). Same pattern as invoicesSeen.ts's
// INVOICE_LAST_SEEN_KEY — no schema field, no per-dealer-user server
// tracking, a single-shared-browser "have I opened Warranty since staff
// last acted on one of my claims" marker.
export const WARRANTY_LAST_SEEN_KEY = "warranty:lastSeenAt";
