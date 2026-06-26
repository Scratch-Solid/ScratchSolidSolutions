"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sanitizeHtml } from '@/lib/htmlSanitizer';
export default function BookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [bookingType, setBookingType] = useState<"individual" | "business">("individual");
  const [formData, setFormData] = useState({
    service_type: "",
    booking_date: "",
    booking_time: "",
    location: "",
    special_instructions: "",
    cleaning_type: "standard",
    payment_method: "card",
    booking_type: "once_off",
    recurring_rule: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showIndemnity, setShowIndemnity] = useState(false);
  const [indemnityAccepted, setIndemnityAccepted] = useState(false);
  const [indemnityContent, setIndemnityContent] = useState("");

  useEffect(() => {
    // Auth guard: booking is only allowed from authenticated dashboard
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    const userId = localStorage.getItem("userId");
    if (!token || !userId) {
      router.push("/auth?redirect=/client-dashboard");
      return;
    }
    // If already logged in, redirect to dashboard booking flow
    router.push("/client-dashboard");
  }, [router]);

  const fetchIndemnityContent = async () => {
    try {
      const response = await fetch('/api/content?type=indemnity');
      if (response.ok) {
        const data = await response.json() as { content?: string };
        setIndemnityContent(data.content || '');
      }
    } catch (error) {
      // Silently fail — decorative content should not block booking
    }
  };

  const timeSlots = ["08:00-12:00", "13:00-17:00"];

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    if (!userId) {
      setError("Please login to book a service");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create booking with pending_payment status
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          client_id: parseInt(userId),
          client_name: localStorage.getItem("userRole") === "business" ? "Business User" : "Individual User",
          ...formData,
        }),
      });

      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json() as { error?: string; alternatives?: string[] };
        if (errorData.error === "Booking conflict" && errorData.alternatives) {
          setError(`Time slot conflict. Available alternatives: ${errorData.alternatives.join(", ")}`);
        } else {
          setError(errorData.error || "Booking failed");
        }
        setLoading(false);
        return;
      }

      const bookingResult = await bookingResponse.json() as { id: number; total_amount?: number };

      // Step 2: Handle payment based on method
      if (formData.payment_method === "card") {
        // Initialize Paystack payment
        const userEmail = localStorage.getItem("userEmail") || "";
        const amount = bookingResult.total_amount || calculateAmount(formData.service_type, formData.cleaning_type);
        const callbackUrl = `${window.location.origin}/payment/verify`;

        const paystackResponse = await fetch("/api/payments/paystack/initialize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : "",
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

      // For cash/EFT: redirect to booking page with instructions
      router.push(`/bookings/${bookingResult.id}?payment=${formData.payment_method}`);
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateAmount = (serviceType: string, cleaningType: string): number => {
    // Base pricing logic — can be refined
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-white py-16 px-4 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-8">
          Book a Cleaning Service
        </h1>

        {error && (
          <div className={`mb-4 p-4 border-2 rounded-lg ${
            error.includes("Payment") 
              ? "bg-yellow-50 border-yellow-300" 
              : "bg-red-50 border-red-200"
          }`}>
            <p className={`text-sm font-semibold ${
              error.includes("Payment") 
                ? "text-yellow-800" 
                : "text-red-600"
            }`}>
              {error.includes("Payment") 
                ? "Payment not confirmed, retry or contact admin." 
                : error
              }
            </p>
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Select Booking Type</h2>
              <div className="space-y-4">
                <button
                  onClick={() => { setBookingType("individual"); setStep(2); }}
                  className={`w-full p-6 rounded-xl border-2 transition-all ${
                    bookingType === "individual" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <h3 className="text-xl font-semibold mb-2">Individual Booking</h3>
                  <p className="text-gray-600">One-time cleaning service for your home</p>
                </button>
                <button
                  onClick={() => { setBookingType("business"); setStep(2); }}
                  className={`w-full p-6 rounded-xl border-2 transition-all ${
                    bookingType === "business" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <h3 className="text-xl font-semibold mb-2">Business Booking</h3>
                  <p className="text-gray-600">Commercial cleaning for your business</p>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Select Service</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                  <select
                    name="service_type"
                    value={formData.service_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select service type</option>
                    <option value="standard">Standard Cleaning</option>
                    <option value="deep_clean">Deep Cleaning</option>
                    <option value="move_in">Move In Cleaning</option>
                    <option value="move_out">Move Out Cleaning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cleaning Type</label>
                  <select
                    name="cleaning_type"
                    value={formData.cleaning_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="standard">Standard</option>
                    <option value="deep_clean">Deep Clean</option>
                    <option value="move_in">Move In</option>
                    <option value="move_out">Move Out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Booking Type</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="booking_type"
                        value="once_off"
                        checked={formData.booking_type === "once_off"}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span>Once-off</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="booking_type"
                        value="recurring"
                        checked={formData.booking_type === "recurring"}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span>Recurring</span>
                    </label>
                  </div>
                </div>
                {formData.booking_type === "recurring" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recurring Schedule</label>
                    <select
                      name="recurring_rule"
                      value={formData.recurring_rule}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select frequency</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 Weeks</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-gray-400">Back</button>
                  <button onClick={() => setStep(3)} disabled={!formData.service_type} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">Next</button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Select Date & Time</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    name="booking_date"
                    value={formData.booking_date}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Slot</label>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setFormData(prev => ({ ...prev, booking_time: slot }))}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          formData.booking_time === slot ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-gray-400">Back</button>
                  <button onClick={() => setStep(4)} disabled={!formData.booking_date || !formData.booking_time} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">Next</button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Location & Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main St, City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
                  <textarea
                    name="special_instructions"
                    value={formData.special_instructions}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any special requests..."
                  />
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep(3)} className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-gray-400">Back</button>
                  <button onClick={() => setStep(5)} disabled={!formData.location} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">Next</button>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Payment & Terms</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="payment_method"
                        value="card"
                        checked={formData.payment_method === "card"}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span>Card (Paystack) — Instant confirmation</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="payment_method"
                        value="cash"
                        checked={formData.payment_method === "cash"}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span>Cash — Pay on arrival</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="payment_method"
                        value="eft"
                        checked={formData.payment_method === "eft"}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span>EFT — Upload proof of payment</span>
                    </label>
                  </div>
                  {formData.payment_method === "card" && (
                    <p className="text-xs text-blue-600 mt-2">
                      You will be redirected to Paystack to complete payment securely.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowIndemnity(true)}
                  className="w-full p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  View Indemnity Form
                </button>
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="indemnity"
                    className="mt-1"
                    checked={indemnityAccepted}
                    onChange={(e) => setIndemnityAccepted(e.target.checked)}
                  />
                  <label htmlFor="indemnity" className="ml-2 text-sm text-gray-700">
                    I have read and agree to the indemnity terms
                  </label>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep(4)} className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-gray-400">Back</button>
                  <button onClick={handleSubmit} disabled={loading || !indemnityAccepted} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {loading
                      ? "Processing..."
                      : formData.payment_method === "card"
                        ? "Proceed to Payment"
                        : "Confirm Booking"
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {showIndemnity && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 m-4 shadow-2xl border border-white/20">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Indemnity Form</h3>
              <div className="text-sm text-gray-700 space-y-2">
                {indemnityContent ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(indemnityContent) }} />
                ) : (
                  <p>Loading indemnity form...</p>
                )}
              </div>
              <div className="mt-6 flex gap-4">
                <button 
                  onClick={() => {
                    setShowIndemnity(false);
                    // Go back to previous step
                    setStep(4);
                  }} 
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold transition-colors"
                >
                  Decline
                </button>
                <button 
                  onClick={() => {
                    setShowIndemnity(false);
                    setIndemnityAccepted(true);
                  }} 
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                >
                  I Agree
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
