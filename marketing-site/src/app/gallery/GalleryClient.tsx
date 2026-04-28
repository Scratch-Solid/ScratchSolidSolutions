"use client";
import { useEffect, useState } from "react";
import SiteNav from "@/components/SiteNav";

export default function GalleryClient() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('left');

  useEffect(() => {
    fetch('/api/reviews?status=approved&limit=10')
      .then(res => res.ok ? res.json() : Promise.resolve({ results: [] }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((reviewsData: any) => {
        setReviews(reviewsData?.results || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (reviews.length > 1) {
      const interval = setInterval(() => {
        setDirection('left');
        setCurrentIndex((prev) => (prev + 1) % reviews.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [reviews.length]);

  const handleDotClick = (index: number) => {
    setDirection(index > currentIndex ? 'left' : 'right');
    setCurrentIndex(index);
  };

  const businessLogo = "/logo.svg";

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white">
      <SiteNav current="gallery" />
      {/* Header */}
      <div className="text-center pt-24 pb-12 px-4">
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          Our Gallery
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
          Real results from real clients. See our work and hear what people have to say.
        </p>
      </div>

      {/* Before & After Gallery Section */}
      <div className="flex-1 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 text-center">
              Before & After
            </h2>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 text-center border-2 border-dashed border-blue-200">
              <p className="text-gray-500 text-lg">Gallery images will be uploaded via admin panel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Review Carousel Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-16 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">
            What Our Clients Say
          </h2>

          {loading ? (
            <div className="text-center text-white text-lg">Loading reviews...</div>
          ) : reviews.length > 0 ? (
            <div className="flex items-center justify-center gap-8 md:gap-16">
              {/* Client Photo Carousel */}
              <div className="hidden md:block w-48 h-48 flex-shrink-0">
                <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white">
                  <div
                    key={`photo-${currentIndex}`}
                    className={`absolute inset-0 w-full h-full transition-transform duration-500 ease-in-out ${
                      direction === 'left' ? 'translate-x-full' : '-translate-x-full'
                    } animate-slide-in`}
                  >
                    {reviews[currentIndex].profile_picture ? (
                      <img
                        src={reviews[currentIndex].profile_picture}
                        alt={reviews[currentIndex].user_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = businessLogo;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500">
                        <span className="text-white text-4xl font-bold">
                          {reviews[currentIndex].user_name?.charAt(0) || 'C'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Review Text Carousel */}
              <div className="flex-1 max-w-2xl relative overflow-hidden">
                <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 border border-white/30">
                  <div
                    key={`review-${currentIndex}`}
                    className={`transition-all duration-500 ease-in-out ${
                      direction === 'left' ? 'translate-x-full opacity-0' : '-translate-x-full opacity-0'
                    } animate-slide-in`}
                  >
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, starIndex) => (
                        <svg
                          key={starIndex}
                          className={`w-8 h-8 ${
                            starIndex < reviews[currentIndex].rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-xl md:text-2xl text-gray-800 font-medium mb-6 leading-relaxed">
                      "{reviews[currentIndex].text}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="md:hidden w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        {reviews[currentIndex].profile_picture ? (
                          <img
                            src={reviews[currentIndex].profile_picture}
                            alt={reviews[currentIndex].user_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = businessLogo;
                            }}
                          />
                        ) : (
                          <span className="text-white text-lg font-bold">
                            {reviews[currentIndex].user_name?.charAt(0) || 'C'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {reviews[currentIndex].user_name}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {reviews[currentIndex].service_location || 'Verified Client'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dots Indicator */}
              <div className="flex gap-2">
                {reviews.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleDotClick(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/70'
                    }`}
                    aria-label={`Go to review ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-white text-lg">No reviews found.</div>
          )}
        </div>
      </div>

      {/* Back Button */}
      <div className="py-12 px-4 text-center">
        <Link
          href="/"
          className="inline-block bg-white text-blue-600 px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl hover:bg-gray-50 transition-all duration-300"
        >
          Back to Home
        </Link>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
