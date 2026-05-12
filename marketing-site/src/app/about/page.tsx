"use client";

import { useState, useEffect } from "react";
import SiteNav from "@/components/SiteNav";

interface Statistics {
  clients_serviced: number;
  jobs_completed: number;
  average_rating: number;
  active_cleaners: number;
  reviews_count?: number;
}

interface Leader {
  name: string;
  title: string;
  image_url: string;
  description: string;
}

export default function AboutPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  const staticLeaders: Leader[] = [
    {
      name: 'Jason Tshaka',
      title: 'Founder and CEO',
      image_url: '/Jason Prof Pic.jpg',
      description: 'Leading Scratch Solid Solutions with a commitment to excellence and community impact.'
    },
    {
      name: 'Arnica Nqayi',
      title: 'Client Success Manager',
      image_url: '/Arnica_Nqayi.jpg',
      description: 'Dedicated to ensuring every client experiences exceptional service and complete satisfaction with every clean.'
    }
  ];

  const toggleFlip = (index: number) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const statsRes = await fetch('/api/statistics');
        const statsData: Statistics | null = statsRes.ok ? await statsRes.json() as Statistics : null;
        setStatistics(statsData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <>
    <SiteNav current="about" />
    <div className="flex flex-col items-center justify-center min-h-screen py-10 sm:py-16 px-3 sm:px-6 font-sans animate-fade-in pt-20">
      <div className="max-w-5xl w-full space-y-8">
        <div className="glass-panel relative overflow-hidden border border-white/60 shadow-2xl">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
            <img
              src="/scratchsolid-logo.jpg"
              alt="Scratch Solid Logo Background"
              width={280}
              height={280}
              className="opacity-10 w-64 h-64 sm:w-80 sm:h-80 object-contain"
              aria-hidden="true"
            />
          </div>
          <div className="relative z-10 p-6 sm:p-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-800 mb-4 sm:mb-6 text-center drop-shadow-lg">About Us</h1>
            
        {loading ? (
          <div className="text-center text-gray-500 relative z-10">Loading...</div>
        ) : (
          <div className="text-base sm:text-lg text-zinc-800 mb-6 sm:mb-8 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-4 text-center">About Scratch Solid Solutions</h2>
            <p className="text-base sm:text-lg text-zinc-800 mb-4 sm:mb-6 text-center leading-relaxed">
              At Scratch Solid Solutions, we believe a clean environment is the foundation of a productive life and a successful business. Based in the heart of the Northern Suburbs, we provide premium, dependable cleaning services tailored to the unique needs of our local community.
            </p>
            <p className="text-base sm:text-lg text-zinc-800 mb-4 sm:mb-6 text-center leading-relaxed">
              Our expertise covers the essential sectors that keep our suburbs running smoothly:
            </p>
            <ul className="text-base sm:text-lg text-zinc-800 mb-6 sm:mb-8 text-left list-disc list-inside space-y-2">
              <li><strong>Residential Excellence:</strong> Giving homeowners their time back with meticulous attention to detail.</li>
              <li><strong>Office & Commercial Spaces:</strong> Creating hygienic, professional environments that inspire productivity.</li>
              <li><strong>Move-In / Move-Out:</strong> Providing intensive deep-cleans to ensure a seamless transition for tenants and homeowners.</li>
              <li><strong>LekkeSlaap Turnovers:</strong> Ensuring that local guests arrive to a spotless, welcoming stay with high-standard, reliable turnovers.</li>
            </ul>
            <p className="text-base sm:text-lg text-zinc-800 mb-6 sm:mb-8 text-center leading-relaxed">
              Our team is the heart of our business. We invest in quality equipment and rigorous safety standards to ensure that every job is performed with integrity and care. When you choose Scratch Solid Solutions, you aren't just hiring a cleaning crew—you're partnering with a local business dedicated to making our community shine, one space at a time.
            </p>

            <div className="my-6 sm:my-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card h-full">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-2 text-center">Our Mission</h2>
                <p className="text-zinc-800 text-center mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">
                  To provide seamless, high-standard cleaning solutions that enhance the quality of life for our residential clients and the operational success of our commercial partners through reliability, integrity, and expert care.
                </p>
              </div>
              <div className="glass-card h-full">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-2 text-center">Our Vision</h2>
                <p className="text-zinc-800 text-center mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">
                  To be the Western Cape's most trusted name in property maintenance, recognized for empowering our local staff and setting the gold standard for cleanliness in the residential and hospitality sectors.
                </p>
              </div>
            </div>

            <div className="my-6 sm:my-8 glass-card">
              <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4 text-center">Areas We Service</h2>
              <p className="text-base sm:text-lg text-zinc-800 mb-4 text-center leading-relaxed">
                We provide professional on-site cleaning across the Northern Suburbs, including:
              </p>
              <p className="text-base sm:text-lg text-zinc-800 text-center font-semibold text-blue-700">
                Parow | Plattekloof | Durbanville | Tygervalley | Bellville | Kuilsriver | Brackenfell
              </p>
            </div>

            <div className="my-6 sm:my-8 glass-card">
              <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4 text-center">Core Values</h2>
              <ul className="text-base sm:text-lg text-zinc-800 text-left list-disc list-inside space-y-3">
                <li><strong>Precision:</strong> We don't just clean; we restore and maintain with an eye for the smallest details.</li>
                <li><strong>Reliability:</strong> Our clients depend on our consistency, and we show up ready to deliver every time.</li>
                <li><strong>Local Commitment:</strong> We are proud to contribute to the local economy by providing quality service and meaningful employment within our community.</li>
              </ul>
            </div>
            
            <div className="my-6 sm:my-8">
              <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4 text-center">Our Leadership Team</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {staticLeaders.map((leader, index) => (
                    <div
                      key={leader.name + index}
                      className="glass-card cursor-pointer h-full"
                      onClick={() => toggleFlip(index)}
                      role="button"
                      aria-label={`Flip card for ${leader.name}`}
                      style={{ perspective: '1000px' }}
                    >
                      <div
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: flippedCards.has(index) ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          transition: 'transform 0.55s ease',
                          position: 'relative',
                          width: '100%',
                          minHeight: '280px',
                        }}
                      >
                        {/* Front */}
                        <div
                          style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
                          className="bg-white/85 rounded-xl p-4 sm:p-5 text-center flex flex-col items-center justify-center border border-blue-100"
                        >
                          {leader.image_url ? (
                            <img
                              src={leader.image_url}
                              alt={leader.name}
                              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto mb-2 sm:mb-3 object-cover border-2 border-blue-200 shadow"
                            />
                          ) : (
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto mb-2 sm:mb-3 bg-blue-100 flex items-center justify-center text-3xl text-blue-700 font-bold">
                              {leader.name.charAt(0)}
                            </div>
                          )}
                          <h3 className="font-bold text-blue-800 text-sm sm:text-base">{leader.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">{leader.title}</p>
                          <p className="text-[10px] text-gray-400 mt-2 sm:mt-3">Tap to see bio</p>
                        </div>
                        {/* Back */}
                        <div
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            position: 'absolute',
                            inset: 0,
                          }}
                          className="bg-gradient-to-br from-blue-700 to-blue-500 rounded-xl p-4 sm:p-5 text-center flex flex-col items-center justify-center text-white"
                        >
                          <h3 className="font-bold text-sm sm:text-base mb-1">{leader.name}</h3>
                          <p className="text-blue-100 text-xs mb-2 sm:mb-3">{leader.title}</p>
                          <p className="text-white text-xs leading-relaxed px-1">
                            {leader.description || 'No bio available.'}
                          </p>
                          <p className="text-blue-200 text-[10px] mt-2 sm:mt-3">Tap to flip back</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
            
            {statistics && (
              <div className="my-6 sm:my-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-4 text-center">By the Numbers</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-card text-center">
                    <p className="text-3xl font-extrabold text-blue-800">{statistics.clients_serviced}</p>
                    <p className="text-sm mt-1 text-gray-600">Clients Serviced</p>
                  </div>
                  <div className="glass-card text-center">
                    <p className="text-3xl font-extrabold text-blue-800">{statistics.jobs_completed}</p>
                    <p className="text-sm mt-1 text-gray-600">Jobs Completed</p>
                  </div>
                  <div className="glass-card text-center">
                    <p className="text-3xl font-extrabold text-blue-800">{statistics.average_rating > 0 ? `${statistics.average_rating}★` : 'N/A'}</p>
                    <p className="text-sm mt-1 text-gray-600">Average Rating</p>
                  </div>
                  <div className="glass-card text-center">
                    <p className="text-3xl font-extrabold text-blue-800">{statistics.reviews_count ?? 0}</p>
                    <p className="text-sm mt-1 text-gray-600">Reviews Received</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
