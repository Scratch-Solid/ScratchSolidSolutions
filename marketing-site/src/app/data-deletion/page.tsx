"use client";

import { useState } from "react";
import Link from "next/link";
import LogoWatermark from '@/components/LogoWatermark';
import BrandHomeLink from '@/components/BrandHomeLink';

export default function DataDeletionPage() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/data-deletion/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, reason }),
      });

      const data = await response.json() as { message?: string; error?: string };

      if (response.ok) {
        setMessage(data.message || 'Confirmation link sent.');
        setEmail("");
        setReason("");
      } else {
        setError(data.error || "Failed to submit deletion request");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 sm:py-16 px-2 sm:px-4 font-sans">
      <BrandHomeLink />
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-blue-700 mb-2">
          Delete My Data
        </h1>
        <p className="text-center text-gray-600 mb-6 sm:mb-8">
          Request removal of your personal information from Scratch Solid Solutions
        </p>

        <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8 overflow-hidden">
          <LogoWatermark size="md" />
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                We&apos;ll email a confirmation link to this address before processing your request.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Let us know why you're requesting deletion (optional)"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {loading ? "Submitting..." : "Request Data Deletion"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/privacy" className="text-blue-600 hover:underline text-sm">
              Back to Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
