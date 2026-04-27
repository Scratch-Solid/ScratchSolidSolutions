"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function BookingOptionsPage() {
  const [userType, setUserType] = useState<"individual" | "business">("individual");

  useEffect(() => {
    // Check if user is logged in and determine user type
    const token = localStorage.getItem("authToken");
    const storedUserType = localStorage.getItem("userType");
    if (token && storedUserType) {
      setUserType(storedUserType as "individual" | "business");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-8">
          Select Booking Type
        </h1>

        <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-200 p-8">
          <div className="space-y-6">
            <Link
              href="/booking"
              className="block w-full bg-blue-600 text-white py-6 px-8 rounded-xl font-semibold text-xl hover:bg-blue-700 transition-colors text-center"
            >
              Once-off Booking
            </Link>

            {userType === "business" && (
              <Link
                href="/business-booking"
                className="block w-full bg-green-600 text-white py-6 px-8 rounded-xl font-semibold text-xl hover:bg-green-700 transition-colors text-center"
              >
                Contract Booking
              </Link>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link href="/business-dashboard" className="text-blue-600 hover:underline text-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
