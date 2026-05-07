// CleanerDashboard.tsx
// Next.js page for cleaner dashboard (status, profile, earnings, tasks)

"use client";

import React, { useEffect, useState } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export default function CleanerDashboard() {
  useSessionTimeout(true);
  const [cleaner, setCleaner] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTile, setActiveTile] = useState("profile");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    profilePicture: "",
    firstName: "",
    lastName: "",
    address: "",
    cellphoneNumber: "",
    taxNumber: "",
    emergencyContact1: { name: "", number: "" },
    emergencyContact2: { name: "", number: "" },
  });
  const [username, setUsername] = useState("");
  const [cleanerStatus, setCleanerStatus] = useState('idle');
  const [cleanerId, setCleanerId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCleanerAndTasks() {
      setLoading(true);
      try {
        // Get username from localStorage
        const storedUsername = localStorage.getItem("username");
        const storedUserId = localStorage.getItem("user_id");
        if (storedUsername) {
          setUsername(storedUsername);

          // Fetch cleaner profile
          const profileRes = await fetch(`/api/cleaner-profile?username=${storedUsername}`);
          if (profileRes.ok) {
            const profile = await profileRes.json();
            setProfileData(profile);
            setCleanerId(profile.user_id || parseInt(storedUserId || '1'));
          }
        }

        // Fetch cleaner status
        if (storedUserId) {
          const statusRes = await fetch(`/api/cleaner-status?cleaner_id=${storedUserId}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setCleanerStatus(statusData.status || 'idle');
          }

          // Fetch task completions for earnings
          const earningsRes = await fetch(`/api/cleaner-earnings?cleaner_id=${storedUserId}`);
          if (earningsRes.ok) {
            const earningsData = await earningsRes.json();
            const totalEarnings = earningsData.reduce((sum: number, item: any) => sum + (item.earnings || 0), 0);
            setCleaner(prev => prev ? { ...prev, totalEarnings, completedJobs: earningsData.length } : prev);
          }

          // Fetch bookings for tasks
          const bookingsRes = await fetch(`/api/bookings?cleaner_id=${storedUserId}`);
          if (bookingsRes.ok) {
            const bookingsData = await bookingsRes.json();
            setTasks(bookingsData.map((b: any) => ({
              id: b.id,
              customer: b.client_name,
              date: b.booking_date,
              time: b.booking_time,
              address: b.location,
              status: b.status
            })));
          }
        }

        // Build cleaner profile from real API data
        const totalEarnings = (cleaner as any)?.totalEarnings ?? 0;
        const completedJobs = (cleaner as any)?.completedJobs ?? 0;
        setCleaner({
          id: cleanerId,
          name: `${profileData.firstName} ${profileData.lastName}`.trim() || username || "Cleaner",
          email: "",
          rating: 0,
          totalEarnings,
          completedJobs,
        });

        if (!storedUserId && tasks.length === 0) {
          setTasks([]);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchCleanerAndTasks();
  }, []);

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Update failed");
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === parseInt(bookingId) ? { ...task, status } : task
        )
      );
    } catch (err) {
      console.error("Failed to update booking status:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  const updateCleanerStatus = async (newStatus: string) => {
    if (!cleanerId) {
      alert("Cleaner ID not found");
      return;
    }

    try {
      // Get GPS location
      let gps_lat: number | undefined;
      let gps_long: number | undefined;

      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        gps_lat = position.coords.latitude;
        gps_long = position.coords.longitude;
      }

      const response = await fetch("/api/cleaner-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleaner_id: cleanerId,
          status: newStatus,
          gps_lat,
          gps_long
        }),
      });

      if (response.ok) {
        setCleanerStatus(newStatus);
        alert(`Status updated to ${newStatus}`);
      } else {
        const error = await response.json();
        alert(`Failed to update status: ${error.error}`);
      }
    } catch (err) {
      console.error("Failed to update cleaner status:", err);
      alert("An error occurred while updating status");
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch("/api/cleaner-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          address: profileData.address,
          cellphone: profileData.cellphoneNumber,
          tax_number: profileData.taxNumber,
          emergency_contact1_name: profileData.emergencyContact1.name,
          emergency_contact1_phone: profileData.emergencyContact1.number,
          emergency_contact2_name: profileData.emergencyContact2.name,
          emergency_contact2_phone: profileData.emergencyContact2.number,
          profile_picture: profileData.profilePicture,
        }),
      });

      if (response.ok) {
        alert("Profile updated successfully!");
        setEditingProfile(false);
      } else {
        alert("Failed to update profile. Please try again.");
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("An error occurred. Please try again.");
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    window.location.href = '/auth/login';
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!cleaner) return <div>No data found.</div>;

  return (
    <div className="dashboard-container glass-panel">
      <div className="flex justify-between items-center mb-6">
        <h2>Cleaner Dashboard</h2>
        <button onClick={handleLogout} className="secondary-button text-red-600 hover:text-red-700">
          Logout
        </button>
      </div>
      
      {/* Tile Navigation */}
      <div className="mb-6 flex space-x-2 border-b pb-2">
        <button
          onClick={() => setActiveTile("profile")}
          className={`px-4 py-2 rounded ${activeTile === "profile" ? "primary-button" : "secondary-button"}`}
        >
          Personal Details
        </button>
        <button
          onClick={() => setActiveTile("status")}
          className={`px-4 py-2 rounded ${activeTile === "status" ? "primary-button" : "secondary-button"}`}
        >
          Status
        </button>
        <button
          onClick={() => setActiveTile("tasks")}
          className={`px-4 py-2 rounded ${activeTile === "tasks" ? "primary-button" : "secondary-button"}`}
        >
          Tasks
        </button>
        <button
          onClick={() => setActiveTile("earnings")}
          className={`px-4 py-2 rounded ${activeTile === "earnings" ? "primary-button" : "secondary-button"}`}
        >
          Earnings
        </button>
      </div>

      {activeTile === "profile" && (
        <div className="glass-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Personal Details</h3>
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="secondary-button px-3 py-1 text-sm"
            >
              {editingProfile ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          {editingProfile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProfileData(prev => ({ ...prev, profilePicture: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full"
                />
                {profileData.profilePicture && (
                  <img src={profileData.profilePicture} alt="Profile" className="w-24 h-24 rounded-full border mt-2" />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Address</label>
                <input
                  type="text"
                  value={profileData.address}
                  onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Cellphone Number</label>
                <input
                  type="tel"
                  value={profileData.cellphoneNumber}
                  onChange={(e) => setProfileData(prev => ({ ...prev, cellphoneNumber: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Tax Number</label>
                <input
                  type="text"
                  value={profileData.taxNumber}
                  onChange={(e) => setProfileData(prev => ({ ...prev, taxNumber: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Emergency Contact 1 - Name</label>
                <input
                  type="text"
                  value={profileData.emergencyContact1.name}
                  onChange={(e) => setProfileData(prev => ({ 
                    ...prev, 
                    emergencyContact1: { ...prev.emergencyContact1, name: e.target.value }
                  }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Emergency Contact 1 - Number</label>
                <input
                  type="tel"
                  value={profileData.emergencyContact1.number}
                  onChange={(e) => setProfileData(prev => ({ 
                    ...prev, 
                    emergencyContact1: { ...prev.emergencyContact1, number: e.target.value }
                  }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Emergency Contact 2 - Name</label>
                <input
                  type="text"
                  value={profileData.emergencyContact2.name}
                  onChange={(e) => setProfileData(prev => ({ 
                    ...prev, 
                    emergencyContact2: { ...prev.emergencyContact2, name: e.target.value }
                  }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Emergency Contact 2 - Number</label>
                <input
                  type="tel"
                  value={profileData.emergencyContact2.number}
                  onChange={(e) => setProfileData(prev => ({ 
                    ...prev, 
                    emergencyContact2: { ...prev.emergencyContact2, number: e.target.value }
                  }))}
                  className="w-full"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                className="w-full primary-button"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {profileData.profilePicture && (
                  <img src={profileData.profilePicture} alt="Profile" className="w-24 h-24 rounded-full border" />
                )}
                <div>
                  <div className="text-xl font-bold">{profileData.firstName} {profileData.lastName}</div>
                  <div className="text-sm text-gray-600">@{username}</div>
                </div>
              </div>
              <div><b>Address:</b> {profileData.address || "Not provided"}</div>
              <div><b>Cellphone:</b> {profileData.cellphoneNumber || "Not provided"}</div>
              <div><b>Tax Number:</b> {profileData.taxNumber || "Not provided"}</div>
              <div><b>Emergency Contact 1:</b> {profileData.emergencyContact1.name || "Not provided"} - {profileData.emergencyContact1.number || "Not provided"}</div>
              <div><b>Emergency Contact 2:</b> {profileData.emergencyContact2.name || "Not provided"} - {profileData.emergencyContact2.number || "Not provided"}</div>
            </div>
          )}
        </div>
      )}

      {activeTile === "status" && (
        <div className="glass-card">
          <h3 className="font-bold text-lg mb-4">Current Status</h3>
          <div className="mb-4">
            <span className={`px-4 py-2 rounded-full text-lg font-semibold ${
              cleanerStatus === 'idle' ? 'bg-gray-100 text-gray-800' :
              cleanerStatus === 'on_way' ? 'bg-blue-100 text-blue-800' :
              cleanerStatus === 'arrived' ? 'bg-yellow-100 text-yellow-800' :
              cleanerStatus === 'completed' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {cleanerStatus === 'idle' ? 'Idle' :
               cleanerStatus === 'on_way' ? 'On the Way' :
               cleanerStatus === 'arrived' ? 'Arrived' :
               cleanerStatus === 'completed' ? 'Completed' : 'Unknown'}
            </span>
          </div>
          <h4 className="font-semibold mb-2">Update Status</h4>
          <div className="space-y-2">
            <button
              onClick={() => updateCleanerStatus('idle')}
              disabled={cleanerStatus === 'idle'}
              className="w-full px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Set Idle
            </button>
            <button
              onClick={() => updateCleanerStatus('on_way')}
              disabled={cleanerStatus === 'on_way'}
              className="w-full px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-100 disabled:text-blue-400"
            >
              On the Way
            </button>
            <button
              onClick={() => updateCleanerStatus('arrived')}
              disabled={cleanerStatus === 'arrived'}
              className="w-full px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600 disabled:bg-yellow-100 disabled:text-yellow-400"
            >
              Arrived
            </button>
            <button
              onClick={() => updateCleanerStatus('completed')}
              disabled={cleanerStatus === 'completed'}
              className="w-full px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600 disabled:bg-green-100 disabled:text-green-400"
            >
              Completed
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">GPS location will be captured when status changes</p>
        </div>
      )}

      {activeTile === "tasks" && (
        <>
          {/* Upcoming Shifts Widget */}
          <div className="glass-card mb-4">
            <h3 className="font-bold text-lg mb-2">Upcoming Shifts</h3>
            {upcomingShifts.length === 0 ? (
              <div>No upcoming shifts.</div>
            ) : (
              <ul className="mt-2 space-y-2">
                {upcomingShifts.map((shift: any) => (
                  <li key={shift.id} className="border rounded p-2 bg-white">
                    <div><b>{shift.date}</b></div>
                    <div>Time: {shift.time_slot === "morning" ? "08:00–12:00" : "13:00–17:00"}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Assignments (Tasks) Widget */}
          <div className="glass-card">
            <h3 className="font-bold text-lg mb-2">Assignments</h3>
            {tasks.length === 0 ? (
              <div>No tasks assigned.</div>
            ) : (
              <ul className="mt-2 space-y-2">
                {tasks.map((task: any) => (
                  <li key={task.id} className="border rounded p-2 bg-white">
                    <div><b>Booking #{task.id}</b> - {task.status}</div>
                    <div>Start: {task.start_time}</div>
                    <div>End: {task.end_time || "-"}</div>
                    <div>Type: {task.booking_type}</div>
                    <div>Client: {task.user_id}</div>
                    <div className="mt-2 space-x-2">
                      <button
                        onClick={() => updateBookingStatus(task.id, "on_the_way")}
                        className="primary-button px-2 py-1 text-sm"
                      >
                        On the Way
                      </button>
                      <button
                        onClick={() => updateBookingStatus(task.id, "arrived")}
                        className="primary-button px-2 py-1 text-sm"
                      >
                        Arrived
                      </button>
                      <button
                        onClick={() => updateBookingStatus(task.id, "completed")}
                        className="primary-button px-2 py-1 text-sm"
                      >
                        Completed
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {activeTile === "earnings" && (
        <>
          {/* Profile Section - Earnings */}
          <div className="glass-card mb-4">
            <h3 className="font-bold text-lg mb-2">Earnings Summary</h3>
            <div className="mb-2">Total Earnings: <b>R{cleaner.totalEarnings?.toFixed(2) ?? "0.00"}</b></div>
            <div className="mb-2">Completed Jobs: <b>{cleaner.completedJobs}</b></div>
            <div className="mb-2">Rating: <b>{cleaner.rating}/5</b></div>
          </div>

          {/* Ratings Widget */}
          <div className="glass-card">
            <h3 className="font-bold text-lg mb-2">Ratings</h3>
            {ratings.length === 0 ? (
              <div>No ratings yet.</div>
            ) : (
              <ul className="mt-2 space-y-2">
                {ratings.map((rating: any) => (
                  <li key={rating.id} className="border rounded p-2 bg-white">
                    <div><b>{rating.rating}/5</b> - {rating.comment}</div>
                    <div className="text-sm">{rating.date}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
