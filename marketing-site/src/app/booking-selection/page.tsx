"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function BookingSelectionPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
    
    // Redirect to appropriate dashboard if already logged in
    const token = localStorage.getItem("authToken");
    if (token && role) {
      if (role === 'business') {
        router.push("/business-dashboard");
      } else {
        router.push("/client-dashboard");
      }
    }
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
              Home / Individual Booking
            </h2>
            <p className="text-gray-600">
              Book a one-time or recurring cleaning service for your home
            </p>
          </button>

          <button
            onClick={handleBusinessBooking}
            className="w-full p-8 rounded-2xl border-2 border-blue-200 bg-white hover:bg-blue-50 transition-all shadow-lg"
          >
            <h2 className="text-2xl font-semibold text-blue-700 mb-2">
              Business Booking
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
