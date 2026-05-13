"use client";

import React, { useState, useEffect } from 'react';
import SiteNav from "@/components/SiteNav";

interface QuoteRequest {
  id: number;
  ref_number: string;
  name: string;
  email: string;
  phone: string;
  service_name: string;
  baseline_price: number;
  discount_amount: number;
  final_price: number;
  promo_code: string;
  status: 'pending' | 'sent' | 'accepted' | 'declined';
  created_at: string;
  zoho_estimate_id: string;
  zoho_estimate_number: string;
  valid_until?: string;
}

export default function CustomerDashboard() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Get user email from JWT token
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(decoded.email);
        fetchQuotes(token);
      } catch (err) {
        setError('Failed to authenticate');
        setLoading(false);
      }
    } else {
      setError('Please log in to view your quotes');
      setLoading(false);
    }
  }, []);

  const fetchQuotes = async (token: string) => {
    try {
      const res = await fetch('/api/customer/quotes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json() as { quotes: QuoteRequest[] };
        setQuotes(data.quotes || []);
      } else {
        setError('Failed to fetch quotes');
      }
    } catch (err) {
      setError('Failed to fetch quotes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isQuoteExpired = (validUntil: string | undefined) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const getExpirationColor = (validUntil: string | undefined) => {
    if (!validUntil) return 'hidden';
    if (isQuoteExpired(validUntil)) return 'bg-red-100 text-red-800';
    const daysUntilExpiry = Math.ceil((new Date(validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 7) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getExpirationText = (validUntil: string | undefined) => {
    if (!validUntil) return '';
    if (isQuoteExpired(validUntil)) return 'Expired';
    const daysUntilExpiry = Math.ceil((new Date(validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 1) return 'Expires today';
    if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`;
    return `Valid until ${new Date(validUntil).toLocaleDateString()}`;
  };

  const handleDownloadPDF = (refNumber: string) => {
    window.open(`/api/quotes/${refNumber}/pdf`, '_blank');
  };

  if (loading) {
    return (
      <>
        <SiteNav current="customer-dashboard" />
        <div className="flex flex-col items-center justify-center min-h-screen pt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SiteNav current="customer-dashboard" />
        <div className="flex flex-col items-center justify-center min-h-screen pt-20 px-4">
          <div className="max-w-md w-full bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="text-red-500 text-center mb-4">{error}</div>
            <button
              onClick={() => window.location.href = '/auth'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors"
            >
              Log In
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteNav current="customer-dashboard" />
      <div className="flex flex-col items-center justify-center min-h-screen py-8 sm:py-16 px-2 sm:px-4 font-sans animate-fade-in pt-20">
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
            My Quotes
          </h1>
          <p className="text-base sm:text-lg text-zinc-700 mb-8 text-center relative z-10 leading-relaxed">
            View your quote history and track the status of your requests.
          </p>

          <div className="relative z-10">
            {quotes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-600">No quotes yet. Request your first quote today!</p>
                <button
                  onClick={() => window.location.href = '/services'}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Request a Quote
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {quotes.map((quote) => (
                  <div key={quote.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-zinc-900">Ref: {quote.ref_number}</p>
                        <p className="text-sm text-zinc-600">{quote.service_name}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(quote.created_at).toLocaleDateString()}
                        </p>
                        {quote.valid_until && (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${getExpirationColor(quote.valid_until)}`}>
                            {getExpirationText(quote.valid_until)}
                          </span>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-zinc-600 text-sm">
                          {quote.discount_amount > 0 && (
                            <span className="line-through mr-2">R{quote.baseline_price.toFixed(2)}</span>
                          )}
                          <span className="font-bold text-zinc-900 text-lg">R{quote.final_price.toFixed(2)}</span>
                        </p>
                        {quote.promo_code && (
                          <p className="text-xs text-green-600">Promo: {quote.promo_code}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadPDF(quote.ref_number)}
                          className="text-blue-600 hover:text-blue-700 px-3 py-1 border border-blue-500/30 rounded transition-all text-sm"
                        >
                          Download PDF
                        </button>
                        {quote.status === 'pending' && !isQuoteExpired(quote.valid_until) && (
                          <button
                            onClick={() => window.location.href = `/services?quote=${quote.ref_number}`}
                            className="text-green-600 hover:text-green-700 px-3 py-1 border border-green-500/30 rounded transition-all text-sm"
                          >
                            Accept Quote
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {quote.zoho_estimate_number && (
                      <p className="text-xs text-zinc-500 mt-2">
                        Estimate #: {quote.zoho_estimate_number}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 relative z-10">
            <button
              onClick={() => window.location.href = '/services'}
              className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg transition-colors"
            >
              <h3 className="text-lg font-bold mb-2">Request New Quote</h3>
              <p className="text-blue-100 text-sm">Get a quote for our cleaning services</p>
            </button>
            
            <button
              onClick={() => window.location.href = '/contact'}
              className="bg-white/10 hover:bg-white/20 text-zinc-900 p-6 rounded-lg border border-white/20 transition-colors"
            >
              <h3 className="text-lg font-bold mb-2">Contact Us</h3>
              <p className="text-zinc-600 text-sm">Have questions? Reach out to our team</p>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
