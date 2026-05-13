export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRateLimit, rateLimits } from '@/lib/middleware';
import { sanitizeText, sanitizeEmail, sanitizePhone } from '@/lib/sanitization';
import { validateEmail } from '@/lib/validation';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: NextRequest) {
  // Rate limiting - prevent abuse
  const rateLimitResult = await withRateLimit(request, { windowMs: 3600000, maxRequests: 5 }); // 5 quotes per hour
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many quote requests. Please try again later.' },
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

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json() as {
      name?: string;
      email?: string;
      phone?: string;
      service_id?: number;
      quantity?: number;
      promo_code?: string;
    };

    const {
      name, email, phone, service_id, quantity, promo_code
    } = body;

    // Validate required fields
    if (!name || !service_id || !email) {
      return NextResponse.json({ error: 'name, email, and service_id are required' }, { status: 400 });
    }

    // Proper sanitization using sanitization library
    const sanitizedName = sanitizeText(name);
    if (!sanitizedName) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    // Validate and sanitize email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.errors.join(', ') }, { status: 400 });
    }
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const sanitizedPhone = phone ? sanitizePhone(phone) : '';
    const sanitizedPromoCode = promo_code ? sanitizeText(promo_code).toUpperCase() : '';
    const sanitizedQuantity = quantity || 1;

    // Validate service_id exists and fetch pricing
    const service = await db.prepare('SELECT id, name, base_price, room_multiplier FROM services WHERE id = ? AND is_active = 1').bind(service_id).first();
    if (!service) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    // Calculate baseline price on server-side
    const basePrice = (service as any).base_price || 0;
    const roomMultiplier = (service as any).room_multiplier || 1.0;
    const baseline_price = basePrice * sanitizedQuantity * roomMultiplier;
    const serviceName = (service as any).name || '';

    // Initialize discount variables
    let discount_type = '';
    let discount_value = 0;
    let discount_amount = 0;

    // Validate promo code if provided
    if (sanitizedPromoCode) {
      const promo = await db.prepare(
        `SELECT id, discount_type, discount_value, is_active, valid_until, max_uses, used_count
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

      // Check if promo code has reached max uses
      const maxUses = (promo as any).max_uses;
      const usedCount = (promo as any).used_count || 0;
      if (maxUses !== null && usedCount >= maxUses) {
        return NextResponse.json({ error: 'Promo code usage limit reached' }, { status: 400 });
      }

      // Calculate discount on server-side
      discount_type = (promo as any).discount_type;
      discount_value = (promo as any).discount_value;
      if (discount_type === 'percentage') {
        discount_amount = baseline_price * (discount_value / 100);
      } else {
        discount_amount = discount_value;
      }
    }

    // Calculate final price on server-side
    const final_price = Math.max(0, baseline_price - discount_amount);

    // Calculate quote expiration (30 days from creation)
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Generate reference number with collision handling
    let refNumber = '';
    let quoteId = 0;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const ts = Date.now().toString(36).toUpperCase();
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      refNumber = `SSQ-${ts}-${rand}`;

      try {
        const result = await db.prepare(
          `INSERT INTO quote_requests
            (ref_number, name, email, phone, service_id, service_name, quantity,
             baseline_price, promo_code, discount_type, discount_value, discount_amount,
             final_price, status, valid_until, created_at, updated_at, client_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 'individual')`
        ).bind(
          refNumber,
          sanitizedName, sanitizedEmail, sanitizedPhone,
          service_id, serviceName, sanitizedQuantity,
          baseline_price, sanitizedPromoCode, discount_type || '', discount_value || 0,
          discount_amount || 0, final_price, 'pending', validUntil
        ).run();

        quoteId = result.meta.last_row_id;
        break; // Success, exit loop
      } catch (error: unknown) {
        attempts++;
        const msg = error instanceof Error ? error.message : '';
        if (!msg.includes('UNIQUE') || attempts >= maxAttempts) {
          throw error; // Re-throw if not a unique constraint error or max attempts reached
        }
        // Collision occurred, retry with new reference number
      }
    }

    if (!quoteId) {
      return NextResponse.json({ error: 'Failed to generate unique reference number' }, { status: 500 });
    }

    // Only increment promo code usage after successful quote creation
    if (sanitizedPromoCode) {
      await db.prepare(
        `UPDATE promo_codes SET used_count = used_count + 1, updated_at = datetime('now')
         WHERE UPPER(code) = UPPER(?) AND is_active = 1`
      ).bind(sanitizedPromoCode).run();
    }

    // Log audit event for quote creation
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || '';
    await logAuditEvent({
      resourceType: 'quote',
      resourceId: quoteId,
      action: 'create',
      userEmail: sanitizedEmail,
      userRole: 'customer',
      ipAddress: clientIp,
      details: {
        ref_number: refNumber,
        service_id,
        service_name: serviceName,
        baseline_price,
        final_price,
        promo_code: sanitizedPromoCode,
        discount_amount,
      },
      metadata: {
        quantity: sanitizedQuantity,
        client_type: 'individual',
      },
    });

    return NextResponse.json({
      success: true,
      id: quoteId,
      ref_number: refNumber,
      zoho_estimate_number: '',
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      service_name: serviceName,
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

// GET endpoint removed - critical security fix
// Previously exposed all quote data without authentication
// Use /api/customer/quotes (authenticated) or create admin endpoint with proper auth
