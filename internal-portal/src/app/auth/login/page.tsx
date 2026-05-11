"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
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
      const res = await fetch('/api/auth/login-better-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: username, password })
      });

      const data = await res.json() as { token?: string; role?: string; username?: string; user_id?: string; paysheet_code?: string; error?: string; mustChangePassword?: boolean };
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      localStorage.setItem("authToken", data.token || '');
      localStorage.setItem("userRole", data.role || '');
      localStorage.setItem("username", data.username || username);
      localStorage.setItem("user_id", data.user_id || '');

      if (data.mustChangePassword) {
        router.push('/auth/change-password');
        return;
      }

      if (data.role === 'admin') {
        localStorage.setItem("userEmail", username);
        router.push("/admin-dashboard");
      } else if (data.role === 'cleaner') {
        localStorage.setItem("paysheetCode", data.paysheet_code || username);
        router.push("/cleaner-dashboard");
      } else if (data.role === 'digital') {
        localStorage.setItem("paysheetCode", data.paysheet_code || username);
        router.push("/digital-dashboard");
      } else if (data.role === 'transport') {
        localStorage.setItem("paysheetCode", data.paysheet_code || username);
        router.push("/transport-dashboard");
      } else if (data.role === 'business') {
        // Business dashboard is external, redirect to marketing site
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
    <div className="center-container px-4">
      <div className="glass-panel max-w-md w-full p-8" style={{ boxShadow: '0 16px 40px rgba(9,23,42,0.12)' }}>
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <img src="/logo-scratch-solid.png" alt="Scratch Solid" style={{ width: 96, height: 96, objectFit: 'contain' }} />
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-h)' }}>Internal Portal</h1>
            <p className="text-base font-medium" style={{ color: 'var(--text)' }}>Welcome back</p>
          </div>
        </div>
        {error && (
          <div className="error-msg text-center font-semibold mb-6">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 text-center">
            {successMessage}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold mb-2">
              Username (Paysheet Code or Email)
            </label>
            <input
              type="text"
              id="username"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              required
              placeholder="Enter password"
            />
          </div>
          <button
            type="submit"
            className="w-full primary-button"
          >
            Login
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => router.push("/auth/forgot-password")}
            className="text-sm underline hover:text-blue-600"
          >
            Forgot Password?
          </button>
        </div>
        <button
          type="button"
          onClick={() => router.push("/auth/employee-consent")}
          className="w-full mt-6 secondary-button"
        >
          Become part of the Team
        </button>
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
