import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white py-16 px-4 font-sans animate-fade-in">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border-2 border-blue-200 p-10 relative">
        {/* Logo in top right */}
        {/* Decorative logo in card background */}
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
        <h1 className="text-5xl sm:text-6xl font-extrabold text-center text-blue-700 mb-4 tracking-tight drop-shadow-lg animate-bounce">
          GRAND OPENING!
        </h1>
        <div className="text-center text-pink-600 font-bold text-2xl mb-2 animate-pulse">Special: <span className="text-black dark:text-zinc-50">R350</span> for 4 hours</div>
        <div className="text-center text-blue-700 font-semibold text-lg mb-2">Starting <span className="font-bold">1 May 2026</span></div>
        <div className="text-center text-zinc-700 dark:text-zinc-300 mb-6 text-lg">
          <div>🎉 Professional, reliable, and affordable cleaning services for homes and businesses.</div>
          <div className="mt-2">Book your slot for only <span className="font-bold">R350</span> during our grand opening! 🎈</div>
        </div>
        {/* Removed scratch-sink image for a cleaner look */}
        <div className="flex justify-center">
          <a
            href="http://localhost:5173"
            className="inline-block rounded-full bg-blue-600 px-12 py-5 text-2xl font-extrabold text-white shadow-xl transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 mb-4 animate-fade-in"
          >
            Book a cleaner
          </a>
        </div>
      </div>


      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/27696735947?text=Hi%2C%20I%20would%20like%20to%20book%20a%20cleaning%20service%20with%20Scratch%20Solid."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-2xl border-2 border-white hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
        aria-label="WhatsApp Booking"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20" fill="white"><path d="M16 3C9.373 3 4 8.373 4 15c0 2.646.86 5.09 2.33 7.09L4 29l7.18-2.28C12.91 27.14 14.43 27.5 16 27.5c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.41 0-2.79-.23-4.09-.68l-.29-.1-4.18 1.33 1.36-4.07-.18-.28C6.23 18.01 6 16.52 6 15c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.07-7.75c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.25-1.41-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.48.14-.16.18-.28.28-.46.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29s.98 2.66 1.12 2.85c.14.18 1.93 2.95 4.68 4.02.65.28 1.16.45 1.56.58.66.21 1.26.18 1.73.11.53-.08 1.65-.67 1.89-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.18-.53-.32z"/></svg>
      </a>
    </div>
  );
}
