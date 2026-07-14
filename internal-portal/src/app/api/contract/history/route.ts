export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = await verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Get contract history for the user
    const history = await db.prepare(`
      SELECT 
        sc.id,
        sc.signed_at,
        sc.ip_address,
        sc.user_agent,
        sc.pdf_url,
        cv.version_number,
        cv.effective_date
      FROM signed_contracts sc
      JOIN contract_versions cv ON sc.contract_version_id = cv.id
      WHERE sc.user_id = ?
      ORDER BY sc.signed_at DESC
    `).bind(decoded.userId).all();

    return NextResponse.json({ history: history.results || [] });
  } catch (error) {
    console.error('Contract history error:', error);
    return NextResponse.json({ error: `Failed to get contract history: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
