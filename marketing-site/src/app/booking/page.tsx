"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export default function BookingPage() {
  useSessionTimeout(true); // Enable 5-minute inactivity timeout
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "eft">("cash");
  const [showIndemnity, setShowIndemnity] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState("Standard Cleaning");
  const [location, setLocation] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [bookingType, setBookingType] = useState<"once_off" | "recurring">("once_off");
  const [recurringRule, setRecurringRule] = useState("");
  const [error, setError] = useState("");
  const [cleanerId, setCleanerId] = useState("");
  const [weekendWorkRequired, setWeekendWorkRequired] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [bankingDetails, setBankingDetails] = useState<any>(null);
  const [popFile, setPopFile] = useState<File | null>(null);

  const timeSlots = [
    { value: "08:00-12:00", label: "Morning (08:00-12:00)" },
    { value: "13:00-17:00", label: "Afternoon (13:00-17:00)" },
  ];

  // Fetch dynamic services and banking details on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch services
        const servicesRes = await fetch('/api/services');
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json() as any[];
          setServices(servicesData || []);
          if (servicesData && servicesData.length > 0) {
            setServiceType(servicesData[0].name);
          }
        }

        // Fetch banking details
        const bankingRes = await fetch('/api/banking-details');
        if (bankingRes.ok) {
          const bankingData = await bankingRes.json();
          setBankingDetails(bankingData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      alert("Please select a date and time slot");
      return;
    }

    setShowIndemnity(true);
  };

  const promptForPOP = async (): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        resolve(file || null);
      };
      input.click();
    });
  };

  const confirmBooking = async () => {
    setLoading(true);
    setError("");
    try {
      const userId = localStorage.getItem("userId");
      const userName = localStorage.getItem("userName") || "Customer";

      // Parse time slot to get start and end times
      const [startTime, endTime] = selectedTime.split("-");

      // Build booking payload with proper typing
      const bookingPayload: any = {
        client_id: parseInt(userId || "0"),
        client_name: userName,
        location: location || "Johannesburg",
        service_type: serviceType,
        booking_date: selectedDate,
        booking_time: selectedTime,
        special_instructions: specialInstructions,
        booking_type: bookingType === "once_off" ? "standard" : "recurring",
        cleaning_type: "standard",
        payment_method: paymentMethod,
        loyalty_discount: 0,
        cleaner_id: cleanerId || null
      };

      // POST /bookings
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload)
      });

      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json() as { error?: string };
        if (errorData.error === "cleaner_unavailable") {
          // Fallback to general pool, next cleaner assigned
          bookingPayload.cleaner_id = "";
          const retryResponse = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bookingPayload)
          });
          if (!retryResponse.ok) {
            throw new Error("Failed to assign cleaner from general pool");
          }
        } else {
          throw new Error(errorData.error || "Booking failed");
        }
      }

      const bookingData = await bookingResponse.json() as { id: number };

      // If EFT payment, show POP submission modal
      if (paymentMethod === "eft") {
        setShowIndemnity(false);
        // Show POP submission modal
        const popFile = await promptForPOP();
        if (popFile) {
          const formData = new FormData();
          formData.append('file', popFile);
          
          const popResponse = await fetch(`/api/bookings/${bookingData.id}/pop`, {
            method: 'POST',
            body: JSON.stringify({
              pop_url: popFile.name, // In production, this would be the uploaded file URL
              pop_reference: prompt("Enter payment reference number:")
            })
          });
          
          if (!popResponse.ok) {
            setError("Failed to submit proof of payment. Please try again or contact admin.");
            setLoading(false);
            return;
          }
        }
      }

      alert("Booking confirmed successfully! Cleaner will be assigned after payment verification.");
      window.location.href = "/client-dashboard";
    } catch (error: any) {
      setError(error.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculatePaymentAmount = (serviceType: string) => {
    const prices: { [key: string]: number } = {
      "Standard Cleaning": 350,
      "Deep Clean": 500,
      "Move-in/Move-out Cleaning": 450,
      "Commercial Cleaning": 600
    };
    return prices[serviceType] || 350;
  };

  const triggerAdminNotification = async (notification: any) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notification)
      });
    } catch (error) {
      console.error("Failed to trigger admin notification:", error);
    }
  };

  const declineIndemnity = () => {
    setShowIndemnity(false);
    alert("You must agree to the indemnity terms to proceed with booking.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-8">
          Book Your Cleaning Service
        </h1>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8">
          {/* Error Banner */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Select Date *
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
              />
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Select Time Slot *
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
              >
                <option value="">Choose a time slot</option>
                {timeSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Type Selection */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Service Type *
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
              >
                {services.length > 0 ? services.map((service: any) => (
                  <option key={service.id} value={service.name}>
                    {service.name}
                  </option>
                )) : (
                  <option value="">Loading services...</option>
                )}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Location *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter your address"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
              />
            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requirements or instructions"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
              />
            </div>

            {/* Booking Type */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Booking Type *
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="bookingType"
                    value="once_off"
                    checked={bookingType === "once_off"}
                    onChange={() => setBookingType("once_off")}
                    className="mr-2"
                  />
                  <span className="text-black">Once-off Booking</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="bookingType"
                    value="recurring"
                    checked={bookingType === "recurring"}
                    onChange={() => setBookingType("recurring")}
                    className="mr-2"
                  />
                  <span className="text-black">Recurring Booking</span>
                </label>
              </div>
            </div>

            {/* Recurring Rule - Only shown if recurring booking */}
            {bookingType === "recurring" && (
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Recurring Rule *
                </label>
                <select
                  value={recurringRule}
                  onChange={(e) => setRecurringRule(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                >
                  <option value="">Select frequency</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}

            {/* Weekend Assignment */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={weekendWorkRequired}
                  onChange={(e) => setWeekendWorkRequired(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-black font-medium">Weekend Work Required</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">If checked, admin will be notified for weekend assignment</p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Payment Method *
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={paymentMethod === "cash"}
                    onChange={() => setPaymentMethod("cash")}
                    className="mr-2"
                  />
                  <span className="text-black">Cash Payment</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="payment"
                    value="eft"
                    checked={paymentMethod === "eft"}
                    onChange={() => setPaymentMethod("eft")}
                    className="mr-2"
                  />
                  <span className="text-black">EFT Payment</span>
                </label>
              </div>

              {/* Banking Details Display for EFT */}
              {paymentMethod === "eft" && bankingDetails && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-700 mb-2">Banking Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Bank:</span> {bankingDetails.bank_name}</p>
                    <p><span className="font-medium">Account Number:</span> {bankingDetails.account_number}</p>
                    <p><span className="font-medium">Account Holder:</span> {bankingDetails.account_holder}</p>
                    <p><span className="font-medium">Branch Code:</span> {bankingDetails.branch_code}</p>
                    <p><span className="font-medium">Account Type:</span> {bankingDetails.account_type}</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Please use these banking details for your EFT payment. You will need to submit proof of payment after booking confirmation.</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Proceed to Booking
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-blue-600 hover:underline text-sm">
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Glassified Indemnity Overlay */}
      {showIndemnity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white bg-opacity-90 backdrop-blur-lg rounded-2xl shadow-2xl border-2 border-blue-200 p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-blue-700 mb-4">Indemnity Agreement</h2>
            
            <div className="text-gray-700 space-y-4 mb-6">
              <p>
                By proceeding with this booking, you agree to the following terms and conditions:
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">1. Service Agreement</h3>
                <p className="text-sm">
                  Scratch Solid Solutions will provide professional cleaning services as scheduled. 
                  The client agrees to provide access to the premises and ensure the area is ready for cleaning.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">2. Liability</h3>
                <p className="text-sm">
                  While we take utmost care with your property, Scratch Solid Solutions is not liable 
                  for any pre-existing damage or issues. We recommend securing valuables before service.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">3. Payment Terms</h3>
                <p className="text-sm">
                  Payment is due upon completion of service. For EFT payments, proof of payment 
                  must be provided within 24 hours. Cleaner will only be assigned after payment confirmation.
                </p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-semibold mb-2">5. Cleaner Assignment</h3>
                <p className="text-sm">
                  <strong>Important:</strong> A cleaner will only be assigned to your booking after payment has been confirmed and proof of payment has been submitted and verified. This ensures efficient resource allocation and quality service delivery.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">4. Cancellation Policy</h3>
                <p className="text-sm">
                  Cancellations must be made at least 24 hours in advance. Late cancellations 
                  may incur a fee.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={confirmBooking}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? "Processing..." : "I Agree - Confirm Booking"}
              </button>
              <button
                onClick={declineIndemnity}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
