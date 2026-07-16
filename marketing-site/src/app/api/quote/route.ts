export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRateLimit } from '@/lib/middleware';
import { sanitizeText, sanitizeEmail, sanitizePhone } from '@/lib/sanitization';
import { validateEmail } from '@/lib/validation';
import { logAuditEvent } from '@/lib/audit';
import { findOrCreateContact, createEstimate } from '@/lib/zoho';
import { calculateQuote } from '@/lib/pricing-engine';

export async function POST(request: NextRequest) {
  // CSRF protection disabled for public quote endpoint
  // Quote requests are public-facing and don't require authentication

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
      client_type?: string;
      vat_registered?: boolean;
      vat_number?: string;
      property_type?: string;
      area?: string;
      baseline_price?: number;
      transport_fee?: number;
      after_hours_surcharge?: number;
      demand_multiplier?: number;
      special_discount?: number;
      promo_discount?: number;
      loyalty_discount?: number;
    };

    const {
      name, email, phone, service_id, quantity, promo_code, client_type, vat_registered, vat_number, property_type, area, transport_fee, after_hours_surcharge, demand_multiplier, special_discount, promo_discount, loyalty_discount
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

    // Validate service_id exists and fetch service name
    const service = await db.prepare('SELECT id, name FROM services WHERE id = ? AND is_active = 1').bind(service_id).first();
    if (!service) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }
    const serviceName = (service as any).name || '';

    // Fetch the active pricing row for this service + client type. This mirrors the
    // front-end QuoteModal.getActivePricingRow so the saved quote uses the SAME inputs
    // (base price + per-unit price) that the customer saw in the live preview.
    const resolvedClientType = client_type === 'business' ? 'business' : 'individual';
    const pricingRows = await db.prepare(
      `SELECT price, unit_price, special_price, special_label, special_valid_from, special_valid_until, client_type
       FROM service_pricing
       WHERE service_id = ? AND (client_type = ? OR client_type = 'all')`
    ).bind(service_id, resolvedClientType).all();
    const rows = (pricingRows.results || []) as any[];
    const pricingRow = rows.find(r => r.client_type === resolvedClientType) || rows[0] || null;
    if (!pricingRow) {
      return NextResponse.json({ error: 'Pricing not configured for this service' }, { status: 400 });
    }

    // Initialize discount variables (validated server-side)
    let discount_type = '';
    let discount_value = 0;

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

      discount_type = (promo as any).discount_type;
      discount_value = (promo as any).discount_value;
    }

    // Compute the quote with the SAME pricing engine the front-end uses, so the saved
    // baseline and final price always equal what the customer was shown. Previously the
    // server re-derived baseline as (base_price * quantity * room_multiplier), which did
    // not match the additive (base + extra-unit) preview and caused the price to jump.
    const activeAreas = await db.prepare(
      'SELECT name, transport_fee FROM service_areas WHERE is_active = 1 ORDER BY name'
    ).all<{ name: string; transport_fee: number }>();
    const areaRows = activeAreas.results || [];
    const safeArea = area && areaRows.some(r => r.name === area) ? area : (areaRows[0]?.name || area || 'Durbanville');
    const areaFee = areaRows.find(r => r.name === safeArea)?.transport_fee;
    const allowedPropertyTypes = ['residential', 'office', 'commercial', 'post-construction', 'short-term-stay'];
    const safePropertyType = (property_type && allowedPropertyTypes.includes(property_type)
      ? property_type
      : 'residential') as 'residential' | 'office' | 'commercial' | 'post-construction' | 'short-term-stay';

    const specialPricing = pricingRow.special_price != null ? {
      specialPrice: pricingRow.special_price as number,
      specialLabel: (pricingRow.special_label as string) || 'Special Offer',
      specialValidFrom: (pricingRow.special_valid_from as string) || undefined,
      specialValidUntil: (pricingRow.special_valid_until as string) || undefined,
    } : undefined;

    const promoData = (discount_type && discount_value)
      ? { discountType: discount_type as 'percentage' | 'fixed', discountValue: discount_value }
      : undefined;

    const quoteCalc = calculateQuote(
      {
        serviceId: service_id,
        propertyType: safePropertyType,
        area: safeArea,
        quantity: sanitizedQuantity,
        promoCode: sanitizedPromoCode || undefined,
      },
      specialPricing,
      promoData,
      0,
      (pricingRow.price as number) || 0,
      (pricingRow.unit_price as number) || 0,
      areaFee
    );

    const baseline_price = Math.round(quoteCalc.basePrice * 100) / 100;
    const computed_transport_fee = Math.round(quoteCalc.transportFee * 100) / 100;
    const discount_amount = Math.round((quoteCalc.specialDiscount + quoteCalc.promoDiscount + quoteCalc.loyaltyDiscount) * 100) / 100;
    const final_price = quoteCalc.finalPrice;

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
             final_price, status, valid_until, created_at, updated_at, client_type, vat_registered, vat_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?)`
        ).bind(
          refNumber,
          sanitizedName, sanitizedEmail, sanitizedPhone,
          service_id, serviceName, sanitizedQuantity,
          baseline_price, sanitizedPromoCode, discount_type || '', discount_value || 0,
          discount_amount || 0, final_price, 'pending', validUntil,
          client_type || 'individual',
          vat_registered ? 1 : 0,
          vat_number || ''
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

    // Create Zoho estimate (non-blocking - quote creation succeeds even if Zoho fails)
    let zohoEstimateId = '';
    let zohoEstimateNumber = '';
    try {
      const contactId = await findOrCreateContact(sanitizedName, sanitizedEmail, sanitizedPhone);
      if (contactId) {
        const zohoResult = await createEstimate({
          contactId,
          serviceName,
          baselinePrice: baseline_price || 0,
          transportFee: computed_transport_fee || 0,
          discountAmount: discount_amount || 0,
          finalPrice: final_price || 0,
          promoCode: sanitizedPromoCode,
          refNumber,
          expiryDays: 30
        });
        if (zohoResult.estimate) {
          zohoEstimateId = zohoResult.estimate.estimate_id;
          zohoEstimateNumber = zohoResult.estimate.estimate_number;
          // Update quote with Zoho estimate info
          await db.prepare(
            `UPDATE quote_requests SET zoho_estimate_id = ?, zoho_estimate_number = ?, updated_at = datetime('now')
             WHERE id = ?`
          ).bind(zohoEstimateId, zohoEstimateNumber, quoteId).run();
        }
      }
    } catch (zohoError) {
      console.error('Zoho estimate creation failed (non-blocking):', zohoError);
      // Continue - quote creation succeeded
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
        client_type: client_type || 'individual',
        vat_registered: vat_registered || false,
      },
    });

    return NextResponse.json({
      success: true,
      id: quoteId,
      ref_number: refNumber,
      zoho_estimate_number: zohoEstimateNumber,
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      service_name: serviceName,
      baseline_price,
      transport_fee: computed_transport_fee,
      promo_code: sanitizedPromoCode,
      discount_type: discount_type || '',
      discount_value: discount_value || 0,
      discount_amount: discount_amount || 0,
      final_price,
      client_type: client_type || 'individual',
      vat_registered: vat_registered || false,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to create quote: ${error instanceof Error ? error.message : 'Unknown error'}`, details: errorMessage }, { status: 500 });
  }
}

// GET endpoint removed - critical security fix
// Previously exposed all quote data without authentication
// Use /api/customer/quotes (authenticated) or create admin endpoint with proper auth
