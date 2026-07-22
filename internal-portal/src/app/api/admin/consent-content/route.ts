export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withSecurityHeaders, withTracing } from '@/lib/middleware';

// GET-only: read access for the background-check consent form text, so a
// cleaner can review it during onboarding (see cleaner-pre-dashboard/page.tsx).
// No POST/PUT here - unlike contract-content/route.ts, whose admin-editing
// handlers reference field names that don't match the live contract_content
// schema (a separate, pre-existing bug out of scope for this route).
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  const db = await getDb();
  if (!db) {
    return withSecurityHeaders(NextResponse.json({ error: 'Database unavailable' }, { status: 503 }), traceId);
  }

  try {
    const consentContent = await db.prepare(
      `SELECT * FROM consent_form_content WHERE form_type = ? AND is_active = 1 ORDER BY version DESC LIMIT 1`
    ).bind('background_check').first();
    return withSecurityHeaders(NextResponse.json(consentContent || null), traceId);
  } catch (error) {
    console.error('Error fetching consent content:', error);
    return withSecurityHeaders(NextResponse.json({ error: `Failed to fetch consent content: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }), traceId);
  }
}
