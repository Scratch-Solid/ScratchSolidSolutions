"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function GalleryClient() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reviews?status=approved&limit=10').then(res => res.ok ? res.json() : []).then((reviewsData) => {
      setReviews(reviewsData || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 sm:py-16 px-2 sm:px-4 bg-gradient-to-br from-blue-50 to-white">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-black mb-4 sm:mb-6 tracking-tight">
        Real Results & Reviews
      </h1>
      <p className="text-center text-zinc-700 mb-6 sm:mb-8 max-w-xl text-sm sm:text-base">
        See real photos from our completed jobs and read authentic reviews from our clients. All content is uploaded directly by our cleaners and clients.
      </p>
      
      {/* Before & After Gallery */}
      <div className="w-full max-w-2xl mb-6 sm:mb-8 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-2 text-center">Before & After Gallery</h2>
        <div className="text-center text-zinc-400">Gallery images will be uploaded via admin panel.</div>
      </div>

      {/* Client Reviews Section */}
      <div className="w-full max-w-4xl mb-6 sm:mb-8 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-green-700 mb-3 sm:mb-4 text-center">Client Reviews</h2>
        {loading ? (
          <div className="text-center text-zinc-500">Loading reviews...</div>
        ) : reviews.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {reviews.map((review, i) => (
              <div key={i} className="bg-zinc-50 rounded-lg p-3 sm:p-4 border border-zinc-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, starIndex) => (
                      <span key={starIndex} className={starIndex < review.rating ? "text-yellow-400" : "text-zinc-300"}>★</span>
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm text-zinc-500">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm sm:text-base text-zinc-800">{review.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-zinc-400">No reviews found.</div>
        )}
      </div>

      <div className="mt-6 sm:mt-8">
        <Link href="/" className="rounded-full bg-blue-600 px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
