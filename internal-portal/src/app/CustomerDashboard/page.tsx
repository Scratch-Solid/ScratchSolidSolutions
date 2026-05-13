"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from "@/components/DashboardLayout";

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
}

export default function CustomerDashboard() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/customer/quotes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
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

  const handleDownloadPDF = (refNumber: string) => {
    window.open(`/api/quotes/${refNumber}/pdf`, '_blank');
  };

  if (loading) {
    return (
      <DashboardLayout title="Customer Dashboard" role="customer">
        <div className="animate-pulse">Loading...</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Customer Dashboard" role="customer">
        <div className="text-red-500">{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Customer Dashboard" role="customer">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Welcome Back!</h1>
          <p className="text-blue-100">View your quote history and track the status of your requests.</p>
        </div>

        {/* Quote History */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Quote History</h2>
          
          {quotes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60">No quotes yet. Request your first quote today!</p>
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
                      <p className="font-semibold text-white">Ref: {quote.ref_number}</p>
                      <p className="text-sm text-white/60">{quote.service_name}</p>
                      <p className="text-xs text-white/40">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(quote.status)}`}>
                      {quote.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/60 text-sm">
                        {quote.discount_amount > 0 && (
                          <span className="line-through mr-2">R{quote.baseline_price.toFixed(2)}</span>
                        )}
                        <span className="font-bold text-white text-lg">R{quote.final_price.toFixed(2)}</span>
                      </p>
                      {quote.promo_code && (
                        <p className="text-xs text-green-400">Promo: {quote.promo_code}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadPDF(quote.ref_number)}
                        className="text-blue-400 hover:text-blue-300 px-3 py-1 border border-blue-500/30 rounded transition-all text-sm"
                      >
                        Download PDF
                      </button>
                      {quote.status === 'pending' && (
                        <button
                          onClick={() => window.location.href = `/services?quote=${quote.ref_number}`}
                          className="text-green-400 hover:text-green-300 px-3 py-1 border border-green-500/30 rounded transition-all text-sm"
                        >
                          Accept Quote
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {quote.zoho_estimate_number && (
                    <p className="text-xs text-white/40 mt-2">
                      Estimate #: {quote.zoho_estimate_number}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => window.location.href = '/services'}
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg transition-colors"
          >
            <h3 className="text-lg font-bold mb-2">Request New Quote</h3>
            <p className="text-blue-100 text-sm">Get a quote for our cleaning services</p>
          </button>
          
          <button
            onClick={() => window.location.href = '/contact'}
            className="bg-white/10 hover:bg-white/20 text-white p-6 rounded-lg border border-white/20 transition-colors"
          >
            <h3 className="text-lg font-bold mb-2">Contact Us</h3>
            <p className="text-white/60 text-sm">Have questions? Reach out to our team</p>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
