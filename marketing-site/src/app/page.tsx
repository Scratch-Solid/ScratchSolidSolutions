"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import AIAssistant from "@/components/AIAssistant";

export default function Home() {
  const [overlayOpen, setOverlayOpen] = useState(false);

  const handleBookCleaner = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // If logged in, route to booking type selection
      window.location.href = "/booking-selection";
    } else {
      // If new user, route to auth page
      window.location.href = "/auth";
    }
  };



  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white py-4 sm:py-8 px-2 sm:px-4 font-sans relative">
      {/* Navigation Bar - Only on main page */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg z-40 px-2 sm:px-4 py-2 sm:py-3" role="navigation" aria-label="Main navigation">
        <div className="max-w-6xl mx-auto flex items-center justify-center space-x-4 sm:space-x-8">
          <Link href="/services" className="text-gray-700 hover:text-blue-600 active:text-blue-600 font-semibold text-sm sm:text-base lg:text-lg transition-colors" aria-label="Navigate to Services page">
            Services
          </Link>
          <Link href="/about" className="text-gray-700 hover:text-blue-600 active:text-blue-600 font-semibold text-sm sm:text-base lg:text-lg transition-colors" aria-label="Navigate to About Us page">
            About Us
          </Link>
          <Link href="/gallery" className="text-gray-700 hover:text-blue-600 active:text-blue-600 font-semibold text-sm sm:text-base lg:text-lg transition-colors" aria-label="Navigate to Gallery page">
            Gallery
          </Link>
        </div>
      </nav>
      <div className="max-w-2xl sm:max-w-3xl lg:max-w-4xl w-full bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-8 sm:p-12 lg:p-16 relative mt-20 sm:mt-24 flex flex-col items-center text-center overflow-hidden">
        {/* Background watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <Image
            src="/scratchsolid-logo.jpg"
            alt=""
            width={400}
            height={400}
            className="opacity-[0.07] w-72 h-72 sm:w-96 sm:h-96 lg:w-[28rem] lg:h-[28rem] object-contain"
            aria-hidden="true"
          />
        </div>

        {/* Title — top */}
        <h1 className="relative z-10 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-blue-700 mb-3 sm:mb-4 tracking-tight leading-tight">
          Scratch Solid Solutions
        </h1>

        {/* Tagline */}
        <p className="relative z-10 text-blue-500 font-semibold text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 tracking-widest uppercase">
          Scratch-Free. Solidly Clean.
        </p>

        {/* Divider */}
        <div className="relative z-10 w-16 h-1 bg-blue-200 rounded-full mb-6 sm:mb-8" />

        {/* Description */}
        <div className="relative z-10 mb-8 sm:mb-10 lg:mb-12 space-y-3 max-w-xl">
          <p className="text-gray-700 text-base sm:text-lg lg:text-xl leading-relaxed">
            Professional, reliable, and affordable cleaning services for homes and businesses.
          </p>
          <p className="text-gray-500 text-sm sm:text-base">
            Experienced cleaners &nbsp;·&nbsp; Quality guaranteed &nbsp;·&nbsp; Fully insured
          </p>
        </div>

        {/* Book a Cleaner — bottom */}
        <div className="relative z-10">
          <button
            onClick={handleBookCleaner}
            className="rounded-full bg-blue-600 px-10 sm:px-14 lg:px-20 py-4 sm:py-5 text-lg sm:text-xl lg:text-2xl font-bold text-white shadow-xl hover:bg-blue-700 active:scale-95 transition-all duration-200 transform hover:scale-105"
            aria-label="Book a cleaner now"
          >
            Book a Cleaner
          </button>
          <p className="mt-3 text-xs sm:text-sm text-gray-400">No account needed to get a quote</p>
        </div>
      </div>

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/27696735947"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-2xl border-2 border-white hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
        aria-label="WhatsApp Booking"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20" fill="white"><path d="M16 3C9.373 3 4 8.373 4 15c0 2.646.86 5.09 2.33 7.09L4 29l7.18-2.28C12.91 27.14 14.43 27.5 16 27.5c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.41 0-2.79-.23-4.09-.68l-.29-.1-4.18 1.33 1.36-4.07-.18-.28C6.23 18.01 6 16.52 6 15c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.07-7.75c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.25-1.41-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.48.14-.16.18-.28.28-.46.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29s.98 2.66 1.12 2.85c.14.18 1.93 2.95 4.68 4.02.65.28 1.16.45 1.56.58.66.21 1.26.18 1.73.11.53-.08 1.65-.67 1.89-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.18-.53-.32z"/></svg>
      </a>

      {/* Overlay Logo Button - Bottom-left corner */}
      <div className="fixed bottom-6 left-6 z-50">
        <div className="relative" id="overlay-menu">
          <button
            onClick={() => setOverlayOpen(o => !o)}
            className="w-14 h-14 bg-white/90 backdrop-blur-md rounded-full shadow-lg border-2 border-blue-200 flex items-center justify-center hover:bg-blue-50 transition-all duration-200 active:scale-95"
            aria-label="Open menu"
            aria-expanded={overlayOpen}
            aria-controls="overlay-menu-dropdown"
          >
            <img
              src="/scratchsolid-logo.jpg"
              alt="Scratch Solid Logo"
              width={40}
              height={40}
              className="object-contain animate-spin-slow"
            />
          </button>
          {/* Dropdown Menu - Glassified overlay */}
          <div
            id="overlay-menu-dropdown"
            className={`absolute left-0 mb-3 w-56 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 bottom-full transition-all duration-200 ${overlayOpen ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'}`}
            role="menu"
            aria-label="Quick access menu"
          >
            <div className="py-3">
              <Link href="/privacy" className="block px-4 py-2.5 hover:bg-blue-50 text-gray-700 font-medium transition-colors" role="menuitem">Privacy Policy</Link>
              <Link href="/terms" className="block px-4 py-2.5 hover:bg-blue-50 text-gray-700 font-medium transition-colors" role="menuitem">Terms of Service</Link>
              <Link href="/contact" className="block px-4 py-2.5 hover:bg-blue-50 text-gray-700 font-medium transition-colors" role="menuitem">Contact Us</Link>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
}
