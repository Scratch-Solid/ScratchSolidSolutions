"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import TwoFactorVerify from "@/components/auth/TwoFactorVerify";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);

  useEffect(() => {
    if (searchParams.get('onboarding') === 'complete') {
      setSuccessMessage('Onboarding complete! Please log in with your email and password.');
    }
    if (searchParams.get('session_expired') === 'true') {
      setError('Your session has expired. Please log in again.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Try Better Auth login first
      const res = await fetch('/api/auth/login-better-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      if (data.success) {
        const { user } = data.data;
        
        // Check if 2FA is required
        if (user.two_factor_enabled) {
          setPendingUser(data.data);
          setRequiresTwoFactor(true);
          setShowTwoFactor(true);
          return;
        }

        // Store auth data and redirect
        localStorage.setItem('authToken', data.data.session.token);
        localStorage.setItem('userRole', user.role);
        localStorage.setItem('username', user.email);
        localStorage.setItem('user_id', user.id.toString());

        // Redirect based on role
        redirectBasedOnRole(user.role);
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSuccess = () => {
    if (pendingUser) {
      const { user, session } = pendingUser;
      
      // Store auth data
      localStorage.setItem('authToken', session.token);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('username', user.email);
      localStorage.setItem('user_id', user.id.toString());

      redirectBasedOnRole(user.role);
    }
  };

  const handleTwoFactorCancel = () => {
    setShowTwoFactor(false);
    setPendingUser(null);
    setRequiresTwoFactor(false);
  };

  const redirectBasedOnRole = (role: string) => {
    switch (role) {
      case 'admin':
        router.push('/admin-dashboard');
        break;
      case 'cleaner':
        router.push('/cleaner-dashboard');
        break;
      case 'digital':
        router.push('/digital-dashboard');
        break;
      case 'transport':
        router.push('/transport-dashboard');
        break;
      default:
        router.push('/dashboard');
    }
  };

  if (showTwoFactor && requiresTwoFactor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <TwoFactorVerify
            onSuccess={handleTwoFactorSuccess}
            onCancel={handleTwoFactorCancel}
            email={email}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <a href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </a>
          </p>
        </div>
        
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>Enhanced security with 2FA and role-based access</p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
