"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignContractPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signatureDate, setSignatureDate] = useState("");
  const [contractContent, setContractContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    // Fetch contract content from database
    const fetchContractContent = async () => {
      try {
        const response = await fetch('/api/admin/contract-content');
        if (response.ok) {
          const data = await response.json();
          setContractContent(data);
        }
      } catch (err) {
        console.error('Error fetching contract content:', err);
      } finally {
        setLoadingContent(false);
      }
    };
    fetchContractContent();
  }, [router]);

  const handleSign = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const signatureDate = new Date().toISOString();
      setSignatureDate(signatureDate);

      const res = await fetch("/api/auth/sign-contract", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ signatureDate }),
      });
      if (res.ok) {
        setSigned(true);
        setTimeout(() => {
          // Redirect to dashboard
          const userRole = localStorage.getItem("userRole");
          if (userRole === 'cleaner') {
            router.push("/cleaner-dashboard");
          } else if (userRole === 'digital') {
            router.push("/digital-dashboard");
          } else if (userRole === 'transport') {
            router.push("/transport-dashboard");
          } else {
            router.push("/admin-dashboard");
          }
        }, 2000);
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error || "Failed to sign contract");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="glass-panel max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Scratch Solid Solutions</h1>
          <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>Employment Contract</p>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg mb-6 text-sm leading-relaxed">
          <h2 className="font-bold text-lg mb-4">EMPLOYMENT AGREEMENT</h2>
          {loadingContent ? (
            <p>Loading contract content...</p>
          ) : (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: contractContent?.contract_text || `
                <p>This Employment Agreement is entered into between Scratch Solid Solutions and the Employee.</p>
                <p>By signing this contract, you agree to the terms and conditions of employment.</p>
                <p>Terms include but are not limited to: work hours, compensation, confidentiality, and termination policies.</p>
                <p class="text-xs text-gray-500">Full contract details available from HR department.</p>
              `}}
            />
          )}
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {signed ? (
          <div className="text-center">
            <div className="text-6xl mb-4">✓</div>
            <p className="text-green-600 font-bold text-xl">Contract signed successfully!</p>
            <p className="text-sm text-gray-500 mb-2">Signature Date: {new Date(signatureDate).toLocaleString()}</p>
            <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-sm">I have read and agree to the terms of this employment contract</span>
            </label>

            {agreed && (
              <div className="border-t pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signed}
                    onChange={(e) => setSigned(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-semibold">I hereby sign this contract electronically</span>
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  By checking this box, you are providing your electronic signature and agreeing to be bound by the terms of this contract.
                </p>
              </div>
            )}

            <button
              onClick={handleSign}
              disabled={!signed || loading}
              className="w-full primary-button disabled:opacity-50"
            >
              {loading ? "Signing..." : "Sign Contract Electronically"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
