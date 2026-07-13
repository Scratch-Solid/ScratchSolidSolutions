"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sanitizeHtml } from '@/lib/htmlSanitizer';
import SignatureCanvas from 'react-signature-canvas';

export default function SignContractPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signatureDate, setSignatureDate] = useState("");
  const [contractContent, setContractContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [stageError, setStageError] = useState("");
  const signatureRef = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [contractHistory, setContractHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null;
    if (!token) {
      router.push("/auth/login");
      return;
    }

    // Check onboarding stage
    const checkStage = async () => {
      try {
        const response = await fetch('/api/auth/check-onboarding-stage', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.redirect) {
            setStageError(data.error || 'Please complete previous onboarding steps');
            setTimeout(() => router.push(data.redirect), 2000);
          }
        }
      } catch (err) {
        console.error('Error checking onboarding stage:', err);
      }
    };

    // Fetch contract content from database
    const fetchContractContent = async () => {
      try {
        const response = await fetch('/api/admin/contract-content', {
          headers: { Authorization: `Bearer ${token}` }
        });
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

    // Fetch contract history
    const fetchContractHistory = async () => {
      try {
        const response = await fetch('/api/contract/history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json() as { history: any[] };
          setContractHistory(data.history || []);
        }
      } catch (err) {
        console.error('Error fetching contract history:', err);
      }
    };
    
    checkStage();
    fetchContractContent();
    fetchContractHistory();
  }, [router]);

  const handleSign = async () => {
    if (!signatureData) {
      setError("Please provide your signature");
      return;
    }
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null;
      const signatureDate = new Date().toISOString();
      setSignatureDate(signatureDate);

      const res = await fetch("/api/auth/sign-contract", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ signatureDate, signatureData }),
      });
      if (res.ok) {
        const data = await res.json() as { redirect_to?: string };
        setSigned(true);
        setTimeout(() => {
          // Redirect to dashboard
          const userRole = typeof window !== 'undefined' ? localStorage.getItem("userRole") : null;
          if (userRole === 'cleaner') {
            const redirectTo = data.redirect_to || "/cleaner-pre-dashboard";
            localStorage.setItem('cleanerRedirectTo', redirectTo === '/cleaner-dashboard?training_required=true' ? '/cleaner-pre-dashboard' : redirectTo);
            router.push(redirectTo);
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

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setSignatureData(null);
    }
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current) {
      const dataUrl = signatureRef.current.toDataURL();
      setSignatureData(dataUrl);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="glass-panel max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Scratch Solid Solutions</h1>
          <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>Employment Contract</p>
          {contractHistory.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm text-[#2E1F16] hover:text-[#1C130D] mt-2 underline"
            >
              {showHistory ? 'Hide' : 'View'} Contract History ({contractHistory.length})
            </button>
          )}
        </div>

        {showHistory && contractHistory.length > 0 && (
          <div className="bg-stone-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-3">Contract History</h3>
            <div className="space-y-2">
              {contractHistory.map((item) => (
                <div key={item.id} className="text-sm border-b pb-2 last:border-0">
                  <div className="font-medium">Version {item.version_number}</div>
                  <div className="text-stone-600">Signed: {new Date(item.signed_at).toLocaleString()}</div>
                  <div className="text-stone-500 text-xs">IP: {item.ip_address}</div>
                  {item.pdf_url && (
                    <a href={item.pdf_url} target="_blank" rel="noopener noreferrer" className="text-[#2E1F16] text-xs hover:underline">
                      View PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-stone-50 p-6 rounded-lg mb-6 text-sm leading-relaxed">
          <h2 className="font-bold text-lg mb-4">EMPLOYMENT AGREEMENT</h2>
          {loadingContent ? (
            <p>Loading contract content...</p>
          ) : (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(contractContent?.contract_text || `
                <p>This Employment Agreement is entered into between Scratch Solid Solutions and the Employee.</p>
                <p>By signing this contract, you agree to the terms and conditions of employment.</p>
                <p>Terms include but are not limited to: work hours, compensation, confidentiality, and termination policies.</p>
                <p class="text-xs text-stone-500">Full contract details available from HR department.</p>
              `) }}
            />
          )}
        </div>

        {stageError && <p className="text-yellow-600 mb-4 bg-yellow-50 p-3 rounded">{stageError}</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {signed ? (
          <div className="text-center">
            <div className="text-6xl mb-4">✓</div>
            <p className="text-green-600 font-bold text-xl">Contract signed successfully!</p>
            <p className="text-sm text-stone-500 mb-2">Signature Date: {new Date(signatureDate).toLocaleString()}</p>
            <p className="text-sm text-stone-500">Redirecting to your dashboard...</p>
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
              <div className="border-t pt-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Your Signature</label>
                  <div className="border-2 border-stone-300 rounded-lg bg-white">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: 'w-full h-40',
                      }}
                      onEnd={handleSignatureEnd}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={clearSignature}
                      className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 text-sm"
                    >
                      Clear Signature
                    </button>
                  </div>
                  <p className="text-xs text-stone-500 mt-2">
                    Sign in the box above using your mouse or touch screen
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signed}
                    onChange={(e) => setSigned(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-semibold">I hereby sign this contract electronically</span>
                </label>
                <p className="text-xs text-stone-500">
                  By checking this box, you are providing your electronic signature and agreeing to be bound by the terms of this contract.
                </p>
              </div>
            )}

            <button
              onClick={handleSign}
              disabled={!signed || !signatureData || loading}
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
