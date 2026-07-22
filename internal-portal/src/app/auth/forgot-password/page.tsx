"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Request failed');
        return;
      }

      setMessage(data.message);
      
      // If in development and token is returned, redirect to reset page
      if (data.resetToken) {
        setTimeout(() => {
          router.push(`/auth/reset-password?token=${data.resetToken}`);
        }, 1500);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-8">
          <a href="https://scratchsolidsolutions.org">
            <img src="/logo-scratch-solid.png" alt="Scratch Solid" className="h-7 w-7 object-contain mb-3" />
          </a>
          <h1 className="text-xl font-semibold text-foreground">Internal Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Scratch Solid Solutions</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-7 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-1">Forgot password</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your email and we&apos;ll send you a reset link
          </p>

          {error && (
            <div className="error-msg text-sm mb-4">{error}</div>
          )}

          {message && (
            <div className="success-msg text-sm mb-4">{message}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                required
                placeholder="Enter your email address"
              />
            </div>
            <button
              type="submit"
              className="w-full primary-button"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
