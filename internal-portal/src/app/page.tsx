"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Check authentication status
    const authToken = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");
    const username = localStorage.getItem("username");

    if (!authToken || !username) {
      // Not authenticated, redirect to login
      router.push("/auth/login");
      return;
    }

    // Redirect based on user role
    switch (userRole) {
      case "admin":
        router.push("/admin-dashboard");
        break;
      case "cleaner":
        router.push("/cleaner-dashboard");
        break;
      case "digital":
        router.push("/digital-dashboard");
        break;
      case "transport":
        router.push("/transport-dashboard");
        break;
      case "client":
      case "user":
        // Redirect to marketing site client dashboard
        window.location.href = process.env.NEXT_PUBLIC_CLIENT_DASHBOARD_URL || "https://scratchsolid.co.za/client-dashboard";
        break;
      case "business":
        // Redirect to marketing site business dashboard
        window.location.href = process.env.NEXT_PUBLIC_BUSINESS_DASHBOARD_URL || "https://scratchsolid.co.za/business-dashboard";
        break;
      default:
        // Unknown role, redirect to login
        router.push("/auth/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting...</p>
    </div>
  );
}
