"use client";
import { useState, useEffect, useCallback } from "react";
import LogoWatermark from '@/components/LogoWatermark';
import {
  calculateQuote,
  getAvailableAreas,
  type QuoteRequest,
  type QuoteResult as PricingQuoteResult
} from '@/lib/pricing-engine';

interface Service {
  id: number;
  name: string;
  description: string;
  detailed_description: string;
  base_price: number;
  room_multiplier: number;
  is_active: number;
  icon: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface ServicePricing {
  id: number;
  service_id: number;
  price: number;
  unit: string;
  min_quantity: number;
  max_quantity: number | null;
  client_type: string;
  special_price: number | null;
  special_label: string;
  special_valid_from: string | null;
  special_valid_until: string | null;
}

interface PromoResult {
  valid: boolean;
  error?: string;
  id?: number;
  code?: string;
  description?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  valid_until?: string;
}

interface QuoteResult {
  id: number;
  ref_number: string;
  zoho_estimate_number: string;
  service_name: string;
  baseline_price: number;
  special_price: number | null;
  special_label: string;
  special_discount: number;
  promo_code: string;
  discount_type: string;
  discount_amount: number;
  final_price: number;
  client_type: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  pricing: ServicePricing[];
  initialServiceId?: number | null;
}

export default function QuoteModal({ isOpen, onClose, services, pricing, initialServiceId }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [clientType, setClientType] = useState<'individual' | 'business'>('individual');
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(initialServiceId || null);
  const [propertyType, setPropertyType] = useState<'residential' | 'office' | 'commercial' | 'post-construction' | 'short-term-stay'>('residential');
  const [area, setArea] = useState('Durbanville');
  const [quantity, setQuantity] = useState(3); // bedrooms or m²
  const [promoInput, setPromoInput] = useState('');
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [actionLoading, setActionLoading] = useState<'accept' | 'decline' | null>(null);
  const [quoteDeclined, setQuoteDeclined] = useState(false);
  const [pricingCalculation, setPricingCalculation] = useState<PricingQuoteResult | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const availableAreas = getAvailableAreas();
  
  // Quote history state
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (initialServiceId) setSelectedServiceId(initialServiceId);
  }, [initialServiceId]);

  // Update quantity when property type changes to ensure it meets minimum requirements
  useEffect(() => {
    if (propertyType === 'residential' || propertyType === 'short-term-stay') {
      setQuantity(prev => Math.max(1, Math.min(prev, 10)));
    } else {
      setQuantity(prev => Math.max(50, prev));
    }
  }, [propertyType]);

  // Get the pricing row matching current client_type (prefers exact match over 'all')
  const getActivePricingRow = useCallback((serviceId: number): ServicePricing | null => {
    const rows = pricing.filter(p =>
      p.service_id === serviceId &&
      (p.client_type === clientType || p.client_type === 'all')
    );
    // Prefer exact client_type match over 'all'
    const exactMatch = rows.find(r => r.client_type === clientType);
    return exactMatch || rows[0] || null;
  }, [pricing, clientType]);

  // Calculate pricing using the new pricing engine
  useEffect(() => {
    if (selectedServiceId) {
      const request: QuoteRequest = {
        serviceId: selectedServiceId,
        propertyType,
        area,
        quantity,
        promoCode: promoResult?.valid ? promoInput.trim() : undefined,
        clientId: userEmail ? 1 : undefined, // TODO: Get actual client ID
        bookingDate: undefined // User can select booking date later
      };

      const row = getActivePricingRow(selectedServiceId);

      const specialPricing = (() => {
        if (!row?.special_price) return undefined;
        return {
          specialPrice: row.special_price,
          specialLabel: row.special_label,
          specialValidFrom: row.special_valid_from || undefined,
          specialValidUntil: row.special_valid_until || undefined
        };
      })();

      // Pass the actual service price from database to pricing engine
      const baseServicePrice = row?.price || 0;

      const promoData = promoResult?.valid ? {
        discountType: promoResult.discount_type || 'percentage',
        discountValue: promoResult.discount_value || 0,
        minAmount: undefined,
        validFrom: undefined,
        validUntil: promoResult.valid_until || undefined,
      } : undefined;

      try {
        const result = calculateQuote(request, specialPricing, promoData, loyaltyPoints, baseServicePrice);
        setPricingCalculation(result);
      } catch (error) {
        console.error('Pricing calculation error:', error);
        setPricingCalculation(null);
      }
    } else {
      setPricingCalculation(null);
    }
  }, [selectedServiceId, propertyType, area, quantity, promoResult, promoInput, loyaltyPoints, userEmail, getActivePricingRow]);

  // Fetch quote history when modal opens and user is authenticated
  useEffect(() => {
    if (isOpen) {
      fetchQuotes();
    }
  }, [isOpen]);

  const fetchQuotes = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(decoded.email);
        setQuotesLoading(true);
        setQuotesError('');
        const res = await fetch('/api/customer/quotes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json() as { quotes: any[] };
          setQuotes(data.quotes || []);
        } else {
          // Don't show error for non-401 errors - might be temporary
          if (res.status === 401) {
            // Token invalid, clear it and don't show error
            localStorage.removeItem('authToken');
            setUserEmail('');
          }
        }
      } catch (err) {
        // Silently fail - don't show error to users
        console.error('Failed to fetch quotes:', err);
      } finally {
        setQuotesLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setClientType('individual');
      setPropertyType('residential');
      setArea('Durbanville');
      setQuantity(3);
      setPromoInput('');
      setPromoResult(null);
      setName('');
      setEmail('');
      setPhone('');
      setSubmitting(false);
      setQuoteResult(null);
      setSubmitError('');
      setActionLoading(null);
      setQuoteDeclined(false);
      setPricingCalculation(null);
      setQuotes([]);
      setQuotesError('');
    }
  }, [isOpen]);

  const getBaselinePrice = useCallback((serviceId: number): number => {
    return getActivePricingRow(serviceId)?.price || 0;
  }, [getActivePricingRow]);

  // Returns the special discount amount if the special is currently active
  const getSpecialDiscount = useCallback((serviceId: number): number => {
    const row = getActivePricingRow(serviceId);
    if (!row?.special_price) return 0;
    const now = new Date().toISOString();
    const fromOk = !row.special_valid_from || row.special_valid_from <= now;
    const untilOk = !row.special_valid_until || row.special_valid_until >= now;
    if (fromOk && untilOk) {
      return Math.max(0, row.price - row.special_price);
    }
    return 0;
  }, [getActivePricingRow]);

  // Promo applies on top of special (to the price-after-special)
  const getPromoDiscount = useCallback((priceAfterSpecial: number): number => {
    if (!promoResult?.valid) return 0;
    if (promoResult.discount_type === 'percentage') {
      return Math.round(priceAfterSpecial * (promoResult.discount_value || 0) / 100 * 100) / 100;
    }
    return Math.min(promoResult.discount_value || 0, priceAfterSpecial);
  }, [promoResult]);

  const getDiscountAmount = useCallback((): number => {
    if (!selectedServiceId) return 0;
    const baseline = getBaselinePrice(selectedServiceId);
    const specialDisc = getSpecialDiscount(selectedServiceId);
    const priceAfterSpecial = Math.max(0, baseline - specialDisc);
    return specialDisc + getPromoDiscount(priceAfterSpecial);
  }, [selectedServiceId, getBaselinePrice, getSpecialDiscount, getPromoDiscount]);

  const getFinalPrice = useCallback((): number => {
    if (!selectedServiceId) return 0;
    return Math.max(0, getBaselinePrice(selectedServiceId) - getDiscountAmount());
  }, [selectedServiceId, getBaselinePrice, getDiscountAmount]);

  const selectedService = services.find(s => s.id === selectedServiceId) || null;

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoResult(null);
    try {
      const res = await fetch(`/api/promo-codes?code=${encodeURIComponent(promoInput.trim())}`);
      const data = await res.json() as PromoResult;
      setPromoResult(data);
    } catch {
      setPromoResult({ valid: false, error: 'Failed to validate promo code' });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !selectedServiceId || !pricingCalculation) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          service_id: selectedServiceId,
          service_name: selectedService?.name || '',
          quantity: quantity,
          baseline_price: pricingCalculation.basePrice,
          transport_fee: pricingCalculation.transportFee,
          property_type: propertyType,
          area: area,
          promo_code: promoResult?.valid ? promoInput.trim() : '',
          discount_type: promoResult?.valid ? promoResult.discount_type : '',
          discount_value: promoResult?.valid ? promoResult.discount_value : 0,
          discount_amount: pricingCalculation.specialDiscount + pricingCalculation.promoDiscount + pricingCalculation.loyaltyDiscount,
          after_hours_surcharge: pricingCalculation.afterHoursSurcharge,
          demand_multiplier: pricingCalculation.demandMultiplier,
          final_price: pricingCalculation.finalPrice,
        }),
      });
      const data = await res.json() as QuoteResult & { error?: string };
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to generate quote');
      } else {
        setQuoteResult(data);
        setStep(3);
        // Refresh quote history if user is authenticated
        if (userEmail) {
          fetchQuotes();
        }
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleAccept = async () => {
    if (!quoteResult) return;
    setActionLoading('accept');
    try {
      await fetch(`/api/quote/${quoteResult.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      });
    } catch { /* non-fatal */ }
    const params = new URLSearchParams({
      service: quoteResult.service_name,
      quote_ref: quoteResult.ref_number,
      type: quoteResult.client_type || clientType,
      name,
      email,
      phone,
    });
    window.location.href = `/auth?${params.toString()}`;
  };

  const handleDecline = async () => {
    if (!quoteResult) return;
    setActionLoading('decline');
    try {
      await fetch(`/api/quote/${quoteResult.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'declined' }),
      });
    } catch { /* non-fatal */ } finally {
      setActionLoading(null);
      setQuoteDeclined(true);
    }
  };

  if (!isOpen) return null;

  const baseline = selectedServiceId ? getBaselinePrice(selectedServiceId) : 0;
  const discountAmt = getDiscountAmount();
  const finalPrice = getFinalPrice();

  return (
    <>
      {/* Print-only quote layout */}
      {quoteResult && (
        <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999] print:p-12">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <img src="/scratchsolid-logo.jpg" alt="Scratch Solid" className="w-16 h-16 object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-blue-700">Scratch Solid Solutions</h1>
                <p className="text-gray-500 text-sm">Professional Cleaning Services</p>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-1">Service Quote</h2>
            <p className="text-gray-500 text-sm mb-6">Ref: {quoteResult.ref_number}{quoteResult.zoho_estimate_number ? ` | Estimate: ${quoteResult.zoho_estimate_number}` : ''}</p>
            <table className="w-full text-sm mb-6">
              <tbody>
                <tr className="border-b"><td className="py-2 text-gray-600">Service</td><td className="py-2 font-semibold text-right">{quoteResult.service_name}</td></tr>
                <tr className="border-b"><td className="py-2 text-gray-600">Base Price</td><td className="py-2 text-right">R{quoteResult.baseline_price.toFixed(2)}</td></tr>
                {quoteResult.discount_amount > 0 && (
                  <tr className="border-b text-green-700"><td className="py-2">Discount ({quoteResult.promo_code})</td><td className="py-2 text-right">- R{quoteResult.discount_amount.toFixed(2)}</td></tr>
                )}
                <tr className="bg-blue-50"><td className="py-3 font-bold text-blue-700">Total</td><td className="py-3 font-bold text-blue-700 text-right text-lg">R{quoteResult.final_price.toFixed(2)}</td></tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-8">This quote is valid for 14 days. Contact us: info@scratchsolidsolutions.co.za</p>
          </div>
        </div>
      )}

      {/* Modal overlay — hidden during print */}
      <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
          <LogoWatermark size="lg" />
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/scratchsolid-logo.jpg" alt="Scratch Solid" className="w-8 h-8 rounded-full object-cover bg-white" />
              <h2 className="text-white font-bold text-lg">
                {step === 3 ? 'Your Quote' : 'Request a Quote'}
              </h2>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors text-2xl leading-none">&times;</button>
          </div>

          {/* Step indicators */}
          {step !== 3 && (
            <div className="flex items-center gap-2 px-6 pt-4">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{s}</div>
                  {s < 2 && <div className={`flex-1 h-0.5 w-8 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                </div>
              ))}
              <span className="text-xs text-gray-400 ml-1">{step === 1 ? 'Select Service' : 'Your Details'}</span>
            </div>
          )}

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* ── QUOTE HISTORY SECTION ── */}
            {userEmail && (
              <div className="border-b border-gray-200 pb-4 mb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-3">Your Quotes</h3>
                {quotesLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : quotesError ? (
                  <p className="text-red-500 text-sm">{quotesError}</p>
                ) : quotes.length === 0 ? (
                  <p className="text-gray-600 text-sm">No quotes yet. Request your first quote below!</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {quotes.map((quote: any) => (
                      <div key={quote.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 text-xs">Ref: {quote.ref_number}</p>
                            <p className="text-xs text-gray-600">{quote.service_name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(quote.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            quote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {quote.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-gray-900 text-sm">
                            R{quote.final_price.toFixed(2)}
                          </p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => window.open(`/api/quotes/${quote.ref_number}/pdf`, '_blank')}
                              className="text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-500/30 rounded transition-all text-xs"
                            >
                              PDF
                            </button>
                            {quote.status === 'pending' && (
                              <button
                                onClick={() => window.location.href = `/services?quote=${quote.ref_number}`}
                                className="text-green-600 hover:text-green-700 px-2 py-1 border border-green-500/30 rounded transition-all text-xs"
                              >
                                Accept
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── NEW QUOTE SECTION ── */}
            {!userEmail && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  <span className="font-semibold">Note:</span> Log in to view your quote history.
                </p>
              </div>
            )}

            {/* ── STEP 1: Service + Details ── */}
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">I am a... <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setClientType('individual'); setSelectedServiceId(null); }}
                      className={`flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                        clientType === 'individual'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-500 hover:border-blue-200'
                      }`}
                    >
                      👤 Individual
                    </button>
                    <button
                      onClick={() => { setClientType('business'); setSelectedServiceId(null); }}
                      className={`flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                        clientType === 'business'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-500 hover:border-blue-200'
                      }`}
                    >
                      🏢 Business
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Property Type <span className="text-red-500">*</span></label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="residential">🏠 Residential</option>
                    <option value="office">🏢 Office</option>
                    <option value="commercial">🏗️ Commercial</option>
                    <option value="post-construction">🔨 Post-Construction</option>
                    <option value="short-term-stay">🏨 Short-Term Stay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Area <span className="text-red-500">*</span></label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="Durbanville">Durbanville (Transport: R50)</option>
                    <option value="Bellville">Bellville (Transport: R45)</option>
                    <option value="Brackenfell">Brackenfell (Transport: R55)</option>
                    <option value="Plattekloof">Plattekloof (Transport: R50)</option>
                    <option value="Tygervalley">Tygervalley (Transport: R45)</option>
                    <option value="Parow">Parow (Transport: R40)</option>
                    <option value="Goodwood">Goodwood (Transport: R40)</option>
                    <option value="Kuils River">Kuils River (Transport: R60)</option>
                    <option value="Kraaifontein">Kraaifontein (Transport: R65)</option>
                    <option value="Stellenbosch">Stellenbosch (Transport: R70)</option>
                    <option value="Paarl">Paarl (Transport: R80)</option>
                    <option value="Wellington">Wellington (Transport: R85)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {propertyType === 'residential' || propertyType === 'short-term-stay' ? 'Number of Bedrooms' : 'Size (m²)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min={propertyType === 'residential' || propertyType === 'short-term-stay' ? 1 : 50}
                    max={propertyType === 'residential' || propertyType === 'short-term-stay' ? 10 : 2000}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {propertyType === 'residential' || propertyType === 'short-term-stay' ? '1-10 bedrooms' : '50-2000 m²'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Select Service <span className="text-red-500">*</span></label>
                  {services.filter(s => s.is_active).length === 0 ? (
                    <p className="text-red-500 text-sm">No services available. Please try again later.</p>
                  ) : (
                    <div className="space-y-2">
                      {services.filter(s => s.is_active).map(service => {
                        const row = getActivePricingRow(service.id);
                        const sd = row ? getSpecialDiscount(service.id) : 0;
                        return (
                          <button
                            key={service.id}
                            onClick={() => setSelectedServiceId(service.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                              selectedServiceId === service.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {service.icon && <span className="text-xl">{service.icon}</span>}
                              <div className="flex-1">
                                <p className="font-semibold text-sm text-gray-800">{service.name}</p>
                                {row && sd > 0 && (
                                  <p className="text-xs font-medium">
                                    <span className="line-through text-gray-400">R{row.price.toFixed(2)}</span>
                                    <span className="text-green-600 ml-1">R{(row.price - sd).toFixed(2)}</span>
                                    <span className="ml-1 bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">{row.special_label || 'Special'}</span>
                                  </p>
                                )}
                                {row && sd === 0 && row.price > 0 && (
                                  <p className="text-xs text-blue-600 font-medium">From R{row.price.toFixed(2)}</p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Promo Code <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoResult(null); }}
                      placeholder="Enter code"
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoInput.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {promoLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {promoResult && (
                    <p className={`text-xs mt-1 font-medium ${promoResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                      {promoResult.valid
                        ? `✓ ${promoResult.description || promoResult.code} — ${promoResult.discount_type === 'percentage' ? `${promoResult.discount_value}% off` : `R${promoResult.discount_value} off`}`
                        : `✗ ${promoResult.error}`}
                    </p>
                  )}
                </div>

                {/* Live price breakdown */}
                {pricingCalculation && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Price Breakdown</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Price</span>
                        <span className="font-medium">R{pricingCalculation.basePrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transport Fee</span>
                        <span className="font-medium">R{pricingCalculation.transportFee.toFixed(2)}</span>
                      </div>
                      {pricingCalculation.specialDiscount > 0 && (
                        <div className="flex justify-between text-green-700">
                          <span>{pricingCalculation.specialLabel || 'Special'}</span>
                          <span className="font-medium">− R{pricingCalculation.specialDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      {pricingCalculation.promoDiscount > 0 && (
                        <div className="flex justify-between text-green-700">
                          <span>Promo ({promoResult?.code})</span>
                          <span className="font-medium">− R{pricingCalculation.promoDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      {pricingCalculation.loyaltyDiscount > 0 && (
                        <div className="flex justify-between text-green-700">
                          <span>Loyalty Discount</span>
                          <span className="font-medium">− R{pricingCalculation.loyaltyDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      {pricingCalculation.afterHoursSurcharge > 0 && (
                        <div className="flex justify-between text-orange-700">
                          <span>After-Hours Surcharge</span>
                          <span className="font-medium">+ R{pricingCalculation.afterHoursSurcharge.toFixed(2)}</span>
                        </div>
                      )}
                      {pricingCalculation.demandMultiplier > 1 && (
                        <div className="flex justify-between text-orange-700">
                          <span>Peak Hours</span>
                          <span className="font-medium">+ R{pricingCalculation.breakdown.surcharges.demand.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-blue-200 pt-2">
                        <span className="font-bold text-blue-700">Total</span>
                        <span className="font-bold text-blue-700 text-base">R{pricingCalculation.finalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                    {/* Loyalty points preview */}
                    {loyaltyPoints > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-xs text-gray-600">
                          🎁 You have <span className="font-bold text-blue-700">{loyaltyPoints}</span> loyalty points
                          {loyaltyPoints >= 1000 && loyaltyPoints < 5000 && ' (Silver tier - 5% discount)'}
                          {loyaltyPoints >= 5000 && ' (Gold tier - 10% discount)'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedServiceId}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  Continue →
                </button>
              </>
            )}

            {/* ── STEP 2: Contact Details ── */}
            {step === 2 && (
              <>
                <p className="text-sm text-gray-500">Fill in your details and we&apos;ll confirm your quote instantly.</p>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(quote will be sent here)</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+27..."
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {/* Summary recap */}
                {pricingCalculation && (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1 border border-gray-200">
                    <p className="font-semibold text-gray-700">{selectedService?.icon} {selectedService?.name}</p>
                    <p className="text-gray-500">Base: R{pricingCalculation.basePrice.toFixed(2)} + Transport: R{pricingCalculation.transportFee.toFixed(2)}</p>
                    {(pricingCalculation.specialDiscount + pricingCalculation.promoDiscount + pricingCalculation.loyaltyDiscount) > 0 && (
                      <p className="text-green-600">Discount: −R{(pricingCalculation.specialDiscount + pricingCalculation.promoDiscount + pricingCalculation.loyaltyDiscount).toFixed(2)}</p>
                    )}
                    <p className="font-bold text-blue-700">Total: R{pricingCalculation.finalPrice.toFixed(2)}</p>
                  </div>
                )}

                {submitError && <p className="text-sm text-red-500">{submitError}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !name.trim()}
                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Generating...' : 'Get My Quote'}
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: Quote Result ── */}
            {step === 3 && quoteResult && (
              <>
                {quoteDeclined ? (
                  /* Decline confirmation screen */
                  <div className="text-center py-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    <p className="text-lg font-bold text-gray-800 mb-2">No worries!</p>
                    <p className="text-sm text-gray-500 mb-1">Your quote has been noted as declined.</p>
                    <p className="text-sm text-gray-500 mb-6">Feel free to reach out anytime — we&apos;re here when you&apos;re ready.</p>
                    <div className="flex flex-col gap-3">
                      <a
                        href="https://wa.me/27696735947"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors text-center"
                      >
                        Chat on WhatsApp
                      </a>
                      <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Quote accepted / pending decision screen */
                  <>
                    <div className="text-center mb-2">
                      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <p className="text-lg font-bold text-gray-800">Your Quote is Ready!</p>
                      <p className="text-xs text-gray-400 mt-1">Ref: <span className="font-mono font-semibold text-blue-600">{quoteResult.ref_number}</span></p>
                      {quoteResult.zoho_estimate_number && (
                        <p className="text-xs text-gray-400">Estimate #: {quoteResult.zoho_estimate_number}</p>
                      )}
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100 space-y-3">
                      <p className="font-bold text-gray-800 text-base">{quoteResult.service_name}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Base Price</span>
                          <span>R{quoteResult.baseline_price.toFixed(2)}</span>
                        </div>
                        {quoteResult.discount_amount > 0 && (
                          <div className="flex justify-between text-green-700">
                            <span>Promo ({quoteResult.promo_code})</span>
                            <span>− R{quoteResult.discount_amount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-blue-700 text-base border-t border-blue-200 pt-2">
                          <span>Total</span>
                          <span>R{quoteResult.final_price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 text-center">Valid for 14 days. A copy has been sent to your email if provided.</p>

                    {/* Download PDF */}
                    <button
                      onClick={handlePrintPdf}
                      className="w-full py-2.5 bg-white border-2 border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Download / Print PDF
                    </button>

                    {/* Accept / Decline */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 text-center mb-3">Do you accept this quote?</p>
                      <div className="flex gap-3">
                        <button
                          onClick={handleDecline}
                          disabled={!!actionLoading}
                          className="flex-1 py-3 bg-white border-2 border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === 'decline' ? 'Declining...' : 'No, Decline'}
                        </button>
                        <button
                          onClick={handleAccept}
                          disabled={!!actionLoading}
                          className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {actionLoading === 'accept' ? 'Booking...' : 'Yes, Accept & Book'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
