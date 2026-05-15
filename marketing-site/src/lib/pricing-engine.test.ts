// Unit Tests for Pricing Engine
// Phase 2: Pricing Engine & Quote Logic

import {
  calculateBasePrice,
  calculateTransportFee,
  isAfterHours,
  calculateAfterHoursSurcharge,
  isPeakHours,
  calculateDemandMultiplier,
  calculateLoyaltyDiscount,
  validateSpecialPricing,
  calculateSpecialDiscount,
  applyPromoDiscount,
  calculateQuote,
  getPricingConfig,
  getAvailableAreas,
  getTransportFee
} from './pricing-engine';

describe('Pricing Engine', () => {
  describe('calculateBasePrice', () => {
    it('should calculate residential standard pricing correctly', () => {
      const price = calculateBasePrice('residential-standard', 3);
      expect(price).toBe(750); // 450 + (3 * 100)
    });

    it('should calculate residential deep pricing correctly', () => {
      const price = calculateBasePrice('residential-deep', 100);
      expect(price).toBe(2450); // 950 + (100 * 15)
    });

    it('should calculate post-construction pricing correctly', () => {
      const price = calculateBasePrice('post-construction', 100);
      expect(price).toBe(6500); // 2000 + (100 * 45)
    });

    it('should calculate commercial pricing correctly', () => {
      const price = calculateBasePrice('commercial', 200);
      expect(price).toBe(5500); // 1500 + (200 * 20)
    });

    it('should calculate short-term stay pricing correctly', () => {
      const price = calculateBasePrice('short-term-stay', 2);
      expect(price).toBe(650); // 350 + (2 * 150)
    });

    it('should throw error for unknown service type', () => {
      expect(() => calculateBasePrice('unknown', 1)).toThrow('Unknown service type');
    });

    it('should throw error for quantity below minimum', () => {
      expect(() => calculateBasePrice('residential-deep', 10)).toThrow('Quantity must be at least 50');
    });

    it('should throw error for quantity above maximum', () => {
      expect(() => calculateBasePrice('residential-standard', 10)).toThrow('Quantity must not exceed 5');
    });
  });

  describe('calculateTransportFee', () => {
    it('should return correct transport fee for Durbanville', () => {
      const fee = calculateTransportFee('Durbanville');
      expect(fee).toBe(50);
    });

    it('should return correct transport fee for Bellville', () => {
      const fee = calculateTransportFee('Bellville');
      expect(fee).toBe(45);
    });

    it('should throw error for unknown area', () => {
      expect(() => calculateTransportFee('Unknown')).toThrow('Unknown area');
    });
  });

  describe('isAfterHours', () => {
    it('should return true for 7 PM', () => {
      const date = new Date('2026-05-14T19:00:00');
      expect(isAfterHours(date.toISOString())).toBe(true);
    });

    it('should return true for 2 AM', () => {
      const date = new Date('2026-05-14T02:00:00');
      expect(isAfterHours(date.toISOString())).toBe(true);
    });

    it('should return false for 10 AM', () => {
      const date = new Date('2026-05-14T10:00:00');
      expect(isAfterHours(date.toISOString())).toBe(false);
    });

    it('should return false for undefined date', () => {
      expect(isAfterHours(undefined)).toBe(false);
    });
  });

  describe('calculateAfterHoursSurcharge', () => {
    it('should calculate 15% surcharge for residential standard', () => {
      const surcharge = calculateAfterHoursSurcharge(1000, 'residential-standard', '2026-05-14T19:00:00');
      expect(surcharge).toBe(150); // 1000 * 0.15
    });

    it('should calculate 20% surcharge for post-construction', () => {
      const surcharge = calculateAfterHoursSurcharge(1000, 'post-construction', '2026-05-14T19:00:00');
      expect(surcharge).toBe(200); // 1000 * 0.20
    });

    it('should return 0 for normal hours', () => {
      const surcharge = calculateAfterHoursSurcharge(1000, 'residential-standard', '2026-05-14T10:00:00');
      expect(surcharge).toBe(0);
    });
  });

  describe('isPeakHours', () => {
    it('should return true for weekday 10 AM', () => {
      const date = new Date('2026-05-14T10:00:00'); // Wednesday
      expect(isPeakHours(date.toISOString())).toBe(true);
    });

    it('should return true for weekday 3 PM', () => {
      const date = new Date('2026-05-14T15:00:00'); // Wednesday
      expect(isPeakHours(date.toISOString())).toBe(true);
    });

    it('should return false for weekend 10 AM', () => {
      const date = new Date('2026-05-17T10:00:00'); // Saturday
      expect(isPeakHours(date.toISOString())).toBe(false);
    });

    it('should return false for weekday 8 PM', () => {
      const date = new Date('2026-05-14T20:00:00'); // Wednesday
      expect(isPeakHours(date.toISOString())).toBe(false);
    });
  });

  describe('calculateDemandMultiplier', () => {
    it('should return 1.10 for peak hours', () => {
      const multiplier = calculateDemandMultiplier('2026-05-14T10:00:00');
      expect(multiplier).toBe(1.10);
    });

    it('should return 1.0 for off-peak', () => {
      const multiplier = calculateDemandMultiplier('2026-05-14T20:00:00');
      expect(multiplier).toBe(1.0);
    });

    it('should return 1.0 for undefined date', () => {
      const multiplier = calculateDemandMultiplier(undefined);
      expect(multiplier).toBe(1.0);
    });
  });

  describe('calculateLoyaltyDiscount', () => {
    it('should return 0 for bronze tier (0 points)', () => {
      const discount = calculateLoyaltyDiscount(0, 1000);
      expect(discount).toBe(0);
    });

    it('should return 5% for silver tier (1000 points)', () => {
      const discount = calculateLoyaltyDiscount(1000, 1000);
      expect(discount).toBe(50); // 1000 * 0.05
    });

    it('should return 10% for gold tier (5000 points)', () => {
      const discount = calculateLoyaltyDiscount(5000, 1000);
      expect(discount).toBe(100); // 1000 * 0.10
    });
  });

  describe('validateSpecialPricing', () => {
    it('should return true for valid date range', () => {
      const validFrom = '2026-05-01T00:00:00';
      const validUntil = '2026-05-31T23:59:59';
      expect(validateSpecialPricing(validFrom, validUntil)).toBe(true);
    });

    it('should return false for expired date range', () => {
      const validFrom = '2026-01-01T00:00:00';
      const validUntil = '2026-01-31T23:59:59';
      expect(validateSpecialPricing(validFrom, validUntil)).toBe(false);
    });

    it('should return false for future date range', () => {
      const validFrom = '2026-12-01T00:00:00';
      const validUntil = '2026-12-31T23:59:59';
      expect(validateSpecialPricing(validFrom, validUntil)).toBe(false);
    });
  });

  describe('calculateSpecialDiscount', () => {
    it('should calculate discount when special price is lower', () => {
      const { discount, label } = calculateSpecialDiscount(800, 1000);
      expect(discount).toBe(200);
      expect(label).toBe('Special Offer');
    });

    it('should return 0 when special price is higher', () => {
      const { discount, label } = calculateSpecialDiscount(1200, 1000);
      expect(discount).toBe(0);
      expect(label).toBe('');
    });

    it('should return 0 when special price is null', () => {
      const { discount, label } = calculateSpecialDiscount(null, 1000);
      expect(discount).toBe(0);
      expect(label).toBe('');
    });
  });

  describe('applyPromoDiscount', () => {
    it('should apply percentage discount correctly', () => {
      const promoData = {
        discountType: 'percentage' as const,
        discountValue: 10
      };
      const result = applyPromoDiscount('SAVE10', 1000, promoData);
      expect(result.discount).toBe(100); // 1000 * 0.10
      expect(result.valid).toBe(true);
    });

    it('should apply fixed discount correctly', () => {
      const promoData = {
        discountType: 'fixed' as const,
        discountValue: 50
      };
      const result = applyPromoDiscount('SAVE50', 1000, promoData);
      expect(result.discount).toBe(50);
      expect(result.valid).toBe(true);
    });

    it('should return 0 for invalid promo code', () => {
      const result = applyPromoDiscount(undefined, 1000);
      expect(result.discount).toBe(0);
      expect(result.valid).toBe(false);
    });

    it('should return error for expired promo', () => {
      const promoData = {
        discountType: 'percentage' as const,
        discountValue: 10,
        validFrom: '2026-01-01T00:00:00',
        validUntil: '2026-01-31T23:59:59'
      };
      const result = applyPromoDiscount('EXPIRED', 1000, promoData);
      expect(result.discount).toBe(0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Promo code expired');
    });

    it('should return error for minimum amount not met', () => {
      const promoData = {
        discountType: 'percentage' as const,
        discountValue: 10,
        minAmount: 500
      };
      const result = applyPromoDiscount('MIN500', 100, promoData);
      expect(result.discount).toBe(0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Minimum amount R500 required');
    });

    it('should not exceed subtotal', () => {
      const promoData = {
        discountType: 'fixed' as const,
        discountValue: 2000
      };
      const result = applyPromoDiscount('BIGDISCOUNT', 1000, promoData);
      expect(result.discount).toBe(1000); // Capped at subtotal
      expect(result.valid).toBe(true);
    });
  });

  describe('calculateQuote', () => {
    it('should calculate quote for residential standard', () => {
      const request = {
        serviceId: 1,
        propertyType: 'residential' as const,
        area: 'Durbanville',
        quantity: 3
      };
      const result = calculateQuote(request);
      expect(result.basePrice).toBe(750); // 450 + (3 * 100)
      expect(result.transportFee).toBe(50);
      expect(result.finalPrice).toBe(800); // 750 + 50
    });

    it('should calculate quote with after-hours surcharge', () => {
      const request = {
        serviceId: 1,
        propertyType: 'residential' as const,
        area: 'Durbanville',
        quantity: 3,
        bookingDate: '2026-05-14T19:00:00'
      };
      const result = calculateQuote(request);
      expect(result.basePrice).toBe(750);
      expect(result.transportFee).toBe(50);
      expect(result.afterHoursSurcharge).toBe(112.5); // 750 * 0.15
      expect(result.finalPrice).toBe(912.5); // 750 + 50 + 112.5
    });

    it('should calculate quote with promo code', () => {
      const request = {
        serviceId: 1,
        propertyType: 'residential' as const,
        area: 'Durbanville',
        quantity: 3,
        promoCode: 'SAVE10'
      };
      const promoData = {
        discountType: 'percentage' as const,
        discountValue: 10
      };
      const result = calculateQuote(request, undefined, promoData);
      expect(result.basePrice).toBe(750);
      expect(result.transportFee).toBe(50);
      expect(result.promoDiscount).toBe(80); // 800 * 0.10
      expect(result.finalPrice).toBe(720); // 800 - 80
    });

    it('should calculate quote with loyalty discount', () => {
      const request = {
        serviceId: 1,
        propertyType: 'residential' as const,
        area: 'Durbanville',
        quantity: 3
      };
      const result = calculateQuote(request, undefined, undefined, 5000);
      expect(result.basePrice).toBe(750);
      expect(result.transportFee).toBe(50);
      expect(result.loyaltyDiscount).toBe(80); // 800 * 0.10
      expect(result.finalPrice).toBe(720); // 800 - 80
    });

    it('should calculate quote for short-term stay with laundry fee', () => {
      const request = {
        serviceId: 1,
        propertyType: 'short-term-stay' as const,
        area: 'Durbanville',
        quantity: 2
      };
      const result = calculateQuote(request);
      expect(result.basePrice).toBe(800); // 350 + (2 * 150) + 150 (laundry)
      expect(result.transportFee).toBe(50);
      expect(result.finalPrice).toBe(850); // 800 + 50
    });

    it('should calculate quote with demand-based pricing', () => {
      const request = {
        serviceId: 1,
        propertyType: 'residential' as const,
        area: 'Durbanville',
        quantity: 3,
        bookingDate: '2026-05-14T10:00:00' // Peak hours
      };
      const result = calculateQuote(request);
      expect(result.demandMultiplier).toBe(1.10);
      expect(result.breakdown.surcharges.demand).toBe(80); // 800 * 0.10
    });

    it('should return detailed breakdown', () => {
      const request = {
        serviceId: 1,
        propertyType: 'residential' as const,
        area: 'Durbanville',
        quantity: 3
      };
      const result = calculateQuote(request);
      expect(result.breakdown).toEqual({
        basePrice: 750,
        transportFee: 50,
        subtotal: 800,
        discounts: {
          special: 0,
          promo: 0,
          loyalty: 0,
          total: 0
        },
        surcharges: {
          afterHours: 0,
          demand: 0,
          total: 0
        },
        final: 800
      });
    });
  });

  describe('getPricingConfig', () => {
    it('should return pricing config for residential standard', () => {
      const config = getPricingConfig('residential-standard');
      expect(config).toBeDefined();
      expect(config?.basePrice).toBe(450);
      expect(config?.unitType).toBe('bedroom');
    });

    it('should return undefined for unknown service type', () => {
      const config = getPricingConfig('unknown');
      expect(config).toBeUndefined();
    });
  });

  describe('getAvailableAreas', () => {
    it('should return all available areas', () => {
      const areas = getAvailableAreas();
      expect(areas).toContain('Durbanville');
      expect(areas).toContain('Bellville');
      expect(areas).toContain('Brackenfell');
      expect(areas.length).toBe(12);
    });
  });

  describe('getTransportFee', () => {
    it('should return transport fee for area', () => {
      const fee = getTransportFee('Durbanville');
      expect(fee).toBe(50);
    });

    it('should return undefined for unknown area', () => {
      const fee = getTransportFee('Unknown');
      expect(fee).toBeUndefined();
    });
  });
});
