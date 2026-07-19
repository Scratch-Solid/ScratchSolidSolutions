/**
 * Single source of truth for "which dashboard does this role own." Used by
 * the root page redirect, the login redirect, and useRequireRole's
 * misrouted-user fallback - these previously each hardcoded their own copy
 * of this mapping and disagreed (e.g. two different fallback routes for the
 * same role, and a 'supervisor' key that no role value ever actually holds -
 * the real role is 'staff').
 *
 * Deliberately excludes 'cleaner' (gated by a training/consent check that
 * needs a live API call, handled separately by each caller) and
 * 'client'/'business' (routed to an external site via env var, not a page
 * in this app).
 */
export const OWN_DASHBOARD: Record<string, string> = {
  admin: '/admin-dashboard',
  staff: '/supervisor-dashboard',
  digital: '/digital-dashboard',
  transport: '/transport-dashboard',
};
