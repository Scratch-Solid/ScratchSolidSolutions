"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Setup2FAPage() {
  const [secret, setSecret] = useState("");
  const [qrUri, setQrUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    fetch("/api/auth/2fa/enable", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: any) => {
        if (data.success) {
          setSecret(data.secret);
          setQrUri(data.qrCodeURI);
          setBackupCodes(data.backupCodes || []);
        } else {
          setError(data.error || "Failed to load 2FA setup");
        }
      })
      .catch(() => {
        setError("Network error. Please try again.");
      })
      .finally(() => {
        setFetching(false);
      });
  }, [router]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          const role = localStorage.getItem("userRole");
          if (role === "admin") {
            router.push("/admin-dashboard");
          } else if (role === "cleaner") {
            const redirectTo = localStorage.getItem("cleanerRedirectTo") || "/cleaner-pre-dashboard";
            router.push(redirectTo);
          } else if (role === "digital") {
            router.push("/digital-dashboard");
          } else if (role === "transport") {
            router.push("/transport-dashboard");
          } else if (role === "business") {
            window.location.href =
              process.env.NEXT_PUBLIC_BUSINESS_DASHBOARD_URL ||
              "https://scratchsolid.co.za/business-dashboard";
          } else {
            router.push("/admin-dashboard");
          }
        }, 2000);
      } else {
        setError(data.error || "Invalid code. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg font-semibold">Loading 2FA setup...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-panel p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4 text-green-600">2FA Enabled Successfully</h2>
          <p className="mb-4">Your account is now secured with two-factor authentication.</p>
          <p className="text-sm text-stone-500">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <div className="max-w-md w-full">
        <div className="glass-panel p-8">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-h)' }}>Set Up Two-Factor Authentication</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text)' }}>
            Secure your account with an authenticator app
          </p>

          {error && (
            <div className="error-msg text-center font-semibold mb-4">
              {error}
            </div>
          )}

          {qrUri && (
            <div className="mb-6 text-center">
              <p className="text-sm font-semibold mb-3">Scan this QR code with your authenticator app</p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`}
                alt="2FA QR Code"
                className="mx-auto mb-3"
                style={{ width: 200, height: 200 }}
              />
            </div>
          )}

          {secret && (
            <div className="mb-6 p-3 bg-stone-50 rounded border border-stone-200 text-center">
              <p className="text-xs text-stone-500 mb-1">Or enter this key manually</p>
              <code className="text-sm font-mono break-all select-all">{secret}</code>
            </div>
          )}

          {backupCodes.length > 0 && (
            <div className="mb-6 p-3 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-xs text-yellow-700 font-semibold mb-2">
                Save these backup codes in a secure place:
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs font-mono text-yellow-800">
                {backupCodes.map((c, i) => (
                  <span key={i} className="break-all">{c}</span>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleConfirm} className="space-y-4">
            <div>
              <label htmlFor="confirm-code" className="block text-sm font-semibold mb-2">
                Enter 6-digit code from your app
              </label>
              <input
                type="text"
                id="confirm-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center text-2xl tracking-widest"
                required
                placeholder="000000"
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              className="w-full primary-button"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Enable 2FA'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="text-sm underline hover:text-[#2E1F16]"
            >
              Cancel and return to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
