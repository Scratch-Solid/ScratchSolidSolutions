'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CleanerLogin() {
  const router = useRouter();
  const [paysheetCode, setPaysheetCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/cleaner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paysheet_code: paysheetCode, password }),
      });

      const data = await response.json() as {
        success?: boolean;
        token?: string;
        role?: string;
        needs_password_setup?: boolean;
        requires_password_setup?: boolean;
        user?: { email?: string; paysheet_code?: string };
        error?: string;
        details?: string[];
      };

      if (!response.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details.join(', ')}` : data.error;
        throw new Error(errorMsg || 'Login failed');
      }

      if (data.needs_password_setup || data.requires_password_setup) {
        setNeedsPasswordSetup(true);
        return;
      }

      if (data.success) {
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }
        localStorage.setItem('userRole', data.role || 'cleaner');
        localStorage.setItem('paysheetCode', data.user?.paysheet_code || paysheetCode);
        if (data.user?.email) {
          localStorage.setItem('username', data.user.email);
        }
        router.push('/cleaner-dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/cleaner/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paysheet_code: paysheetCode, password }),
      });

      const data = await response.json() as { success?: boolean; token?: string; error?: string; details?: string[] };

      if (!response.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details.join(', ')}` : data.error;
        throw new Error(errorMsg || 'Password setup failed');
      }

      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userRole', 'cleaner');
        router.push('/cleaner-dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Password setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Cleaner Login</h1>
        <p className="text-center text-gray-600 mb-8">
          {needsPasswordSetup ? 'Set your password to continue' : 'Enter your paysheet code to login'}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={needsPasswordSetup ? handlePasswordSetup : handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Paysheet Code *</label>
            <input
              type="text"
              required
              value={paysheetCode}
              onChange={(e) => setPaysheetCode(e.target.value)}
              disabled={needsPasswordSetup}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {needsPasswordSetup ? 'New Password *' : 'Password *'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {needsPasswordSetup && (
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : needsPasswordSetup ? 'Set Password' : 'Login'}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Want to join our team?{' '}
          <a href="/cleaner-signup" className="text-blue-600 hover:underline">
            Apply here
          </a>
        </p>
      </div>
    </div>
  );
}
