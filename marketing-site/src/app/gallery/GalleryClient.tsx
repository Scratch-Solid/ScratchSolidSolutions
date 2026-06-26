"use client";
import { useEffect, useState, useCallback } from "react";
import SiteNav from "@/components/SiteNav";

interface Review {
  id: number;
  user_id: number;
  rating: number;
  text: string;
  images?: string | string[];
  user_name?: string;
  service_location?: string;
  created_at: string;
}

interface GalleryImage {
  url: string;
  caption: string;
  review?: Review;
  index: number;
}

export default function GalleryClient() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  const parseImages = useCallback((images: string | string[] | undefined): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    try { const p = JSON.parse(images); return Array.isArray(p) ? p : []; } catch { return []; }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/reviews?status=approved&limit=50').then(res => res.ok ? res.json() : Promise.resolve({ results: [] })),
      fetch('/api/content?type=gallery-images').then(res => res.ok ? res.json() : Promise.resolve({ content: '' })),
    ]).then(([reviewsData, galleryData]) => {
      const rawReviews = (reviewsData as any)?.results || (Array.isArray(reviewsData) ? reviewsData : []);
      const reviewList: Review[] = rawReviews;
      setReviews(reviewList);

      const cmsImages: GalleryImage[] = (() => {
        try {
          const raw = (galleryData as any)?.content;
          if (!raw) return [];
          const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const arr = Array.isArray(json) ? json : (json?.images || []);
          return arr.map((img: any, i: number) => ({
            url: typeof img === 'string' ? img : img.url,
            caption: typeof img === 'string' ? '' : (img.caption || ''),
            index: i,
          }));
        } catch (e) { return []; }
      })();

      const reviewImages: GalleryImage[] = reviewList.flatMap((review, ri) => {
        const imgs = parseImages(review.images);
        return imgs.map((url: string, ii: number) => ({
          url,
          caption: review.text ? (review.text.length > 60 ? review.text.substring(0, 60) + '...' : review.text) : '',
          review,
          index: cmsImages.length + ri * 10 + ii,
        }));
      });

      const all = [...cmsImages, ...reviewImages];
      const unique = all.filter((img, i, self) => i === self.findIndex(s => s.url === img.url));
      setGalleryImages(unique);
      setLoading(false);
    });
  }, [parseImages]);

  useEffect(() => {
    if (reviews.length <= 1) return;
    const timer = setInterval(() => setHeroIndex(prev => (prev + 1) % reviews.length), 6000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  const currentReview = reviews[heroIndex];

  return (
    <div className="min-h-screen bg-white">
      <SiteNav current="gallery" />

      {/* ─── HERO SECTION ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-28 pb-20 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-blue-200 text-sm font-medium mb-6 border border-white/10">
            Trusted by hundreds of happy clients
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight">
            Real Results.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Real Reviews.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100/80 max-w-2xl mx-auto leading-relaxed">
            Every photo you see here was submitted by a real client after their cleaning service.
            No stock images. No filters. Just honest work and honest feedback.
          </p>

          {/* Live rotating testimonial hero card */}
          {!loading && reviews.length > 0 && currentReview && (
            <div className="mt-12 max-w-2xl mx-auto">
              <div
                key={currentReview.id}
                className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 text-left shadow-2xl animate-fade-in"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-5 h-5 ${i < currentReview.rating ? 'text-yellow-400' : 'text-white/20'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-xl md:text-2xl text-white font-medium leading-relaxed mb-6">
                  “{currentReview.text}”
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {(currentReview.user_name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{currentReview.user_name || 'Verified Client'}</p>
                    <p className="text-sm text-blue-200/70">{currentReview.service_location || 'Scratch Solid Client'}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-2 mt-6">
                {reviews.slice(0, Math.min(reviews.length, 6)).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === heroIndex ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="bg-gray-50 border-y border-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {[
            { label: 'Verified Reviews', value: reviews.length.toString(), suffix: '+' },
            { label: 'Avg. Rating', value: reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : '0.0', suffix: '/5' },
            { label: 'Photo Submissions', value: galleryImages.length.toString(), suffix: '+' },
            { label: 'Satisfaction Rate', value: '99', suffix: '%' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-gray-900">{stat.value}<span className="text-blue-600">{stat.suffix}</span></p>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PHOTO GALLERY ─── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Client Photo Gallery</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Before &amp; after shots, sparkling results, and the proof that our team delivers every time.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : galleryImages.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 text-lg">Gallery images will appear here once clients submit photos with their reviews.</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {galleryImages.map((img) => (
                <div
                  key={img.index}
                  className="break-inside-avoid group relative rounded-2xl overflow-hidden cursor-pointer bg-gray-100 shadow-sm hover:shadow-xl transition-all duration-300"
                  onClick={() => setSelectedImage(img)}
                >
                  <img
                    src={img.url}
                    alt={img.caption || 'Gallery image'}
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-white text-sm font-medium line-clamp-2">{img.caption}</p>
                      {img.review && (
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`w-3 h-3 ${i < img.review!.rating ? 'text-yellow-400' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          <span className="text-xs text-white/80 ml-1">{img.review.user_name || 'Client'}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 backdrop-blur-md rounded-full p-2 shadow-lg">
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── REVIEW GRID ─── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">What Our Clients Say</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Every review is manually verified and approved before publication. Only genuine feedback makes it here.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-200">
              <p className="text-gray-500 text-lg">No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, si) => (
                      <svg key={si} className={`w-4 h-4 ${si < review.rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">“{review.text}”</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                      {(review.user_name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{review.user_name || 'Verified Client'}</p>
                      <p className="text-xs text-gray-400">{review.service_location || 'Scratch Solid'} · {new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Experience the Difference?</h2>
          <p className="text-blue-100 mb-8">Join our satisfied clients. Book your first cleaning service today.</p>
          <a
            href="/auth?redirect=/client-dashboard"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            Book a Cleaning
          </a>
        </div>
      </section>

      {/* ─── LIGHTBOX ─── */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedImage.url}
              alt={selectedImage.caption || 'Gallery image'}
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
            {selectedImage.caption && (
              <div className="mt-4 text-center">
                <p className="text-white/90 text-lg font-medium">{selectedImage.caption}</p>
                {selectedImage.review && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < selectedImage.review!.rating ? 'text-yellow-400' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-white/60 text-sm">{selectedImage.review.user_name || 'Client'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
