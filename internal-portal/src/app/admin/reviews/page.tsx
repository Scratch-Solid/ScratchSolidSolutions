"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Review {
  id: number;
  user_id: number;
  booking_id: number;
  rating: number;
  text: string;
  images: string | string[];
  status: string;
  created_at: string;
  user_name?: string;
  service_location?: string;
}

export default function AdminReviewsPage() {
  const router = useRouter();
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
    if (!token || role !== 'admin') {
      router.push('/auth/login');
      return;
    }
    fetchReviews();
  }, [router]);

  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const [pendingRes, approvedRes] = await Promise.all([
        fetch(`/api/marketing/reviews?status=pending&limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/marketing/reviews?status=approved&limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json() as { results?: Review[] } | Review[];
        const arr = Array.isArray(data) ? data : (data.results || []);
        setPendingReviews(arr);
      }
      if (approvedRes.ok) {
        const data = await approvedRes.json() as { results?: Review[] } | Review[];
        const arr = Array.isArray(data) ? data : (data.results || []);
        setApprovedReviews(arr);
      }
    } catch (err) {
      setError('Network error while loading reviews');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    setActionLoading(id);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch(`/api/marketing/reviews`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        setError(`Failed to ${status} review`);
        return;
      }
      setError('');
      fetchReviews();
    } catch (err) {
      setError(`Network error while ${status}ing review`);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteReview = async (id: number) => {
    if (!confirm('Are you sure you want to delete this review permanently?')) return;
    setActionLoading(id);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch(`/api/marketing/reviews?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError('Failed to delete review');
        return;
      }
      setError('');
      fetchReviews();
    } catch (err) {
      setError('Network error while deleting review');
    } finally {
      setActionLoading(null);
    }
  };

  const parseImages = (images: string | string[]): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );

  if (loading) return <div className="py-8 text-sm text-slate-400">Loading reviews…</div>;

  const currentReviews = activeTab === 'pending' ? pendingReviews : approvedReviews;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Moderation</h1>
        <p className="text-sm text-slate-500 mt-1">Approve client reviews before they appear on the public gallery.</p>
      </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Pending Reviews</p>
            <p className="text-2xl font-bold text-orange-600">{pendingReviews.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Approved Reviews</p>
            <p className="text-2xl font-bold text-green-600">{approvedReviews.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Avg. Rating (Approved)</p>
            <p className="text-2xl font-bold text-blue-600">
              {approvedReviews.length > 0
                ? (approvedReviews.reduce((acc, r) => acc + r.rating, 0) / approvedReviews.length).toFixed(1)
                : '-'}
              <span className="text-sm text-gray-400 font-normal"> /5</span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-5 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Pending ({pendingReviews.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-5 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Approved ({approvedReviews.length})
          </button>
        </div>

        {currentReviews.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <p className="text-gray-500 text-lg">No {activeTab} reviews found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentReviews.map((review) => {
              const images = parseImages(review.images);
              return (
                <div key={review.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                          {(review.user_name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{review.user_name || 'Client'}</p>
                          <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm font-medium text-gray-700">{review.rating}/5</span>
                      </div>
                    </div>

                    <p className="text-gray-700 text-sm leading-relaxed mb-3">{review.text}</p>

                    {review.service_location && (
                      <p className="text-xs text-gray-400 mb-3">📍 {review.service_location}</p>
                    )}

                    {images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {images.map((img, idx) => (
                          <a
                            key={idx}
                            href={img}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
                          >
                            <img
                              src={img}
                              alt={`Review photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      {activeTab === 'pending' ? (
                        <>
                          <button
                            onClick={() => updateStatus(review.id, 'approved')}
                            disabled={actionLoading === review.id}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === review.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => updateStatus(review.id, 'rejected')}
                            disabled={actionLoading === review.id}
                            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 inline-flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Live on Gallery
                          </span>
                          <button
                            onClick={() => deleteReview(review.id)}
                            disabled={actionLoading === review.id}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
  );
}
