"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import { authFetch, getCsrfToken } from "@/lib/authFetch";
import DashboardShell, { DashboardDepartment } from "@/components/dashboard/DashboardShell";

const ic = {
  grid: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  bank: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10l9-6 9 6" /><path d="M5 10v9M10 10v9M14 10v9M19 10v9M3 21h18" /></svg>,
  star: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.1 6.6 7.2.8-5.4 5 1.5 7.2L12 18.3 5.6 21.6 7.1 14.4 1.7 9.4l7.2-.8z" /></svg>,
  gear: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>,
  broom: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 4L10 14" /><path d="M8 16l-5 5" /><path d="M6 18l5-5 3 3-5 5z" /><path d="M14 6l4 4" /></svg>,
  car: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 13l1.6-4.8A2 2 0 016.5 7h11a2 2 0 011.9 1.2L21 13" /><rect x="2" y="13" width="20" height="6" rx="1.5" /><circle cx="7" cy="19.5" r="1.5" /><circle cx="17" cy="19.5" r="1.5" /></svg>,
  code: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 8l-5 4 5 4M15 8l5 4-5 4" /></svg>,
  layers: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l9 5-9 5-9-5 9-5z" /><path d="M3 12l9 5 9-5M3 17l9 5 9-5" /></svg>,
  folder: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>,
  receipt: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></svg>,
  activity: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>,
};

const TRANSPORT_NOTIFY_LINK =
  "https://wa.me/27696735947?text=" + encodeURIComponent("Hi, please notify me when Scratch Solid Transportation launches.");

export default function BusinessDashboard() {
  const router = useRouter();
  useSessionTimeout(true); // Enable inactivity timeout with auto-refresh
  useTokenRefresh(); // Silently refresh token every 5 minutes
  const [weekendRequests, setWeekendRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignedCleaner, setAssignedCleaner] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [recurringBookings, setRecurringBookings] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewingContract, setViewingContract] = useState<any>(null);

  // Dashboard navigation state
  const [activeDept, setActiveDept] = useState<DashboardDepartment>('cleaning');
  const [activeView, setActiveView] = useState('overview');

  // Digital department state
  const [projects, setProjects] = useState<any[]>([]);
  const [projectDetail, setProjectDetail] = useState<any>(null);
  const [projectDetailLoading, setProjectDetailLoading] = useState(false);

  // localStorage is only available client-side — read it after mount, never
  // at render time, or Next.js's static prerender step throws.
  const [userName, setUserName] = useState('Business');

  // Review upload state
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [reviewImagesLoading, setReviewImagesLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    if (!token || role !== 'business') {
      router.replace('/auth');
      return;
    }
    setUserName(localStorage.getItem('userName') || 'Business');
    fetchWeekendRequests();
    fetchContracts();
    fetchRecurringBookings();
    fetchUserProfile();
    fetchProjects();

    // Poll for cleaner updates every 30 seconds
    const interval = setInterval(() => {
      fetchWeekendRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchWeekendRequests = async () => {
    try {
      const businessId = localStorage.getItem("userId");
      if (!businessId) return;

      const response = await authFetch(`/api/weekend-requests?business_id=${businessId}`);
      if (response.ok) {
        const data = await response.json() as any[];
        setWeekendRequests(data);
        // Derive assigned cleaner from most recent assigned request
        const assigned = data.find((r: any) => r.status === 'assigned' && r.assigned_cleaner_name);
        if (assigned) {
          const fullName = assigned.assigned_cleaner_name || '';
          const firstName = fullName.split(' ')[0];
          setAssignedCleaner({
            id: assigned.assigned_cleaner_id || '',
            name: firstName,
            rating: assigned.assigned_cleaner_rating || 0,
            specialties: assigned.assigned_cleaner_specialties || [],
            available: true,
            image_url: assigned.assigned_cleaner_image || ''
          });
        }
      }
    } catch (error) {
      // Non-critical background fetch
    }
  };

  const handleWeekendRequest = async () => {
    setLoading(true);
    try {
      const businessId = localStorage.getItem("userId");
      if (!businessId) {
        setError("Authentication required");
        setLoading(false);
        return;
      }
      const csrfToken = await getCsrfToken();
      const response = await authFetch('/api/weekend-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          business_id: parseInt(businessId),
          requested_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          special_instructions: "Weekend cleaning required"
        })
      });
      if (response.ok) {
        const newRequest = await response.json();
        setWeekendRequests((prev: any[]) => [newRequest, ...prev]);
        setSuccess("Weekend request submitted successfully!");
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError("Failed to submit request. Please try again.");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const businessId = localStorage.getItem("userId");
      const response = await authFetch(`/api/contracts?business_id=${businessId}`);
      if (response.ok) {
        const data = await response.json() as any[];
        setContracts(data);
      }
    } catch (error) {
      // Non-critical background fetch
    }
  };

  const fetchRecurringBookings = async () => {
    try {
      const businessId = localStorage.getItem("userId");
      const response = await authFetch(`/api/bookings?client_id=${businessId}&booking_type=recurring`);
      if (response.ok) {
        const data = await response.json() as any[];
        setRecurringBookings(data);
      }
    } catch (error) {
      // Non-critical background fetch
    }
  };

  const fetchUserProfile = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const response = await authFetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json() as any[];
        setUserProfile(data);
      }
    } catch (error) {
      // Non-critical background fetch
    }
  };

  // Digital department — only surfaced if the business account actually has a project
  const fetchProjects = async () => {
    try {
      const res = await authFetch('/api/projects');
      if (res.ok) {
        const data = await res.json() as any[];
        setProjects(data);
      }
    } catch (e) {
      // Silently fail — Digital department simply won't be offered
    }
  };

  const loadProjectDetail = async (id: number) => {
    setProjectDetailLoading(true);
    try {
      const res = await authFetch(`/api/projects/${id}`);
      if (res.ok) setProjectDetail(await res.json());
    } finally {
      setProjectDetailLoading(false);
    }
  };

  const selectDepartment = (dept: DashboardDepartment) => {
    setActiveDept(dept);
    setActiveView('overview');
    if (dept === 'digital' && projects.length > 0 && !projectDetail) {
      loadProjectDetail(projects[0].id);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;

    try {
      const userId = localStorage.getItem("userId");
      const csrfToken = await getCsrfToken();
      const response = await authFetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
      });
      if (response.ok) {
        localStorage.clear();
        router.push('/login');
      } else {
        setError("Failed to delete account");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const cancelRequest = async (requestId: number) => {
    try {
      const csrfToken = await getCsrfToken();
      const response = await authFetch(`/api/weekend-requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
      });
      if (response.ok) {
        setWeekendRequests((prev: any[]) => prev.filter(req => req.id !== requestId));
        setSuccess("Request cancelled successfully");
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError("Failed to cancel request.");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleExportPDF = async (contractId: number) => {
    try {
      const response = await authFetch(`/api/contracts/${contractId}/export`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-${contractId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError("Failed to export contract PDF");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userAddress');
    router.push('/auth');
  };

  // Review upload functions
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 3) {
      setError('Maximum 3 images allowed');
      return;
    }

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'review-images');

        const response = await authFetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json() as { error?: string };
          throw new Error(error.error || 'Failed to upload image');
        }

        const data = await response.json() as { publicUrl: string };
        uploadedUrls.push(data.publicUrl);
      }

      setReviewImages(prev => [...prev, ...uploadedUrls]);
    } catch (err) {
      setError('Failed to upload images. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (reviewText.trim().length === 0) {
      setError('Please enter a review');
      return;
    }

    if (reviewText.trim().split(/\s+/).filter(w => w.length > 0).length > 100) {
      setError('Review must be 100 words or less');
      return;
    }

    if (!selectedBookingForReview) {
      setError('Please select a booking to review');
      return;
    }

    if (reviewImages.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    const userId = localStorage.getItem('userId');

    setReviewImagesLoading(true);
    try {
      const csrfToken = await getCsrfToken();
      const reviewRes = await authFetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          user_id: userId,
          booking_id: parseInt(selectedBookingForReview),
          rating: reviewRating,
          text: reviewText,
          images: reviewImages
        })
      });
      if (!reviewRes.ok) {
        throw new Error('Review submission failed');
      }

      setSuccess('Review submitted successfully! Gallery will be updated.');
      setTimeout(() => setSuccess(''), 3000);

      // Reset review form
      setReviewImages([]);
      setReviewText('');
      setReviewRating(5);
      setSelectedBookingForReview('');

    } catch (error) {
      setError('Failed to submit review');
    } finally {
      setReviewImagesLoading(false);
    }
  };

  const removeReviewImage = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index));
  };

  const departments = [
    { key: 'cleaning' as const, label: 'Cleaning', icon: ic.broom },
    { key: 'transportation' as const, label: 'Transportation', icon: ic.car, locked: true },
    ...(projects.length > 0 ? [{ key: 'digital' as const, label: 'Digital', icon: ic.code }] : []),
  ];

  const cleaningNav = [
    { key: 'overview', label: 'Overview', icon: ic.grid },
    { key: 'bookings', label: 'Bookings', icon: ic.calendar },
    { key: 'financials', label: 'Financials', icon: ic.bank },
    { key: 'reviews', label: 'Reviews', icon: ic.star },
    { key: 'settings', label: 'Settings', icon: ic.gear },
  ];
  const digitalNav = [
    { key: 'overview', label: 'Overview', icon: ic.grid },
    { key: 'phases', label: 'Phases', icon: ic.layers },
    { key: 'files', label: 'Files', icon: ic.folder },
    { key: 'invoices', label: 'Invoices', icon: ic.receipt },
    { key: 'updates', label: 'Updates', icon: ic.activity },
  ];

  const viewLabels: Record<string, string> = {
    overview: 'Overview', bookings: 'Bookings', financials: 'Financials', reviews: 'Reviews', settings: 'Settings',
    phases: 'Phases', files: 'Files', invoices: 'Invoices', updates: 'Updates',
  };

  return (
    <DashboardShell
      userName={userName}
      userRoleLabel="Business account"
      departments={departments}
      activeDepartment={activeDept}
      onDepartmentChange={selectDepartment}
      navItems={activeDept === 'digital' ? digitalNav : activeDept === 'cleaning' ? cleaningNav : []}
      activeView={activeView}
      onViewChange={setActiveView}
      pageTitle={viewLabels[activeView] || 'Overview'}
      primaryAction={
        activeDept === 'cleaning' && (activeView === 'overview' || activeView === 'bookings')
          ? { label: 'Book a Cleaner', onClick: () => router.push('/business-booking') }
          : undefined
      }
      onLogout={handleLogout}
    >
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-semibold text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-semibold text-green-600">{success}</p>
        </div>
      )}

      {activeDept === 'cleaning' && activeView === 'overview' && (
        <div className="space-y-6">
          {assignedCleaner && (
            <div className="bg-white rounded-lg p-6 border border-[#E9E0D3]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-gray-800">Your Assigned Cleaner</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-green-700">POPIA Compliant</span>
                </div>
              </div>
              <div className="flex items-start space-x-6">
                <div className="flex-shrink-0">
                  {assignedCleaner.image_url ? (
                    <img
                      src={assignedCleaner.image_url}
                      alt={assignedCleaner.name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{assignedCleaner.name}</h4>
                  <div className="flex items-center space-x-2 my-2">
                    <div className="flex items-center">
                      <span className="text-yellow-400">{'★'.repeat(Math.floor(assignedCleaner.rating))}</span>
                      <span className="text-gray-400">{'★'.repeat(5 - Math.floor(assignedCleaner.rating))}</span>
                    </div>
                      <span className="text-sm text-stone-600">{assignedCleaner.rating}</span>
                    </div>
                    <p className="text-sm text-stone-600">
                      <strong>Specialties:</strong> {assignedCleaner.specialties?.join(', ') || 'General Cleaning'}
                    </p>
                  </div>
                </div>
              </div>
          )}

          <div className="bg-[#F7F2EA] border border-[#E9E0D3] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-[#B08A5E] text-xl">🔒</div>
              <div>
                <h4 className="font-semibold text-[#2E1F16] mb-1">Privacy Protected</h4>
                <p className="text-sm text-[#3f342a]">
                  Your cleaner's personal information (surname, contact details, address) is protected under POPIA. Only their first name, profile picture, and rating are displayed for your safety and privacy.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#F7F2EA] rounded-lg border border-[#E9E0D3]">
            <h3 className="font-semibold text-lg text-[#2E1F16] mb-2">Book Cleaning Service</h3>
            <p className="text-stone-600 mb-4">Schedule your professional cleaning service</p>
            <Link
              href="/business-booking"
              className="block bg-[#B08A5E] text-[#2E1F16] py-3 px-6 rounded-lg font-semibold hover:bg-[#c39a6c] transition-colors text-center"
            >
              Book a Cleaner
            </Link>
          </div>
        </div>
      )}

      {activeDept === 'cleaning' && activeView === 'bookings' && (
        <div className="space-y-6">
          <div className="p-4 bg-[#F7F2EA] rounded-lg border border-[#E9E0D3]">
            <h3 className="font-semibold text-lg text-[#2E1F16] mb-2">Recurring Bookings</h3>
            <p className="text-stone-600 mb-4">Manage your recurring cleaning schedule</p>
            <div className="space-y-2">
              {recurringBookings.length === 0 ? (
                <p className="text-sm text-gray-500">No recurring bookings yet</p>
              ) : (
                recurringBookings.map((booking: any) => (
                  <div key={booking.id} className="border border-[#E9E0D3] rounded-lg p-3 bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-800">{booking.service_type}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        booking.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600">Next: {new Date(booking.booking_date).toLocaleDateString()}</p>
                    <p className="text-sm text-stone-600">Time: {booking.booking_time}</p>
                  </div>
                ))
              )}
            </div>
            <Link href="/client-dashboard?action=book" className="block mt-3 text-center bg-[#B08A5E] text-[#2E1F16] py-2 px-4 rounded-lg font-semibold hover:bg-[#c39a6c] transition-colors">
              Schedule Recurring Booking
            </Link>
          </div>

          <div className="p-4 bg-[#FAF3E6] rounded-lg border border-[#E9DCC0]">
            <h3 className="font-semibold text-lg text-[#2E1F16] mb-2">Weekend Assignments</h3>
            <p className="text-stone-600 mb-4">Pending weekend cleaning assignments</p>
            <div className="space-y-4">
              {weekendRequests.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No weekend assignments pending
                </div>
              ) : (
                <div className="space-y-2">
                  {weekendRequests.map((request) => (
                    <div key={request.id} className="border border-[#E9E0D3] rounded-lg p-3 bg-white">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-800">
                          Weekend Assignment - {new Date(request.requested_date).toLocaleDateString()}
                        </h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'assigned' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="text-sm text-stone-600">
                        <p><strong>Special Instructions:</strong> {request.special_instructions}</p>
                        {request.assigned_cleaner && (
                          <p><strong>Assigned Cleaner:</strong> {request.assigned_cleaner}</p>
                        )}
                      </div>
                      {request.status === 'pending' && (
                        <div className="mt-3 text-xs text-[#8a6a45]">
                          Awaiting admin assignment
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-[#F7F2EA] rounded-lg border border-[#E9E0D3]">
            <h3 className="font-semibold text-lg text-[#2E1F16] mb-2">Weekend Cleaning</h3>
            <p className="text-stone-600 mb-4">Request weekend cleaning services</p>
            <div className="space-y-4">
              {weekendRequests.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No weekend requests yet
                </div>
              ) : (
                <div className="space-y-4">
                  {weekendRequests.map((request) => (
                    <div key={request.id} className="border border-[#E9E0D3] rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-[#2E1F16]">
                          Request for {new Date(request.requested_date).toLocaleDateString()}
                        </h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'assigned' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="text-sm text-stone-600">
                        <p><strong>Special Instructions:</strong> {request.special_instructions}</p>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => cancelRequest(request.id)}
                          className="rounded bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700"
                        >
                          Cancel Request
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-[#F7F2EA] rounded-lg border border-[#E9E0D3]">
            <h3 className="font-semibold text-lg text-[#2E1F16] mb-2">Submit New Request</h3>
            <button
              onClick={handleWeekendRequest}
              disabled={loading}
              className="w-full rounded-full bg-[#B08A5E] px-6 py-3 text-[#2E1F16] font-semibold hover:bg-[#c39a6c] transition-colors disabled:bg-gray-400"
            >
              {loading ? "Submitting..." : "Request Weekend Cleaning"}
            </button>
          </div>
        </div>
      )}

      {activeDept === 'cleaning' && activeView === 'financials' && (
        <div className="p-4 bg-[#F7F2EA] rounded-lg border border-[#E9E0D3]">
          <h3 className="font-semibold text-lg text-[#2E1F16] mb-2">Service Contracts</h3>
          <p className="text-stone-600 mb-4">View and manage your service agreements</p>
          <div className="space-y-2">
            {contracts.length === 0 ? (
              <p className="text-sm text-gray-500">No contracts yet</p>
            ) : (
              contracts.map((contract: any) => (
                <div key={contract.id} className="border border-[#E9E0D3] rounded-lg p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-800">{contract.contract_type}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      contract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {contract.status}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600">Rate: R{contract.rate_per_hour}/hr</p>
                  <p className="text-sm text-stone-600">Weekend Multiplier: {contract.weekend_rate_multiplier}x</p>
                  {contract.start_date && (
                    <p className="text-sm text-stone-600">Start: {new Date(contract.start_date).toLocaleDateString()}</p>
                  )}
                  {contract.end_date && (
                    <p className="text-sm text-stone-600">End: {new Date(contract.end_date).toLocaleDateString()}</p>
                  )}
                  {contract.is_immutable === 1 && (
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-orange-600">Contract is locked (read-only)</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewingContract(contract)}
                          className="text-xs bg-[#B08A5E] text-[#2E1F16] px-3 py-1 rounded hover:bg-[#c39a6c]"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleExportPDF(contract.id)}
                          className="text-xs bg-[#2E1F16] text-[#F7F2EA] px-3 py-1 rounded hover:bg-[#241811]"
                        >
                          Export PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeDept === 'cleaning' && activeView === 'reviews' && (
        <div className="bg-white rounded-lg p-6 border border-[#E9E0D3]">
          <h3 className="font-semibold text-lg text-gray-800 mb-4">Write a Review</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Photos (Max 3)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
              />
              {reviewImages.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {reviewImages.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={img}
                        alt={`Review image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeReviewImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Booking to Review
              </label>
              <select
                value={selectedBookingForReview}
                onChange={(e) => setSelectedBookingForReview(e.target.value)}
                className="w-full px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
              >
                <option value="">Choose a booking...</option>
                {recurringBookings
                  .filter((b: any) => b.status === 'completed')
                  .map((b: any) => (
                    <option key={b.id} value={String(b.id)}>
                      {new Date(b.booking_date).toLocaleDateString()} — {b.booking_time}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`text-2xl transition-colors ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-2 text-sm text-stone-600">{reviewRating}/5</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review (100 words max)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E]"
                placeholder="Share your experience..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {reviewText.trim().split(/\s+/).filter(w => w.length > 0).length}/100 words
              </p>
            </div>

            <button
              onClick={handleReviewSubmit}
              disabled={reviewImagesLoading || reviewText.trim().length === 0 || reviewText.trim().split(/\s+/).filter(w => w.length > 0).length > 100 || !selectedBookingForReview}
              className="w-full bg-[#B08A5E] text-[#2E1F16] py-3 px-4 rounded-lg font-semibold hover:bg-[#c39a6c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reviewImagesLoading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}

      {activeDept === 'cleaning' && activeView === 'settings' && (
        <div className="p-4 bg-[#F7F2EA] rounded-lg border border-[#E9E0D3]">
          <h3 className="font-semibold text-lg text-[#2E1F16] mb-2">Settings</h3>
          <p className="text-stone-600 mb-4">Account and profile settings</p>
          {userProfile && (
            <div className="border border-[#E9E0D3] rounded-lg p-3 bg-white mb-3">
              <p className="font-medium text-gray-800">{userProfile.name}</p>
              <p className="text-sm text-stone-600">{userProfile.email}</p>
              {userProfile.business_name && (
                <p className="text-sm text-stone-600">{userProfile.business_name}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full text-left px-4 py-2 bg-white border border-[#E9E0D3] rounded-lg hover:bg-[#F0E6D6] transition-colors"
            >
              {showSettings ? 'Hide Settings' : 'Show Settings'}
            </button>
            {showSettings && (
              <div className="space-y-2 pl-4 border-l-2 border-[#D3C6AE]">
                <button className="w-full text-left px-4 py-2 text-[#8a6a45] hover:text-[#2E1F16]">
                  Edit Profile
                </button>
                <button className="w-full text-left px-4 py-2 text-[#8a6a45] hover:text-[#2E1F16]">
                  Change Password
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full text-left px-4 py-2 text-red-600 hover:text-red-700"
                >
                  Delete Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeDept === 'transportation' && (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-dashed border-[#D3C6AE] text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#a3906f] font-semibold mb-2">Coming soon</p>
          <h3 className="text-xl font-normal text-[#2E1F16] mb-2" style={{ fontFamily: "Georgia, serif" }}>
            Transportation is on its way
          </h3>
          <p className="text-sm text-stone-600 max-w-md mx-auto mb-5">
            Corporate transport and airport transfers, run with the same tracking and transparency as our cleaning service. We'll let you know the moment it launches.
          </p>
          <a
            href={TRANSPORT_NOTIFY_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-[#B08A5E] px-6 py-3 text-[#2E1F16] font-semibold hover:bg-[#c39a6c] transition-colors"
          >
            Notify me on WhatsApp
          </a>
        </div>
      )}

      {activeDept === 'digital' && (
        <DigitalDashboardViews
          activeView={activeView}
          project={projects[0]}
          detail={projectDetail}
          loading={projectDetailLoading}
        />
      )}

      {viewingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingContract(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E9E0D3] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingContract(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
            <h2 className="text-2xl font-normal text-[#2E1F16] mb-6" style={{ fontFamily: "Georgia, serif" }}>Contract Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Contract Type</p>
                <p className="font-semibold text-gray-800">{viewingContract.contract_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  viewingContract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {viewingContract.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Rate</p>
                <p className="font-semibold text-gray-800">R{viewingContract.rate_per_hour}/hour</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Weekend Multiplier</p>
                <p className="font-semibold text-gray-800">{viewingContract.weekend_rate_multiplier}x</p>
              </div>
              {viewingContract.start_date && (
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-semibold text-gray-800">{new Date(viewingContract.start_date).toLocaleDateString()}</p>
                </div>
              )}
              {viewingContract.end_date && (
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="font-semibold text-gray-800">{new Date(viewingContract.end_date).toLocaleDateString()}</p>
                </div>
              )}
              {viewingContract.terms && (
                <div>
                  <p className="text-sm text-gray-500">Terms</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{viewingContract.terms}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleExportPDF(viewingContract.id)}
                className="flex-1 bg-[#B08A5E] text-[#2E1F16] py-3 px-6 rounded-lg font-semibold hover:bg-[#c39a6c] transition-colors"
              >
                Download PDF
              </button>
              <button
                onClick={() => setViewingContract(null)}
                className="flex-1 bg-white text-[#2E1F16] border border-[#E9E0D3] py-3 px-6 rounded-lg font-semibold hover:bg-[#F7F2EA] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function DigitalDashboardViews({ activeView, project, detail, loading }: { activeView: string; project: any; detail: any; loading: boolean }) {
  if (!project) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-[#E9E0D3] text-center">
        <p className="text-sm text-stone-600">No active project on this account yet.</p>
      </div>
    );
  }
  if (loading || !detail) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#B08A5E]" />
      </div>
    );
  }

  if (activeView === 'phases') {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E9E0D3]">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">Project Phases</h3>
        <div className="space-y-2">
          {detail.phases.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between bg-[#F7F2EA] rounded-lg p-3">
              <span className="text-sm font-medium text-gray-800">{p.name}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                p.status === 'completed' ? 'bg-green-100 text-green-800' :
                p.status === 'in_progress' ? 'bg-[#F0E6D6] text-[#8a6a3a]' :
                'bg-gray-100 text-gray-800'
              }`}>
                {p.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeView === 'files') {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E9E0D3]">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">Files &amp; Links</h3>
        {detail.files.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No files yet</p>
        ) : (
          <div className="space-y-2">
            {detail.files.map((f: any) => (
              <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-[#F7F2EA] rounded-lg p-3 hover:bg-[#F0E6D6] transition-colors">
                <span className="text-sm font-medium text-[#2E1F16]">{f.file_name}</span>
                <span className="text-xs text-[#8a6a45]">Open →</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeView === 'invoices') {
    const total = detail.milestones.reduce((a: number, m: any) => a + Number(m.amount || 0), 0);
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E9E0D3]">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">Milestone Invoices</h3>
        <div className="space-y-2 mb-4">
          {detail.milestones.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between bg-[#F7F2EA] rounded-lg p-3">
              <span className="text-sm font-medium text-gray-800">{m.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">R{Number(m.amount).toLocaleString()}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  m.billing_status === 'paid' ? 'bg-green-100 text-green-800' :
                  m.billing_status === 'invoiced' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {m.billing_status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 text-sm border-t border-[#E9E0D3] pt-3">
          <span className="text-gray-600">Total project value</span>
          <span className="font-bold text-gray-800">R{total.toLocaleString()}</span>
        </div>
      </div>
    );
  }

  if (activeView === 'updates') {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E9E0D3]">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">Project Updates</h3>
        {detail.updates.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No updates yet</p>
        ) : (
          <div className="space-y-3">
            {detail.updates.map((u: any) => (
              <div key={u.id} className="border-l-2 border-[#E9E0D3] pl-3">
                <p className="text-sm text-gray-800">{u.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(u.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // overview
  const completedPhases = detail.phases.filter((p: any) => p.status === 'completed').length;
  const pct = detail.phases.length ? Math.round((completedPhases / detail.phases.length) * 100) : 0;
  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6 shadow-sm" style={{ background: "linear-gradient(135deg, #2E1F16, #3a281a)" }}>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#B08A5E] font-semibold mb-2">Active project</p>
        <h2 className="text-xl font-normal text-[#F7F2EA] mb-1" style={{ fontFamily: "Georgia, serif" }}>{detail.name}</h2>
        <p className="text-sm text-[#CBB89A]">{detail.description || 'No description yet.'}</p>
        <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden max-w-xs">
          <div className="h-full bg-[#B08A5E] rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-[#B7A288] mt-1">{pct}% complete · {completedPhases} of {detail.phases.length} phases</p>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E9E0D3]">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">Latest updates</h3>
        {detail.updates.slice(0, 3).map((u: any) => (
          <div key={u.id} className="border-l-2 border-[#E9E0D3] pl-3 mb-3">
            <p className="text-sm text-gray-800">{u.message}</p>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(u.created_at).toLocaleDateString()}</p>
          </div>
        ))}
        {detail.updates.length === 0 && <p className="text-gray-500 text-sm">No updates yet</p>}
      </div>
    </div>
  );
}
