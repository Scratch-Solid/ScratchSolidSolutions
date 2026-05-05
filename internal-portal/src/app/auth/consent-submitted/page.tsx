"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConsentSubmittedPage() {
  const [consentData, setConsentData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Get consent data from localStorage
    const storedConsent = localStorage.getItem("pendingConsent");
    if (storedConsent) {
      setConsentData(JSON.parse(storedConsent));
    } else {
      router.push("/auth/login");
    }
  }, [router]);

  const handleGoBack = () => {
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Scratch Solid Solutions</h1>
          <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>Consent Submitted</p>
        </div>

        <div className="glass-card text-center">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-4">Consent form submitted</h2>
          <p className="text-gray-600 mb-6">
            You will be notified of the next steps.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Please check back later or contact admin if you have any questions.
          </p>
        </div>

        <button
          onClick={handleGoBack}
          className="w-full mt-6 secondary-button"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
