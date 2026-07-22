// Server-side pricing truth for digital projects. Never accept a price,
// subtotal, or discount amount from the client - every number here is
// computed from this file's own tables plus a fresh promo_codes lookup,
// the same principle behind the booking-side price-tampering fix
// (see migrations/031_bookings_server_price.sql).

export type PageType =
  | 'simple_page'
  | 'contact_form'
  | 'gallery'
  | 'blog'
  | 'ecommerce'
  | 'booking'
  | 'auth_system'
  | 'custom';

export const BASE_BUILD_FEE = 10000;

export const PAGE_TYPE_PRICES: Record<PageType, number> = {
  simple_page: 2500,
  contact_form: 3500,
  gallery: 4000,
  blog: 8000,
  ecommerce: 12000,
  booking: 15000,
  auth_system: 6000,
  custom: 0, // quote-on-request - never auto-priced, see computePageListPricing
};

export const PAGE_TYPE_LABELS: Record<PageType, string> = {
  simple_page: 'Simple content page',
  contact_form: 'Contact / lead-capture form',
  gallery: 'Gallery / portfolio page',
  blog: 'Blog / news system',
  ecommerce: 'E-commerce / product catalog',
  booking: 'Booking / scheduling page',
  auth_system: 'Auth / account system',
  custom: 'Custom interactive page or portal (quote on request)',
};

export type SupportTierId = 'warranty' | 'standard' | 'growth' | 'partner';

export const SUPPORT_TIER_RATES: Record<SupportTierId, { rate: number; minMonths: number }> = {
  warranty: { rate: 0, minMonths: 0 },
  standard: { rate: 1200, minMonths: 3 },
  growth: { rate: 2200, minMonths: 6 },
  partner: { rate: 3800, minMonths: 12 },
};

export interface PageListItem {
  type: PageType;
  label: string;
  included?: boolean; // client can uncheck a suggested page before confirming
}

export interface PricedPageItem extends PageListItem {
  price: number;
}

export function resolveSupportTier(tierId: unknown): { id: SupportTierId; rate: number; minMonths: number } {
  const id = (typeof tierId === 'string' && tierId in SUPPORT_TIER_RATES ? tierId : 'warranty') as SupportTierId;
  return { id, ...SUPPORT_TIER_RATES[id] };
}

/**
 * Prices a page list server-side. `custom` items are never auto-priced -
 * they're returned with price 0 and flagged via hasCustomItems, so the
 * caller can exclude them from the payable total and route them to a
 * manual staff quote instead of silently mis-pricing bespoke work.
 */
export function computePageListPricing(pageList: PageListItem[]): {
  pricedItems: PricedPageItem[];
  pagesSubtotal: number;
  hasCustomItems: boolean;
} {
  const included = pageList.filter((p) => p.included !== false);
  const pricedItems: PricedPageItem[] = included.map((p) => ({
    ...p,
    price: PAGE_TYPE_PRICES[p.type] ?? 0,
  }));
  const hasCustomItems = included.some((p) => p.type === 'custom');
  const pagesSubtotal = pricedItems
    .filter((p) => p.type !== 'custom')
    .reduce((sum, p) => sum + p.price, 0);
  return { pricedItems, pagesSubtotal, hasCustomItems };
}

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  discountAmount: number;
  promoCodeRow?: { id: number; code: string; discount_type: string; discount_value: number };
}

/**
 * Looks up and validates a promo code against digital-project pricing,
 * mirroring the server-side redemption pattern already used for bookings
 * (marketing-site/src/app/api/bookings/route.ts) - active/date/min-amount
 * checks happen here, against a fresh DB row, never against anything the
 * client asserts about the code.
 */
export async function validateDigitalPromoCode(
  db: D1Database,
  code: string,
  subtotal: number
): Promise<PromoValidationResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, error: 'Enter a promo code', discountAmount: 0 };
  }

  const promo = await db
    .prepare(`SELECT * FROM promo_codes WHERE code = ? AND is_active = 1 AND applies_to IN ('digital', 'both')`)
    .bind(normalized)
    .first<any>();

  if (!promo) {
    return { valid: false, error: 'That promo code is not valid for digital projects', discountAmount: 0 };
  }

  const now = new Date().toISOString();
  if (promo.valid_from && now < promo.valid_from) {
    return { valid: false, error: 'That promo code is not active yet', discountAmount: 0 };
  }
  if (promo.valid_until && now > promo.valid_until) {
    return { valid: false, error: 'That promo code has expired', discountAmount: 0 };
  }
  if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
    return { valid: false, error: 'That promo code has reached its usage limit', discountAmount: 0 };
  }
  if (promo.min_amount != null && subtotal < promo.min_amount) {
    return { valid: false, error: `That promo code needs a build price of at least R${promo.min_amount.toLocaleString()}`, discountAmount: 0 };
  }

  let discountAmount =
    promo.discount_type === 'percentage' ? subtotal * (promo.discount_value / 100) : promo.discount_value;
  discountAmount = Math.min(Math.max(discountAmount, 0), subtotal);

  return {
    valid: true,
    discountAmount,
    promoCodeRow: { id: promo.id, code: promo.code, discount_type: promo.discount_type, discount_value: promo.discount_value },
  };
}

export interface DigitalPriceBreakdown {
  baseFee: number;
  pricedItems: PricedPageItem[];
  pagesSubtotal: number;
  hasCustomItems: boolean;
  promoCode: string | null;
  discountAmount: number;
  totalPrice: number;
  depositAmount: number;
  finalAmount: number;
  supportTier: SupportTierId;
  supportMonthlyRate: number;
}

/**
 * Single entry point that computes the full, real price breakdown for a
 * digital project. Called server-side every time a price needs to be
 * shown or charged - the client's page selection and promo code are
 * inputs to re-derive from, never the price itself.
 */
export async function computeDigitalPriceBreakdown(
  db: D1Database,
  params: { pageList: PageListItem[]; promoCode?: string | null; supportTier?: unknown }
): Promise<DigitalPriceBreakdown> {
  const { pricedItems, pagesSubtotal, hasCustomItems } = computePageListPricing(params.pageList);
  const tier = resolveSupportTier(params.supportTier);

  let discountAmount = 0;
  let normalizedPromo: string | null = null;
  if (params.promoCode && params.promoCode.trim()) {
    const promoResult = await validateDigitalPromoCode(db, params.promoCode, BASE_BUILD_FEE + pagesSubtotal);
    if (promoResult.valid) {
      discountAmount = promoResult.discountAmount;
      normalizedPromo = promoResult.promoCodeRow!.code;
    }
    // An invalid code at charge time is silently ignored rather than
    // thrown - the review-step endpoint (which the client actually reads
    // errors from) validates and surfaces the message before this point
    // is ever reached for real money.
  }

  const totalPrice = Math.max(BASE_BUILD_FEE + pagesSubtotal - discountAmount, 0);
  const depositAmount = Math.round((totalPrice / 2) * 100) / 100;
  const finalAmount = Math.round((totalPrice - depositAmount) * 100) / 100;

  return {
    baseFee: BASE_BUILD_FEE,
    pricedItems,
    pagesSubtotal,
    hasCustomItems,
    promoCode: normalizedPromo,
    discountAmount,
    totalPrice,
    depositAmount,
    finalAmount,
    supportTier: tier.id,
    supportMonthlyRate: tier.rate,
  };
}
