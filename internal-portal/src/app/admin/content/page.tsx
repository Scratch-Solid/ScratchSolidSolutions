"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ContentManagement() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/content-upload");
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2E1F16]"></div>
    </div>
  );
}
