"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function BusinessEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
      console.error("Failed to fetch events:", error);
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
        alert("Event request submitted successfully!");
        setEvents(prev => [result, ...prev]);
      } else {
        alert("Failed to submit event request");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-16 px-4 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-8">
          Business Events & Extra Services
        </h1>
        
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-blue-700 mb-4">
              Request Extra Services
            </h2>
            
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Request Extra Services"}
            </button>
          </div>
          
          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={event.id} className="border rounded-lg p-4 bg-yellow-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-blue-700">
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
                
                <div className="text-sm text-gray-600">
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
            className="text-blue-600 hover:underline font-semibold"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
