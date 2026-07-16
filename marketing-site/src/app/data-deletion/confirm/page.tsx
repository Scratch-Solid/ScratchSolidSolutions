"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LogoWatermark from '@/components/LogoWatermark';

function ConfirmDataDeletionContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing confirmation link. Please request a new one.");
      return;
    }

    const confirm = async () => {
      try {
        const response = await fetch("/api/data-deletion/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json() as { message?: string; error?: string };

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Your data deletion request has been confirmed.");
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to confirm your data deletion request.");
        }
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    };

    confirm();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 sm:py-16 px-2 sm:px-4 font-sans">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-blue-700 mb-2">
          Confirm Data Deletion
        </h1>

        <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8 overflow-hidden text-center">
          <LogoWatermark size="md" />

          {status === "loading" && (
            <p className="text-gray-600">Confirming your request...</p>
          )}

          {status === "success" && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{message}</p>
            </div>
          )}

          {status === "error" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{message}</p>
            </div>
          )}

          <div className="mt-6">
            <Link href="/data-deletion" className="text-blue-600 hover:underline text-sm">
              {status === "error" ? "Request a new confirmation link" : "Back to Data Deletion"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmDataDeletionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 sm:py-16 px-2 sm:px-4 font-sans flex items-center justify-center">
      <div className="text-center text-gray-600">Loading...</div>
    </div>}>
      <ConfirmDataDeletionContent />
    </Suspense>
  );
}
