"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyEmailContent() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid verification link. Please request a new verification email.');
      return;
    }

    // Auto-verify if token is present
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;
    
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await res.json() as { error?: string; message?: string; email?: string };
      if (!res.ok) {
        setError(data.error || 'Email verification failed');
        return;
      }

      setMessage('Email verified successfully! Redirecting to login...');
      setVerified(true);
      
      setTimeout(() => {
        router.push("/auth/login?message=email_verified");
      }, 2000);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Scratch Solid Solutions</h1>
          <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>Email Verification</p>
        </div>
        
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying your email...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="error-msg text-center font-semibold mb-6">
            {error}
          </div>
        )}
        
        {message && !loading && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 text-center">
            {message}
          </div>
        )}

        {!loading && !verified && (
          <div className="text-center">
            <button
              onClick={verifyEmail}
              className="w-full primary-button mb-4"
              disabled={loading || !token}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
            
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="w-full secondary-button"
            >
              Back to Login
            </button>
          </div>
        )}

        {!loading && error && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 mb-4">
              Need a new verification link?
            </p>
            <button
              type="button"
              onClick={() => router.push("/auth/send-verification")}
              className="text-sm underline hover:text-blue-600"
            >
              Request New Verification Email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
