import Link from "next/link";

export const metadata = {
  title: "Services | Scratch Solid Solutions",
  description: "Explore our detailed list of cleaning services and request a quote.",
};

export default function ServicesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white py-16 px-4 font-sans animate-fade-in">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border-2 border-blue-200 p-10 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <img
            src="/scratchsolid-logo.jpg"
            alt="Scratch Solid Logo Background"
            width={400}
            height={400}
            className="opacity-10 w-96 h-96 object-contain"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-4xl font-extrabold text-blue-700 mb-6 text-center drop-shadow-lg">Our Services</h1>
        <ul className="text-lg text-zinc-800 mb-8 list-disc pl-6 relative z-10">
          <li className="mb-2"><b>Residential Cleaning:</b> Homes, apartments, and complexes</li>
          <li className="mb-2"><b>Office Cleaning:</b> Workspaces, offices, and business premises</li>
          <li className="mb-2"><b>Deep Cleaning:</b> Intensive cleaning for kitchens, bathrooms, carpets, and more</li>
          <li className="mb-2"><b>Move-In/Move-Out Cleaning:</b> End-of-lease and pre-occupancy cleaning</li>
          <li className="mb-2"><b>Custom Cleaning:</b> Tailored solutions for unique needs</li>
        </ul>
        <div className="text-center text-blue-700 font-semibold text-lg mb-6 relative z-10">
          <span>Contact us for a detailed quote or to discuss your specific requirements!</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
          <a href="/contact" className="rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors">Request a Quote</a>
          <a href="/" className="rounded-full bg-zinc-200 px-8 py-3 text-lg font-semibold text-blue-700 shadow hover:bg-zinc-300 transition-colors">Back to Home</a>
        </div>
      </div>
    </div>
  );
}
