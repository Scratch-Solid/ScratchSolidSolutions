import Image from "next/image";
import Link from "next/link";

export default function Home() {
  // Static data for static export
  const promos = [
    {
      title: "GRAND OPENING!",
      description: "Special: R350 for 4 hours",
      start_date: "2026-05-01"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white py-16 px-4 font-sans animate-fade-in">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border-2 border-blue-200 p-10 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <Image
            src="/scratchsolid-logo.jpg"
            alt="Scratch Solid Logo Background"
            width={400}
            height={400}
            className="opacity-10 w-96 h-96 object-contain"
            aria-hidden="true"
            priority={true}
          />
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-center text-blue-700 mb-4 tracking-tight drop-shadow-lg animate-bounce">
          {promos[0]?.title}
        </h1>
        <div className="text-center text-pink-600 font-bold text-2xl mb-2 animate-pulse">
          {promos[0]?.description}
        </div>
        <div className="text-center text-blue-700 font-semibold text-lg mb-2">
          Starting {new Date(promos[0].start_date).toLocaleDateString()}
        </div>
        <div className="text-center text-zinc-700 dark:text-zinc-300 mb-6 text-lg">
          <div>🎉 Professional, reliable, and affordable cleaning services for homes and businesses.</div>
          <div className="mt-2">Book your slot for only <span className="font-bold">R350</span> during our grand opening! 🎈</div>
        </div>
        <div className="flex justify-center mb-8">
          <Link
            href="/book"
            className="rounded-full bg-blue-600 px-10 py-3 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
          >
            Book a cleaner
          </Link>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border bg-blue-50 p-4 mb-2 shadow">
            <div className="font-bold text-xl text-blue-700">Home Cleaning</div>
            <div className="text-zinc-700">Professional home cleaning services</div>
            <Link href="/book?service=home" className="inline-block mt-2 rounded bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700">Book Now</Link>
          </div>
          <div className="rounded-xl border bg-blue-50 p-4 mb-2 shadow">
            <div className="font-bold text-xl text-blue-700">Business Cleaning</div>
            <div className="text-zinc-700">Commercial cleaning solutions</div>
            <Link href="/book?service=business" className="inline-block mt-2 rounded bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700">Book Now</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
