"use client";

import { useState, useEffect } from "react";

interface Props {
  message: string;
  until: string;
}

export default function MaintenanceBanner({ message, until }: Props) {
  // Keyed by `until` so a new/changed maintenance window always shows again,
  // even if the visitor dismissed a previous one.
  const dismissKey = `maintenanceBannerDismissed:${until}`;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(dismissKey) !== "1") {
      setIsVisible(true);
    }
  }, [dismissKey]);

  if (!isVisible) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(dismissKey, "1");
    setIsVisible(false);
  };

  return (
    <div className="w-full bg-[#2E1F16] text-[#F7F2EA] text-sm">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#B08A5E] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>{message}</span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[#d8c4a8] hover:text-white shrink-0 p-1"
          aria-label="Dismiss maintenance notice"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
