"use client";

import Link from "next/link";
import { getAboutUs } from "../directusApi";
import { useEffect, useState } from "react";

export default function AboutPage() {
  const [about, setAbout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getAboutUs().then((data) => {
      setAbout(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white py-16 px-4 font-sans animate-fade-in">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border-2 border-blue-200 p-10">
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
        {loading ? (
          <div className="text-center text-zinc-500">Loading...</div>
        ) : about ? (
          <>
            <p className="text-lg text-zinc-800 mb-6 text-center">{about.intro}</p>
            <div className="my-8">
              <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Our Mission</h2>
              <p className="text-zinc-800 text-center mb-4">{about.mission}</p>
              <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Our Vision</h2>
              <p className="text-zinc-800 text-center mb-4">{about.vision}</p>
              <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Our Values</h2>
              <ul className="text-zinc-800 text-center list-none mb-4">
                {about.values?.map((v: string, i: number) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
            <p className="text-lg text-zinc-800 mb-6 text-center">{about.outro}</p>
            <p className="text-xl font-bold text-green-700 text-center mb-4">{about.slogan}</p>
          </>
        ) : (
          <div className="text-center text-red-500">Failed to load content.</div>
        )}
        <div className="flex justify-center mt-8">
          <Link href="/" className="rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
