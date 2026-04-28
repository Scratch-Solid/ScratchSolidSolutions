import { NextRequest, NextResponse } from 'next/server';
import { getDb, validateSession } from '@/lib/db';
import { findOrCreateContact, createEstimate } from '@/lib/zoho';
import { withRateLimit, rateLimits } from '@/lib/rateLimit';

function generateRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SSQ-${ts}-${rand}`;
}

// Public POST: submit a quote request
export async function POST(request: NextRequest) {
  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many quote requests. Please try again later.' }, { status: 429 });
  }

  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

    const body = await request.json() as {
      name?: string;
      email?: string;
      phone?: string;
      service_id?: number;
      service_name?: string;
      client_type?: string;
      quantity?: number;
      unit?: string;
      baseline_price?: number;
      special_price?: number | null;
      special_label?: string;
      special_discount?: number;
      promo_code?: string;
      discount_type?: string;
      discount_value?: number;
      discount_amount?: number;
      final_price?: number;
    };

    const {
      name, email, phone, service_id, service_name, client_type, quantity, unit,
      baseline_price, promo_code, discount_type, discount_value, discount_amount, final_price
    } = body;

    if (!name || !service_id || baseline_price === undefined || final_price === undefined) {
      return NextResponse.json({ error: 'name, service_id, baseline_price, and final_price are required' }, { status: 400 });
    }

    // If a promo code was submitted, increment its used_count atomically
    if (promo_code) {
      await db.prepare(
        `UPDATE promo_codes SET used_count = used_count + 1, updated_at = datetime('now')
         WHERE UPPER(code) = UPPER(?) AND active = 1`
      ).bind(promo_code.trim()).run();
    }

    const refNumber = generateRef();

    // Save quote request to DB
    const result = await db.prepare(
      `INSERT INTO quote_requests
        (ref_number, name, email, phone, service_id, service_name, client_type, quantity, unit,
         baseline_price, promo_code, discount_type, discount_value, discount_amount,
         final_price, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
    ).bind(
      refNumber,
      name.trim(), email?.trim() || '', phone?.trim() || '',
      service_id, service_name || '', client_type || 'individual', quantity || 1, unit || '',
      baseline_price, promo_code || '', discount_type || '', discount_value || 0,
      discount_amount || 0, final_price
    ).run();

    const quoteId = result.meta.last_row_id;

    // Attempt Zoho estimate creation (best-effort, non-blocking)
    let zohoEstimateId = '';
    let zohoEstimateNumber = '';

    if (email || name) {
      try {
        const contactId = await findOrCreateContact(name.trim(), email?.trim() || '', phone?.trim() || '');
        if (contactId) {
          const estimateResp = await createEstimate({
            contactId,
            serviceName: service_name || `Service #${service_id}`,
            baselinePrice: baseline_price,
            discountAmount: discount_amount || 0,
            finalPrice: final_price,
            promoCode: promo_code,
            refNumber,
          });
          zohoEstimateId = estimateResp.estimate?.estimate_id || '';
          zohoEstimateNumber = estimateResp.estimate?.estimate_number || '';

          if (zohoEstimateId) {
            await db.prepare(
              `UPDATE quote_requests SET zoho_estimate_id = ?, zoho_estimate_number = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(zohoEstimateId, zohoEstimateNumber, quoteId).run();
          }
        }
      } catch (zohoErr) {
        console.error('Zoho estimate creation failed (non-fatal):', zohoErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: quoteId,
      ref_number: refNumber,
      zoho_estimate_number: zohoEstimateNumber,
      name, email, phone,
      service_name: service_name || '',
      client_type: client_type || 'individual',
      baseline_price,
      promo_code: promo_code || '',
      discount_type: discount_type || '',
      discount_value: discount_value || 0,
      discount_amount: discount_amount || 0,
      final_price,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}

// Admin GET: list all quote requests
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await validateSession(db, token);
    if (!session || (session as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `SELECT * FROM quote_requests`;
    const params: unknown[] = [];

    if (status) {
      query += ` WHERE status = ?`;
      params.push(status);
    }
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const quotes = await db.prepare(query).bind(...params).all();
    return NextResponse.json(quotes.results || []);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
