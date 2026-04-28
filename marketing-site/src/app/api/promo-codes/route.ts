import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

// Public GET: validate a single code OR list all (admin)
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (code) {
      // Public: validate a specific promo code
      const promo = await db.prepare(
        `SELECT * FROM promo_codes WHERE UPPER(code) = UPPER(?) AND active = 1`
      ).bind(code.trim()).first();

      if (!promo) {
        return NextResponse.json({ valid: false, error: 'Invalid or inactive promo code' }, { status: 200 });
      }

      const now = new Date().toISOString();
      const p = promo as Record<string, unknown>;

      if (p.valid_from && (p.valid_from as string) > now) {
        return NextResponse.json({ valid: false, error: 'Promo code not yet active' }, { status: 200 });
      }
      if (p.valid_until && (p.valid_until as string) < now) {
        return NextResponse.json({ valid: false, error: 'Promo code has expired' }, { status: 200 });
      }
      if (p.max_uses !== null && (p.used_count as number) >= (p.max_uses as number)) {
        return NextResponse.json({ valid: false, error: 'Promo code usage limit reached' }, { status: 200 });
      }

      return NextResponse.json({
        valid: true,
        id: p.id,
        code: p.code,
        description: p.description,
        discount_type: p.discount_type,
        discount_value: p.discount_value,
        valid_until: p.valid_until,
      });
    }

    // Admin: list all promo codes (requires admin session)
    const authResult = await withAuth(request, ['admin']);
    if (authResult instanceof NextResponse) return authResult;
    const { db: adminDb } = authResult;

    const promos = await adminDb.prepare(
      `SELECT * FROM promo_codes ORDER BY created_at DESC`
    ).all();

    return NextResponse.json(promos.results || []);
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 });
  }
}

// Admin POST: create a new promo code
export async function POST(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {

    const body = await request.json() as {
      code?: string;
      description?: string;
      discount_type?: 'percentage' | 'fixed';
      discount_value?: number;
      valid_from?: string;
      valid_until?: string;
      max_uses?: number | null;
      active?: boolean;
    };

    const { code, description, discount_type, discount_value, valid_from, valid_until, max_uses, active } = body;

    if (!code || !discount_type || discount_value === undefined) {
      return NextResponse.json({ error: 'code, discount_type, and discount_value are required' }, { status: 400 });
    }
    if (!['percentage', 'fixed'].includes(discount_type)) {
      return NextResponse.json({ error: 'discount_type must be percentage or fixed' }, { status: 400 });
    }
    if (discount_value <= 0) {
      return NextResponse.json({ error: 'discount_value must be greater than 0' }, { status: 400 });
    }
    if (discount_type === 'percentage' && discount_value > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100' }, { status: 400 });
    }

    const result = await db.prepare(
      `INSERT INTO promo_codes (code, description, discount_type, discount_value, valid_from, valid_until, max_uses, active, created_at, updated_at)
       VALUES (UPPER(?), ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      code.trim(), description || '', discount_type, discount_value,
      valid_from || null, valid_until || null,
      max_uses ?? null, active !== false ? 1 : 0
    ).run();

    return NextResponse.json({ id: result.meta.last_row_id, success: true }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Promo code already exists' }, { status: 409 });
    }
    console.error('Error creating promo code:', error);
    return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 });
  }
}

// Admin PUT: update a promo code
export async function PUT(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {

    const body = await request.json() as {
      id?: number;
      description?: string;
      discount_type?: string;
      discount_value?: number;
      valid_from?: string | null;
      valid_until?: string | null;
      max_uses?: number | null;
      active?: boolean;
    };

    const { id, description, discount_type, discount_value, valid_from, valid_until, max_uses, active } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const result = await db.prepare(
      `UPDATE promo_codes SET
        description = COALESCE(?, description),
        discount_type = COALESCE(?, discount_type),
        discount_value = COALESCE(?, discount_value),
        valid_from = ?,
        valid_until = ?,
        max_uses = ?,
        active = COALESCE(?, active),
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      description ?? null, discount_type ?? null, discount_value ?? null,
      valid_from ?? null, valid_until ?? null, max_uses ?? null,
      active !== undefined ? (active ? 1 : 0) : null, id
    ).run();

    if (result.meta.rows_written === 0) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating promo code:', error);
    return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 });
  }
}

// Admin DELETE: delete a promo code
export async function DELETE(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const result = await db.prepare(`DELETE FROM promo_codes WHERE id = ?`).bind(id).run();
    if (result.meta.rows_written === 0) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json({ error: 'Failed to delete promo code' }, { status: 500 });
  }
}
