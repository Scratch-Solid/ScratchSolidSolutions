// Analytics tracking utility for promo codes

export interface AnalyticsEvent {
  eventType: 'page_view' | 'qr_scan' | 'short_url_click' | 'promo_applied';
  promoCode?: string;
  promoCodeId?: number;
  referrer?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function trackAnalyticsEvent(event: AnalyticsEvent) {
  try {
    // Send to analytics API
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      }),
    });
  } catch (error) {
    console.error('Failed to track analytics event:', error);
    // Don't throw - analytics failures shouldn't break the app
  }
}

export function trackPageView(promoCode?: string) {
  return trackAnalyticsEvent({
    eventType: 'page_view',
    promoCode,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
  });
}

export function trackPromoApplied(promoCode: string, promoCodeId?: number) {
  return trackAnalyticsEvent({
    eventType: 'promo_applied',
    promoCode,
    promoCodeId,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

export function getPromoCodeFromURL(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('promo');
}

export function shouldTrackPromo(): boolean {
  const promoCode = getPromoCodeFromURL();
  return promoCode !== null && promoCode.length > 0;
}

// Auto-track promo code on page load if present
export function initPromoTracking() {
  if (typeof window === 'undefined') return;

  const promoCode = getPromoCodeFromURL();
  if (promoCode && shouldTrackPromo()) {
    // Track page view with promo code
    trackPageView(promoCode).catch(console.error);
  }
}
