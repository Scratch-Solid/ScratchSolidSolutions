"use client";

import Link from "next/link";
import LogoWatermark from '@/components/LogoWatermark';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-8 sm:py-16 px-2 sm:px-4 font-sans">
      <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-10 relative overflow-hidden">
        <LogoWatermark size="lg" />
        <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-700 mb-4 sm:mb-6 text-center drop-shadow-lg">Privacy Policy</h1>

        <div className="text-base sm:text-lg text-zinc-800 mb-6 sm:mb-8 relative z-10 leading-relaxed">
          <p className="text-sm text-gray-500 mb-6 text-center">Last Updated: May 2026</p>

          <p className="mb-6">
            Scratch Solid Solutions is committed to protecting your privacy in accordance with the Protection of Personal Information Act (POPIA) of South Africa.
          </p>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">1. Information We Collect</h2>
            <p className="text-base sm:text-lg text-zinc-800 mb-4 leading-relaxed">
              We collect personal information necessary to provide our services and communicate with you, including:
            </p>
            <ul className="text-base sm:text-lg text-zinc-800 list-disc list-inside space-y-2">
              <li>Name and contact details (Email and WhatsApp number).</li>
              <li>Physical address (for service delivery).</li>
              <li>Payment information (for invoicing).</li>
              <li>Photographs of the premises (if provided for "Quick Quotes").</li>
            </ul>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">2. Purpose of Collection</h2>
            <p className="text-base sm:text-lg text-zinc-800 mb-4 leading-relaxed">
              Your data is processed only for:
            </p>
            <ul className="text-base sm:text-lg text-zinc-800 list-disc list-inside space-y-2">
              <li>Providing cleaning quotes and fulfilling service bookings.</li>
              <li>Invoicing and financial record-keeping.</li>
              <li>Marketing communications (only where you have opted in).</li>
            </ul>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">3. Data Security & IT GRC</h2>
            <p className="text-base sm:text-lg text-zinc-800 mb-4 leading-relaxed">
              As a tech-forward organization, we apply rigorous IT Governance and Risk Compliance standards:
            </p>
            <ul className="text-base sm:text-lg text-zinc-800 list-disc list-inside space-y-2">
              <li>Your data is stored within a secure Cloudflare environment.</li>
              <li>We utilize encrypted communication channels (WhatsApp/Secure Email).</li>
              <li>Only authorized personnel who require the data to perform their duties have access to your information.</li>
            </ul>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">4. Third-Party Sharing</h2>
            <p className="text-base sm:text-lg text-zinc-800 leading-relaxed">
              We do not sell your data. We only share information with third parties (e.g., cloud storage or accounting software) that are also compliant with South African data protection laws.
            </p>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">5. Your Rights</h2>
            <p className="text-base sm:text-lg text-zinc-800 mb-4 leading-relaxed">
              Under POPIA, you have the right to:
            </p>
            <ul className="text-base sm:text-lg text-zinc-800 list-disc list-inside space-y-2">
              <li>Request access to the personal information we hold about you.</li>
              <li>Request the correction or deletion of your data.</li>
              <li>Object to the processing of your data for marketing purposes.</li>
            </ul>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4">6. Information Officer</h2>
            <p className="text-base sm:text-lg text-zinc-800 leading-relaxed">
              For any privacy-related inquiries, please contact our Information Officer at <a href="mailto:it@scratchsolidsolutions.org" className="text-blue-600 hover:underline">it@scratchsolidsolutions.org</a>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6 sm:mt-8 relative z-10">
          <Link href="/terms" className="rounded-full bg-zinc-200 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-blue-700 shadow hover:bg-zinc-300 transition-colors">Terms of Service</Link>
          <Link href="/contact" className="rounded-full bg-zinc-200 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-blue-700 shadow hover:bg-zinc-300 transition-colors">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
