export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    let query = `SELECT * FROM promo_codes`;
    let params: unknown[] = [];
    
    if (code) {
      query += ` WHERE code = ? AND is_active = 1`;
      params.push(code.toUpperCase());
      
      // Check if promo is valid
      const promo = await db.prepare(query).bind(...params).first();
      
      if (!promo) {
        return NextResponse.json({ valid: false, error: 'Invalid promo code' });
      }
      
      const now = new Date().toISOString();
      const validFrom = promo.valid_from;
      const validUntil = promo.valid_until;
      
      // Check date validity
      if (validFrom && validFrom > now) {
        return NextResponse.json({ valid: false, error: 'Promo code not yet active' });
      }
      
      if (validUntil && validUntil < now) {
        return NextResponse.json({ valid: false, error: 'Promo code has expired' });
      }
      
      // Check usage limits
      if (promo.max_uses && promo.used_count >= promo.max_uses) {
        return NextResponse.json({ valid: false, error: 'Promo code usage limit reached' });
      }
      
      return NextResponse.json({
        valid: true,
        id: promo.id,
        code: promo.code,
        description: promo.description,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        min_amount: promo.min_amount,
        valid_until: promo.valid_until
      });
    }
    
    // Return all promo codes for admin
    query += ` ORDER BY created_at DESC`;
    const promos = await db.prepare(query).all();
    
    return NextResponse.json(promos.results || []);
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 });
  }
}

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
      min_amount?: number | null;
      max_uses?: number | null;
      valid_from?: string | null;
      valid_until?: string | null;
      is_active?: boolean;
    };
    
    const { 
      code, 
      description, 
      discount_type, 
      discount_value, 
      min_amount, 
      max_uses, 
      valid_from, 
      valid_until, 
      is_active 
    } = body;
    
    if (!code || !discount_type || discount_value === undefined) {
      return NextResponse.json({ error: 'Code, discount type, and discount value are required' }, { status: 400 });
    }
    
    // Check if code already exists
    const existing = await db.prepare(
      `SELECT id FROM promo_codes WHERE code = ?`
    ).bind(code.toUpperCase()).first();
    
    if (existing) {
      return NextResponse.json({ error: 'Promo code already exists' }, { status: 400 });
    }
    
    const result = await db.prepare(
      `INSERT INTO promo_codes
        (code, description, discount_type, discount_value, min_amount, max_uses, used_count, valid_from, valid_until, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      code.toUpperCase(),
      description || '',
      discount_type,
      discount_value,
      min_amount || null,
      max_uses || null,
      valid_from || null,
      valid_until || null,
      is_active !== false ? 1 : 0
    ).run();
    
    return NextResponse.json({ id: result.meta.last_row_id, success: true });
  } catch (error) {
    console.error('Error creating promo code:', error);
    return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as {
      id?: number;
      code?: string;
      description?: string;
      discount_type?: 'percentage' | 'fixed';
      discount_value?: number;
      min_amount?: number | null;
      max_uses?: number | null;
      valid_from?: string | null;
      valid_until?: string | null;
      is_active?: boolean;
    };
    
    const { 
      id,
      code, 
      description, 
      discount_type, 
      discount_value, 
      min_amount, 
      max_uses, 
      valid_from, 
      valid_until, 
      is_active 
    } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const result = await db.prepare(
      `UPDATE promo_codes
       SET code = ?, description = ?, discount_type = ?, discount_value = ?, min_amount = ?, max_uses = ?,
           valid_from = ?, valid_until = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      code?.toUpperCase() || '',
      description || '',
      discount_type || 'percentage',
      discount_value || 0,
      min_amount || null,
      max_uses || null,
      valid_from || null,
      valid_until || null,
      is_active !== false ? 1 : 0,
      id
    ).run();
    
    if (result.meta.changes === 0) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating promo code:', error);
    return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Promo code ID is required' }, { status: 400 });
    }
    
    const result = await db.prepare(
      `DELETE FROM promo_codes WHERE id = ?`
    ).bind(parseInt(id)).run();
    
    if (result.meta.changes === 0) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json({ error: 'Failed to delete promo code' }, { status: 500 });
  }
}
