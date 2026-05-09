"use client";
import { useState, useEffect, useCallback } from "react";
import LogoWatermark from '@/components/LogoWatermark';

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

  useEffect(() => {
    if (initialServiceId) setSelectedServiceId(initialServiceId);
  }, [initialServiceId]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setClientType('individual');
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
    }
  }, [isOpen]);

  // Get the pricing row matching current client_type (prefers exact match over 'all')
  const getActivePricingRow = useCallback((serviceId: number): ServicePricing | null => {
    const rows = pricing.filter(p =>
      p.service_id === serviceId &&
      (p.client_type === clientType || p.client_type === 'all')
    );
    // Prefer exact client_type match over 'all'
    return rows.find(r => r.client_type === clientType) || rows[0] || null;
  }, [pricing, clientType]);

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
    if (!name.trim() || !selectedServiceId) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const row = getActivePricingRow(selectedServiceId);
      const baseline = row?.price || 0;
      const specialDisc = getSpecialDiscount(selectedServiceId);
      const priceAfterSpecial = Math.max(0, baseline - specialDisc);
      const promoDisc = getPromoDiscount(priceAfterSpecial);
      const discountAmt = specialDisc + promoDisc;
      const finalPrice = Math.max(0, baseline - discountAmt);

      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          service_id: selectedServiceId,
          service_name: selectedService?.name || '',
          quantity: 1,
          baseline_price: baseline,
          promo_code: promoResult?.valid ? promoInput.trim() : '',
          discount_type: promoResult?.valid ? promoResult.discount_type : '',
          discount_value: promoResult?.valid ? promoResult.discount_value : 0,
          discount_amount: discountAmt,
          final_price: finalPrice,
        }),
      });
      const data = await res.json() as QuoteResult & { error?: string };
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to generate quote');
      } else {
        setQuoteResult(data);
        setStep(3);
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
            {/* ── STEP 1: Service + Promo ── */}
            {step === 1 && (
              <>
                {/* Client type selector */}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Select Service <span className="text-red-500">*</span></label>
                  <div className="space-y-2">
                    {services.filter(s => s.is_active).map(service => (
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
                            {(() => {
                              const row = getActivePricingRow(service.id);
                              if (!row) return null;
                              const sd = getSpecialDiscount(service.id);
                              return sd > 0 ? (
                                <p className="text-xs font-medium">
                                  <span className="line-through text-gray-400">R{row.price.toFixed(2)}</span>
                                  <span className="text-green-600 ml-1">R{(row.price - sd).toFixed(2)}</span>
                                  <span className="ml-1 bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">{row.special_label || 'Special'}</span>
                                </p>
                              ) : row.price > 0 ? (
                                <p className="text-xs text-blue-600 font-medium">From R{row.price.toFixed(2)}</p>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
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
                {selectedServiceId && baseline > 0 && (() => {
                  const activeRow = getActivePricingRow(selectedServiceId);
                  const sd = getSpecialDiscount(selectedServiceId);
                  const priceAfterSpecial = Math.max(0, baseline - sd);
                  const pd = getPromoDiscount(priceAfterSpecial);
                  return (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Price Breakdown</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Base Price</span>
                          <span className="font-medium">R{baseline.toFixed(2)}</span>
                        </div>
                        {sd > 0 && (
                          <div className="flex justify-between text-green-700">
                            <span>{activeRow?.special_label || 'Special'}</span>
                            <span className="font-medium">− R{sd.toFixed(2)}</span>
                          </div>
                        )}
                        {pd > 0 && (
                          <div className="flex justify-between text-green-700">
                            <span>Promo ({promoResult?.code})</span>
                            <span className="font-medium">− R{pd.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-blue-200 pt-2">
                          <span className="font-bold text-blue-700">Total</span>
                          <span className="font-bold text-blue-700 text-base">R{finalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1 border border-gray-200">
                  <p className="font-semibold text-gray-700">{selectedService?.icon} {selectedService?.name}</p>
                  <p className="text-gray-500">Base: R{baseline.toFixed(2)}{discountAmt > 0 ? ` → Discount: −R${discountAmt.toFixed(2)}` : ''}</p>
                  <p className="font-bold text-blue-700">Total: R{finalPrice.toFixed(2)}</p>
                </div>

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
