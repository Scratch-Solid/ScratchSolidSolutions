import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withRateLimit } from "@/lib/middleware";
import { sanitizeRequestBody } from "@/lib/sanitization";

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const contactNumber = searchParams.get("contactNumber");
  const idPassportNumber = searchParams.get("idPassportNumber");

  if (!contactNumber || !idPassportNumber) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Sanitize input
  const sanitizedContact = contactNumber.replace(/[^\d]/g, '');
  const sanitizedId = idPassportNumber.replace(/[^a-zA-Z0-9]/g, '');

  try {
    const contract = await db.prepare(
      'SELECT * FROM pending_contracts WHERE contact_number = ? AND id_passport_number = ? ORDER BY submitted_at DESC LIMIT 1'
    ).bind(sanitizedContact, sanitizedId).first();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      status: (contract as any).status,
      rejection_reason: (contract as any).rejection_reason || null
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check contract' }, { status: 500 });
  }
}
