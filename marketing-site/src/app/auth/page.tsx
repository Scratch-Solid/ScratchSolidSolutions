import { Suspense } from "react";
import AuthContent from "./AuthContent";

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F2EA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B08A5E]"></div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
