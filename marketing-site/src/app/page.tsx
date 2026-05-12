"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import AIAssistant from "@/components/AIAssistant";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export default function Home() {
  const [overlayOpen, setOverlayOpen] = useState(false);
  useSessionTimeout(true);

  const handleBookCleaner = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      window.location.href = "/booking-selection";
    } else {
      window.location.href = "/auth";
    }
  };

  return (
    <div className="min-h-screen font-sans relative">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg z-40 px-2 sm:px-4 py-2 sm:py-3" role="navigation" aria-label="Main navigation">
        <div className="max-w-6xl mx-auto flex items-center justify-center space-x-4 sm:space-x-8">
          <Link href="/services" className="text-gray-700 hover:text-blue-600 active:text-blue-600 font-semibold text-sm sm:text-base lg:text-lg transition-colors">Services</Link>
          <Link href="/about" className="text-gray-700 hover:text-blue-600 active:text-blue-600 font-semibold text-sm sm:text-base lg:text-lg transition-colors">About Us</Link>
          <Link href="/gallery" className="text-gray-700 hover:text-blue-600 active:text-blue-600 font-semibold text-sm sm:text-base lg:text-lg transition-colors">Gallery</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 px-2 sm:px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-blue-700 mb-4 sm:mb-6 tracking-tight leading-tight">
            A Spotless Space. Total Transparency.
          </h1>
          <p className="text-xl sm:text-2xl lg:text-3xl text-gray-700 mb-3 sm:mb-4 font-semibold">
            Professional Residential & Commercial Cleaning in the Northern Suburbs.
          </p>
          <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
            From Durbanville to Brackenfell, we bring precision, reliability, and real-time tracking to every clean.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={handleBookCleaner}
              className="rounded-full bg-blue-600 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold text-white shadow-xl hover:bg-blue-700 active:scale-95 transition-all duration-200"
            >
              Get a Quick Quote
            </button>
            <Link
              href="/services"
              className="rounded-full bg-white border-2 border-blue-600 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold text-blue-600 shadow-lg hover:bg-blue-50 active:scale-95 transition-all duration-200"
            >
              Explore Our Services
            </Link>
          </div>
        </div>
      </section>

      {/* The "Scratch Solid" Advantage Section */}
      <section className="py-12 sm:py-16 px-2 sm:px-4 bg-blue-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-800 mb-6 sm:mb-8 text-center">
            The "Scratch Solid" Advantage: Why Us?
          </h2>
          <p className="text-lg sm:text-xl text-gray-700 mb-6 sm:mb-8 text-center font-semibold">
            Cleaning with Nothing to Hide.
          </p>
          <p className="text-base sm:text-lg text-gray-600 mb-8 sm:mb-10 text-center max-w-2xl mx-auto">
            In an industry where trust is everything, we lead with transparency. Our custom platform keeps you in the loop from start to finish.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-md border border-blue-100">
              <h3 className="font-bold text-blue-700 mb-2 text-base sm:text-lg">Real-Time Tracking</h3>
              <p className="text-sm sm:text-base text-gray-600">Watch your cleaner's status in real-time—from "On the Way" to "Completed"—using live geolocation.</p>
            </div>
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-md border border-blue-100">
              <h3 className="font-bold text-blue-700 mb-2 text-base sm:text-lg">Guaranteed Time on Site</h3>
              <p className="text-sm sm:text-base text-gray-600">Our Standard Clean includes 3 hours of active cleaning in a 4-hour window. No rushed jobs, ever.</p>
            </div>
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-md border border-blue-100">
              <h3 className="font-bold text-blue-700 mb-2 text-base sm:text-lg">Secure & Verified</h3>
              <p className="text-sm sm:text-base text-gray-600">We are POPIA compliant and secured by Cloudflare, ensuring your data and your home are in safe hands.</p>
            </div>
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-md border border-blue-100">
              <h3 className="font-bold text-blue-700 mb-2 text-base sm:text-lg">The Signature Finish</h3>
              <p className="text-sm sm:text-base text-gray-600">Every space is hand-checked and treated with our signature Fresh Lemon spray.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Specialized Services Section */}
      <section className="py-12 sm:py-16 px-2 sm:px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-800 mb-6 sm:mb-8 text-center">
            Our Specialized Services
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 text-center">
            Quick links to your main offerings:
          </p>
          <div className="space-y-3 sm:space-y-4">
            <Link href="/services" className="block bg-white rounded-xl p-4 sm:p-5 shadow-md border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <h3 className="font-bold text-blue-700 mb-1 text-base sm:text-lg">Residential & Office</h3>
              <p className="text-sm sm:text-base text-gray-600">Weekly maintenance to keep life and work moving.</p>
            </Link>
            <Link href="/services" className="block bg-white rounded-xl p-4 sm:p-5 shadow-md border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <h3 className="font-bold text-blue-700 mb-1 text-base sm:text-lg">LekkeSlaap Turnovers</h3>
              <p className="text-sm sm:text-base text-gray-600">5-star readiness for your Northern Suburbs guest stays.</p>
            </Link>
            <Link href="/services" className="block bg-white rounded-xl p-4 sm:p-5 shadow-md border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <h3 className="font-bold text-blue-700 mb-1 text-base sm:text-lg">Move-In / Move-Out</h3>
              <p className="text-sm sm:text-base text-gray-600">Heavy-duty deep cleans for a stress-free transition.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Areas We Service Section */}
      <section className="py-12 sm:py-16 px-2 sm:px-4 bg-blue-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-800 mb-3 sm:mb-4">
            Areas We Service
          </h2>
          <p className="text-lg sm:text-xl text-gray-700 mb-6 sm:mb-8 font-semibold">
            Your Local Northern Suburbs Partner
          </p>
          <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">
            We are proud to serve:
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <span className="bg-white px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base text-gray-700 shadow-sm border border-blue-200">Parow</span>
            <span className="bg-white px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base text-gray-700 shadow-sm border border-blue-200">Plattekloof</span>
            <span className="bg-white px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base text-gray-700 shadow-sm border border-blue-200">Durbanville</span>
            <span className="bg-white px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base text-gray-700 shadow-sm border border-blue-200">Tygervalley</span>
            <span className="bg-white px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base text-gray-700 shadow-sm border border-blue-200">Bellville</span>
            <span className="bg-white px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base text-gray-700 shadow-sm border border-blue-200">Kuilsriver</span>
            <span className="bg-white px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base text-gray-700 shadow-sm border border-blue-200">Brackenfell</span>
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="py-12 sm:py-16 px-2 sm:px-4 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
            Ready to see the difference transparency makes?
          </h2>
          <p className="text-base sm:text-lg mb-6 sm:mb-8">
            Get your Quick Quote via WhatsApp today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center text-sm sm:text-base">
            <a href="https://wa.me/27696735947" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
              <span className="font-semibold">WhatsApp:</span> +27 69 673 5947
            </a>
            <a href="mailto:customerservice@scratchsolidsolutions.org" className="flex items-center gap-2 hover:underline">
              <span className="font-semibold">Email:</span> customerservice@scratchsolidsolutions.org
            </a>
            <a href="https://instagram.com/ScratchSolidSolutions" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
              <span className="font-semibold">Social:</span> @ScratchSolidSolutions
            </a>
          </div>
        </div>
      </section>

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/27696735947"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-2xl border-2 border-white hover:bg-green-600 transition-colors"
        aria-label="WhatsApp Booking"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20" fill="white"><path d="M16 3C9.373 3 4 8.373 4 15c0 2.646.86 5.09 2.33 7.09L4 29l7.18-2.28C12.91 27.14 14.43 27.5 16 27.5c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.41 0-2.79-.23-4.09-.68l-.29-.1-4.18 1.33 1.36-4.07-.18-.28C6.23 18.01 6 16.52 6 15c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.07-7.75c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.25-1.41-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.48.14-.16.18-.28.28-.46.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29s.98 2.66 1.12 2.85c.14.18 1.93 2.95 4.68 4.02.65.28 1.16.45 1.56.58.66.21 1.26.18 1.73.11.53-.08 1.65-.67 1.89-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.18-.53-.32z"/></svg>
      </a>

      {/* Overlay Logo Button */}
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
          <div
            id="overlay-menu-dropdown"
            className={`absolute left-0 mb-3 w-56 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 bottom-full transition-all duration-200 ${overlayOpen ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'}`}
            role="menu"
            aria-label="Quick access menu"
          >
            <div className="py-3">
              <Link href="/privacy" className="block px-4 py-2.5 hover:bg-blue-50 text-gray-700 font-medium transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="block px-4 py-2.5 hover:bg-blue-50 text-gray-700 font-medium transition-colors">Terms of Service</Link>
              <Link href="/contact" className="block px-4 py-2.5 hover:bg-blue-50 text-gray-700 font-medium transition-colors">Contact Us</Link>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
}
