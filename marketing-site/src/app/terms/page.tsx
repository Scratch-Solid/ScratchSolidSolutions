"use client";

import Link from "next/link";
import LogoWatermark from '@/components/LogoWatermark';

export default function TermsPage() {
  return (
    <div className="min-h-screen py-8 sm:py-16 px-2 sm:px-4 font-sans">
      <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-10 relative overflow-hidden">
        <LogoWatermark size="lg" />
        <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-700 mb-4 sm:mb-6 text-center drop-shadow-lg">Terms of Service</h1>

        <div className="text-base sm:text-lg text-zinc-800 mb-6 sm:mb-8 relative z-10 leading-relaxed">
          <p className="text-sm text-gray-500 mb-6 text-center">Last Updated: May 2026</p>

          <p className="mb-6">
            Welcome to Scratch Solid Solutions. By booking our services or using our website (<a href="https://scratchsolidsolutions.org/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://scratchsolidsolutions.org</a>), you agree to the following terms and conditions:
          </p>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">1. Services Provided</h2>
            <p className="text-base sm:text-lg text-zinc-800 leading-relaxed">
              Scratch Solid Solutions provides residential, commercial, and short-term accommodation (LekkeSlaap) cleaning services. The specific scope of work is defined by the service package (Maintenance vs. Deep Clean) selected at the time of booking.
            </p>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">2. Quotes and Bookings</h2>
            <ul className="text-base sm:text-lg text-zinc-800 list-disc list-inside space-y-2">
              <li>"Quick Quotes" provided via WhatsApp or our website are estimates based on the information provided by the client.</li>
              <li>Final pricing may be adjusted if the actual condition or size of the property differs significantly from the description provided.</li>
            </ul>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">3. Access and Security</h2>
            <ul className="text-base sm:text-lg text-zinc-800 list-disc list-inside space-y-2">
              <li>Clients must provide safe access to the premises at the scheduled time.</li>
              <li>While our staff takes the utmost care, clients are encouraged to secure high-value items or sentimental jewelry prior to the service.</li>
            </ul>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">4. Cancellations</h2>
            <p className="text-base sm:text-lg text-zinc-800 leading-relaxed">
              Cancellations made less than 24 hours before the scheduled service may be subject to a cancellation fee to cover administrative and labor costs.
            </p>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">5. Liability</h2>
            <p className="text-base sm:text-lg text-zinc-800 leading-relaxed">
              Scratch Solid Solutions maintains professional standards and utilizes appropriate PPE. We are not liable for pre-existing damage, wear and tear, or damage resulting from incorrect surfaces (e.g., unsealed flooring) unless caused by gross negligence.
            </p>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">6. Governing Law</h2>
            <p className="text-base sm:text-lg text-zinc-800 leading-relaxed">
              These terms are governed by the laws of the Republic of South Africa, including the Consumer Protection Act 68 of 2008.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6 sm:mt-8 relative z-10">
          <Link href="/privacy" className="rounded-full bg-zinc-200 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-blue-700 shadow hover:bg-zinc-300 transition-colors">Privacy Policy</Link>
          <Link href="/contact" className="rounded-full bg-zinc-200 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-blue-700 shadow hover:bg-zinc-300 transition-colors">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
