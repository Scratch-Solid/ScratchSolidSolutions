"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem("authToken") : null;
    const userRole = typeof window !== 'undefined' ? localStorage.getItem("userRole") : null;
    const username = typeof window !== 'undefined' ? localStorage.getItem("username") : null;

    if (!authToken || !username) {
      router.push("/auth/login");
      return;
    }

    // Fallback: detect admin by email domain if role is missing or generic
    const isAdminDomain = username && username.toLowerCase().endsWith('@scratchsolidsolution.org');
    const effectiveRole = userRole === 'admin' || isAdminDomain ? 'admin' : userRole;

    async function redirectUser() {
      switch (effectiveRole) {
        case "admin":
          router.push("/admin-dashboard");
          break;
        case "cleaner": {
          try {
            const response = await fetch('/api/cleaner/pre-dashboard', {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            });

            if (!response.ok) {
              localStorage.setItem('cleanerRedirectTo', '/cleaner-pre-dashboard');
              router.push('/cleaner-pre-dashboard');
              break;
            }

            const data = await response.json() as {
              data?: {
                can_transition_to_cleaner_dashboard?: boolean;
              };
            };
            const redirectTo = data.data?.can_transition_to_cleaner_dashboard ? '/cleaner-dashboard' : '/cleaner-pre-dashboard';
            localStorage.setItem('cleanerRedirectTo', redirectTo);
            router.push(redirectTo);
          } catch {
            localStorage.setItem('cleanerRedirectTo', '/cleaner-pre-dashboard');
            router.push('/cleaner-pre-dashboard');
          }
          break;
        }
        case "digital":
          router.push("/digital-dashboard");
          break;
        case "transport":
          router.push("/transport-dashboard");
          break;
        case "client":
        case "user":
          window.location.href = process.env.NEXT_PUBLIC_CLIENT_DASHBOARD_URL || "https://scratchsolid.co.za/client-dashboard";
          break;
        case "business":
          window.location.href = process.env.NEXT_PUBLIC_BUSINESS_DASHBOARD_URL || "https://scratchsolid.co.za/business-dashboard";
          break;
        default:
          router.push("/auth/login");
      }
    }

    redirectUser();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting...</p>
    </div>
  );
}
