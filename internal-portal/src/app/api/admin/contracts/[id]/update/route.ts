import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as { weekend_rate_multiplier?: number; status?: string; end_date?: string };
    const contractId = params.id;

    // Check if contract is immutable
    const contract = await db.prepare('SELECT * FROM contracts WHERE id = ?').bind(contractId).first();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if ((contract as any).is_immutable === 1) {
      return NextResponse.json({ error: 'Cannot update immutable contract' }, { status: 403 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.weekend_rate_multiplier !== undefined) {
      updates.push('weekend_rate_multiplier = ?');
      values.push(body.weekend_rate_multiplier);
    }

    if (body.status !== undefined) {
      updates.push('status = ?');
      values.push(body.status);
    }

    if (body.end_date !== undefined) {
      updates.push('end_date = ?');
      values.push(body.end_date);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = datetime("now")');
    values.push(contractId);

    await db.prepare(
      `UPDATE contracts SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating contract:', error);
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
  }
}
