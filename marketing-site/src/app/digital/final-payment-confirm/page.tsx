import { Suspense } from "react";
import FinalPaymentConfirmContent from "./FinalPaymentConfirmContent";

function ConfirmFallback() {
  return (
    <div className="min-h-screen bg-white py-16 px-4 font-sans">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#B08A5E] mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Confirming Your Payment</h2>
          <p className="text-gray-600">One moment...</p>
        </div>
      </div>
    </div>
  );
}

export default function FinalPaymentConfirmPage() {
  return (
    <Suspense fallback={<ConfirmFallback />}>
      <FinalPaymentConfirmContent />
    </Suspense>
  );
}
