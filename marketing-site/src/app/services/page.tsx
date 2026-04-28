"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import QuoteModal from "@/components/QuoteModal";
import SiteNav from "@/components/SiteNav";

interface Service {
  id: number;
  name: string;
  description: string;
  icon: string;
  active: boolean;
}

interface ServicePricing {
  id: number;
  service_id: number;
  min_quantity: number;
  max_quantity: number | null;
  price: number;
  unit: string;
  client_type: string;
  special_price: number | null;
  special_label: string;
  special_valid_from: string | null;
  special_valid_until: string | null;
  service_name?: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [pricing, setPricing] = useState<ServicePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuote, setShowQuote] = useState(false);
  const [quoteServiceId, setQuoteServiceId] = useState<number | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  const toggleFlip = (id: number) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sRes, pRes] = await Promise.all([
          fetch('/api/services'),
          fetch('/api/service-pricing'),
        ]);
        const servicesData: Service[] = sRes.ok ? await sRes.json() as Service[] : [];
        const pricingData: ServicePricing[] = pRes.ok ? await pRes.json() as ServicePricing[] : [];
        setServices(servicesData);
        setPricing(pricingData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Auto-open quote modal if ?promo= param present (from QR code scan)
  useEffect(() => {
    if (!loading && searchParams.get('promo')) {
      setShowQuote(true);
    }
  }, [loading, searchParams]);

  const openQuote = (serviceId?: number) => {
    setQuoteServiceId(serviceId || null);
    setShowQuote(true);
  };

  const getServicePricing = (serviceId: number) => pricing.filter(p => p.service_id === serviceId);

  const getPriceLabel = (serviceId: number): string => {
    const rows = pricing.filter(p => p.service_id === serviceId);
    if (!rows.length) return '';
    const row = rows[0];
    const now = new Date().toISOString();
    const specialActive = row.special_price !== null &&
      (!row.special_valid_from || row.special_valid_from <= now) &&
      (!row.special_valid_until || row.special_valid_until >= now);
    if (specialActive && row.special_price !== null) {
      return `R${row.special_price.toFixed(2)} · ${row.special_label || 'Special'} (was R${row.price.toFixed(2)})`;
    }
    return `From R${row.price.toFixed(2)}`;
  };

  return (
    <>
      <SiteNav current="services" />
      <QuoteModal
        isOpen={showQuote}
        onClose={() => setShowQuote(false)}
        services={services}
        pricing={pricing}
        initialServiceId={quoteServiceId}
      />

      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 sm:py-16 px-2 sm:px-4 font-sans animate-fade-in pt-20">
        <div className="max-w-2xl w-full bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-10 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
            <img
              src="/scratchsolid-logo.jpg"
              alt="Scratch Solid Logo Background"
              width={300}
              height={300}
              className="opacity-10 w-72 h-72 sm:w-96 sm:h-96 object-contain"
              aria-hidden="true"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-700 mb-6 sm:mb-8 text-center relative z-10">
            Our Services
          </h1>

          {loading ? (
            <div className="text-center text-gray-500 relative z-10">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 relative z-10">
              {services.filter(s => s.active).map((service) => {
                const isFlipped = flippedCards.has(service.id);
                const priceLabel = getPriceLabel(service.id);
                return (
                  <div
                    key={service.id}
                    style={{ perspective: '1000px', height: '220px' }}
                    className="cursor-pointer"
                    onClick={() => toggleFlip(service.id)}
                    role="button"
                    aria-label={`${isFlipped ? 'Flip back' : 'See details for'} ${service.name}`}
                  >
                    <div
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        transition: 'transform 0.5s ease',
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      {/* ── FRONT ── */}
                      <div
                        style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
                        className="bg-blue-50 rounded-2xl border-2 border-blue-100 p-5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            {service.icon && <span className="text-3xl">{service.icon}</span>}
                            <h3 className="text-lg sm:text-xl font-bold text-blue-700 leading-tight">{service.name}</h3>
                          </div>
                          {priceLabel && (
                            <p className="text-sm font-semibold text-green-600 mt-1">{priceLabel}</p>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 text-right mt-2">Tap to see details →</p>
                      </div>

                      {/* ── BACK ── */}
                      <div
                        style={{
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          position: 'absolute',
                          inset: 0,
                        }}
                        className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 flex flex-col"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                          {service.icon && <span className="text-xl">{service.icon}</span>}
                          <h3 className="text-white font-bold text-sm leading-tight">{service.name}</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 text-blue-100 text-xs leading-relaxed mb-3"
                          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.3) transparent' }}
                        >
                          {service.description || 'No details available.'}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); openQuote(service.id); }}
                          className="flex-shrink-0 w-full py-2 bg-white text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-50 transition-colors shadow"
                        >
                          Get a Quote
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-center relative z-10 mt-6">
            <button
              onClick={() => openQuote()}
              className="rounded-full bg-blue-600 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
            >
              Request a Quote
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
