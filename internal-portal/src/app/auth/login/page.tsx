"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userRole", data.role);
      localStorage.setItem("username", data.username || username);
      localStorage.setItem("user_id", data.user_id);

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
        router.push("/business-dashboard");
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Scratch Solid Solutions</h1>
          <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>Internal Portal</p>
        </div>
        {error && (
          <div className="error-msg text-center font-semibold mb-6">
            {error}
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
