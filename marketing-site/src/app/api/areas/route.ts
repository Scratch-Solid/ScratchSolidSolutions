export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withAdminOrServiceAuth, withTracing, withSecurityHeaders, withRateLimit, rateLimits } from "@/lib/middleware";
import { validateString, validateNumber } from "@/lib/validation";

// Public: used by the booking form's area dropdown - no auth required, same
// as /api/services and /api/service-pricing.
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);

  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(NextResponse.json({ error: 'Too many requests' }, { status: 429 }), traceId);
  }

  const db = await getDb();
  if (!db) return withSecurityHeaders(NextResponse.json({ areas: [] }), traceId);

  try {
    const result = await db.prepare(
      'SELECT id, name, transport_fee FROM service_areas WHERE is_active = 1 ORDER BY name'
    ).all();
    return withSecurityHeaders(NextResponse.json({ areas: result.results || [] }), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to fetch areas: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}

// Admin (direct, or internal-portal's proxy via service token) only.
export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAdminOrServiceAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as { name?: string; transport_fee?: number };
    const { name, transport_fee } = body;

    const nameValidation = validateString(name, 'name', 1, 100);
    if (!nameValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: nameValidation.errors.join(', ') }, { status: 400 }), traceId);
    }
    const feeValidation = validateNumber(transport_fee, 'transport_fee', 0);
    if (!feeValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: feeValidation.errors.join(', ') }, { status: 400 }), traceId);
    }

    const existing = await db.prepare('SELECT id FROM service_areas WHERE name = ?').bind(name).first();
    if (existing) {
      return withSecurityHeaders(NextResponse.json({ error: 'This area already exists' }, { status: 409 }), traceId);
    }

    const result = await db.prepare(
      `INSERT INTO service_areas (name, transport_fee, is_active, created_at, updated_at)
       VALUES (?, ?, 1, datetime('now'), datetime('now')) RETURNING *`
    ).bind(name, transport_fee).first();

    return withSecurityHeaders(NextResponse.json(result, { status: 201 }), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to create area: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}

export async function DELETE(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAdminOrServiceAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return withSecurityHeaders(NextResponse.json({ error: 'Area ID is required' }, { status: 400 }), traceId);
    }

    // Soft delete - existing bookings referencing this suburb by name stay
    // intact, it just stops showing up as a bookable option.
    const result = await db.prepare(
      `UPDATE service_areas SET is_active = 0, updated_at = datetime('now') WHERE id = ?`
    ).bind(parseInt(id)).run();

    if (result.meta.changes === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'Area not found' }, { status: 404 }), traceId);
    }

    return withSecurityHeaders(NextResponse.json({ success: true }), traceId);
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to remove area: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
