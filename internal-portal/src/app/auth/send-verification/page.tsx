"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";

function SendVerificationContent() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json() as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || 'Failed to send verification email');
        return;
      }

      setMessage('Verification email sent! Please check your inbox.');
      setSent(true);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-panel max-w-md w-full text-center">
          <div className="mb-8">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Email Sent!</h1>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="w-full primary-button"
            >
              Back to Login
            </button>
            
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setMessage("");
                setError("");
              }}
              className="w-full secondary-button"
            >
              Send Another Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Scratch Solid Solutions</h1>
          <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>Send Verification Email</p>
        </div>
        
        {error && (
          <div className="error-msg font-semibold mb-6">
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email address"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full primary-button"
          >
            {loading ? 'Sending...' : 'Send Verification Email'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="text-sm underline hover:text-blue-600"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SendVerificationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SendVerificationContent />
    </Suspense>
  );
}
