"use client";

import { useState } from "react";
import Link from "next/link";
import LogoWatermark from '@/components/LogoWatermark';
import BrandHomeLink from '@/components/BrandHomeLink';

export default function ForgotPasswordPage() {
  const [userType, setUserType] = useState<"individual" | "business">("individual");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: userType,
          identifier: identifier,
        }),
      });

      const data = await response.json() as { message?: string; error?: string };

      if (response.ok) {
        setMessage(data.message || 'Reset link sent.');
      } else {
        setError(data.error || "Failed to send reset code");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F2EA] py-8 sm:py-16 px-2 sm:px-4 font-sans">
      <BrandHomeLink />
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl sm:text-4xl font-normal text-center text-[#2E1F16] mb-2 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
          Reset Password
        </h1>
        <p className="text-center text-gray-600 mb-6 sm:mb-8">
          Recover your account password
        </p>

        <div className="relative bg-white rounded-xl shadow-sm border border-[#E9E0D3] p-6 sm:p-8 overflow-hidden">
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
                Account Type
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setUserType("individual")}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    userType === "individual"
                      ? "border-[#B08A5E] bg-[#F7F2EA] text-[#8a6a45]"
                      : "border-gray-300 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("business")}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    userType === "business"
                      ? "border-[#B08A5E] bg-[#F7F2EA] text-[#8a6a45]"
                      : "border-gray-300 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  Business
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {userType === "individual" ? "Phone Number *" : "Email Address *"}
              </label>
              <input
                type={userType === "individual" ? "tel" : "email"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                placeholder={
                  userType === "individual" ? "+27 12 345 6789" : "business@example.com"
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                {userType === "individual"
                  ? "A reset link will be sent to your email if one is registered"
                  : "A reset link will be sent via email"}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#B08A5E] text-[#2E1F16] py-2 px-4 rounded-lg hover:bg-[#c39a6c] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-[#8a6a45] hover:underline text-sm">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
