"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  max_quantity: number;
  price: number;
  unit: string;
  service_name?: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [pricing, setPricing] = useState<ServicePricing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/services').then(res => res.json()),
      fetch('/api/service-pricing').then(res => res.json())
    ]).then(([servicesData, pricingData]) => {
      setServices(servicesData || []);
      setPricing(pricingData || []);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching data:', err);
      setLoading(false);
    });
  }, []);

  const getServicePricing = (serviceId: number) => {
    return pricing.filter(p => p.service_id === serviceId);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 sm:py-16 px-2 sm:px-4 font-sans animate-fade-in">
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
          <div className="space-y-4 sm:space-y-6 relative z-10">
            {services.filter(s => s.active).map((service) => (
              <div key={service.id} className="bg-blue-50 rounded-xl p-4 sm:p-6 border-2 border-blue-100 hover:border-blue-300 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  {service.icon && <span className="text-3xl">{service.icon}</span>}
                  <h3 className="text-xl sm:text-2xl font-bold text-blue-700">{service.name}</h3>
                </div>
                <p className="text-gray-700 text-sm sm:text-base mb-3">{service.description}</p>
                {getServicePricing(service.id).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-sm font-semibold text-blue-600 mb-2">Pricing:</p>
                    {getServicePricing(service.id).map((price) => (
                      <p key={price.id} className="text-xs text-gray-600">
                        {price.min_quantity}{price.unit} - {price.max_quantity ? `${price.max_quantity}${price.unit}` : 'unlimited'}: R{price.price}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="text-center text-blue-700 font-semibold text-base sm:text-lg mb-4 sm:mb-6 relative z-10">
          <span>Contact us for a detailed quote or to discuss your specific requirements!</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
          <a href="/contact" className="rounded-full bg-blue-600 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors">Request a Quote</a>
          <a href="/" className="rounded-full bg-zinc-200 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-blue-700 shadow hover:bg-zinc-300 transition-colors">Back to Home</a>
        </div>
      </div>
    </div>
  );
}
