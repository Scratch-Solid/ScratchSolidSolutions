"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/client-signup");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F7F2EA]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B08A5E]"></div>
    </div>
  );
}
