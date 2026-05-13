export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withRateLimit, rateLimits } from '@/lib/middleware';
import { logAuditEvent } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    // Require code parameter - removed "list all" functionality for security
    if (!code) {
      return NextResponse.json({ error: 'Code parameter is required' }, { status: 400 });
    }

    // Validate a specific promo code
    const promo = await db.prepare(
      `SELECT * FROM promo_codes WHERE UPPER(code) = UPPER(?) AND is_active = 1`
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
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString()
        }
      }
    );
  }

  // Authentication - require admin role
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db, user } = authResult;

  try {
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json() as {
      code?: string;
      description?: string;
      discount_type?: 'percentage' | 'fixed';
      discount_value?: number;
      min_amount?: number | null;
      valid_from?: string;
      valid_until?: string;
      max_uses?: number | null;
      is_active?: boolean;
    };

    const { code, description, discount_type, discount_value, min_amount, valid_from, valid_until, max_uses, is_active } = body;

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
      `INSERT INTO promo_codes (code, description, discount_type, discount_value, min_amount, valid_from, valid_until, max_uses, used_count, is_active, created_at, updated_at)
       VALUES (UPPER(?), ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))`
    ).bind(
      code.trim(), description || '', discount_type, discount_value,
      min_amount ?? null, valid_from || null, valid_until || null,
      max_uses ?? null, is_active !== false ? 1 : 0
    ).run();

    const promoId = result.meta.last_row_id;

    // Log audit event for promo code creation
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || '';
    await logAuditEvent({
      resourceType: 'promo_code',
      resourceId: promoId,
      action: 'create',
      adminId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: clientIp,
      details: {
        code: code.trim(),
        description,
        discount_type,
        discount_value,
        min_amount,
        max_uses,
        valid_from,
        valid_until,
        is_active: is_active !== false,
      },
    });

    return NextResponse.json({ id: promoId, success: true }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Promo code already exists' }, { status: 409 });
    }
    console.error('Error creating promo code:', error);
    return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString()
        }
      }
    );
  }

  // Authentication - require admin role
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db, user } = authResult;

  try {
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json() as {
      id?: number;
      description?: string;
      discount_type?: string;
      discount_value?: number;
      min_amount?: number | null;
      valid_from?: string | null;
      valid_until?: string | null;
      max_uses?: number | null;
      is_active?: boolean;
    };

    const { id, description, discount_type, discount_value, min_amount, valid_from, valid_until, max_uses, is_active } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const result = await db.prepare(
      `UPDATE promo_codes SET
        description = COALESCE(?, description),
        discount_type = COALESCE(?, discount_type),
        discount_value = COALESCE(?, discount_value),
        min_amount = ?,
        valid_from = ?,
        valid_until = ?,
        max_uses = ?,
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      description ?? null, discount_type ?? null, discount_value ?? null,
      min_amount ?? null, valid_from ?? null, valid_until ?? null, max_uses ?? null,
      is_active !== undefined ? (is_active ? 1 : 0) : null, id
    ).run();

    if (result.meta.changes === 0) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }

    // Log audit event for promo code update
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || '';
    await logAuditEvent({
      resourceType: 'promo_code',
      resourceId: id,
      action: 'update',
      adminId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: clientIp,
      details: {
        description,
        discount_type,
        discount_value,
        min_amount,
        max_uses,
        valid_from,
        valid_until,
        is_active,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating promo code:', error);
    return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString()
        }
      }
    );
  }

  // Authentication - require admin role
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db, user } = authResult;

  try {
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const result = await db.prepare(`DELETE FROM promo_codes WHERE id = ?`).bind(id).run();
    if (result.meta.changes === 0) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }

    // Log audit event for promo code deletion
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || '';
    await logAuditEvent({
      resourceType: 'promo_code',
      resourceId: parseInt(id),
      action: 'delete',
      adminId: user.id,
      userEmail: user.email,
      userRole: user.role,
      ipAddress: clientIp,
      details: { deleted_id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json({ error: 'Failed to delete promo code' }, { status: 500 });
  }
}
