"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BookingQuotePanel from "@/components/BookingQuotePanel";

export default function BusinessBookingPage() {
  const [bookingMode, setBookingMode] = useState<"choose" | "once-off" | "contract">("choose");
  const [weekendRequired, setWeekendRequired] = useState(false);
  const [contractData, setContractData] = useState({
    duration: "1_year",
    start_date: "",
    end_date: "",
    terms: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  const contractDurations = [
    { value: "1_year", label: "1 Year" },
    { value: "5_years", label: "5 Years" },
  ];

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) {
      window.location.href = '/auth?redirect=/business-booking';
      return;
    }
    setAuthChecked(true);
  }, []);

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          business_id: userId,
          business_name: localStorage.getItem('userName') || '',
          contract_type: 'standard',
          rate_per_hour: 150,
          weekend_rate_multiplier: weekendRequired ? 1.5 : 1,
          start_date: contractData.start_date || new Date().toISOString().split('T')[0],
          end_date: contractData.end_date || null,
          terms: contractData.terms || '',
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error || 'Contract request failed');
        return;
      }
      if (weekendRequired) {
        await fetch('/api/weekend-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            business_id: userId,
            requested_date: contractData.start_date || new Date().toISOString().split('T')[0],
            special_instructions: contractData.terms || '',
          }),
        });
      }
      setSuccess('Contract request submitted! Our team will review and confirm within 24 hours.');
      setTimeout(() => { window.location.href = '/business-dashboard'; }, 2500);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/business-dashboard"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-blue-700">Business Booking</h1>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-semibold text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm font-semibold text-green-700">{success}</p>
          </div>
        )}

        {/* ── Mode selection ── */}
        {bookingMode === 'choose' && (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-8">
            <h2 className="text-xl font-bold text-center text-gray-800 mb-6">
              What type of booking do you need?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <button
                onClick={() => setBookingMode('once-off')}
                className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-200 hover:border-blue-500 transition-colors text-left"
              >
                <div className="text-3xl mb-3">🗓️</div>
                <h3 className="text-lg font-bold text-blue-700 mb-1">Once-off Booking</h3>
                <p className="text-sm text-gray-600">
                  Single cleaning visit — choose your service, area, rooms, and get an accurate price instantly.
                </p>
              </button>
              <button
                onClick={() => setBookingMode('contract')}
                className="p-6 bg-green-50 rounded-2xl border-2 border-green-200 hover:border-green-500 transition-colors text-left"
              >
                <div className="text-3xl mb-3">📋</div>
                <h3 className="text-lg font-bold text-green-700 mb-1">Contract Booking</h3>
                <p className="text-sm text-gray-600">
                  Long-term recurring contract — submit your requirements and our team will confirm rates.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ── Once-off: BookingQuotePanel ── */}
        {bookingMode === 'once-off' && (
          <div className="space-y-4">
            <button
              onClick={() => setBookingMode('choose')}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              ← Change booking type
            </button>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <p className="text-sm text-blue-700 font-medium">
                🏢 Business rate — select your property type, area, and number of rooms/m² for an accurate quote.
              </p>
            </div>
            <BookingQuotePanel
              mode="business"
              onSuccess={(_id, _amount) => {
                setSuccess('Booking confirmed! You will receive a confirmation email shortly.');
                setTimeout(() => { window.location.href = '/business-dashboard'; }, 2500);
              }}
              onCancel={() => setBookingMode('choose')}
            />
          </div>
        )}

        {/* ── Contract: existing contract form ── */}
        {bookingMode === 'contract' && (
          <div className="space-y-4">
            <button
              onClick={() => setBookingMode('choose')}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              ← Change booking type
            </button>
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 space-y-5">
              <h2 className="text-xl font-bold text-gray-800">Contract Request</h2>
              <p className="text-sm text-gray-600">
                Submit your contract requirements. Our team will review and send you a formal contract with confirmed rates within 24 hours.
              </p>

              <form onSubmit={handleContractSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contract Duration <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    {contractDurations.map((d) => (
                      <label key={d.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="duration"
                          value={d.value}
                          checked={contractData.duration === d.value}
                          onChange={(e) => setContractData({ ...contractData, duration: e.target.value })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm font-medium text-gray-700">{d.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={contractData.start_date}
                      onChange={(e) => setContractData({ ...contractData, start_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      End Date (optional)
                    </label>
                    <input
                      type="date"
                      value={contractData.end_date}
                      onChange={(e) => setContractData({ ...contractData, end_date: e.target.value })}
                      min={contractData.start_date || new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={weekendRequired}
                      onChange={(e) => setWeekendRequired(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-sm font-semibold text-gray-700">Weekend work required</span>
                  </label>
                  {weekendRequired && (
                    <p className="text-xs text-orange-600 mt-1 ml-7">
                      Weekend rate multiplier: 1.5× — a weekend request will also be submitted for admin scheduling.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Additional Requirements / Terms
                  </label>
                  <textarea
                    value={contractData.terms}
                    onChange={(e) => setContractData({ ...contractData, terms: e.target.value })}
                    rows={3}
                    placeholder="Describe your premises, frequency, any special requirements…"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Contract rates are confirmed by our admin team. You will receive a formal quote with pricing breakdown within 24 hours of submission.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingMode('choose')}
                    className="flex-1 rounded-full border-2 border-gray-300 px-6 py-3 text-gray-700 font-semibold hover:border-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !contractData.start_date}
                    className="flex-1 rounded-full bg-green-600 px-6 py-3 text-white font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting…' : 'Submit Contract Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
