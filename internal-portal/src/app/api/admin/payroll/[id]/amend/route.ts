import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/db';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

  try {
    const body = await request.json();
    const { deductions, weekday_rate, weekend_rate } = body;
    const cleanerId = params.id;

    const updates: string[] = [];
    const values: any[] = [];

    if (deductions !== undefined) {
      updates.push('deductions = ?');
      values.push(deductions);
    }
    if (weekday_rate !== undefined) {
      updates.push('weekday_rate = ?');
      values.push(weekday_rate);
    }
    if (weekend_rate !== undefined) {
      updates.push('weekend_rate = ?');
      values.push(weekend_rate);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = datetime("now")');
    values.push(cleanerId);

    await db.prepare(
      `UPDATE cleaner_profiles SET ${updates.join(', ')} WHERE user_id = ?`
    ).bind(...values).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error amending payroll:', error);
    return NextResponse.json({ error: 'Failed to amend payroll' }, { status: 500 });
  }
}
