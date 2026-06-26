"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PaymentVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const trxref = searchParams.get("trxref");

  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    const verifyPayment = async () => {
      const ref = reference || trxref;
      if (!ref) {
        setStatus("failed");
        setMessage("No payment reference found.");
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/payments/paystack/verify?reference=${ref}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json() as { status?: string; message?: string };

        if (response.ok && data.status === "success") {
          setStatus("success");
          setMessage("Payment successful! Your booking has been confirmed.");
          // Redirect to booking details after 3 seconds
          setTimeout(() => {
            router.push("/bookings");
          }, 3000);
        } else {
          setStatus("failed");
          setMessage(data.message || "Payment verification failed. Please contact support.");
        }
      } catch (error) {
        setStatus("failed");
        setMessage("Network error during verification. Please contact support.");
      }
    };

    verifyPayment();
  }, [reference, trxref, router]);

  return (
    <div className="min-h-screen bg-white py-16 px-4 font-sans">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8">
          {status === "verifying" && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Processing Payment</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-green-700 mb-2">Payment Successful!</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-4">Redirecting to your bookings...</p>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-red-700 mb-2">Payment Issue</h2>
              <p className="text-gray-600">{message}</p>
              <div className="mt-6 flex gap-4 justify-center">
                <button
                  onClick={() => router.push("/client-dashboard")}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="px-6 py-2 rounded-lg border-2 border-gray-300 hover:border-gray-400"
                >
                  Home
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
