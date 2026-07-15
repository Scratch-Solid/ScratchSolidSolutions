"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AcceptInviteContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [invite, setInvite] = useState<{ email: string; name: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link.');
      setChecking(false);
      return;
    }

    fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data: { valid?: boolean; email?: string; name?: string; error?: string }) => {
        if (!data.valid) {
          setError(data.error || 'This invite link is no longer valid.');
        } else {
          setInvite({ email: data.email!, name: data.name! });
        }
      })
      .catch(() => setError('Unable to validate invite link. Please try again.'))
      .finally(() => setChecking(false));
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

    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json() as { token?: string; error?: string };
      if (!res.ok) {
        setError(data.error || 'Failed to accept invite');
        return;
      }

      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      setMessage('Account set up successfully! Redirecting...');
      setTimeout(() => {
        router.push("/admin/overview");
      }, 1500);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E1F16]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Scratch Solid Solutions</h1>
          <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>Accept Admin Invitation</p>
        </div>

        {error && (
          <div className="error-msg text-center font-semibold mb-6">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 text-center">
            {message}
          </div>
        )}

        {invite && !message && (
          <>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text)' }}>
              Welcome, {invite.name}. Set a password for <strong>{invite.email}</strong> to finish setting up your admin account.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold mb-2">
                  Password
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
                  placeholder="Create a password"
                  minLength={12}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2">
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
                  placeholder="Confirm password"
                  minLength={12}
                />
              </div>
              <button
                type="submit"
                className="w-full primary-button"
                disabled={loading}
              >
                {loading ? 'Setting up...' : 'Set Password & Continue'}
              </button>
            </form>
          </>
        )}

        {!invite && (
          <button
            type="button"
            onClick={() => router.push("/auth/login")}
            className="w-full mt-2 secondary-button"
          >
            Back to Login
          </button>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
