"use client";

import Link from "next/link";
import LogoWatermark from '@/components/LogoWatermark';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 sm:py-16 px-2 sm:px-4 font-sans">
      <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-10 relative overflow-hidden">
        <LogoWatermark size="lg" />
        <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-700 mb-4 sm:mb-6 text-center drop-shadow-lg">Get In Touch</h1>

        <div className="text-base sm:text-lg text-zinc-800 mb-6 sm:mb-8 relative z-10 leading-relaxed">
          <p className="mb-6">
            Ready to experience a cleaner, fresher space? Whether you need a quote for your home in Durbanville or a deep clean for your office in Tygervalley, the Scratch Solid Solutions team is standing by to help.
          </p>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4 text-center">How to Reach Us</h2>
            <p className="text-sm text-zinc-700 mb-4 text-center">
              We recommend using WhatsApp for the fastest response and "Quick Quote" estimates.
            </p>
            <ul className="text-base sm:text-lg text-zinc-800 text-left list-disc list-inside space-y-2">
              <li><strong>WhatsApp:</strong> <a href="https://wa.me/27696735947" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">+27 69 673 5947</a></li>
              <li><strong>Customer Support:</strong> <a href="mailto:customerservice@scratchsolidsolutions.org" className="text-blue-600 hover:underline">customerservice@scratchsolidsolutions.org</a></li>
              <li><strong>Technical & Admin:</strong> <a href="mailto:it@scratchsolidsolutions.org" className="text-blue-600 hover:underline">it@scratchsolidsolutions.org</a></li>
            </ul>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4 text-center">Get a Quick Quote</h2>
            <p className="text-sm text-zinc-700 mb-4 text-center">
              Getting a price shouldn't be a chore. You can request a Quick Quote in two easy ways:
            </p>
            <ol className="text-base sm:text-lg text-zinc-800 text-left list-decimal list-inside space-y-2">
              <li><strong>Via WhatsApp:</strong> Simply send us your location and a few photos or a description of your space.</li>
              <li><strong>On our Services Page:</strong> Use our <Link href="/services" className="text-blue-600 hover:underline">Request a Quote</Link> to get a detailed estimate for your specific needs.</li>
            </ol>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4 text-center">Operating Hours</h2>
            <ul className="text-base sm:text-lg text-zinc-800 text-left list-none space-y-2">
              <li><strong>Monday – Friday:</strong> 08:00 – 17:00</li>
              <li><strong>Saturday:</strong> 08:00 – 13:00 (Priority for LekkeSlaap & Move-outs)</li>
              <li><strong>Sunday:</strong> Closed</li>
            </ul>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4 text-center">Service Areas</h2>
            <p className="text-sm text-zinc-700 mb-4 text-center">
              We proudly service residential and commercial properties throughout the Northern Suburbs:
            </p>
            <p className="text-base sm:text-lg text-zinc-800 text-center font-semibold text-blue-700">
              Bellville | Durbanville | Brackenfell | Tygervalley | Kuilsriver | Parow | Plattekloof
            </p>
          </div>

          <div className="glass-card mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4 text-center">Follow Our Journey</h2>
            <p className="text-sm text-zinc-700 mb-4 text-center">
              Check out our latest work, before-and-after transformations, and cleaning tips on social media:
            </p>
            <ul className="text-base sm:text-lg text-zinc-800 text-left list-none space-y-2">
              <li><strong>Instagram:</strong> <a href="https://instagram.com/ScratchSolidSolutions" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">@ScratchSolidSolutions</a></li>
              <li><strong>Facebook:</strong> <a href="https://facebook.com/ScratchSolidSolutions" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Scratch Solid Solutions</a></li>
              <li><strong>Web:</strong> <a href="https://scratchsolidsolutions.org/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">www.scratchsolidsolutions.org</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6 sm:mt-8 relative z-10">
          <Link href="/" className="rounded-full bg-blue-600 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors">Back to Home</Link>
          <Link href="/services" className="rounded-full bg-zinc-200 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-blue-700 shadow hover:bg-zinc-300 transition-colors">Our Services</Link>
        </div>
      </div>
    </div>
  );
}
