"use client";

import { useEffect, useState } from "react";
import SiteNav from "@/components/SiteNav";

interface AboutContent {
  section: string;
  title?: string;
  content: string;
}

interface Statistics {
  clients_serviced: number;
  jobs_completed: number;
  average_rating: number;
  active_cleaners: number;
}

interface Leader {
  name: string;
  title: string;
  image_url: string;
  description: string;
}

export default function AboutPage() {
  const [aboutContent, setAboutContent] = useState<AboutContent[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

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
        const [contentRes, leadersRes, statsRes] = await Promise.all([
          fetch('/api/about-content'),
          fetch('/api/leaders'),
          fetch('/api/statistics'),
        ]);
        const contentData: AboutContent[] = contentRes.ok ? await contentRes.json() as AboutContent[] : [];
        const leadersData: Leader[] = leadersRes.ok ? await leadersRes.json() as Leader[] : [];
        const statsData: Statistics | null = statsRes.ok ? await statsRes.json() as Statistics : null;
        setAboutContent(Array.isArray(contentData) ? contentData : []);
        setLeaders(Array.isArray(leadersData) ? leadersData : []);
        setStatistics(statsData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const getSectionContent = (section: string) => {
    return aboutContent.filter(c => c.section === section);
  };

  return (
    <>
    <SiteNav current="about" />
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 sm:py-16 px-2 sm:px-4 font-sans animate-fade-in pt-20">
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
        
        {loading ? (
          <div className="text-center text-gray-500 relative z-10">Loading...</div>
        ) : (
          <div className="text-base sm:text-lg text-zinc-800 mb-6 sm:mb-8 relative z-10">
            {getSectionContent('about-main').map((item, i) => (
              <p key={i} className="text-base sm:text-lg text-zinc-800 mb-4 sm:mb-6 text-center">{item.content}</p>
            ))}
            
            <div className="my-6 sm:my-8">
              {getSectionContent('mission').map((item, i) => (
                <div key={i}>
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-2 text-center">{item.title}</h2>
                  <p className="text-zinc-800 text-center mb-3 sm:mb-4 text-sm sm:text-base">{item.content}</p>
                </div>
              ))}
              {getSectionContent('vision').map((item, i) => (
                <div key={i}>
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-2 text-center">{item.title}</h2>
                  <p className="text-zinc-800 text-center mb-3 sm:mb-4 text-sm sm:text-base">{item.content}</p>
                </div>
              ))}
              {getSectionContent('values').map((item, i) => (
                <div key={i}>
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-2 text-center">{item.title}</h2>
                  <p className="text-zinc-800 text-center mb-3 sm:mb-4 text-sm sm:text-base whitespace-pre-line">{item.content}</p>
                </div>
              ))}
            </div>
            
            {leaders.length > 0 && (
              <div className="my-6 sm:my-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-1 text-center">Our Leadership Team</h2>
                <p className="text-xs text-gray-400 text-center mb-4">Tap a card to learn more</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {leaders.map((leader, index) => (
                    <div
                      key={leader.name + index}
                      className="cursor-pointer"
                      style={{ perspective: '1000px', height: '220px' }}
                      onClick={() => toggleFlip(index)}
                      role="button"
                      aria-label={`Flip card for ${leader.name}`}
                    >
                      <div
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: flippedCards.has(index) ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          transition: 'transform 0.55s ease',
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        {/* Front */}
                        <div
                          style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
                          className="bg-blue-50 rounded-xl p-4 text-center flex flex-col items-center justify-center border-2 border-blue-100"
                        >
                          {leader.image_url ? (
                            <img
                              src={leader.image_url}
                              alt={leader.name}
                              className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-blue-200 shadow"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-blue-200 flex items-center justify-center text-3xl text-blue-600 font-bold">
                              {leader.name.charAt(0)}
                            </div>
                          )}
                          <h3 className="font-bold text-blue-700 text-base">{leader.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{leader.title}</p>
                          <p className="text-[10px] text-gray-400 mt-3">Tap to see bio</p>
                        </div>
                        {/* Back */}
                        <div
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            position: 'absolute',
                            inset: 0,
                          }}
                          className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-5 text-center flex flex-col items-center justify-center"
                        >
                          <h3 className="font-bold text-white text-base mb-1">{leader.name}</h3>
                          <p className="text-blue-200 text-xs mb-3">{leader.title}</p>
                          <p className="text-white text-xs leading-relaxed line-clamp-6">
                            {leader.description || 'No bio available.'}
                          </p>
                          <p className="text-blue-300 text-[10px] mt-3">Tap to flip back</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {statistics && (
              <div className="my-6 sm:my-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-4 text-center">By the Numbers</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-600 rounded-xl p-4 text-center text-white">
                    <p className="text-3xl font-extrabold">{statistics.clients_serviced}</p>
                    <p className="text-sm mt-1 opacity-90">Clients Serviced</p>
                  </div>
                  <div className="bg-blue-600 rounded-xl p-4 text-center text-white">
                    <p className="text-3xl font-extrabold">{statistics.jobs_completed}</p>
                    <p className="text-sm mt-1 opacity-90">Jobs Completed</p>
                  </div>
                  <div className="bg-blue-600 rounded-xl p-4 text-center text-white">
                    <p className="text-3xl font-extrabold">{statistics.average_rating > 0 ? `${statistics.average_rating}★` : 'N/A'}</p>
                    <p className="text-sm mt-1 opacity-90">Average Rating</p>
                  </div>
                  <div className="bg-blue-600 rounded-xl p-4 text-center text-white">
                    <p className="text-3xl font-extrabold">{statistics.active_cleaners}</p>
                    <p className="text-sm mt-1 opacity-90">Active Cleaners</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
      </div>
    </div>
    </>
  );
}
