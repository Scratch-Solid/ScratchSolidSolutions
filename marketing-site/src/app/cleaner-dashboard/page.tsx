'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Booking {
  id: number;
  client_name: string;
  location: string;
  service_type: string;
  booking_date: string;
  booking_time: string;
  status: string;
  special_instructions?: string;
}

interface Earnings {
  total_earnings: number;
  completed_jobs: number;
}

export default function CleanerDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [earnings, setEarnings] = useState<Earnings>({ total_earnings: 0, completed_jobs: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');

    if (!token || userRole !== 'cleaner') {
      router.push('/login');
      return;
    }

    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Get cleaner profile to get user ID
      const profileResponse = await fetch('/api/cleaner-profiles', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (profileResponse.ok) {
        const profiles = await profileResponse.json() as any[];
        if (profiles && profiles.length > 0) {
          const cleanerId = profiles[0].user_id;

          // Fetch bookings assigned to this cleaner
          const bookingsResponse = await fetch(`/api/bookings?cleaner_id=${cleanerId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json() as Booking[];
            setBookings(bookingsData || []);
          }

          // Fetch earnings
          const earningsResponse = await fetch(`/api/task-completions?cleaner_id=${cleanerId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (earningsResponse.ok) {
            const earningsData = await earningsResponse.json() as Earnings;
            setEarnings(earningsData || { total_earnings: 0, completed_jobs: 0 });
          }
        }
      }
    } catch (err: any) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteBooking = async (bookingId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const profileResponse = await fetch('/api/cleaner-profiles', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (profileResponse.ok) {
        const profiles = await profileResponse.json() as any[];
        if (profiles && profiles.length > 0) {
          const cleanerId = profiles[0].user_id;

          // Record task completion
          await fetch('/api/task-completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              booking_id: bookingId,
              cleaner_id: cleanerId,
              earnings: 150,
            }),
          });

          // Update booking status
          await fetch(`/api/bookings/${bookingId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ status: 'completed' }),
          });

          fetchDashboardData();
        }
      }
    } catch (err: any) {
      setError('Failed to complete booking');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Cleaner Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Earnings</h3>
            <p className="text-3xl font-bold text-green-600">R {earnings.total_earnings.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Completed Jobs</h3>
            <p className="text-3xl font-bold text-blue-600">{earnings.completed_jobs}</p>
          </div>
        </div>

        {/* Bookings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">My Bookings</h2>
          {bookings.length === 0 ? (
            <p className="text-gray-600">No bookings assigned yet.</p>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-800">{booking.client_name}</h3>
                      <p className="text-sm text-gray-600">{booking.location}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Service:</strong> {booking.service_type}</p>
                    <p><strong>Date:</strong> {booking.booking_date}</p>
                    <p><strong>Time:</strong> {booking.booking_time}</p>
                    {booking.special_instructions && (
                      <p><strong>Instructions:</strong> {booking.special_instructions}</p>
                    )}
                  </div>
                  {booking.status === 'pending' || booking.status === 'assigned' ? (
                    <button
                      onClick={() => handleCompleteBooking(booking.id)}
                      className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                    >
                      Mark Complete
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
