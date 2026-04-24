"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import AIAssistant from "@/components/AIAssistant";
import { getPromotions, getHomeTiles } from "./directusApi";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [homeTiles, setHomeTiles] = useState<any[]>([]);

  useEffect(() => {
    // Check if user is logged in and redirect to appropriate dashboard
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    
    if (token && userRole) {
      // User is logged in, redirect to appropriate dashboard
      if (userRole === 'business') {
        window.location.href = '/business-dashboard';
      } else {
        window.location.href = '/client-dashboard';
      }
      return;
    }
    
    setIsLoggedIn(!!token);

    // Load content from Directus
    const loadContent = async () => {
      try {
        const promoData = await getPromotions();
        const tileData = await getHomeTiles();
        setPromotions(promoData);
        setHomeTiles(tileData);
      } catch (error) {
        console.error("Error loading content:", error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

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

  const handleLogout = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white py-16 px-4 font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white py-8 px-2 sm:px-4 font-sans relative">
      {/* Navigation Bar - Only on main page */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg z-40 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-center space-x-8">
          <Link href="/services" className="text-gray-700 hover:text-blue-600 active:text-blue-600 font-semibold text-base sm:text-lg transition-colors">
            Services
          </Link>
          <Link href="/about" className="text-gray-700 hover:text-blue-600 active:text-blue-600 font-semibold text-base sm:text-lg transition-colors">
            About Us
          </Link>
          <Link href="/gallery" className="text-gray-700 hover:text-blue-600 active:text-blue-600 font-semibold text-base sm:text-lg transition-colors">
            Gallery
          </Link>
          {isLoggedIn && (
            <button onClick={handleLogout} className="text-red-600 hover:text-red-700 active:text-red-700 font-semibold text-base sm:text-lg transition-colors">
              Logout
            </button>
          )}
        </div>
      </nav>
      <div className="max-w-xl sm:max-w-2xl w-full bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border-2 border-blue-200 p-6 sm:p-8 lg:p-10 relative mt-12 sm:mt-16 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <Image
            src="/scratchsolid-logo.jpg"
            alt="Scratch Solid Logo Background"
            width={400}
            height={400}
            className="opacity-10 w-96 h-96 object-contain"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-center text-blue-700 mb-4 sm:mb-6 tracking-tight">
          Scratch Solid Solutions
        </h1>
        <div className="text-center text-black mb-6 sm:mb-8 text-sm sm:text-base lg:text-lg">
          {promotions.length > 0 ? (
            promotions.map((promo, index) => (
              <div key={index} className="mb-2 sm:mb-4">
                <div className="text-blue-600 font-semibold text-base sm:text-xl mb-2">{promo.title}</div>
                <div className="text-black text-xs sm:text-sm">{promo.description}</div>
              </div>
            ))
          ) : (
            <div className="mb-2 sm:mb-4">Professional, reliable, and affordable cleaning services for homes and businesses.</div>
          )}
          {homeTiles.length > 0 && homeTiles[0].subtitle && (
            <div className="text-blue-600 font-semibold text-base sm:text-xl mb-2">{homeTiles[0].subtitle}</div>
          )}
          <div className="text-black text-xs sm:text-sm">Experienced cleaners | Quality guaranteed | Fully insured</div>
        </div>
        <div className="flex justify-center mb-6 sm:mb-8">
          <button
            onClick={handleBookCleaner}
            className="rounded-full bg-blue-600 px-16 sm:px-20 lg:px-24 py-4 sm:py-5 lg:py-6 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white shadow-2xl hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95"
          >
            Book a Cleaner
          </button>
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
        <div className="relative group">
          <button className="w-14 h-14 bg-white/90 backdrop-blur-md rounded-full shadow-lg border-2 border-blue-200 flex items-center justify-center hover:bg-blue-50 transition-all duration-200 active:scale-95">
            <img
              src="/scratchsolid-logo.jpg"
              alt="Scratch Solid Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </button>
          {/* Dropdown Menu - Glassified overlay */}
          <div className="absolute left-0 mb-3 w-56 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bottom-full">
            <div className="py-3">
              <Link href="/client-signup" className="block px-4 py-2.5 hover:bg-blue-50 text-gray-700 font-medium transition-colors">Client Signup</Link>
              <Link href="/business-signup" className="block px-4 py-2.5 hover:bg-blue-50 text-gray-700 font-medium transition-colors">Business Signup</Link>
              <Link href="/login" className="block px-4 py-2.5 hover:bg-blue-50 text-gray-700 font-medium transition-colors">Login</Link>
              <Link href="/book" className="block px-4 py-2.5 hover:bg-blue-50 text-gray-700 font-medium transition-colors">Book Service</Link>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
}
