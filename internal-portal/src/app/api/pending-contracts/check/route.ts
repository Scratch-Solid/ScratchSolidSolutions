import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
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

  try {
    const contract = await db.prepare(
      'SELECT * FROM pending_contracts WHERE contact_number = ? AND id_passport_number = ? ORDER BY submitted_at DESC LIMIT 1'
    ).bind(contactNumber, idPassportNumber).first();

    if (!contract) {
      return NextResponse.json({ status: 'not_found' });
    }

    return NextResponse.json({ status: (contract as any).status });
  } catch (error) {
    console.error('Error checking contract:', error);
    return NextResponse.json({ error: 'Error checking contract' }, { status: 500 });
  }
}
