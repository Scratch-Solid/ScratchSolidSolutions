import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

export async function GET(request: NextRequest) {
  const db = getDb(request);
  if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = `
      SELECT u.*, bp.company_name, bp.registration_number, bp.vat_number, bp.business_address, bp.contact_person
      FROM users u
      LEFT JOIN business_profiles bp ON u.id = bp.user_id
      WHERE u.role = 'business'
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND u.deleted = ?';
      params.push(status === 'active' ? 0 : 1);
    }

    query += ' ORDER BY u.created_at DESC';

    const businesses = await db.prepare(query).bind(...params).all();
    return NextResponse.json(businesses.results || []);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
  }
}
