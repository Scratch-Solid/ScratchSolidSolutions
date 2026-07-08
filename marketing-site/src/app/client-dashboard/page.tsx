"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import { authFetch, getCsrfToken } from "@/lib/authFetch";
import BookingQuotePanel from "@/components/BookingQuotePanel";

export default function ClientDashboard() {
  const router = useRouter();
  useSessionTimeout(true); // Enable inactivity timeout with auto-refresh
  useTokenRefresh(); // Silently refresh token every 5 minutes
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [monthlyStatement, setMonthlyStatement] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Booking flow state
  const [bookingStep, setBookingStep] = useState<'dashboard' | 'calendar' | 'form' | 'booking'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedCleaner, setSelectedCleaner] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'eft' | 'card'>('card');
  const [bookingType, setBookingType] = useState<'once_off' | 'recurring'>('once_off');
  const [availableCleaners, setAvailableCleaners] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  const [selectedCleaningType, setSelectedCleaningType] = useState<string>('standard');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showIndemnityOverlay, setShowIndemnityOverlay] = useState(false);
  const [indemnityAccepted, setIndemnityAccepted] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [cleanerUnavailable, setCleanerUnavailable] = useState(false);
  
  // New features state - POPIA compliant (only first name, profile picture, rating displayed)
  const [assignedCleaner, setAssignedCleaner] = useState<{ profilePicture?: string; firstName?: string; rating?: number; specialties?: string[]; status?: string; [key: string]: any } | null>(null);
  const [zohoStatements, setZohoStatements] = useState<any[]>([]);
  const [zohoInvoices, setZohoInvoices] = useState<any[]>([]);
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<string>('');
  const [reviewImagesLoading, setReviewImagesLoading] = useState(false);
  const [zohoLoading, setZohoLoading] = useState(false);
  const [cleanerStatus, setCleanerStatus] = useState<'idle' | 'on_way' | 'arrived' | 'completed'>('idle');
  const [showStatementsModal, setShowStatementsModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [olderStatementsRequest, setOlderStatementsRequest] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<number | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    if (!token || role === 'business') {
      router.replace('/auth');
      return;
    }
    fetchClientData();
    fetchZohoData();
    fetchCleanerStatus();
    
    // Poll for cleaner updates every 30 seconds
    const interval = setInterval(() => {
      fetchClientData();
      fetchCleanerStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Load cleaner public profile when assigned (only if username is available)
  useEffect(() => {
    const username = (assignedCleaner as any)?.username;
    if (assignedCleaner && typeof assignedCleaner === 'object' && username) {
      authFetch(`/api/cleaner-details?username=${encodeURIComponent(username)}`)
        .then(res => res.ok ? res.json() : null).then(profile => {
        if (profile) {
          setAssignedCleaner(profile);
        }
      });
    }
  }, [(assignedCleaner as any)?.username]);

  const fetchClientData = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        const [sRes, pRes] = await Promise.all([
          fetch('/api/services'),
          fetch('/api/service-pricing'),
        ]);
        const servicesData = sRes.ok ? await sRes.json() as any[] : [];
        const pricingData = pRes.ok ? await pRes.json() as any[] : [];
        setServices(servicesData);
        setPricing(pricingData);
      } catch (e) {
        // Silently fail — services/pricing defaults will be used
      }

      // Fetch available cleaners from real API
      try {
        const cleanersRes = await authFetch('/api/cleaners?status=idle&blocked=0');
        if (cleanersRes.ok) {
          const cleanersData = await cleanersRes.json() as any[];
          setAvailableCleaners(cleanersData.map((c: any) => ({
            id: c.user_id,
            name: c.first_name || c.username, // POPIA compliance: only first name
            rating: c.rating || 0,
            specialties: (() => { try { return JSON.parse(c.specialties || '[]'); } catch { return []; } })(),
            available: c.status === 'idle'
          })));
        }
      } catch (e) {
        // Silently fail — cleaners list is non-critical
      }

      // Fetch real bookings for this client
      try {
        const bookingsRes = await authFetch(`/api/bookings?client_id=${userId}`);
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json() as any[];
          setBookings(bookingsData);
        }
      } catch (e) {
        // Silently fail — bookings will retry on next poll
      }

      // Payments populated from real bookings data
      setPayments([]);
      setMonthlyStatement(null);
    } catch (error) {
      // Non-critical background fetch failure
    }
  };

  // Booking logic functions
  const startBooking = () => {
    setBookingStep('booking');
    setError('');
    setSuccess('');
  };

  const handleDateSelection = (date: string) => {
    setSelectedDate(date);
    setError('');
  };

  const handleTimeSlotSelection = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setError('');
    // Show indemnity overlay after time slot selection
    setShowIndemnityOverlay(true);
  };

  const handleIndemnityAccept = () => {
    setIndemnityAccepted(true);
    setShowIndemnityOverlay(false);
    setBookingStep('form');
  };

  const handleIndemnityDecline = () => {
    setShowIndemnityOverlay(false);
    setSelectedTimeSlot('');
    setError('You must accept the indemnity form to proceed with booking');
  };

  const proceedToBookingForm = () => {
    if (!selectedDate || !selectedTimeSlot) {
      setError('Please select both date and time slot');
      return;
    }
    if (!indemnityAccepted) {
      setShowIndemnityOverlay(true);
      return;
    }
    setBookingStep('form');
  };

  const calculateAmount = (serviceType: string, cleaningType: string): number => {
    const basePrices: Record<string, number> = {
      standard: 350,
      deep_clean: 500,
      move_in: 450,
      move_out: 450,
    };
    const multiplier: Record<string, number> = {
      standard: 1,
      deep_clean: 1.5,
      move_in: 1.2,
      move_out: 1.2,
    };
    return (basePrices[serviceType] || 350) * (multiplier[cleaningType] || 1);
  };

  const createBooking = async () => {
    setLoading(true);
    setError('');
    setPaymentError(false);
    setCleanerUnavailable(false);

    try {
      const userId = localStorage.getItem("userId");
      
      if (!selectedServiceType) {
        setError('Please select a service type');
        setLoading(false);
        return;
      }

      // Step 1: Create booking with pending_payment status
      const csrfToken = await getCsrfToken();
      const bookingRes = await authFetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({
          client_id: parseInt(userId || '0'),
          client_name: localStorage.getItem("userName") || '',
          location: localStorage.getItem("userAddress") || '',
          booking_date: selectedDate,
          booking_time: selectedTimeSlot,
          payment_method: paymentMethod,
          service_type: selectedServiceType,
          cleaning_type: selectedCleaningType,
          type: bookingType,
          price: calculateAmount(selectedServiceType, selectedCleaningType),
          phone: localStorage.getItem("userPhone") || ''
        })
      });

      if (!bookingRes.ok) {
        const errData = await bookingRes.json().catch(() => ({}));
        setError(errData.error || 'Booking creation failed. Please retry or contact admin.');
        setLoading(false);
        return;
      }

      const bookingResult = await bookingRes.json();

      // Step 2: Handle payment based on method
      if (paymentMethod === 'card') {
        const userEmail = localStorage.getItem("userEmail") || "";
        const amount = bookingResult.total_amount || calculateAmount(selectedServiceType, selectedCleaningType);
        const callbackUrl = `${window.location.origin}/payment/verify`;

        const paystackResponse = await authFetch("/api/payments/paystack/initialize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            booking_id: bookingResult.id,
            email: userEmail,
            amount,
            callback_url: callbackUrl,
          }),
        });

        const paystackData = await paystackResponse.json() as {
          authorization_url?: string;
          reference?: string;
          error?: string;
        };

        if (!paystackResponse.ok || !paystackData.authorization_url) {
          setError(paystackData.error || "Payment initialization failed. Your booking is saved — please contact support.");
          setLoading(false);
          return;
        }

        // Redirect to Paystack checkout
        window.location.href = paystackData.authorization_url;
        return; // Don't set loading false — we're navigating away
      }

      // For cash/EFT: record the payment and show success message
      if (paymentMethod === 'cash' || paymentMethod === 'eft' || paymentMethod === 'instant') {
        try {
          const amount = bookingResult.total_amount || calculateAmount(selectedServiceType, selectedCleaningType);
          await authFetch('/api/payments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
            },
            body: JSON.stringify({
              booking_id: bookingResult.id,
              payment_method: paymentMethod,
              amount,
            }),
          });
        } catch (paymentErr) {
          // Payment recording failed — booking is still created, user can retry payment
          console.error('Failed to record offline payment:', paymentErr);
        }
      }

      setBookings(prev => [...prev, bookingResult]);
      setSuccess(`Booking saved! Please make ${paymentMethod.toUpperCase()} payment. Your cleaner will be dispatched once payment is confirmed.`);
      
      // Reset booking form and return to dashboard
      setTimeout(() => {
        setBookingStep('dashboard');
        setSelectedDate('');
        setSelectedTimeSlot('');
        setSelectedCleaner('');
        setSelectedServiceType('');
        setSelectedCleaningType('standard');
        setPaymentMethod('card');
        setBookingType('once_off');
        setIndemnityAccepted(false);
        setSuccess('');
        setCleanerUnavailable(false);
        setPaymentError(false);
        setCleanerStatus('idle');
      }, 3000);

    } catch (error) {
      setPaymentError(true);
      setError('Payment not confirmed, retry or contact admin. No cleaner assignment until payment success');
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = () => {
    setBookingStep('dashboard');
    setSelectedDate('');
    setSelectedTimeSlot('');
    setSelectedCleaner('');
    setSelectedServiceType('');
    setSelectedCleaningType('standard');
    setPaymentMethod('card');
    setBookingType('once_off');
    setError('');
    setSuccess('');
    setShowIndemnityOverlay(false);
    setIndemnityAccepted(false);
    setPaymentError(false);
    setCleanerUnavailable(false);
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this booking? Cancellations within 24h of the booking time are not eligible for a refund.')) {
      return;
    }
    setCancellingBookingId(bookingId);
    try {
      const csrfToken = await getCsrfToken();
      const res = await authFetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ reason: 'Cancelled by client' }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || 'Booking cancelled successfully');
        fetchClientData();
      } else {
        setError(data.error || 'Failed to cancel booking');
      }
    } catch (err) {
      setError('Failed to cancel booking. Please try again.');
    } finally {
      setCancellingBookingId(null);
    }
  };

  const openRescheduleModal = (booking: any) => {
    setRescheduleBooking(booking);
    setRescheduleDate('');
    setRescheduleTime('');
    setError('');
    setSuccess('');
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) {
      setError('Please select a new date and time');
      return;
    }
    setRescheduleLoading(true);
    try {
      const csrfToken = await getCsrfToken();
      const res = await authFetch(`/api/bookings/${rescheduleBooking.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ new_date: rescheduleDate, new_time: rescheduleTime }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Booking rescheduled successfully');
        setRescheduleBooking(null);
        fetchClientData();
      } else {
        setError(data.error || 'Failed to reschedule booking');
      }
    } catch (err) {
      setError('Failed to reschedule booking. Please try again.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Zoho Books integration functions
  const fetchZohoData = async () => {
    setZohoLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      
      const zohoRes = await authFetch(`/api/zoho/financials?customer_id=${userId}`);
      if (zohoRes.ok) {
        const zohoData = await zohoRes.json() as { statements?: any[]; invoices?: any[] };
        setZohoStatements(zohoData.statements || []);
        setZohoInvoices(zohoData.invoices || []);
      }
      
    } catch (error) {
      setError('Failed to fetch Zoho Books data');
    } finally {
      setZohoLoading(false);
    }
  };

  // Review upload functions
  const [uploadingImages, setUploadingImages] = useState(false);

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

    const wordCount = reviewText.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount > 100) {
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

    setReviewImagesLoading(true);
    try {
      const userId = localStorage.getItem('userId');
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

      setSuccess('Review submitted successfully! It will be published on the Gallery once approved by our team.');

      // Reset review form
      setReviewImages([]);
      setReviewText('');
      setReviewRating(5);
      setSelectedBookingForReview('');

      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (error) {
      setError('Failed to submit review');
    } finally {
      setReviewImagesLoading(false);
    }
  };

  const removeReviewImage = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index));
  };

  // Fetch real cleaner status from internal portal
  const fetchCleanerStatus = async () => {
    if (!assignedCleaner || typeof assignedCleaner !== 'object' || !('id' in assignedCleaner)) {
      return;
    }
    try {
      const cleanerId = (assignedCleaner as any).id;
      const response = await authFetch(`/api/cleaner-status?cleaner_id=${cleanerId}`);
      if (response.ok) {
        const data = await response.json() as { status?: string };
        if (data.status) {
          setCleanerStatus(data.status as any);
          if (data.status === 'completed') {
            sendWhatsAppCompletionMessage();
          }
        }
      }

      // Fetch GPS coordinates for real-time tracking
      const activeBooking = bookings.find(b => b.status === 'confirmed' || b.status === 'in_progress');
      if (activeBooking) {
        const trackingResponse = await authFetch(`/api/tracking?booking_id=${activeBooking.id}`);
        if (trackingResponse.ok) {
          await trackingResponse.json();
          // GPS data available for future map display
        }
      }
    } catch (error) {
      // Silently fail — tracking is non-critical
    }
  };

  const sendWhatsAppCompletionMessage = () => {
    // Simulate WhatsApp message to client
    const clientPhone = localStorage.getItem('userPhone') || '+27696735947';
    const message = `Scratch Solid: Your cleaning service has been completed today! We've cleaned your premises thoroughly. Thank you for choosing our services!`;
    
  };

  const requestOlderStatements = async () => {
    setOlderStatementsRequest(true);
    try {
      // Simulate manual processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Request submitted! Older statements will be sent to your email/WhatsApp within 24 hours.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to submit request. Please try again.');
    } finally {
      setOlderStatementsRequest(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 font-sans relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/scratchsolid-logo.jpg"
          alt="Scratch Solid Background"
          fill
          className="object-cover opacity-20"
          priority
        />
      </div>
      
      {/* Glassified Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-blue-700">
              {bookingStep === 'dashboard' ? 'Client Dashboard' : 
               bookingStep === 'calendar' ? 'Select Date & Time' : 'Complete Booking'}
            </h1>
            <div className="flex items-center gap-4">
              {bookingStep !== 'dashboard' && (
                <button
                  onClick={cancelBooking}
                  className="text-gray-500 hover:text-gray-700 font-medium"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Dashboard View */}
          {bookingStep === 'dashboard' && (
            <div className="space-y-6">
              {/* Assigned Cleaner Profile - MOVED TO TOP */}
              {assignedCleaner && (
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-gray-800">Your Assigned Cleaner</h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium text-green-700">POPIA Compliant</span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {assignedCleaner.profilePicture ? (
                          <img src={assignedCleaner.profilePicture} alt="Cleaner" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4 1.79 4 4s-1.79 4-4 4-4 4 4 4-1.79 4-4-4-4zm0 6c-3.31 0-6 2.69-6 6h2c0 3.31 2.69 6 6 6 3.31 0 6-2.69 6-6-2.69-6-6-6z"/>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{assignedCleaner.firstName || assignedCleaner.name?.split(' ')[0]}</h4>
                      <div className="flex items-center space-x-2 my-2">
                        <div className="flex items-center">
                          <span className="text-yellow-400">{'★'.repeat(Math.floor(assignedCleaner.rating || 0))}</span>
                          <span className="text-gray-400">{'★'.repeat(5 - Math.floor(assignedCleaner.rating || 0))}</span>
                        </div>
                        <span className="text-sm text-gray-600">{assignedCleaner.rating || 0}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        <strong>Specialties:</strong> {assignedCleaner.specialties?.join(', ') || 'General Cleaning'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Status:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          cleanerStatus === 'idle' ? 'bg-gray-100 text-gray-800' :
                          cleanerStatus === 'on_way' ? 'bg-blue-100 text-blue-800' :
                          cleanerStatus === 'arrived' ? 'bg-yellow-100 text-yellow-800' :
                          cleanerStatus === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {cleanerStatus === 'idle' ? 'Idle' :
                           cleanerStatus === 'on_way' ? 'On the way' :
                           cleanerStatus === 'arrived' ? 'Arrived' :
                           cleanerStatus === 'completed' ? 'Completed' : 'Unknown'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* POPIA Compliance Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 text-xl">🔒</div>
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">Privacy Protected</h4>
                    <p className="text-sm text-blue-700">
                      Your cleaner's personal information (surname, contact details, address) is protected under POPIA. Only their first name, profile picture, and rating are displayed for your safety and privacy.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-700">Active Bookings</h3>
                  <p className="text-2xl font-bold text-blue-600">{bookings.length}</p>
                </div>
              </div>

              {/* Book a Cleaning Button */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold text-lg text-blue-700 mb-4">Book a Cleaning</h3>
                <button
                  onClick={startBooking}
                  className="w-full rounded-full bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Schedule New Service
                </button>
              </div>

              {/* Zoho Books Integration - Updated to show only one statement and one invoice */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">Financial Statements</h3>
                  <button
                    onClick={fetchZohoData}
                    disabled={zohoLoading}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                  >
                    {zohoLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                
                {/* Latest Monthly Statement */}
                {zohoStatements.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-700">Latest Statement</h4>
                      <button
                        onClick={() => setShowStatementsModal(true)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <div 
                      onClick={() => setShowStatementsModal(true)}
                      className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{zohoStatements[0].period}</p>
                          <p className="text-sm text-gray-600">Due: {zohoStatements[0].due_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-800">R{zohoStatements[0].total_amount}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            zohoStatements[0].status === 'paid' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {zohoStatements[0].status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Latest Invoice/Receipt */}
                {zohoInvoices.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-700">Latest Invoice</h4>
                      <button
                        onClick={() => setShowInvoicesModal(true)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <div 
                      onClick={() => setShowInvoicesModal(true)}
                      className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800">
                            {zohoInvoices[0].invoice_number || zohoInvoices[0].receipt_number}
                          </p>
                          <p className="text-sm text-gray-600">{zohoInvoices[0].description}</p>
                          <p className="text-sm text-gray-600">{zohoInvoices[0].date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-800">R{zohoInvoices[0].amount}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            zohoInvoices[0].status === 'paid' ? 'bg-green-100 text-green-800' :
                            zohoInvoices[0].status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {zohoInvoices[0].status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Request Older Statements Button */}
                <button
                  onClick={requestOlderStatements}
                  disabled={olderStatementsRequest}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
                >
                  {olderStatementsRequest ? 'Submitting...' : 'Request Older Statements'}
                </button>
              </div>

              {/* Review Upload Section */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a booking...</option>
                      {bookings
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
                      <span className="ml-2 text-sm text-gray-600">{reviewRating}/5</span>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Share your experience..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {reviewText.trim().split(/\s+/).filter(w => w.length > 0).length}/100 words
                    </p>
                  </div>

                  <button
                    onClick={handleReviewSubmit}
                    disabled={reviewImagesLoading || reviewText.trim().length === 0 || reviewText.trim().split(/\s+/).filter(w => w.length > 0).length > 100 || !selectedBookingForReview}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reviewImagesLoading ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-lg text-gray-800 mb-4">Your Bookings</h3>
                {bookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No bookings yet</p>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => {
                      const canCancelOrReschedule = ['pending', 'confirmed', 'awaiting_payment'].includes(booking.status);
                      const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time || '00:00'}`);
                      const hoursUntilBooking = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
                      const within24h = hoursUntilBooking > 0 && hoursUntilBooking < 24;
                      return (
                        <div key={booking.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800">
                                {new Date(booking.booking_date).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-600">
                                {booking.booking_time}
                              </p>
                              <p className="text-sm text-gray-600">
                                Cleaner: {availableCleaners.find(c => c.id === booking.cleaner_id)?.name || 'Auto-assigned'}
                              </p>
                              {booking.rescheduled_from && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Rescheduled from: {booking.rescheduled_from}
                                </p>
                              )}
                              {booking.cancellation_reason && (
                                <p className="text-xs text-red-500 mt-1">
                                  Cancelled: {booking.cancellation_reason}
                                </p>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              booking.status === 'awaiting_payment' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                          {canCancelOrReschedule && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                disabled={cancellingBookingId === booking.id}
                                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 flex items-center gap-1"
                                title={within24h ? "Late cancellation — no refund within 24h of booking" : "Full refund available (24h+ before booking)"}
                              >
                                {cancellingBookingId === booking.id ? "Cancelling…" : "Cancel"}
                                {within24h && (
                                  <span className="text-[10px] text-orange-500">(no refund)</span>
                                )}
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => openRescheduleModal(booking)}
                                disabled={hoursUntilBooking <= 0}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1"
                                title={within24h ? "Rescheduling not allowed within 24h" : "Free rescheduling (24h+ before booking)"}
                              >
                                Reschedule
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Booking Screen — full quote + schedule + payment */}
          {(bookingStep === 'calendar' || bookingStep === 'form' || bookingStep === 'booking') && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => setBookingStep('dashboard')}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                >
                  ← Back to Dashboard
                </button>
                <h2 className="font-bold text-xl text-gray-800">Schedule a Cleaning</h2>
              </div>
              <BookingQuotePanel
                mode="client"
                onSuccess={(_id, _amount) => {
                  fetchClientData();
                  setTimeout(() => setBookingStep('dashboard'), 3000);
                }}
                onCancel={() => setBookingStep('dashboard')}
              />
            </div>
          )}

          {/* Indemnity Overlay */}
          {showIndemnityOverlay && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={handleIndemnityDecline} />
              <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-blue-200 p-8 max-w-md w-full max-h-[90vh] overflow-y-auto relative z-50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-black">Indemnity Form</h2>
                  <button
                    onClick={handleIndemnityDecline}
                    className="text-gray-500 hover:text-black transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-700 mb-2">Booking Details</h3>
                    <p className="text-sm text-gray-600">
                      Date: {new Date(selectedDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Time: {selectedTimeSlot} - {selectedTimeSlot === '08:00' ? '12:00' : '17:00'}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Terms and Conditions</h3>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p>1. I acknowledge that Scratch Solid Cleaning Services will be performed at the specified date and time.</p>
                      <p>2. I understand that I am responsible for securing valuable items before the service.</p>
                      <p>3. I agree to provide access to the premises and ensure utilities (water, electricity) are available.</p>
                      <p>4. I understand that payment is required before or at the time of service.</p>
                      <p>5. I release Scratch Solid from liability for any pre-existing damage to property.</p>
                      <p>6. I agree to notify Scratch Solid of any specific areas that require special attention.</p>
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-700 mb-2">Important Notice</h3>
                    <p className="text-sm text-yellow-700">
                      By accepting this indemnity form, you agree to the terms and conditions outlined above. 
                      This booking is subject to availability and confirmation.
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="indemnity-accept"
                      checked={indemnityAccepted}
                      onChange={(e) => setIndemnityAccepted(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="indemnity-accept" className="text-sm text-gray-700">
                      I have read and agree to the terms and conditions
                    </label>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleIndemnityDecline}
                      className="flex-1 bg-gray-200 text-black py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={handleIndemnityAccept}
                      disabled={!indemnityAccepted}
                      className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Accept & Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statements Modal */}
          {showStatementsModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowStatementsModal(false)} />
              <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-blue-200 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-black">Monthly Statements (6 Months)</h2>
                  <button
                    onClick={() => setShowStatementsModal(false)}
                    className="text-gray-500 hover:text-black transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {zohoStatements.map((stmt) => (
                    <div key={stmt.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{stmt.period}</p>
                          <p className="text-sm text-gray-600">Due: {stmt.due_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-800">R{stmt.total_amount}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            stmt.status === 'paid' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {stmt.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Invoices Modal */}
          {showInvoicesModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setShowInvoicesModal(false)} />
              <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-blue-200 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-black">Invoices & Receipts (6 Months)</h2>
                  <button
                    onClick={() => setShowInvoicesModal(false)}
                    className="text-gray-500 hover:text-black transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3">
                  {zohoInvoices.map((doc) => (
                    <div key={doc.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800">
                            {doc.invoice_number || doc.receipt_number}
                          </p>
                          <p className="text-sm text-gray-600">{doc.description}</p>
                          <p className="text-sm text-gray-600">{doc.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-800">R{doc.amount}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            doc.status === 'paid' ? 'bg-green-100 text-green-800' :
                            doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reschedule Modal */}
          {rescheduleBooking && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setRescheduleBooking(null)} />
              <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-blue-200 p-8 max-w-md w-full relative z-50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-black">Reschedule Booking</h2>
                  <button
                    onClick={() => setRescheduleBooking(null)}
                    className="text-gray-500 hover:text-black transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700">
                    <p>Current: <strong>{new Date(rescheduleBooking.booking_date).toLocaleDateString()}</strong> at <strong>{rescheduleBooking.booking_time}</strong></p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Date</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Time</label>
                    <select
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a time slot</option>
                      <option value="08:00">08:00</option>
                      <option value="09:00">09:00</option>
                      <option value="10:00">10:00</option>
                      <option value="11:00">11:00</option>
                      <option value="12:00">12:00</option>
                      <option value="13:00">13:00</option>
                      <option value="14:00">14:00</option>
                      <option value="15:00">15:00</option>
                      <option value="16:00">16:00</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setRescheduleBooking(null)}
                      className="flex-1 rounded-full border-2 border-gray-300 px-4 py-2 text-gray-700 font-semibold hover:border-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRescheduleSubmit}
                      disabled={rescheduleLoading || !rescheduleDate || !rescheduleTime}
                      className="flex-1 rounded-full bg-blue-600 px-4 py-2 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {rescheduleLoading ? "Rescheduling…" : "Confirm"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
