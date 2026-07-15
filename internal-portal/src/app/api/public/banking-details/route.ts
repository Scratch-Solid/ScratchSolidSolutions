export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders, withRateLimit } from '@/lib/middleware';

// Intentionally public, no auth - EFT payment details are meant to be given
// to anyone paying by bank transfer (same as printing them on an invoice).
// Consumed by marketing-site's /api/banking-details proxy for the EFT
// payment step.
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);

  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, traceId);

  const db = await getDb();
  if (!db) return withSecurityHeaders(NextResponse.json({ error: 'Database unavailable' }, { status: 503 }), traceId);

  try {
    const bankingDetails = await db.prepare(
      'SELECT bank_name, account_number, account_holder, branch_code, account_type FROM banking_details WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    ).first();

    return withSecurityHeaders(NextResponse.json(bankingDetails || null), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to fetch banking details: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
