"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getCsrfToken } from "@/lib/authFetch";

export default function DeleteAccountSection() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const closeModal = () => {
    if (loading) return;
    setShowModal(false);
    setPassword("");
    setConfirmChecked(false);
    setError("");
  };

  const handleDelete = async () => {
    setError("");
    if (!password) {
      setError("Please enter your password to confirm.");
      return;
    }
    if (!confirmChecked) {
      setError("Please check the box to confirm account deletion.");
      return;
    }

    setLoading(true);
    try {
      const csrfToken = await getCsrfToken();
      const res = await authFetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({ password, confirm: true }),
      });

      const data = await res.json() as { message?: string; grace_period_end?: string; error?: string };

      if (res.ok) {
        setMessage(data.message || "Account marked for deletion.");
        setTimeout(() => {
          localStorage.removeItem("authToken");
          localStorage.removeItem("userRole");
          localStorage.removeItem("userId");
          localStorage.removeItem("userName");
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userPhone");
          localStorage.removeItem("userAddress");
          router.push("/auth");
        }, 3000);
      } else {
        setError(data.error || "Failed to delete account. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="font-semibold text-red-800 mb-1">Danger Zone</h3>
      <p className="text-sm text-red-700 mb-3">
        Deleting your account gives you a 30-day grace period to change your mind, after which it becomes permanent.
      </p>
      <button
        onClick={() => setShowModal(true)}
        className="text-sm font-semibold text-red-700 border border-red-300 rounded-lg px-4 py-2 hover:bg-red-100 transition-colors"
      >
        Delete My Account
      </button>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={closeModal} />
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-200 p-6 max-w-md w-full relative z-50">
            <h2 className="text-xl font-bold text-red-800 mb-2">Delete Your Account?</h2>

            {message ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-sm">{message}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Your account will be deactivated immediately and permanently deleted after 30 days. You can restore it
                  by logging in again within that window.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm your password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Password"
                    autoFocus
                  />
                </div>

                <div className="flex items-start space-x-3 mb-6">
                  <input
                    type="checkbox"
                    id="confirm-delete-account"
                    checked={confirmChecked}
                    onChange={(e) => setConfirmChecked(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="confirm-delete-account" className="text-sm text-gray-700">
                    I understand this will delete my account and data after a 30-day grace period.
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    disabled={loading}
                    className="flex-1 rounded-full border-2 border-gray-300 px-4 py-2 text-gray-700 font-semibold hover:border-gray-400 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 rounded-full bg-red-600 px-4 py-2 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Deleting…" : "Delete Account"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
