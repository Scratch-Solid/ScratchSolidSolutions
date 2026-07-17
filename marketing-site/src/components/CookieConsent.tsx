"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookieConsent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 text-white p-4 z-50 shadow-lg pointer-events-none" style={{ background: "linear-gradient(135deg, #2E1F16, #3a281a)" }}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-auto">
        <div className="flex-1 text-sm">
          <p className="mb-1">
            <strong>Cookie Notice:</strong> We use essential cookies for authentication and session management. 
            By continuing to use this site, you accept our use of cookies in accordance with our{" "}
            <Link href="/privacy" className="text-[#B08A5E] hover:underline">Privacy Policy</Link>.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm bg-white/10 border border-white/25 text-[#F7F2EA] hover:bg-white/15 rounded-lg transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-[#B08A5E] text-[#2E1F16] font-semibold hover:bg-[#c39a6c] rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
