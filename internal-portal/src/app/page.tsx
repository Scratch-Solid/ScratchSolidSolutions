"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OWN_DASHBOARD } from "@/lib/roleRouting";

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
    const isAdminDomain = username && username.toLowerCase().endsWith('@scratchsolidsolutions.org');
    const effectiveRole = userRole === 'admin' || isAdminDomain ? 'admin' : userRole;

    async function redirectUser() {
      switch (effectiveRole) {
        case "admin":
          router.push(OWN_DASHBOARD.admin);
          break;
        case "cleaner": {
          try {
            const response = await fetch('/api/cleaner/pre-dashboard', {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
              cache: 'no-store',
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
          router.push(OWN_DASHBOARD.digital);
          break;
        case "transport":
          router.push(OWN_DASHBOARD.transport);
          break;
        case "staff":
          // Supervisors: users.role is 'staff', not a separate 'supervisor'
          // value - see src/lib/roleRouting.ts.
          router.push(OWN_DASHBOARD.staff);
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
