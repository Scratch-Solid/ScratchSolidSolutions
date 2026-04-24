"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function PrivacyPage() {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const res = await fetch("/api/content?type=privacy");
        if (res.ok) {
          const page = await res.json();
          setContent(page.content || "");
        }
      } catch (error) {
        console.error("Error loading privacy content:", error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-4xl font-bold text-blue-700 mb-8">{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-semibold text-gray-800 mb-4 mt-6">{line.substring(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-semibold text-gray-800 mb-3 mt-4">{line.substring(4)}</h3>;
      } else if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="font-semibold text-gray-800 mb-4">{line.substring(2, line.length - 2)}</p>;
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return <p key={index} className="text-gray-700 mb-4 leading-relaxed">{line}</p>;
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 sm:py-16 px-2 sm:px-4 font-sans">
      <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-10 relative">
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
        <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-700 mb-4 sm:mb-6 text-center drop-shadow-lg">Privacy Policy</h1>
        {content ? (
          <div className="text-base sm:text-lg text-zinc-800 mb-6 sm:mb-8 relative z-10 prose prose-blue max-w-none">
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        ) : (
          <div className="text-center text-zinc-500">No content available.</div>
        )}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6 sm:mt-8 relative z-10">
          <Link href="/terms" className="rounded-full bg-zinc-200 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-blue-700 shadow hover:bg-zinc-300 transition-colors">Terms of Service</Link>
          <Link href="/contact" className="rounded-full bg-zinc-200 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-blue-700 shadow hover:bg-zinc-300 transition-colors">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
