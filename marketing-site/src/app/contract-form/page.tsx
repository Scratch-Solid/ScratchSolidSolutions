"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContractFormPage() {
  const [duration, setDuration] = useState("1year");
  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userId = localStorage.getItem("user_id");
      const businessName = localStorage.getItem("business_name") || "";

      // POST /contracts
      const response = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          business_name: businessName,
          duration: duration,
          rate: rate,
          status: "pending",
          created_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create contract");
      }

      alert("Contract submitted successfully!");
      window.location.href = "/business-dashboard";
    } catch (error: any) {
      setError(error.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-8">
          Contract Booking
        </h1>

        <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-200 p-8">
          {/* Error Banner */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Duration Selection */}
            <div>
              <label className="block text-sm font-medium text-black mb-4">
                Contract Duration *
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer">
                  <input
                    type="radio"
                    name="duration"
                    value="1year"
                    checked={duration === "1year"}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-black font-semibold">1 Year Contract</span>
                </label>
                <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer">
                  <input
                    type="radio"
                    name="duration"
                    value="5years"
                    checked={duration === "5years"}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-black font-semibold">5 Year Contract</span>
                </label>
              </div>
            </div>

            {/* Rate Field - Disabled (admin-only) */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Rate (Admin Only)
              </label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                placeholder="Rate will be set by admin"
              />
              <p className="text-xs text-gray-500 mt-1">Contact admin to set your contract rate</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? "Submitting..." : "Submit Contract Request"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/booking-options" className="text-blue-600 hover:underline text-sm">
              Back to Booking Options
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
