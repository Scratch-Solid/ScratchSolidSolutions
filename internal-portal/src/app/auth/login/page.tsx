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
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'linear-gradient(135deg, #f0f4f8 0%, #e6eef7 100%)' }}>
      <div className="max-w-5xl w-full">
        <div className="text-center mb-10">
          <img src="/logo-scratch-solid.png" alt="Scratch Solid" className="mx-auto mb-4" style={{ width: 80, height: 80, objectFit: 'contain' }} />
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-h)' }}>Internal Portal</h1>
          <p className="text-base font-medium" style={{ color: 'var(--text)' }}>Your gateway to Scratch Solid Solutions</p>
        </div>

        {error && (
          <div className="error-msg text-center font-semibold mb-6 max-w-md mx-auto">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 text-center max-w-md mx-auto">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-8" style={{ boxShadow: '0 16px 40px rgba(9,23,42,0.12)' }}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-h)' }}>
                {require2FA ? 'Two-Factor Authentication' : 'Staff Login'}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text)' }}>
                {require2FA ? 'Enter the 6-digit code from your authenticator app' : 'For existing employees, admins, and managers'}
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              {!require2FA && (
                <>
                  <div>
                    <label htmlFor="username" className="block text-sm font-semibold mb-2">
                      Username (Paysheet Code or Email)
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
                    <label htmlFor="password" className="block text-sm font-semibold mb-2">
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
                  <label htmlFor="totp" className="block text-sm font-semibold mb-2">
                    Authentication Code
                  </label>
                  <input
                    type="text"
                    id="totp"
                    name="totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full text-center text-2xl tracking-widest"
                    required
                    placeholder="000000"
                    maxLength={6}
                  />
                  <p className="text-xs mt-2" style={{ color: 'var(--text)' }}>
                    Enter the code from your authenticator app
                  </p>
                </div>
              )}
              <button
                type="submit"
                className="w-full primary-button"
                disabled={loading}
              >
                {loading ? 'Signing in...' : require2FA ? 'Verify Code' : 'Login'}
              </button>
              {require2FA && (
                <button
                  type="button"
                  onClick={() => {
                    setRequire2FA(false);
                    setTotpCode('');
                    setError('');
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 mt-2"
                >
                  Back to login
                </button>
              )}
            </form>
            {!require2FA && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => router.push("/auth/forgot-password")}
                  className="text-sm underline hover:text-blue-600"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          <div className="glass-panel p-8 flex flex-col justify-between" style={{ boxShadow: '0 16px 40px rgba(9,23,42,0.12)', background: 'linear-gradient(160deg, #ffffff 0%, #f8fbff 100%)' }}>
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-h)' }}>Become part of the team</h2>
                <p className="text-sm" style={{ color: 'var(--text)' }}>Join Scratch Solid Solutions as a cleaner</p>
              </div>
              <ul className="space-y-3 mb-8 text-sm" style={{ color: 'var(--text)' }}>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">&#10003;</span>
                  <span>Competitive pay with weekly payslips</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">&#10003;</span>
                  <span>Flexible scheduling around your availability</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">&#10003;</span>
                  <span>Full training and onboarding support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">&#10003;</span>
                  <span>Growth opportunities and bonuses</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => router.push("/signup/cleaner")}
              className="w-full secondary-button"
            >
              Apply Now
            </button>
          </div>
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
