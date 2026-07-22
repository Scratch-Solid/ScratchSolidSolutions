"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Password reset failed');
        return;
      }

      setMessage('Password reset successful! Redirecting to login...');
      
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
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
          <h2 className="text-base font-semibold text-foreground mb-1">Reset password</h2>
          <p className="text-sm text-muted-foreground mb-6">Choose a new password for your account</p>

          {error && (
            <div className="error-msg text-sm mb-4">{error}</div>
          )}

          {message && (
            <div className="success-msg text-sm mb-4">{message}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-muted-foreground mb-1.5">
                New Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                required
                placeholder="Enter new password (min 8 characters)"
                minLength={8}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-muted-foreground mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full"
                required
                placeholder="Confirm new password"
                minLength={8}
              />
            </div>
            <button
              type="submit"
              className="w-full primary-button"
              disabled={loading || !token}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
