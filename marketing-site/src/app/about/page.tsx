"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface AboutContent {
  section: string;
  title: string;
  content: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/about-content').then(res => res.json()),
      fetch('/api/leaders').then(res => res.json())
    ]).then(([contentData, leadersData]) => {
      setAboutContent(contentData || []);
      setLeaders(leadersData || []);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching data:', err);
      setLoading(false);
    });
  }, []);

  const getSectionContent = (section: string) => {
    return aboutContent.filter(c => c.section === section);
  };

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
        
        {loading ? (
          <div className="text-center text-gray-500 relative z-10">Loading...</div>
        ) : (
          <div className="text-base sm:text-lg text-zinc-800 mb-6 sm:mb-8 relative z-10">
            {getSectionContent('intro').map((item) => (
              <p key={item.title} className="text-base sm:text-lg text-zinc-800 mb-4 sm:mb-6 text-center">{item.content}</p>
            ))}
            
            <div className="my-6 sm:my-8">
              {getSectionContent('mission').map((item) => (
                <div key={item.title}>
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-2 text-center">{item.title}</h2>
                  <p className="text-zinc-800 text-center mb-3 sm:mb-4 text-sm sm:text-base">{item.content}</p>
                </div>
              ))}
              {getSectionContent('vision').map((item) => (
                <div key={item.title}>
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-2 text-center">{item.title}</h2>
                  <p className="text-zinc-800 text-center mb-3 sm:mb-4 text-sm sm:text-base">{item.content}</p>
                </div>
              ))}
              {getSectionContent('values').map((item) => (
                <div key={item.title}>
                  <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-2 text-center">{item.title}</h2>
                  <p className="text-zinc-800 text-center mb-3 sm:mb-4 text-sm sm:text-base whitespace-pre-line">{item.content}</p>
                </div>
              ))}
            </div>
            
            {leaders.length > 0 && (
              <div className="my-6 sm:my-8">
                <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-4 text-center">Our Leadership Team</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {leaders.map((leader) => (
                    <div key={leader.name} className="bg-blue-50 rounded-xl p-4 text-center">
                      {leader.image_url && (
                        <img
                          src={leader.image_url}
                          alt={leader.name}
                          className="w-24 h-24 rounded-full mx-auto mb-3 object-cover"
                        />
                      )}
                      <h3 className="font-bold text-blue-700">{leader.name}</h3>
                      <p className="text-sm text-gray-600">{leader.title}</p>
                      {leader.description && (
                        <p className="text-xs text-gray-500 mt-2">{leader.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {getSectionContent('closing').map((item) => (
              <p key={item.title} className="text-base sm:text-lg text-zinc-800 mb-4 sm:mb-6 text-center">{item.content}</p>
            ))}
          </div>
        )}
        
        <div className="flex justify-center mt-6 sm:mt-8 relative z-10">
          <Link href="/" className="rounded-full bg-blue-600 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
