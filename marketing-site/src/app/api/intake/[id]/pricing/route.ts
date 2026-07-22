export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withRateLimit, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { getDb, getIntakeRequest, updateIntakeRequest } from '@/lib/db';
import { computeDigitalPriceBreakdown, validateDigitalPromoCode, BASE_BUILD_FEE, type PageListItem, type PageType } from '@/lib/digital-pricing';

const VALID_PAGE_TYPES = new Set<PageType>([
  'simple_page', 'contact_form', 'gallery', 'blog', 'ecommerce', 'booking', 'auth_system', 'custom',
]);

function sanitizePageList(input: unknown): PageListItem[] | null {
  if (!Array.isArray(input)) return null;
  const cleaned: PageListItem[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const type = (item as any).type;
    const label = (item as any).label;
    if (typeof type !== 'string' || !VALID_PAGE_TYPES.has(type as PageType)) continue;
    if (typeof label !== 'string' || !label.trim()) continue;
    cleaned.push({
      type: type as PageType,
      label: label.trim().slice(0, 80),
      included: (item as any).included !== false,
    });
  }
  return cleaned;
}

// GET /api/intake/[id]/pricing — public. Returns the current stored price
// breakdown for the review screen (re-derived from the stored page list,
// not read off a cached total column, so it always reflects the latest
// promo_codes state).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  try {
    const db = await getDb();
    if (!db) return withSecurityHeaders(NextResponse.json({ error: 'Database not available' }, { status: 500 }), traceId);

    const { id } = await params;
    const intake = await getIntakeRequest(db, Number(id)) as Record<string, any> | null;
    if (!intake) {
      return withSecurityHeaders(NextResponse.json({ error: 'Intake request not found' }, { status: 404 }), traceId);
    }

    const pageList: PageListItem[] = intake.page_list ? JSON.parse(intake.page_list) : [];
    const breakdown = await computeDigitalPriceBreakdown(db, {
      pageList,
      promoCode: intake.promo_code,
      supportTier: intake.support_tier,
    });

    return withSecurityHeaders(NextResponse.json(breakdown), traceId);
  } catch (error) {
    logger.error('Error fetching intake pricing', error as Error);
    return withSecurityHeaders(NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 }), traceId);
  }
}

// POST /api/intake/[id]/pricing — public. The review-step screen calls this
// every time the client toggles a page in/out or types a promo code -
// stores the client's *selection*, but the price itself is always
// recomputed here from digital-pricing.ts + a fresh promo_codes lookup,
// never trusted from the request body.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);

  const rateLimitResult = await withRateLimit(request, { windowMs: 3600000, maxRequests: 120 });
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 }), traceId);
  }

  try {
    const db = await getDb();
    if (!db) return withSecurityHeaders(NextResponse.json({ error: 'Database not available' }, { status: 500 }), traceId);

    const { id } = await params;
    const intakeId = Number(id);
    const intake = await getIntakeRequest(db, intakeId) as Record<string, any> | null;
    if (!intake) {
      return withSecurityHeaders(NextResponse.json({ error: 'Intake request not found' }, { status: 404 }), traceId);
    }
    if (intake.deposit_paid_at) {
      return withSecurityHeaders(NextResponse.json({ error: 'This project is already confirmed and paid - scope is locked' }, { status: 400 }), traceId);
    }

    const body = await request.json().catch(() => ({})) as { page_list?: unknown; promo_code?: string | null };

    let pageList: PageListItem[];
    if (body.page_list !== undefined) {
      const sanitized = sanitizePageList(body.page_list);
      if (!sanitized || sanitized.length === 0) {
        return withSecurityHeaders(NextResponse.json({ error: 'At least one page is required' }, { status: 400 }), traceId);
      }
      pageList = sanitized;
    } else {
      pageList = intake.page_list ? JSON.parse(intake.page_list) : [];
    }

    let promoCode: string | null = intake.promo_code || null;
    let promoError: string | undefined;
    if (body.promo_code !== undefined) {
      if (!body.promo_code) {
        promoCode = null;
      } else {
        const { pagesSubtotal } = await computeDigitalPriceBreakdown(db, { pageList, supportTier: intake.support_tier }).then((b) => ({ pagesSubtotal: b.pagesSubtotal }));
        const promoResult = await validateDigitalPromoCode(db, body.promo_code, BASE_BUILD_FEE + pagesSubtotal);
        if (!promoResult.valid) {
          promoError = promoResult.error;
          promoCode = intake.promo_code || null; // keep whatever was already applied, if anything
        } else {
          promoCode = promoResult.promoCodeRow!.code;
        }
      }
    }

    const breakdown = await computeDigitalPriceBreakdown(db, {
      pageList,
      promoCode,
      supportTier: intake.support_tier,
    });

    await updateIntakeRequest(db, intakeId, {
      page_list: JSON.stringify(pageList),
      promo_code: breakdown.promoCode,
      base_fee: breakdown.baseFee,
      pages_subtotal: breakdown.pagesSubtotal,
      has_custom_items: breakdown.hasCustomItems ? 1 : 0,
      discount_amount: breakdown.discountAmount,
      total_price: breakdown.totalPrice,
      deposit_amount: breakdown.depositAmount,
      final_amount: breakdown.finalAmount,
    });

    return withSecurityHeaders(NextResponse.json({ ...breakdown, promo_error: promoError }), traceId);
  } catch (error) {
    logger.error('Error updating intake pricing', error as Error);
    return withSecurityHeaders(NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 }), traceId);
  }
}
