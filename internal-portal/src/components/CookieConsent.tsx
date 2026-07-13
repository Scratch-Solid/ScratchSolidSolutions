"use client";

import { useState, useEffect } from "react";

const CONSENT_KEY = "scratchsolid_cookie_consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

  function acceptAll() {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ necessary: true, analytics: true, marketing: true, timestamp: Date.now() })
    );
    setVisible(false);
  }

  function acceptNecessaryOnly() {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ necessary: true, analytics: false, marketing: false, timestamp: Date.now() })
    );
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-900 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm">
          We use cookies to ensure the best experience. Necessary cookies are always active.
          Analytics and marketing cookies require your consent.
        </p>
        <div className="flex gap-2">
          <button
            onClick={acceptNecessaryOnly}
            className="px-4 py-2 text-sm bg-stone-700 hover:bg-stone-600 rounded"
          >
            Necessary Only
          </button>
          <button
            onClick={acceptAll}
            className="px-4 py-2 text-sm bg-[#2E1F16] hover:bg-[#B08A5E] rounded"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}

export function getCookieConsent() {
  if (typeof window === "undefined") return { necessary: true, analytics: false, marketing: false };
  const raw = localStorage.getItem(CONSENT_KEY);
  if (!raw) return { necessary: true, analytics: false, marketing: false };
  try {
    return JSON.parse(raw) as { necessary: boolean; analytics: boolean; marketing: boolean };
  } catch {
    return { necessary: true, analytics: false, marketing: false };
  }
}
