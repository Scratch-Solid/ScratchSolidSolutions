import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cleaner_id = searchParams.get('cleaner_id');

    let query = `
      SELECT p.*, u.name as user_name, u.email as user_email
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    if (cleaner_id) {
      conditions.push('p.cleaner_id = ?');
      params.push(cleaner_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY p.created_at DESC';

    const payments = await db.prepare(query).bind(...params).all();
    return NextResponse.json(payments.results || []);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 });
  }
}
