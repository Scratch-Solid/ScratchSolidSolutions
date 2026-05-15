// Pricing Engine Configuration
// World-class pricing calculation logic for quote system
// Phase 2: Pricing Engine & Quote Logic

export interface PricingConfig {
  basePrice: number;
  unitType: 'bedroom' | 'm2' | 'flat' | 'hourly';
  unitPrice: number;
  minQuantity?: number;
  maxQuantity?: number;
  afterHoursSurcharge: number; // percentage (0-20)
}

export interface QuoteRequest {
  serviceId: number;
  propertyType: 'residential' | 'office' | 'commercial' | 'post-construction' | 'short-term-stay';
  area: string;
  quantity: number; // bedrooms or m² based on service
  promoCode?: string;
  clientId?: number; // for loyalty discount
  bookingDate?: string; // for special pricing and after-hours
}

export interface QuoteResult {
  basePrice: number;
  transportFee: number;
  specialDiscount: number;
  specialLabel: string;
  promoDiscount: number;
  afterHoursSurcharge: number;
  loyaltyDiscount: number;
  demandMultiplier: number;
  finalPrice: number;
  breakdown: {
    basePrice: number;
    transportFee: number;
    subtotal: number;
    discounts: {
      special: number;
      promo: number;
      loyalty: number;
      total: number;
    };
    surcharges: {
      afterHours: number;
      demand: number;
      total: number;
    };
    final: number;
  };
}

// Service pricing matrix
const SERVICE_PRICING: Record<string, PricingConfig> = {
  'residential-standard': {
    basePrice: 450,
    unitType: 'bedroom',
    unitPrice: 100,
    minQuantity: 1,
    maxQuantity: 10,
    afterHoursSurcharge: 15
  },
  'residential-deep': {
    basePrice: 950,
    unitType: 'bedroom',
    unitPrice: 150,
    minQuantity: 1,
    maxQuantity: 10,
    afterHoursSurcharge: 15
  },
  'post-construction': {
    basePrice: 2000,
    unitType: 'm2',
    unitPrice: 45,
    minQuantity: 50,
    maxQuantity: 2000,
    afterHoursSurcharge: 20
  },
  'commercial': {
    basePrice: 1500,
    unitType: 'm2',
    unitPrice: 20,
    minQuantity: 50,
    maxQuantity: 2000,
    afterHoursSurcharge: 15
  },
  'short-term-stay': {
    basePrice: 350,
    unitType: 'bedroom',
    unitPrice: 150,
    minQuantity: 1,
    maxQuantity: 10,
    afterHoursSurcharge: 15
  }
};

// Location transport fees (from locations table)
const TRANSPORT_FEES: Record<string, number> = {
  'Durbanville': 50,
  'Bellville': 45,
  'Brackenfell': 55,
  'Plattekloof': 50,
  'Tygervalley': 45,
  'Parow': 40,
  'Goodwood': 40,
  'Kuils River': 60,
  'Kraaifontein': 65,
  'Stellenbosch': 70,
  'Paarl': 80,
  'Wellington': 85
};

// Laundry fee for short-term stay
const LAUNDRY_FEE = 150;

// After-hours time ranges (24-hour format)
const AFTER_HOURS_START = 18; // 6 PM
const AFTER_HOURS_END = 8; // 8 AM

// Peak hours for demand-based pricing
const PEAK_HOURS_START = 8; // 8 AM
const PEAK_HOURS_END = 18; // 6 PM
const PEAK_DAYS = [1, 2, 3, 4, 5]; // Monday to Friday

// Loyalty tiers
const LOYALTY_TIERS = {
  bronze: { minPoints: 0, discount: 0 },
  silver: { minPoints: 1000, discount: 0.05 }, // 5%
  gold: { minPoints: 5000, discount: 0.10 } // 10%
};

/**
 * Calculate base price based on service type and quantity
 */
export function calculateBasePrice(
  serviceType: string,
  quantity: number
): number {
  const config = SERVICE_PRICING[serviceType];
  if (!config) {
    throw new Error(`Unknown service type: ${serviceType}`);
  }

  // Validate quantity
  if (config.minQuantity && quantity < config.minQuantity) {
    throw new Error(`Quantity must be at least ${config.minQuantity}`);
  }
  if (config.maxQuantity && quantity > config.maxQuantity) {
    throw new Error(`Quantity must not exceed ${config.maxQuantity}`);
  }

  // Calculate base price
  if (config.unitType === 'flat') {
    return config.basePrice;
  } else {
    return config.basePrice + (quantity * config.unitPrice);
  }
}

/**
 * Calculate transport fee based on location
 */
export function calculateTransportFee(area: string): number {
  const fee = TRANSPORT_FEES[area];
  if (fee === undefined) {
    throw new Error(`Unknown area: ${area}`);
  }
  return fee;
}

/**
 * Check if booking time is after hours
 */
export function isAfterHours(bookingDate?: string): boolean {
  if (!bookingDate) return false;

  const date = new Date(bookingDate);
  const hour = date.getHours();

  return hour >= AFTER_HOURS_START || hour < AFTER_HOURS_END;
}

/**
 * Calculate after-hours surcharge
 */
export function calculateAfterHoursSurcharge(
  basePrice: number,
  serviceType: string,
  bookingDate?: string
): number {
  if (!isAfterHours(bookingDate)) return 0;

  const config = SERVICE_PRICING[serviceType];
  if (!config) return 0;

  const surchargePercentage = config.afterHoursSurcharge;
  return (basePrice * surchargePercentage) / 100;
}

/**
 * Check if it's peak hours for demand-based pricing
 */
export function isPeakHours(bookingDate?: string): boolean {
  if (!bookingDate) return false;

  const date = new Date(bookingDate);
  const hour = date.getHours();
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

  const isWeekday = PEAK_DAYS.includes(day);
  const isPeakTime = hour >= PEAK_HOURS_START && hour < PEAK_HOURS_END;

  return isWeekday && isPeakTime;
}

/**
 * Calculate demand-based pricing multiplier
 */
export function calculateDemandMultiplier(bookingDate?: string): number {
  if (!bookingDate) return 1.0;

  if (isPeakHours(bookingDate)) {
    return 1.10; // 10% increase during peak hours
  }

  return 1.0;
}

/**
 * Calculate loyalty discount based on client points
 */
export function calculateLoyaltyDiscount(points: number, subtotal: number): number {
  let tier = LOYALTY_TIERS.bronze;

  if (points >= LOYALTY_TIERS.gold.minPoints) {
    tier = LOYALTY_TIERS.gold;
  } else if (points >= LOYALTY_TIERS.silver.minPoints) {
    tier = LOYALTY_TIERS.silver;
  }

  return subtotal * tier.discount;
}

/**
 * Validate special pricing (date range)
 */
export function validateSpecialPricing(
  validFrom?: string,
  validUntil?: string
): boolean {
  if (!validFrom || !validUntil) return false;

  const now = new Date();
  const from = new Date(validFrom);
  const until = new Date(validUntil);

  return now >= from && now <= until;
}

/**
 * Calculate special discount
 */
export function calculateSpecialDiscount(
  specialPrice: number | null,
  baselinePrice: number
): { discount: number; label: string } {
  if (specialPrice === null || specialPrice >= baselinePrice) {
    return { discount: 0, label: '' };
  }

  const discount = baselinePrice - specialPrice;
  return { discount, label: 'Special Offer' };
}

/**
 * Validate and apply promo code discount
 */
export function applyPromoDiscount(
  promoCode: string | undefined,
  subtotal: number,
  promoData?: {
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minAmount?: number;
    validFrom?: string;
    validUntil?: string;
    maxUses?: number;
    usedCount?: number;
  }
): { discount: number; valid: boolean; error?: string } {
  if (!promoCode || !promoData) {
    return { discount: 0, valid: false };
  }

  // Check if promo is valid
  if (promoData.validFrom && promoData.validUntil) {
    if (!validateSpecialPricing(promoData.validFrom, promoData.validUntil)) {
      return { discount: 0, valid: false, error: 'Promo code expired' };
    }
  }

  // Check minimum amount
  if (promoData.minAmount && subtotal < promoData.minAmount) {
    return { discount: 0, valid: false, error: `Minimum amount R${promoData.minAmount} required` };
  }

  // Check usage limit
  if (promoData.maxUses && promoData.usedCount && promoData.usedCount >= promoData.maxUses) {
    return { discount: 0, valid: false, error: 'Promo code usage limit reached' };
  }

  // Calculate discount
  let discount = 0;
  if (promoData.discountType === 'percentage') {
    discount = (subtotal * promoData.discountValue) / 100;
  } else {
    discount = promoData.discountValue;
  }

  // Ensure discount doesn't exceed subtotal
  discount = Math.min(discount, subtotal);

  return { discount, valid: true };
}

/**
 * Main quote calculation function
 */
export function calculateQuote(
  request: QuoteRequest,
  specialPricing?: {
    specialPrice: number | null;
    specialLabel: string;
    specialValidFrom?: string;
    specialValidUntil?: string;
  },
  promoData?: {
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minAmount?: number;
    validFrom?: string;
    validUntil?: string;
    maxUses?: number;
    usedCount?: number;
  },
  loyaltyPoints?: number
): QuoteResult {
  // Determine service type from property type
  const serviceTypeMap: Record<string, string> = {
    'residential': 'residential-standard',
    'office': 'commercial',
    'commercial': 'commercial',
    'post-construction': 'post-construction',
    'short-term-stay': 'short-term-stay'
  };

  const serviceType = serviceTypeMap[request.propertyType] || 'residential-standard';

  // Calculate base price
  let basePrice = calculateBasePrice(serviceType, request.quantity);

  // Add laundry fee for short-term stay
  if (request.propertyType === 'short-term-stay') {
    basePrice += LAUNDRY_FEE;
  }

  // Calculate transport fee
  const transportFee = calculateTransportFee(request.area);

  // Calculate subtotal before discounts and surcharges
  let subtotal = basePrice + transportFee;

  // Apply demand-based pricing
  const demandMultiplier = calculateDemandMultiplier(request.bookingDate);
  subtotal = subtotal * demandMultiplier;

  // Calculate special discount
  let specialDiscount = 0;
  let specialLabel = '';
  if (specialPricing) {
    const { discount, label } = calculateSpecialDiscount(
      specialPricing.specialPrice,
      basePrice
    );
    specialDiscount = discount;
    specialLabel = label;
  }

  // Calculate after-hours surcharge
  const afterHoursSurcharge = calculateAfterHoursSurcharge(
    basePrice,
    serviceType,
    request.bookingDate
  );

  // Apply promo code discount
  const promoResult = applyPromoDiscount(
    request.promoCode,
    subtotal,
    promoData
  );
  const promoDiscount = promoResult.discount;

  // Calculate loyalty discount
  const loyaltyDiscount = loyaltyPoints
    ? calculateLoyaltyDiscount(loyaltyPoints, subtotal)
    : 0;

  // Calculate total discounts
  const totalDiscounts = specialDiscount + promoDiscount + loyaltyDiscount;

  // Calculate total surcharges
  const totalSurcharges = afterHoursSurcharge + (subtotal * (demandMultiplier - 1));

  // Calculate final price
  const finalPrice = Math.max(0, subtotal - totalDiscounts + totalSurcharges);

  // Build breakdown
  const breakdown = {
    basePrice,
    transportFee,
    subtotal: basePrice + transportFee,
    discounts: {
      special: specialDiscount,
      promo: promoDiscount,
      loyalty: loyaltyDiscount,
      total: totalDiscounts
    },
    surcharges: {
      afterHours: afterHoursSurcharge,
      demand: subtotal * (demandMultiplier - 1),
      total: totalSurcharges
    },
    final: finalPrice
  };

  return {
    basePrice,
    transportFee,
    specialDiscount,
    specialLabel,
    promoDiscount,
    afterHoursSurcharge,
    loyaltyDiscount,
    demandMultiplier,
    finalPrice,
    breakdown
  };
}

/**
 * Get pricing configuration for a service type
 */
export function getPricingConfig(serviceType: string): PricingConfig | undefined {
  return SERVICE_PRICING[serviceType];
}

/**
 * Get all available areas
 */
export function getAvailableAreas(): string[] {
  return Object.keys(TRANSPORT_FEES);
}

/**
 * Get transport fee for an area
 */
export function getTransportFee(area: string): number | undefined {
  return TRANSPORT_FEES[area];
}
