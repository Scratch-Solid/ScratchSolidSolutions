"use client";

import Link from "next/link";

export default function AboutPage() {

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 sm:py-16 px-2 sm:px-4 font-sans animate-fade-in">
      <div className="max-w-2xl w-full bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-10 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <img
            src="/scratchsolid-logo.jpg"
            alt="Scratch Solid Logo Background"
            width={300}
            height={300}
            className="opacity-10 w-72 h-72 sm:w-96 sm:h-96 object-contain"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-700 mb-4 sm:mb-6 text-center drop-shadow-lg">About Us</h1>
        <div className="text-base sm:text-lg text-zinc-800 mb-6 sm:mb-8 relative z-10">
          <p className="text-base sm:text-lg text-zinc-800 mb-4 sm:mb-6 text-center">Scratch Solid Solutions is a premier cleaning service provider dedicated to delivering exceptional cleaning solutions for homes and businesses.</p>
          <div className="my-6 sm:my-8">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-2 text-center">Our Mission</h2>
            <p className="text-zinc-800 text-center mb-3 sm:mb-4 text-sm sm:text-base">To provide reliable, high-quality cleaning services that exceed customer expectations every time.</p>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-2 text-center">Our Vision</h2>
            <p className="text-zinc-800 text-center mb-3 sm:mb-4 text-sm sm:text-base">To be the leading cleaning service provider known for excellence, reliability, and customer satisfaction.</p>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-2 text-center">Our Values</h2>
            <ul className="text-zinc-800 text-center list-none mb-3 sm:mb-4 text-sm sm:text-base">
              <li>Quality First</li>
              <li>Customer Satisfaction</li>
              <li>Reliability</li>
              <li>Integrity</li>
            </ul>
          </div>
          <p className="text-base sm:text-lg text-zinc-800 mb-4 sm:mb-6 text-center">We are committed to making your spaces sparkle with our professional cleaning services.</p>
          <p className="text-lg sm:text-xl font-bold text-green-700 text-center mb-3 sm:mb-4">Excellence in Every Clean</p>
        </div>
        <div className="flex justify-center mt-6 sm:mt-8 relative z-10">
          <Link href="/" className="rounded-full bg-blue-600 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
