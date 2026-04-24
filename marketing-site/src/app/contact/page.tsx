"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function ContactPage() {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const res = await fetch("/api/content?type=contact");
        if (res.ok) {
          const page = await res.json();
          setContent(page.content || "");
        }
      } catch (error) {
        console.error("Error loading contact content:", error);
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
      } else if (line.startsWith('**Q:**')) {
        return <p key={index} className="font-semibold text-gray-800 mb-2">{line.substring(2)}</p>;
      } else if (line.startsWith('**A:**')) {
        return <p key={index} className="text-gray-700 mb-4 ml-4">{line.substring(2)}</p>;
      } else if (line.startsWith('- ')) {
        return <p key={index} className="text-gray-700 mb-2 ml-4">â¢ {line.substring(2)}</p>;
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-200 p-8">
          {renderMarkdown(content)}

          {/* Navigation Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Link
              href="/"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Back to Home
            </Link>
            
            <div className="flex gap-4">
              <Link
                href="/privacy"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
