"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function GlassifiedPage() {
  const [selectedService, setSelectedService] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4 font-sans relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/scratchsolid-logo.jpg"
          alt="Scratch Solid Background"
          fill
          className="object-cover opacity-20"
          priority={true}
        />
      </div>
      
      {/* Glassified Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-blue-200 p-12 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center text-blue-700 mb-8">
            Choose Your Service
          </h1>
          
          <div className="space-y-6">
            {/* Home Cleaning Option */}
            <div 
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                selectedService === 'home' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 bg-white hover:border-blue-400'
              }`}
              onClick={() => setSelectedService('home')}
            >
              <div className="flex items-center space-x-4">
                <div className="text-4xl">🏠</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Home Cleaning</h3>
                  <p className="text-gray-600">Professional home cleaning services</p>
                </div>
              </div>
            </div>

            {/* Business Cleaning Option */}
            <div 
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                selectedService === 'business' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 bg-white hover:border-blue-400'
              }`}
              onClick={() => setSelectedService('business')}
            >
              <div className="flex items-center space-x-4">
                <div className="text-4xl">🏢</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Business Cleaning</h3>
                  <p className="text-gray-600">Commercial cleaning solutions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          {selectedService && (
            <div className="mt-8 space-y-4">
              {selectedService === 'home' && (
                <Link 
                  href="/client-dashboard"
                  className="w-full rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors text-center"
                >
                  Continue to Home Dashboard
                </Link>
              )}
              
              {selectedService === 'business' && (
                <Link 
                  href="/business-dashboard"
                  className="w-full rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors text-center"
                >
                  Continue to Business Dashboard
                </Link>
              )}
              
              <button
                onClick={() => setSelectedService(null)}
                className="w-full rounded-full border-2 border-gray-300 px-8 py-3 text-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
