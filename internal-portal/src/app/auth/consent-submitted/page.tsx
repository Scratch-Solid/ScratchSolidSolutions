"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConsentSubmittedPage() {
  const [consentData, setConsentData] = useState<any>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get consent data from localStorage
    const storedConsent = localStorage.getItem("pendingConsent");
    if (!storedConsent) {
      router.push("/auth/login");
      return;
    }

    const consent = JSON.parse(storedConsent);
    setConsentData(consent);

    // Check status periodically
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/pending-contracts/check?contactNumber=${consent.contactNumber}&idPassportNumber=${consent.idPassportNumber}`
        );
        if (response.ok) {
          const data = await response.json() as { status?: string; rejection_reason?: string };
          setStatus(data.status || 'pending');
          setRejectionReason(data.rejection_reason || null);

          // Redirect based on status
          if (data.status === 'approved') {
            router.push('/auth/create-profile');
          } else if (data.status === 'rejected') {
            setChecking(false);
          }
        }
      } catch (err) {
        console.error('Error checking status:', err);
      }
    };

    // Check immediately
    checkStatus();

    // Check every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
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
          {status === 'rejected' ? (
            <>
              <div className="text-6xl mb-4">✕</div>
              <h2 className="text-2xl font-bold mb-4 text-red-600">Application Rejected</h2>
              <p className="text-gray-600 mb-4">
                Your application has been rejected.
              </p>
              {rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-700">
                    <strong>Reason:</strong> {rejectionReason}
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500 mb-6">
                Please contact administration for more information.
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">✓</div>
              <h2 className="text-2xl font-bold mb-4">Consent form submitted</h2>
              <p className="text-gray-600 mb-6">
                You will be notified of the next steps.
              </p>

              {/* Display login credentials */}
              {consentData?.generatedUsername && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Your Login Credentials:</strong>
                  </p>
                  <div className="space-y-2 text-left">
                    <div>
                      <p className="text-xs text-gray-500">Username / Paysheet Code:</p>
                      <p className="font-mono font-bold text-lg">{consentData.generatedUsername}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Password:</p>
                      <p className="text-sm">Your registered cellphone number</p>
                      <p className="text-sm font-mono">{consentData.contactNumber}</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-3">
                    Please save these credentials. You will need them to login after approval.
                  </p>
                </div>
              )}

              {checking && (
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-gray-500">Checking status...</p>
                </div>
              )}
              <p className="text-sm text-gray-500 mb-6">
                {status === 'approved' ? 'Redirecting to profile creation...' : 'Please check back later or contact admin if you have any questions.'}
              </p>
            </>
          )}
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
