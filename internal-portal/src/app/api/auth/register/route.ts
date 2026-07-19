export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withTracing, withSecurityHeaders } from '@/lib/middleware';

// Retired 2026-07-18: this endpoint let anyone create a fully-active staff
// account (any role, including 'admin') by POSTing client-supplied
// role/paysheetCode/department with zero admin approval - it trusted every
// field verbatim and inserted straight into `users` with a live session
// token. Account creation for Digital/Transportation staff now goes through
// /api/apply (submits a pending application) -> admin review ->
// /api/admin/new-joiners/[id]/approve (see lib/cleaner-integrations.ts,
// activateStaffAccount). Cleaners already had their own equivalent flow via
// /api/signup/cleaner. Kept as a stub (rather than deleted) so any stale
// client hitting this old path gets a clear, actionable error instead of a
// generic 404.
export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const response = NextResponse.json({
    error: 'This endpoint no longer creates accounts directly. Please apply via /auth/signup (Digital/Transportation) or /signup/cleaner (Cleaning) - an admin will review your application.',
  }, { status: 410 });
  return withSecurityHeaders(response, traceId);
}
