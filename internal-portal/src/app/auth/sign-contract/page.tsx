"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignContractPage() {
  const router = useRouter();
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("pendingConsent")) router.push("/auth/employee-consent");
  }, [router]);

  const handleSign = async () => {
    setLoading(true);
    try {
      const consent = JSON.parse(localStorage.getItem("pendingConsent") || "{}");
      const res = await fetch("/api/auth/sign-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentData: consent }),
      });
      if (res.ok) {
        setSigned(true);
        setTimeout(() => {
          localStorage.removeItem("pendingConsent");
          router.push("/auth/login");
        }, 3000);
      } else {
        setError("Failed to sign contract");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel max-w-2xl w-full p-6">
        <h1 className="text-2xl font-bold mb-4">Employment Contract</h1>
        
        <div className="bg-gray-50 p-4 rounded mb-6 text-sm">
          <h2 className="font-bold mb-2">EMPLOYMENT AGREEMENT</h2>
          <p className="mb-2">This Employment Agreement is entered into between Scratch Solid Solutions and the Employee.</p>
          <p className="mb-2">By signing this contract, you agree to the terms and conditions of employment.</p>
          <p className="mb-2">Terms include but are not limited to: work hours, compensation, confidentiality, and termination policies.</p>
          <p className="text-xs text-gray-500">Full contract details available from HR department.</p>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {signed ? (
          <div className="text-center">
            <div className="text-4xl mb-2">✓</div>
            <p className="text-green-600 font-bold">Contract signed successfully!</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={signed}
                onChange={(e) => setSigned(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-sm">I have read and agree to the terms of this employment contract</span>
            </label>
            <button
              onClick={handleSign}
              disabled={!signed || loading}
              className="w-full bg-blue-600 text-white p-3 rounded disabled:bg-gray-400"
            >
              {loading ? "Signing..." : "Sign Contract Electronically"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
