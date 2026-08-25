// Shared localStorage key for the Invoices sidebar "unread" badge
// (components/portal/PortalShell.tsx) and the page that clears it
// (app/(portal)/invoices/page.tsx). No schema field, no per-dealer-user
// server tracking — a single-shared-browser "have I opened the Invoices
// list since this invoice was issued" marker, same pattern the CRM sidebar
// already uses for its own "new DMS order" indicator.
export const INVOICE_LAST_SEEN_KEY = "invoices:lastSeenAt";
