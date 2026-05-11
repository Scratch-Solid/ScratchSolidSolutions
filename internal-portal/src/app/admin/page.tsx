"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLegacyRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');

    if (!token || role !== 'admin') {
      router.replace('/auth/login');
      return;
    }

    router.replace('/admin-dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
