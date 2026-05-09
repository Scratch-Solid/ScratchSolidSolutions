import { NextRequest, NextResponse } from 'next/server';

function generateRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SSQ-${ts}-${rand}`;
}

// Public POST: submit a quote request
export async function POST(request: NextRequest) {
  try {
    // Temporarily disable database to isolate module-level error
    return NextResponse.json({ error: 'Database temporarily disabled for testing' }, { status: 500 });

    const body = await request.json() as {
      name?: string;
      email?: string;
      phone?: string;
      service_id?: number;
      service_name?: string;
      quantity?: number;
      baseline_price?: number;
      promo_code?: string;
      discount_type?: string;
      discount_value?: number;
      discount_amount?: number;
      final_price?: number;
    };

    const {
      name, email, phone, service_id, service_name, quantity,
      baseline_price, promo_code, discount_type, discount_value, discount_amount, final_price
    } = body;

    // Validate required fields
    if (!name || !service_id || baseline_price === undefined || final_price === undefined) {
      return NextResponse.json({ error: 'name, service_id, baseline_price, and final_price are required' }, { status: 400 });
    }

    // Simple sanitization (temporarily removed sanitization imports to isolate issue)
    const sanitizedName = name.trim();
    const sanitizedEmail = email ? email.trim() : '';
    const sanitizedPhone = phone ? phone.trim() : '';
    const sanitizedServiceName = service_name ? service_name : '';
    const sanitizedPromoCode = promo_code ? promo_code.trim().toUpperCase() : '';

    // Email validation temporarily disabled

    // Validate service_id exists
    const service = await db.prepare('SELECT id FROM services WHERE id = ? AND is_active = 1').bind(service_id).first();
    if (!service) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    // Validate promo code if provided
    if (sanitizedPromoCode) {
      const promo = await db.prepare(
        `SELECT id, discount_type, discount_value, is_active, valid_until 
         FROM promo_codes 
         WHERE UPPER(code) = UPPER(?) AND is_active = 1`
      ).bind(sanitizedPromoCode).first();

      if (!promo) {
        return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
      }

      // Check if promo is expired
      if ((promo as any).valid_until && new Date((promo as any).valid_until) < new Date()) {
        return NextResponse.json({ error: 'Promo code has expired' }, { status: 400 });
      }
    }

    const refNumber = generateRef();

    // Save quote request to DB
    const result = await db.prepare(
      `INSERT INTO quote_requests
        (ref_number, name, email, phone, service_id, service_name, quantity,
         baseline_price, promo_code, discount_type, discount_value, discount_amount,
         final_price, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
    ).bind(
      refNumber,
      sanitizedName, sanitizedEmail, sanitizedPhone,
      service_id, sanitizedServiceName, quantity || 1,
      baseline_price, sanitizedPromoCode, discount_type || '', discount_value || 0,
      discount_amount || 0, final_price
    ).run();

    const quoteId = result.meta.last_row_id;

    // Only increment promo code usage after successful quote creation
    if (sanitizedPromoCode) {
      await db.prepare(
        `UPDATE promo_codes SET used_count = used_count + 1, updated_at = datetime('now')
         WHERE UPPER(code) = UPPER(?) AND is_active = 1`
      ).bind(sanitizedPromoCode).run();
    }

    // Attempt Zoho estimate creation (best-effort, non-blocking) - temporarily disabled
    let zohoEstimateNumber = '';

    // if (sanitizedEmail || sanitizedName) {
    //   try {
    //     const contactId = await findOrCreateContact(sanitizedName, sanitizedEmail, sanitizedPhone);
    //     if (contactId) {
    //       const estimateResp = await createEstimate({
    //         contactId,
    //         serviceName: sanitizedServiceName || `Service #${service_id}`,
    //         baselinePrice: baseline_price,
    //         discountAmount: discount_amount || 0,
    //         finalPrice: final_price,
    //         promoCode: sanitizedPromoCode,
    //         refNumber,
    //       });
    //       zohoEstimateId = estimateResp.estimate?.estimate_id || '';
    //       zohoEstimateNumber = estimateResp.estimate?.estimate_number || '';

    //       if (zohoEstimateId) {
    //         await db.prepare(
    //           `UPDATE quote_requests SET zoho_estimate_number = ?, updated_at = datetime('now') WHERE id = ?`
    //         ).bind(zohoEstimateNumber, quoteId).run();
    //       }
    //     }
    //   } catch (zohoErr) {
    //     console.error('Zoho estimate creation failed (non-fatal):', zohoErr);
    //   }
    // }

    return NextResponse.json({
      success: true,
      id: quoteId,
      ref_number: refNumber,
      zoho_estimate_number: zohoEstimateNumber,
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      service_name: sanitizedServiceName,
      baseline_price,
      promo_code: sanitizedPromoCode,
      discount_type: discount_type || '',
      discount_value: discount_value || 0,
      discount_amount: discount_amount || 0,
      final_price,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create quote', details: errorMessage }, { status: 500 });
  }
}

// Admin GET: list all quote requests - temporarily disabled session validation
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

    // const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    // if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // const session = await validateSession(db, token);
    // if (!session || (session as any).role !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

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
