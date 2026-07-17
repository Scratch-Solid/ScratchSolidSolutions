"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BookingQuotePanel from "@/components/BookingQuotePanel";
import { authFetch, getCsrfToken } from "@/lib/authFetch";

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
      const csrfToken = await getCsrfToken();
      const res = await authFetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
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
        await authFetch('/api/weekend-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
          },
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
      <div className="min-h-screen bg-[#F7F2EA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#B08A5E]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F2EA] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 rounded-xl px-4 py-3" style={{ background: "linear-gradient(135deg, #2E1F16, #3a281a)" }}>
          <Link
            href="/business-dashboard"
            className="text-[#CBB89A] hover:text-[#F7F2EA] font-medium text-sm"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-normal tracking-tight text-[#F7F2EA]" style={{ fontFamily: "Georgia, serif" }}>Business Booking</h1>
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
          <div className="bg-white rounded-2xl shadow-sm border border-[#E9E0D3] p-8">
            <h2 className="text-xl font-normal text-center text-[#2E1F16] mb-6" style={{ fontFamily: "Georgia, serif" }}>
              What type of booking do you need?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <button
                onClick={() => setBookingMode('once-off')}
                className="p-6 bg-[#F7F2EA] rounded-2xl border-2 border-[#E9E0D3] hover:border-[#B08A5E] transition-colors text-left"
              >
                <div className="text-3xl mb-3">🗓️</div>
                <h3 className="text-lg font-bold text-[#2E1F16] mb-1">Once-off Booking</h3>
                <p className="text-sm text-stone-600">
                  Single cleaning visit — choose your service, area, rooms, and get an accurate price instantly.
                </p>
              </button>
              <button
                onClick={() => setBookingMode('contract')}
                className="p-6 bg-[#F0E6D6] rounded-2xl border-2 border-[#E9DCC0] hover:border-[#B08A5E] transition-colors text-left"
              >
                <div className="text-3xl mb-3">📋</div>
                <h3 className="text-lg font-bold text-[#2E1F16] mb-1">Contract Booking</h3>
                <p className="text-sm text-stone-600">
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
              className="text-[#8a6a45] hover:text-[#2E1F16] font-medium text-sm"
            >
              ← Change booking type
            </button>
            <div className="bg-white border border-[#E9E0D3] rounded-xl px-4 py-3">
              <p className="text-sm text-[#3f342a] font-medium">
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
              className="text-[#8a6a45] hover:text-[#2E1F16] font-medium text-sm"
            >
              ← Change booking type
            </button>
            <div className="bg-white rounded-2xl shadow-sm border border-[#E9E0D3] p-6 space-y-5">
              <h2 className="text-xl font-normal text-[#2E1F16]" style={{ fontFamily: "Georgia, serif" }}>Contract Request</h2>
              <p className="text-sm text-stone-600">
                Submit your contract requirements. Our team will review and send you a formal contract with confirmed rates within 24 hours.
              </p>

              <form onSubmit={handleContractSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
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
                          className="w-4 h-4 text-[#B08A5E] accent-[#B08A5E]"
                        />
                        <span className="text-sm font-medium text-stone-700">{d.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={contractData.start_date}
                      onChange={(e) => setContractData({ ...contractData, start_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full border border-[#E9E0D3] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1">
                      End Date (optional)
                    </label>
                    <input
                      type="date"
                      value={contractData.end_date}
                      onChange={(e) => setContractData({ ...contractData, end_date: e.target.value })}
                      min={contractData.start_date || new Date().toISOString().split('T')[0]}
                      className="w-full border border-[#E9E0D3] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={weekendRequired}
                      onChange={(e) => setWeekendRequired(e.target.checked)}
                      className="w-5 h-5 text-[#B08A5E] accent-[#B08A5E] rounded"
                    />
                    <span className="text-sm font-semibold text-stone-700">Weekend work required</span>
                  </label>
                  {weekendRequired && (
                    <p className="text-xs text-orange-600 mt-1 ml-7">
                      Weekend rate multiplier: 1.5× — a weekend request will also be submitted for admin scheduling.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">
                    Additional Requirements / Terms
                  </label>
                  <textarea
                    value={contractData.terms}
                    onChange={(e) => setContractData({ ...contractData, terms: e.target.value })}
                    rows={3}
                    placeholder="Describe your premises, frequency, any special requirements…"
                    className="w-full border border-[#E9E0D3] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B08A5E] resize-none"
                  />
                </div>

                <div className="bg-[#FAF3E6] border border-[#E9DCC0] rounded-xl p-4">
                  <p className="text-sm text-[#3f342a]">
                    <strong>Note:</strong> Contract rates are confirmed by our admin team. You will receive a formal quote with pricing breakdown within 24 hours of submission.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingMode('choose')}
                    className="flex-1 rounded-full border-2 border-[#E9E0D3] px-6 py-3 text-[#2E1F16] font-semibold hover:border-[#D3C6AE] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !contractData.start_date}
                    className="flex-1 rounded-full bg-[#B08A5E] px-6 py-3 text-[#2E1F16] font-bold hover:bg-[#c39a6c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
