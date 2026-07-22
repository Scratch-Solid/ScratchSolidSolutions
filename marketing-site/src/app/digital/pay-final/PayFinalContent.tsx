"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Breakdown {
  totalPrice: number;
  depositAmount: number;
  finalAmount: number;
}

export default function PayFinalContent() {
  const searchParams = useSearchParams();
  const intakeId = searchParams.get("intake_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!intakeId) {
      setError("Missing project reference.");
      setLoading(false);
      return;
    }
    fetch(`/api/intake/${intakeId}/pricing`)
      .then((res) => res.json() as Promise<Breakdown & { error?: string }>)
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setBreakdown(data);
        }
      })
      .catch(() => setError("Failed to load your project's pricing."))
      .finally(() => setLoading(false));
  }, [intakeId]);

  async function payNow() {
    if (!intakeId) return;
    setPaying(true);
    setError("");
    try {
      const res = await fetch(`/api/intake/${intakeId}/final-payment/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_url: `${window.location.origin}/digital/final-payment-confirm?intake_id=${intakeId}` }),
      });
      const data = await res.json() as { authorization_url?: string; error?: string };
      if (!res.ok || !data.authorization_url) {
        setError(data.error || "Failed to start payment.");
        setPaying(false);
        return;
      }
      window.location.href = data.authorization_url;
    } catch {
      setError("Network error. Please try again.");
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen bg-white py-16 px-4 font-sans">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Final Payment</h2>
          {loading && <p className="text-gray-600">Loading your project details...</p>}
          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-2">{error}</p>}
          {breakdown && (
            <>
              <p className="text-gray-600 mb-4">Your project is complete. Settle your remaining balance below to receive your delivery.</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left text-sm space-y-1 mb-4">
                <div className="flex justify-between"><span className="text-gray-500">Total build price</span><span className="font-semibold">R{breakdown.totalPrice.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Deposit already paid</span><span className="font-semibold">R{breakdown.depositAmount.toLocaleString()}</span></div>
                <div className="flex justify-between text-base border-t border-gray-200 pt-1 mt-1"><span className="font-bold text-gray-800">Balance due now</span><span className="font-bold text-[#2E1F16]">R{breakdown.finalAmount.toLocaleString()}</span></div>
              </div>
              <button onClick={payNow} disabled={paying} className="w-full py-3 bg-[#B08A5E] text-[#2E1F16] font-bold rounded-xl hover:bg-[#c39a6c] disabled:opacity-50 transition-colors">
                {paying ? "Redirecting…" : `Pay R${breakdown.finalAmount.toLocaleString()} now`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
