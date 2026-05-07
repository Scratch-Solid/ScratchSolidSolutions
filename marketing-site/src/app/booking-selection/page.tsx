"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export default function BookingSelectionPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  useSessionTimeout(true); // Enable 5-minute inactivity timeout

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
  }, [router]);

  const handleIndividualBooking = () => {
    router.push("/book");
  };

  const handleBusinessBooking = () => {
    router.push("/business-booking");
  };

  return (
    <div className="min-h-screen bg-white py-16 px-4 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-8">
          Select Booking Type
        </h1>

        <div className="space-y-6">
          <button
            onClick={handleIndividualBooking}
            className="w-full p-8 rounded-2xl border-2 border-blue-200 bg-white hover:bg-blue-50 transition-all shadow-lg"
          >
            <h2 className="text-2xl font-semibold text-blue-700 mb-2">
              Once-off / Individual Booking
            </h2>
            <p className="text-gray-600">
              Book a one-time cleaning service for your home
            </p>
          </button>

          <button
            onClick={handleBusinessBooking}
            className="w-full p-8 rounded-2xl border-2 border-blue-200 bg-white hover:bg-blue-50 transition-all shadow-lg"
          >
            <h2 className="text-2xl font-semibold text-blue-700 mb-2">
              Contract / Business Booking
            </h2>
            <p className="text-gray-600">
              Book commercial cleaning services or sign a contract
            </p>
          </button>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-blue-600 hover:underline font-semibold"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
