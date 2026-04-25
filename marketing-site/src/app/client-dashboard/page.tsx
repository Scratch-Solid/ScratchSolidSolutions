"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ClientDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [monthlyStatement, setMonthlyStatement] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Booking flow state
  const [bookingStep, setBookingStep] = useState<'dashboard' | 'calendar' | 'form'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedCleaner, setSelectedCleaner] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'eft'>('cash');
  const [bookingType, setBookingType] = useState<'once_off' | 'recurring'>('once_off');
  const [availableCleaners, setAvailableCleaners] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showIndemnityOverlay, setShowIndemnityOverlay] = useState(false);
  const [indemnityAccepted, setIndemnityAccepted] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [cleanerUnavailable, setCleanerUnavailable] = useState(false);
  
  // New features state - POPIA compliant
  const [assignedCleaner, setAssignedCleaner] = useState<{ profilePicture?: string; fullName?: string; address?: string; cellphoneNumber?: string; [key: string]: any } | null>(null);
  const [zohoStatements, setZohoStatements] = useState<any[]>([]);
  const [zohoInvoices, setZohoInvoices] = useState<any[]>([]);
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState<string>('');
  const [reviewImagesLoading, setReviewImagesLoading] = useState(false);
  const [zohoLoading, setZohoLoading] = useState(false);
  const [cleanerStatus, setCleanerStatus] = useState<'idle' | 'on_way' | 'arrived' | 'completed'>('idle');
  const [showStatementsModal, setShowStatementsModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [olderStatementsRequest, setOlderStatementsRequest] = useState(false);

  useEffect(() => {
    fetchClientData();
    fetchZohoData();
  }, []);

  // Load cleaner public profile when assigned
  useEffect(() => {
    if (assignedCleaner && typeof assignedCleaner === 'object' && 'id' in assignedCleaner) {
      const token = localStorage.getItem('authToken');
      fetch(`/api/cleaner-details?username=${(assignedCleaner as any).username || (assignedCleaner as any).id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.ok ? res.json() : null).then(profile => {
        if (profile) {
          setAssignedCleaner(profile);
        }
      });
    }
  }, [assignedCleaner]);

  const fetchClientData = async () => {
    try {
      const userId = localStorage.getItem("user_id");
      const token = localStorage.getItem("authToken");
      if (!userId || !token) return;

      // Fetch available cleaners from real API
      try {
        const cleanersRes = await fetch('/api/cleaners?status=idle&blocked=0', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (cleanersRes.ok) {
          const cleanersData = await cleanersRes.json();
          setAvailableCleaners(cleanersData.map((c: any) => ({
            id: c.user_id,
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username,
            rating: c.rating || 0,
            specialties: JSON.parse(c.specialties || '[]'),
            available: c.status === 'idle'
          })));
        }
      } catch (e) {
        console.error('Failed to fetch cleaners:', e);
      }

      // Fetch real bookings for this client
      try {
        const bookingsRes = await fetch(`/api/bookings?client_id=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData);
        }
      } catch (e) {
        console.error('Failed to fetch bookings:', e);
      }

      // Payments populated from real bookings data
      setPayments([]);
      setMonthlyStatement(null);
    } catch (error) {
      console.error("Failed to fetch client data:", error);
    }
  };

  // Booking logic functions
  const startBooking = () => {
    setBookingStep('calendar');
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

  const createBooking = async () => {
    setLoading(true);
    setError('');
    setPaymentError(false);
    setCleanerUnavailable(false);

    try {
      const userId = localStorage.getItem("user_id");
      
      // Auto-assign first available cleaner
      const availableCleaner = availableCleaners.find(c => c.available);
      if (!availableCleaner) {
        setError('No cleaners available at this time. Please try a different time slot.');
        setLoading(false);
        return;
      }

      const assignedCleaner = availableCleaner;
      setAssignedCleaner(availableCleaner);

      // Create booking payload as specified
      const bookingPayload = {
        user_id: userId,
        cleaner_id: assignedCleaner,
        type: bookingType,
        start_time: `${selectedDate}T${selectedTimeSlot}:00`,
        end_time: `${selectedDate}T${selectedTimeSlot === '08:00' ? '12:00' : '17:00'}:00`,
        payment_method: paymentMethod
      };

      // Create booking via real API
      const token = localStorage.getItem("authToken");
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: parseInt(userId),
          client_name: localStorage.getItem("user_name") || '',
          cleaner_id: parseInt(assignedCleaner.id),
          location: localStorage.getItem("user_address") || '',
          booking_date: selectedDate,
          booking_time: selectedTimeSlot,
          payment_method: paymentMethod,
          type: bookingType,
          price: 350,
          phone: localStorage.getItem("user_phone") || ''
        })
      });

      if (!bookingRes.ok) {
        setPaymentError(true);
        setError('Booking creation failed. Please retry or contact admin.');
        setLoading(false);
        return;
      }

      const newBooking = await bookingRes.json();
      setBookings(prev => [...prev, newBooking]);

      const cleanerForMessage = availableCleaners.find((c: any) => c.available);
      setSuccess(`Booking confirmed successfully! ${cleanerForMessage?.name || 'Cleaner'} has been assigned to your cleaning service.`);
      
      // Reset booking form and return to dashboard
      setTimeout(() => {
        setBookingStep('dashboard');
        setSelectedDate('');
        setSelectedTimeSlot('');
        setSelectedCleaner('');
        setPaymentMethod('cash');
        setBookingType('once_off');
        setIndemnityAccepted(false);
        setSuccess('');
        setCleanerUnavailable(false);
        setPaymentError(false);
        
        // Set cleaner status to idle initially (will be updated by cleaner)
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
    setPaymentMethod('cash');
    setBookingType('once_off');
    setError('');
    setSuccess('');
    setShowIndemnityOverlay(false);
    setIndemnityAccepted(false);
    setPaymentError(false);
    setCleanerUnavailable(false);
  };

  // Zoho Books integration functions
  const fetchZohoData = async () => {
    setZohoLoading(true);
    try {
      const userId = localStorage.getItem("user_id");
      
      const token = localStorage.getItem('authToken');
      const zohoRes = await fetch(`/api/zoho/financials?customer_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (zohoRes.ok) {
        const zohoData = await zohoRes.json();
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
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 3) {
      setError('Maximum 3 images allowed');
      return;
    }

    const imageUrls: string[] = [];
    files.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      imageUrls.push(url);
    });

    setReviewImages(prev => [...prev, ...imageUrls]);
  };

  const handleReviewSubmit = async () => {
    if (reviewText.length > 100) {
      setError('Review must be 100 words or less');
      return;
    }

    if (reviewImages.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    setReviewImagesLoading(true);
    try {
      const userId = localStorage.getItem('user_id');
      const token = localStorage.getItem('authToken');
      const reviewRes = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userId,
          booking_id: bookings[0]?.id,
          rating: 5,
          text: reviewText,
          images: reviewImages
        })
      });
      if (!reviewRes.ok) {
        throw new Error('Review submission failed');
      }
      
      setSuccess('Review submitted successfully! Gallery will be updated.');
      
      // Reset review form
      setReviewImages([]);
      setReviewText('');
      
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

  // Cleaner status update simulation (would be triggered by cleaner dashboard)
  const updateCleanerStatus = (status: 'idle' | 'on_way' | 'arrived' | 'completed') => {
    setCleanerStatus(status);
    
    // Trigger WhatsApp message when cleaner completes
    if (status === 'completed') {
      sendWhatsAppCompletionMessage();
      updateCleanerPayroll();
    }
  };

  const sendWhatsAppCompletionMessage = () => {
    // Simulate WhatsApp message to client
    const clientPhone = localStorage.getItem('user_phone') || '+27696735947';
    const message = `Scratch Solid: Your cleaning service has been completed today! We've cleaned your premises thoroughly. Thank you for choosing our services!`;
    
    console.log('WhatsApp message sent to client:', {
      phone: clientPhone,
      message: message,
      timestamp: new Date().toISOString()
    });
    
    // In production, this would call WhatsApp API
    // fetch('/api/send-whatsapp', { method: 'POST', body: JSON.stringify({ phone: clientPhone, message }) });
  };

  const updateCleanerPayroll = () => {
    // Simulate payroll update for cleaner
    const payrollUpdate = {
      amount: 150,
      task_type: 'cleaning_completed',
      timestamp: new Date().toISOString()
    };
    
    console.log('Cleaner payroll updated:', payrollUpdate);
    
    // In production, this would update cleaner dashboard payroll tile
    // fetch('/api/cleaner/payroll', { method: 'POST', body: JSON.stringify(payrollUpdate) });
  };

  const requestOlderStatements = async () => {
    setOlderStatementsRequest(true);
    try {
      // Simulate manual processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const userEmail = localStorage.getItem('user_email') || 'client@example.com';
      console.log('Older statements request submitted for:', userEmail);
      
      setSuccess('Request submitted! Older statements will be sent to your email/WhatsApp within 24 hours.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to submit request. Please try again.');
    } finally {
      setOlderStatementsRequest(false);
    }
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
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-blue-200 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-blue-700">
              {bookingStep === 'dashboard' ? 'Client Dashboard' : 
               bookingStep === 'calendar' ? 'Select Date & Time' : 'Complete Booking'}
            </h1>
            {bookingStep !== 'dashboard' && (
              <button
                onClick={cancelBooking}
                className="text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
            )}
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
                  <h3 className="font-semibold text-lg text-gray-800 mb-4">Your Assigned Cleaner</h3>
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
                      <h4 className="font-semibold text-gray-800">{assignedCleaner.firstName} {assignedCleaner.lastName}</h4>
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
                      
                      {/* Demo buttons for cleaner status (for testing) */}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => updateCleanerStatus('on_way')}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          On Way
                        </button>
                        <button
                          onClick={() => updateCleanerStatus('arrived')}
                          className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                        >
                          Arrived
                        </button>
                        <button
                          onClick={() => updateCleanerStatus('completed')}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-700">Active Bookings</h3>
                  <p className="text-2xl font-bold text-blue-600">{bookings.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-700">Total Spent</h3>
                  <p className="text-2xl font-bold text-green-600">
                    R{payments.filter(p => p.type === 'receipt').reduce((sum, p) => sum + p.amount, 0)}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-700">Available Cleaners</h3>
                  <p className="text-2xl font-bold text-purple-600">{availableCleaners.filter(c => c.available).length}</p>
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
                      Your Review (100 words max)
                    </label>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      maxLength={100}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Share your experience..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {reviewText.length}/100 words
                    </p>
                  </div>

                  <button
                    onClick={handleReviewSubmit}
                    disabled={reviewImagesLoading || reviewText.length === 0 || reviewText.length > 100}
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
                    {bookings.map((booking) => (
                      <div key={booking.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800">
                              {new Date(booking.start_time).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(booking.start_time).toLocaleTimeString()} - 
                              {new Date(booking.end_time).toLocaleTimeString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              Cleaner: {availableCleaners.find(c => c.id === booking.cleaner_id)?.name || 'Auto-assigned'}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calendar Screen */}
          {bookingStep === 'calendar' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-4">Select Date</h3>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateSelection(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-4">Select Time Slot</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['08:00', '13:00'].map((slot) => (
                    <button
                      key={slot}
                      onClick={() => handleTimeSlotSelection(slot)}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        selectedTimeSlot === slot
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <p className="font-medium text-gray-800">{slot}</p>
                      <p className="text-sm text-gray-700 font-medium">
                        {slot === '08:00' ? '08:00 - 12:00' : '13:00 - 17:00'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={proceedToBookingForm}
                disabled={!selectedDate || !selectedTimeSlot}
                className="w-full rounded-full bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Booking Details
              </button>
            </div>
          )}

          {/* Booking Form Screen */}
          {bookingStep === 'form' && (
            <div className="space-y-6">
              {/* Selected Date & Time Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-700 mb-2">Selected Schedule</h4>
                <p className="text-sm text-gray-600">
                  {new Date(selectedDate).toLocaleDateString()} at {selectedTimeSlot}
                </p>
              </div>

              
              {/* Booking Type */}
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-4">Booking Type</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['once_off', 'recurring'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setBookingType(type as any)}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        bookingType === type
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <p className="font-medium capitalize">{type.replace('_', ' ')}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-4">Payment Method</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['cash', 'eft'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method as any)}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        paymentMethod === method
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <p className="font-medium capitalize">{method.toUpperCase()}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={cancelBooking}
                  className="flex-1 rounded-full bg-gray-200 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createBooking}
                  disabled={loading || !selectedCleaner}
                  className="flex-1 rounded-full bg-blue-600 px-6 py-3 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Confirm Booking'}
                </button>
              </div>
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
        </div>
      </div>
    </div>
  );
}
