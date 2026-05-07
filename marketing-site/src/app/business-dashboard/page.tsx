"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export default function BusinessDashboard() {
  const router = useRouter();
  useSessionTimeout(true); // Enable 5-minute inactivity timeout
  const [weekendRequests, setWeekendRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignedCleaner, setAssignedCleaner] = useState<any>(null);
  const [cleanerStatus, setCleanerStatus] = useState<'idle' | 'on_way' | 'arrived' | 'completed'>('idle');
  const [contracts, setContracts] = useState<any[]>([]);
  const [recurringBookings, setRecurringBookings] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewingContract, setViewingContract] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    if (!token || role !== 'business') {
      router.replace('/auth');
      return;
    }
    fetchWeekendRequests();
    fetchContracts();
    fetchRecurringBookings();
    fetchUserProfile();
    
    // Poll for cleaner updates every 30 seconds
    const interval = setInterval(() => {
      fetchWeekendRequests();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchWeekendRequests = async () => {
    try {
      const businessId = localStorage.getItem("userId");
      const token = localStorage.getItem("authToken");
      if (!businessId || !token) return;

      const response = await fetch(`/api/weekend-requests?business_id=${businessId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      console.error("Failed to fetch weekend requests:", error);
    }
  };

  const updateCleanerStatus = (status: 'idle' | 'on_way' | 'arrived' | 'completed') => {
    setCleanerStatus(status);
  };

  const updateCleanerStatusInner = (status: 'idle' | 'on_way' | 'arrived' | 'completed') => {
    setCleanerStatus(status);
  };

  const handleWeekendRequest = async () => {
    setLoading(true);
    try {
      const businessId = localStorage.getItem("userId");
      const token = localStorage.getItem("authToken");
      if (!businessId || !token) {
        alert("Authentication required");
        setLoading(false);
        return;
      }
      const response = await fetch('/api/weekend-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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
        alert("Weekend request submitted successfully!");
      } else {
        alert("Failed to submit request. Please try again.");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const businessId = localStorage.getItem("userId");
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/contracts?business_id=${businessId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json() as any[];
        setContracts(data);
      }
    } catch (error) {
      console.error("Failed to fetch contracts:", error);
    }
  };

  const fetchRecurringBookings = async () => {
    try {
      const businessId = localStorage.getItem("userId");
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/bookings?client_id=${businessId}&booking_type=recurring`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json() as any[];
        setRecurringBookings(data);
      }
    } catch (error) {
      console.error("Failed to fetch recurring bookings:", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json() as any[];
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    
    try {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        localStorage.clear();
        router.push('/login');
      } else {
        alert("Failed to delete account");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  const cancelRequest = async (requestId: number) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/weekend-requests/${requestId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setWeekendRequests((prev: any[]) => prev.filter(req => req.id !== requestId));
        alert("Request cancelled successfully");
      } else {
        alert("Failed to cancel request.");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  const handleExportPDF = async (contractId: number) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/contracts/${contractId}/export`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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
        alert("Failed to export contract PDF");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-8">
          Business Dashboard
        </h1>
        
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Welcome Back!</h2>
              <p className="text-gray-600">Manage your business cleaning services</p>
            </div>

            {/* Contract Tile */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-lg text-purple-700 mb-2">Service Contracts</h3>
              <p className="text-gray-600 mb-4">View and manage your service agreements</p>
              <div className="space-y-2">
                {contracts.length === 0 ? (
                  <p className="text-sm text-gray-500">No contracts yet</p>
                ) : (
                  contracts.map((contract: any) => (
                    <div key={contract.id} className="border rounded-lg p-3 bg-white">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">{contract.contract_type}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          contract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {contract.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Rate: R{contract.rate_per_hour}/hr</p>
                      <p className="text-sm text-gray-600">Weekend Multiplier: {contract.weekend_rate_multiplier}x</p>
                      {contract.start_date && (
                        <p className="text-sm text-gray-600">Start: {new Date(contract.start_date).toLocaleDateString()}</p>
                      )}
                      {contract.end_date && (
                        <p className="text-sm text-gray-600">End: {new Date(contract.end_date).toLocaleDateString()}</p>
                      )}
                      {contract.is_immutable === 1 && (
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-orange-600">Contract is locked (read-only)</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setViewingContract(contract)}
                              className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleExportPDF(contract.id)}
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
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

            {/* Recurring Booking Tile */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-lg text-green-700 mb-2">Recurring Bookings</h3>
              <p className="text-gray-600 mb-4">Manage your recurring cleaning schedule</p>
              <div className="space-y-2">
                {recurringBookings.length === 0 ? (
                  <p className="text-sm text-gray-500">No recurring bookings yet</p>
                ) : (
                  recurringBookings.map((booking: any) => (
                    <div key={booking.id} className="border rounded-lg p-3 bg-white">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">{booking.service_type}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          booking.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Next: {new Date(booking.booking_date).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">Time: {booking.booking_time}</p>
                    </div>
                  ))
                )}
              </div>
              <Link href="/book" className="block mt-3 text-center bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                Schedule Recurring Booking
              </Link>
            </div>

            {/* Settings Tile */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-lg text-gray-700 mb-2">Settings</h3>
              <p className="text-gray-600 mb-4">Account and profile settings</p>
              {userProfile && (
                <div className="border rounded-lg p-3 bg-white mb-3">
                  <p className="font-medium text-gray-800">{userProfile.name}</p>
                  <p className="text-sm text-gray-600">{userProfile.email}</p>
                  {userProfile.business_name && (
                    <p className="text-sm text-gray-600">{userProfile.business_name}</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full text-left px-4 py-2 bg-white border rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {showSettings ? 'Hide Settings' : 'Show Settings'}
                </button>
                {showSettings && (
                  <div className="space-y-2 pl-4 border-l-2 border-gray-300">
                    <button className="w-full text-left px-4 py-2 text-blue-600 hover:text-blue-700">
                      Edit Profile
                    </button>
                    <button className="w-full text-left px-4 py-2 text-blue-600 hover:text-blue-700">
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

            <div className="space-y-4">
              {/* Assigned Cleaner Profile */}
              {assignedCleaner && (
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h3 className="font-semibold text-lg text-gray-800 mb-4">Your Assigned Cleaner</h3>
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
                            <path d="M12 12c2.21 0 4 1.79 4 4s-1.79 4-4 4-4 4 4-1.79 4-4-4zm0 6c-3.31 0-6 2.69-6 6h2c0 3.31 2.69 6 6 3.31 0 6-2.69 6-6-2.69-6-6z"/>
                          </svg>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{assignedCleaner.name}</h4>
                        <div className="flex items-center space-x-2 my-2">
                          <div className="flex items-center">
                            <span className="text-yellow-400">{'\u2605'.repeat(Math.floor(assignedCleaner.rating))}</span>
                            <span className="text-gray-400">{'\u2605'.repeat(5 - Math.floor(assignedCleaner.rating))}</span>
                          </div>
                          <span className="text-sm text-gray-600">{assignedCleaner.rating}</span>
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
                </div>
              )}
              
              {/* Booking Options */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-lg text-blue-700 mb-2">Book Cleaning Service</h3>
                <p className="text-gray-600 mb-4">Schedule your professional cleaning service</p>
                
                <Link
                  href="/business-booking"
                  className="block bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
                >
                  Book a Cleaner
                </Link>
              </div>

              {/* Weekend Assignment Notifications */}
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold text-lg text-yellow-700 mb-2">Weekend Assignments</h3>
                <p className="text-gray-600 mb-4">Pending weekend cleaning assignments</p>
                
                <div className="space-y-4">
                  {weekendRequests.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                      No weekend assignments pending
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {weekendRequests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-3 bg-white">
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
                          
                          <div className="text-sm text-gray-600">
                            <p><strong>Special Instructions:</strong> {request.special_instructions}</p>
                            {request.assigned_cleaner && (
                              <p><strong>Assigned Cleaner:</strong> {request.assigned_cleaner}</p>
                            )}
                          </div>
                          
                          {request.status === 'pending' && (
                            <div className="mt-3 text-xs text-blue-600">
                              Awaiting admin assignment
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-lg text-blue-700 mb-2">Weekend Cleaning</h3>
                <p className="text-gray-600 mb-4">Request weekend cleaning services</p>
                
                <div className="space-y-4">
                  {weekendRequests.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No weekend requests yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {weekendRequests.map((request, index) => (
                        <div key={request.id} className="border rounded-lg p-4 bg-white">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-blue-700">
                              Request for {new Date(request.requested_date).toLocaleDateString()}
                            </h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              request.status === 'assigned' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600">
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
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-lg text-blue-700 mb-2">Submit New Request</h3>
                <button
                  onClick={handleWeekendRequest}
                  disabled={loading}
                  className="w-full rounded-full bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? "Submitting..." : "Request Weekend Cleaning"}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Link 
            href="/book" 
            className="text-blue-600 hover:underline font-semibold"
          >
            Back to Booking
          </Link>
        </div>
      </div>

      {/* Glassified Contract View Overlay */}
      {viewingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingContract(null)}></div>
          <div className="relative bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-white/20 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingContract(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-blue-700 mb-6">Contract Details</h2>
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
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Download PDF
              </button>
              <button
                onClick={() => setViewingContract(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
