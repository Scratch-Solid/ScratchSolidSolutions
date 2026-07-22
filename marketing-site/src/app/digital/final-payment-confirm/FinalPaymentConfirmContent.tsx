"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function FinalPaymentConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intakeId = searchParams.get("intake_id");
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("Confirming your payment...");

  useEffect(() => {
    const verify = async () => {
      if (!intakeId || !reference) {
        setStatus("failed");
        setMessage("We couldn't find your payment reference. If you were charged, our team will follow up by email.");
        return;
      }

      try {
        const response = await fetch(`/api/intake/${intakeId}/final-payment/verify?reference=${encodeURIComponent(reference)}`);
        const data = await response.json() as { status?: string; message?: string };

        if (response.ok && data.status === "success") {
          setStatus("success");
          setMessage(data.message || "Final payment confirmed. Thank you!");
        } else {
          setStatus("failed");
          setMessage(data.message || "We couldn't confirm your payment. Please contact us if you were charged.");
        }
      } catch {
        setStatus("failed");
        setMessage("Network error while confirming your payment. Please contact us if you were charged.");
      }
    };

    verify();
  }, [intakeId, reference]);

  return (
    <div className="min-h-screen bg-white py-16 px-4 font-sans">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8">
          {status === "verifying" && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#B08A5E] mx-auto mb-4"></div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Confirming Your Payment</h2>
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
              <h2 className="text-2xl font-semibold text-green-700 mb-2">Payment Received!</h2>
              <p className="text-gray-600">{message}</p>
              <button onClick={() => router.push("/digital")} className="mt-6 py-2.5 px-6 bg-[#2E1F16] text-[#F7F2EA] font-semibold rounded-xl hover:bg-[#241811] transition-colors">
                Back to Digital
              </button>
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
              <button onClick={() => router.push("/digital")} className="mt-6 py-2.5 px-6 bg-[#B08A5E] text-[#2E1F16] font-bold rounded-xl hover:bg-[#c39a6c] transition-colors">
                Back to Digital
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
