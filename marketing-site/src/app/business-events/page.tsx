"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function BusinessEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/business-events");
      if (response.ok) {
        const data = await response.json() as any[];
        setEvents(data);
      }
    } catch (error) {
      // Non-critical background fetch
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch("/api/business-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          business_id: localStorage.getItem("userId"),
          event_type: "extra_work",
          requested_date: new Date().toISOString(),
          special_instructions: "Additional cleaning services required",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess("Event request submitted successfully!");
        setEvents(prev => [result, ...prev]);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError("Failed to submit event request");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F2EA] py-16 px-4 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-normal tracking-tight text-center text-[#2E1F16] mb-8" style={{ fontFamily: "Georgia, serif" }}>
          Business Events & Extra Services
        </h1>

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
        <div className="bg-white rounded-2xl shadow-sm border border-[#E9E0D3] p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-normal text-[#2E1F16] mb-4" style={{ fontFamily: "Georgia, serif" }}>
              Request Extra Services
            </h2>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-full bg-[#B08A5E] px-8 py-3 text-lg font-semibold text-[#2E1F16] shadow-lg hover:bg-[#c39a6c] transition-colors disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Request Extra Services"}
            </button>
          </div>
          
          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={event.id} className="border border-[#E9DCC0] rounded-lg p-4 bg-[#FAF3E6]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-[#2E1F16]">
                    {new Date(event.requested_date).toLocaleDateString()}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    event.status === 'assigned' ? 'bg-green-100 text-green-800' :
                    event.status === 'completed' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {event.status === 'pending' ? 'Pending' : 
                     event.status === 'assigned' ? 'Assigned' : 
                     event.status === 'completed' ? 'Completed' : event.status}
                  </span>
                </div>
                
                <div className="text-sm text-stone-600">
                  <p><strong>Event Type:</strong> {event.event_type}</p>
                  {event.special_instructions && (
                    <p><strong>Special Instructions:</strong> {event.special_instructions}</p>
                  )}
                  {event.assigned_cleaner && (
                    <p><strong>Assigned Cleaner:</strong> {event.assigned_cleaner}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Link 
            href="/business-dashboard" 
            className="text-[#8a6a45] hover:underline font-semibold"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
