"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [require2FA, setRequire2FA] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('onboarding') === 'complete') {
      setSuccessMessage('Onboarding complete! Please log in with your phone number (as username) and the password you created.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: username, password, totp_code: totpCode || undefined })
      });

      const data = await res.json() as {
        token?: string;
        role?: string;
        username?: string;
        user_id?: string;
        paysheet_code?: string;
        redirect_to?: string;
        error?: string;
        message?: string;
        mustChangePassword?: boolean;
        require_2fa?: boolean;
        require_2fa_setup?: boolean;
      };

      if (data.require_2fa_setup) {
        localStorage.setItem("authToken", data.token || '');
        localStorage.setItem("userRole", data.role || '');
        localStorage.setItem("username", data.username || username);
        localStorage.setItem("user_id", data.user_id || '');
        localStorage.setItem("mustChangePassword", data.mustChangePassword ? 'true' : 'false');
        router.push('/auth/2fa-setup');
        return;
      }

      if (!res.ok) {
        if (data.require_2fa) {
          setRequire2FA(true);
          setError(data.message || 'Two-factor authentication code required');
          return;
        }
        setError(data.error || data.message || 'Login failed');
        return;
      }

      setRequire2FA(false);

      localStorage.setItem("authToken", data.token || '');
      localStorage.setItem("userRole", data.role || '');
      localStorage.setItem("username", data.username || username);
      localStorage.setItem("user_id", data.user_id || '');
      localStorage.setItem("mustChangePassword", data.mustChangePassword ? 'true' : 'false');

      if (data.mustChangePassword) {
        router.push('/auth/change-password');
        return;
      }

      if (data.role === 'admin') {
        localStorage.setItem("userEmail", username);
        router.push("/admin-dashboard");
      } else if (data.role === 'cleaner') {
        const cleanerUsername = data.paysheet_code || username;
        localStorage.setItem("paysheetCode", cleanerUsername);
        localStorage.setItem("username", cleanerUsername);
        localStorage.setItem("cleanerRedirectTo", data.redirect_to || "/cleaner-pre-dashboard");
        router.push(data.redirect_to || "/cleaner-pre-dashboard");
      } else if (data.role === 'digital') {
        localStorage.setItem("paysheetCode", data.paysheet_code || username);
        router.push("/digital-dashboard");
      } else if (data.role === 'transport') {
        localStorage.setItem("paysheetCode", data.paysheet_code || username);
        router.push("/transport-dashboard");
      } else if (data.role === 'business') {
        window.location.href = process.env.NEXT_PUBLIC_BUSINESS_DASHBOARD_URL || 'https://scratchsolid.co.za/business-dashboard';
      } else {
        router.push("/admin-dashboard");
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
          <img src="/logo-scratch-solid.png" alt="Scratch Solid" className="h-10 w-10 object-contain mb-4" />
          <h1 className="text-xl font-semibold text-foreground">Internal Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Scratch Solid Solutions</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-7 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-1">
            {require2FA ? 'Two-factor authentication' : 'Welcome back'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {require2FA ? 'Enter the 6-digit code from your authenticator app' : 'Sign in to continue'}
          </p>

          {error && (
            <div className="error-msg text-sm mb-4">{error}</div>
          )}
          {successMessage && (
            <div className="success-msg text-sm mb-4">{successMessage}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {!require2FA && (
              <>
                <div>
                  <label htmlFor="username" className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Paysheet code or email
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full"
                    required
                    placeholder="Enter paysheet code or email"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                    required
                    placeholder="Enter password"
                  />
                </div>
              </>
            )}
            {require2FA && (
              <div>
                <label htmlFor="totp" className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Authentication code
                </label>
                <input
                  type="text"
                  id="totp"
                  name="totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center text-xl tracking-[0.3em]"
                  required
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            )}
            <button
              type="submit"
              className="w-full primary-button"
              disabled={loading}
            >
              {loading ? 'Signing in...' : require2FA ? 'Verify code' : 'Sign in'}
            </button>
            {require2FA && (
              <button
                type="button"
                onClick={() => {
                  setRequire2FA(false);
                  setTotpCode('');
                  setError('');
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back to login
              </button>
            )}
          </form>
          {!require2FA && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => router.push("/auth/forgot-password")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-border bg-secondary/40 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Join the cleaning team</p>
            <p className="text-xs text-muted-foreground mt-0.5">Competitive pay, flexible scheduling, full training</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/signup/cleaner")}
            className="shrink-0 text-sm font-medium text-accent-foreground bg-accent/20 hover:bg-accent/30 rounded-lg px-3.5 py-2 transition-colors"
          >
            Apply now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
