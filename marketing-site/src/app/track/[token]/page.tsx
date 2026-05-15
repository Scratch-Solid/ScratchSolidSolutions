"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import TrackingMap from "@/components/TrackingMap";

// Helper function to get coordinates for an area
function getCoordinatesForArea(areaName: string): { lat: number; long: number } | null {
  const areaCoordinates: Record<string, { lat: number; long: number }> = {
    'Durbanville': { lat: -33.8333, long: 18.6500 },
    'Bellville': { lat: -33.8986, long: 18.6319 },
    'Brackenfell': { lat: -33.8833, long: 18.7000 },
    'Plattekloof': { lat: -33.8667, long: 18.6167 },
    'Tygervalley': { lat: -33.8783, long: 18.6283 },
    'Parow': { lat: -33.9028, long: 18.5819 },
    'Goodwood': { lat: -33.9028, long: 18.5600 },
    'Kuils River': { lat: -33.9639, long: 18.7167 },
    'Kraaifontein': { lat: -33.9750, long: 18.7083 },
    'Stellenbosch': { lat: -33.9333, long: 18.8667 },
    'Paarl': { lat: -33.7333, long: 18.9667 },
    'Wellington': { lat: -33.6333, long: 18.9833 }
  };
  return areaCoordinates[areaName] || null;
}

export default function PublicTrackingPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [cleanerStatus, setCleanerStatus] = useState<any>(null);
  const [gpsLocation, setGpsLocation] = useState<any>(null);

  useEffect(() => {
    fetchTrackingData();
    
    // Poll for updates every 15 seconds
    const interval = setInterval(() => {
      fetchTrackingData();
    }, 15000);
    
    return () => clearInterval(interval);
  }, [token]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/tracking/${token}`);
      
      if (!response.ok) {
        const data = await response.json();
        setError((data as any).error || 'Failed to load tracking data');
        setBooking(null);
        return;
      }

      const data = await response.json();
      setBooking((data as any).booking);
      setCleanerStatus((data as any).cleanerStatus);
      setGpsLocation((data as any).gpsLocation);
      setError("");
    } catch (err) {
      console.error('Failed to fetch tracking data:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-gray-100 text-gray-800';
      case 'on_way': return 'bg-blue-100 text-blue-800';
      case 'arrived': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'idle': return 'Idle';
      case 'on_way': return 'On the Way';
      case 'arrived': return 'Arrived';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  if (loading && !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Tracking Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchTrackingData}
            className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">🧹 Scratch Solid Solutions</h1>
            <span className="text-sm text-gray-600">Live Tracking</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Booking Info Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Booking Details</h2>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Booking ID</p>
              <p className="font-semibold text-gray-800">#{booking.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Service</p>
              <p className="font-semibold text-gray-800">{booking.service_name || 'Cleaning Service'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Date</p>
              <p className="font-semibold text-gray-800">{booking.booking_date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Time</p>
              <p className="font-semibold text-gray-800">{booking.booking_time}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 mb-1">Location</p>
              <p className="font-semibold text-gray-800">{booking.location}</p>
            </div>
          </div>
        </div>

        {/* Cleaner Status Card */}
        {cleanerStatus && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Cleaner Status</h2>
            
            <div className="flex items-center justify-center mb-6">
              <div className={`px-8 py-4 rounded-full text-xl font-bold ${getStatusColor(cleanerStatus.status)}`}>
                {getStatusText(cleanerStatus.status)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  👤
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cleaner</p>
                  <p className="font-semibold text-gray-800">{cleanerStatus.cleaner_name || 'Assigned Cleaner'}</p>
                </div>
              </div>

              {cleanerStatus.status === 'on_way' && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    🚗
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-semibold text-gray-800">On the way to your location</p>
                  </div>
                </div>
              )}

              {cleanerStatus.status === 'arrived' && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    🏠
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-semibold text-gray-800">Has arrived at your location</p>
                  </div>
                </div>
              )}

              {cleanerStatus.status === 'completed' && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    ✨
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-semibold text-gray-800">Cleaning service completed</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GPS Location Card */}
        {gpsLocation && gpsLocation.gps_lat && gpsLocation.gps_long && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Live Location</h2>
            
            <div className="bg-gray-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-500 mb-1">Last Updated</p>
              <p className="font-semibold text-gray-800">
                {gpsLocation.last_update ? new Date(gpsLocation.last_update).toLocaleString() : 'Unknown'}
              </p>
            </div>

            {/* Map */}
            <div className="mb-4">
              <TrackingMap
                cleanerLat={gpsLocation.gps_lat}
                cleanerLong={gpsLocation.gps_long}
                destinationLat={booking.location ? getCoordinatesForArea(booking.location)?.lat : undefined}
                destinationLong={booking.location ? getCoordinatesForArea(booking.location)?.long : undefined}
                locationName={booking.location}
                showRoute={true}
                height="300px"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Latitude</p>
                <p className="font-semibold text-gray-800">{gpsLocation.gps_lat.toFixed(6)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Longitude</p>
                <p className="font-semibold text-gray-800">{gpsLocation.gps_long.toFixed(6)}</p>
              </div>
            </div>

            <a
              href={`https://www.google.com/maps?q=${gpsLocation.gps_lat},${gpsLocation.gps_long}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-4 text-center bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              View on Google Maps
            </a>
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="text-center text-sm text-gray-500">
          <p>Auto-refreshing every 15 seconds...</p>
          <button
            onClick={fetchTrackingData}
            className="mt-2 text-blue-600 hover:text-blue-700 underline"
          >
            Refresh Now
          </button>
        </div>
      </div>
    </div>
  );
}
