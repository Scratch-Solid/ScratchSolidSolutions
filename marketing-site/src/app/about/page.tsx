import Link from "next/link";

export const metadata = {
  title: "About Us | Scratch Solid Solutions",
  description: "Learn more about Scratch Solid Solutions and our commitment to spotless, reliable cleaning services.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white py-16 px-4 font-sans animate-fade-in">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border-2 border-blue-200 p-10">
        {/* Decorative logo in card background */}
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
        <h1 className="text-4xl font-extrabold text-blue-700 mb-6 text-center drop-shadow-lg">About Us</h1>
        <p className="text-lg text-zinc-800 mb-6 text-center">
          At <span className="font-bold text-blue-700">Scratch Solid Solutions</span>, we believe that a clean space is the foundation of productivity, comfort, and peace of mind. Built on the promise of reliability and excellence, our company delivers professional cleaning services that leave every surface spotless and scratch-free.
        </p>
        <p className="text-lg text-zinc-800 mb-6 text-center">
          Our team is dedicated to providing tailored cleaning solutions for homes, offices, and commercial spaces. Whether it’s routine maintenance or deep cleaning, we approach every job with precision, care, and a commitment to the highest standards. With our slogan, <span className="italic text-blue-600">“Scratch-Free, Solidly Clean,”</span> we embody the values of trust, strength, and attention to detail.
        </p>

        {/* Mission, Vision, Values Sections */}
        <div className="my-8">
          <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Our Mission</h2>
          <p className="text-zinc-800 text-center mb-4">To deliver spotless, reliable cleaning services that create healthy, productive, and welcoming environments for our clients.</p>
          <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Our Vision</h2>
          <p className="text-zinc-800 text-center mb-4">To be the most trusted and innovative cleaning solutions provider, setting new standards for quality, sustainability, and customer satisfaction.</p>
          <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Our Values</h2>
          <ul className="text-zinc-800 text-center list-none mb-4">
            <li><b>Trust:</b> We build lasting relationships through honesty and reliability.</li>
            <li><b>Excellence:</b> We deliver outstanding results every time.</li>
            <li><b>Attention to Detail:</b> We care for every surface and every client need.</li>
            <li><b>Eco-Consciousness:</b> We use safe, sustainable cleaning practices.</li>
            <li><b>Customer-First:</b> We listen, adapt, and put our clients at the center of everything we do.</li>
          </ul>
        </div>
        <p className="text-lg text-zinc-800 mb-6 text-center">
          We don’t just clean — we create environments where people can thrive. By combining modern techniques, eco-conscious practices, and a customer-first mindset, Scratch Solid Solutions ensures that every client enjoys a space that feels fresh, safe, and welcoming.
        </p>
        <p className="text-xl font-bold text-green-700 text-center mb-4">Solid solutions. Spotless results. Every time.</p>
        <div className="flex justify-center mt-8">
          <Link href="/" className="rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
