"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function BusinessBookingPage() {
  const [bookingType, setBookingType] = useState<"once-off" | "contract" | null>(null);
  const [showContractForm, setShowContractForm] = useState(false);
  const [weekendRequired, setWeekendRequired] = useState(false);
  const [formData, setFormData] = useState({
    duration: "1_year",
    cleaner_id: "",
    date: "",
    time_slot: "",
    rate_per_hour: 150,
    start_date: "",
    end_date: "",
    terms: "",
    location: "",
  });
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const contractDurations = [
    { value: "1_year", label: "1 Year" },
    { value: "5_years", label: "5 Years" },
  ];

  const timeSlots = [
    { value: "08:00-12:00", label: "Morning (08:00-12:00)" },
    { value: "13:00-17:00", label: "Afternoon (13:00-17:00)" },
  ];

  useEffect(() => {
    // Initialize empty cleaners list - will be populated by actual data
    setCleaners([]);
  }, []);

  const handleBookingTypeSelection = (type: "once-off" | "contract") => {
    setBookingType(type);
    if (type === "contract") {
      setShowContractForm(true);
    }
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          business_id: userId,
          business_name: localStorage.getItem('userName') || '',
          contract_type: 'standard',
          rate_per_hour: formData.rate_per_hour || 150,
          weekend_rate_multiplier: weekendRequired ? 1.5 : 1,
          start_date: formData.start_date || new Date().toISOString().split('T')[0],
          end_date: formData.end_date || null,
          terms: formData.terms || ''
        })
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        alert(data.error || 'Contract creation failed');
        return;
      }

      if (weekendRequired) {
        await fetch('/api/weekend-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            business_id: userId,
            requested_date: formData.start_date || new Date().toISOString().split('T')[0],
            special_instructions: formData.terms || ''
          })
        });
      }

      alert("Contract created successfully!");
      window.location.href = "/business-dashboard";
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOnceOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const userId = localStorage.getItem('userId');
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: userId,
          client_name: localStorage.getItem('userName') || '',
          location: formData.location || '',
          service_type: 'standard',
          booking_date: formData.date,
          booking_time: formData.time_slot?.split('-')[0] || '08:00',
          booking_type: 'once_off',
          cleaning_type: 'standard',
          payment_method: 'eft'
        })
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        alert(data.error || 'Booking failed');
        return;
      }

      alert("Booking confirmed successfully!");
      window.location.href = "/business-dashboard";
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-8">
          Business Booking
        </h1>

        {!bookingType ? (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8">
            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
              Choose Booking Type
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => handleBookingTypeSelection("once-off")}
                className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors"
              >
                <h3 className="text-xl font-bold text-blue-700 mb-2">Once-off Booking</h3>
                <p className="text-gray-600">Single cleaning service</p>
              </button>
              
              <button
                onClick={() => handleBookingTypeSelection("contract")}
                className="p-6 bg-green-50 rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors"
              >
                <h3 className="text-xl font-bold text-green-700 mb-2">Contract Booking</h3>
                <p className="text-gray-600">Long-term cleaning contract</p>
              </button>
            </div>
          </div>
        ) : bookingType === "once-off" ? (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8">
            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
              Once-off Booking
            </h2>
            
            <form onSubmit={handleOnceOffSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Time Slot *
                </label>
                <select
                  value={formData.time_slot}
                  onChange={(e) => setFormData({...formData, time_slot: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a time slot</option>
                  {timeSlots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Cleaner *
                </label>
                <select
                  value={formData.cleaner_id}
                  onChange={(e) => setFormData({...formData, cleaner_id: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a cleaner</option>
                  {cleaners.map((cleaner) => (
                    <option key={cleaner.id} value={cleaner.id}>
                      {cleaner.name} - {cleaner.rating} stars
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? "Processing..." : "Confirm Booking"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8">
            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
              Contract Booking
            </h2>
            
            <form onSubmit={handleContractSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Duration *
                </label>
                <div className="space-y-2">
                  {contractDurations.map((duration) => (
                    <label key={duration.value} className="flex items-center">
                      <input
                        type="radio"
                        name="duration"
                        value={duration.value}
                        checked={formData.duration === duration.value}
                        onChange={(e) => setFormData({...formData, duration: e.target.value})}
                        className="mr-2"
                      />
                      <span>{duration.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Cleaner *
                </label>
                <select
                  value={formData.cleaner_id}
                  onChange={(e) => setFormData({...formData, cleaner_id: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a cleaner</option>
                  {cleaners.map((cleaner) => (
                    <option key={cleaner.id} value={cleaner.id}>
                      {cleaner.name} - {cleaner.rating} stars
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={weekendRequired}
                    onChange={(e) => setWeekendRequired(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Weekend Work Required
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Additional charges may apply for weekend services
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate per Hour (Admin Only)
                </label>
                <input
                  type="number"
                  value={formData.rate_per_hour}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Rate is set by admin and cannot be modified
                </p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Contract Information</h4>
                <p className="text-sm text-gray-700">
                  Contract rates are set by admin. You will receive the final rate confirmation 
                  after contract submission.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? "Processing..." : "Create Contract"}
              </button>
            </form>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/business-dashboard" className="text-blue-600 hover:underline text-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
