"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BookingPage() {
  const router = useRouter();

  useEffect(() => {
    // Auth guard: booking is only allowed from authenticated dashboard
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    const userId = localStorage.getItem("userId");
    if (!token || !userId) {
      router.push("/auth?redirect=/client-dashboard");
      return;
    }
    // If already logged in, redirect to dashboard booking flow
    router.push("/client-dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F2EA] py-16 px-4 font-sans">
      <div className="max-w-2xl mx-auto text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B08A5E] mx-auto mb-4"></div>
        <p className="text-stone-600">Redirecting...</p>
      </div>
    </div>
  );
}
