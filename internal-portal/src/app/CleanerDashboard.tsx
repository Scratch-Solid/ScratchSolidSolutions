// CleanerDashboard.tsx
// Next.js page for cleaner dashboard (status, profile, earnings, tasks)

"use client";

import React, { useEffect, useState } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import DashboardLayout from "@/components/DashboardLayout";

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
  const [mustChangePassword, setMustChangePassword] = useState(false);
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
  const [taskHorizonFilter, setTaskHorizonFilter] = useState<'7-day' | 'all'>('7-day');
  const [geolocationEnabled, setGeolocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [lastLocationPing, setLastLocationPing] = useState<Date | null>(null);
  const [kpiScore, setKpiScore] = useState(0);

  useEffect(() => {
    async function fetchCleanerAndTasks() {
      setLoading(true);
      try {
        // Get username from localStorage
        const storedUsername = localStorage.getItem("username");
        const storedUserId = localStorage.getItem("user_id");
        if (storedUsername) {
          setUsername(storedUsername);
          const mustChange = localStorage.getItem('mustChangePassword') === 'true';
          setMustChangePassword(mustChange);

          // Fetch cleaner profile
          const profileRes = await fetch(`/api/cleaner-profile?username=${storedUsername}`);
          if (profileRes.ok) {
            const profile = await profileRes.json() as any;
            setProfileData(profile as any);
            setCleanerId(profile.user_id || parseInt(storedUserId || '1'));
          }
        }

        // Fetch cleaner status
        if (storedUserId) {
          const statusRes = await fetch(`/api/cleaner-status?cleaner_id=${storedUserId}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json() as any;
            setCleanerStatus(statusData.status || 'idle');
          }

          // Fetch task completions for earnings
          const earningsRes = await fetch(`/api/cleaner-earnings?cleaner_id=${storedUserId}`);
          if (earningsRes.ok) {
            const earningsData = await earningsRes.json() as any[];
            const totalEarnings = earningsData.reduce((sum: number, item: any) => sum + (item.earnings || 0), 0);
            setCleaner(prev => prev ? { ...prev, totalEarnings, completedJobs: earningsData.length } : prev);
          }

          // Fetch bookings for tasks
          const bookingsRes = await fetch(`/api/bookings?cleaner_id=${storedUserId}`);
          if (bookingsRes.ok) {
            const bookingsData = await bookingsRes.json() as any[];
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
        setError((err as any)?.error || (err as Error).message);
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
        const error = await response.json() as any;
        alert(`Failed to update status: ${error?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Failed to update cleaner status:", err);
      const msg = (err as any)?.error || (err as Error)?.message || 'An error occurred while updating status';
      alert(msg);
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

  if (loading) return <DashboardLayout title="Cleaner Dashboard" role="cleaner"><div className="glass-panel text-center" style={{ color: 'var(--text)' }}>Loading...</div></DashboardLayout>;
  if (error) return <DashboardLayout title="Cleaner Dashboard" role="cleaner"><div className="error-msg">{error}</div></DashboardLayout>;
  if (!cleaner) return <DashboardLayout title="Cleaner Dashboard" role="cleaner"><div className="glass-panel text-center" style={{ color: 'var(--text)' }}>No data found.</div></DashboardLayout>;

  return (
    <DashboardLayout title="Cleaner Dashboard" role="cleaner">
      {mustChangePassword && (
        <div className="mb-4 glass-panel" style={{ background: 'rgba(254, 249, 195, 0.9)', borderColor: 'rgba(234, 179, 8, 0.4)' }}>
          <div className="font-bold" style={{ color: '#854d0e' }}>Action required</div>
          <div style={{ color: '#854d0e' }}>Please update your password to continue using the portal.</div>
          <button className="mt-2 primary-button" onClick={() => window.location.href = '/auth/change-password'}>
            Change Password
          </button>
        </div>
      )}
      {/* Tile Navigation */}
      <div className="mb-6 flex space-x-2 border-b pb-2" style={{ borderColor: 'rgba(12, 37, 74, 0.12)' }}>
        <button
          onClick={() => setActiveTile("profile")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "profile" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "profile" ? '#09172a' : '#0e223a' }}
        >
          Personal Details
        </button>
        <button
          onClick={() => setActiveTile("status")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "status" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "status" ? '#09172a' : '#0e223a' }}
        >
          Status
        </button>
        <button
          onClick={() => setActiveTile("tasks")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "tasks" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "tasks" ? '#09172a' : '#0e223a' }}
        >
          Tasks
        </button>
        <button
          onClick={() => setActiveTile("earnings")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "earnings" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "earnings" ? '#09172a' : '#0e223a' }}
        >
          Earnings
        </button>
        <button
          onClick={() => setActiveTile("performance")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "performance" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "performance" ? '#09172a' : '#0e223a' }}
        >
          Performance
        </button>
        <button
          onClick={() => setActiveTile("geolocation")}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${activeTile === "geolocation" ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
          style={{ color: activeTile === "geolocation" ? '#09172a' : '#0e223a' }}
        >
          Geolocation
        </button>
      </div>

      {activeTile === "profile" && (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-h)' }}>Personal Details</h3>
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 text-sm rounded border transition-all"
              style={{ color: 'var(--text)', borderColor: 'rgba(12, 37, 74, 0.12)' }}
            >
              {editingProfile ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          {editingProfile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Profile Picture</label>
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
                  <img src={profileData.profilePicture} alt="Profile" className="w-12 h-12 rounded-full border mt-2" style={{ borderColor: 'var(--border)' }} />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Address</label>
                <input
                  type="text"
                  value={profileData.address}
                  onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Cellphone Number</label>
                <input
                  type="tel"
                  value={profileData.cellphoneNumber}
                  onChange={(e) => setProfileData(prev => ({ ...prev, cellphoneNumber: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Tax Number</label>
                <input
                  type="text"
                  value={profileData.taxNumber}
                  onChange={(e) => setProfileData(prev => ({ ...prev, taxNumber: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Emergency Contact 1 - Name</label>
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
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Emergency Contact 1 - Number</label>
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
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Emergency Contact 2 - Name</label>
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
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Emergency Contact 2 - Number</label>
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
                  <img src={profileData.profilePicture} alt="Profile" className="w-12 h-12 rounded-full border" style={{ borderColor: 'var(--border)' }} />
                )}
                <div>
                  <div className="text-xl font-bold" style={{ color: 'var(--text-h)' }}>{profileData.firstName} {profileData.lastName}</div>
                  <div className="text-sm" style={{ color: 'var(--text)', opacity: 0.6 }}>@{username}</div>
                </div>
              </div>
              <div style={{ color: 'var(--text)' }}><b>Address:</b> {profileData.address || "Not provided"}</div>
              <div style={{ color: 'var(--text)' }}><b>Cellphone:</b> {profileData.cellphoneNumber || "Not provided"}</div>
              <div style={{ color: 'var(--text)' }}><b>Tax Number:</b> {profileData.taxNumber || "Not provided"}</div>
              <div style={{ color: 'var(--text)' }}><b>Emergency Contact 1:</b> {profileData.emergencyContact1.name || "Not provided"} - {profileData.emergencyContact1.number || "Not provided"}</div>
              <div style={{ color: 'var(--text)' }}><b>Emergency Contact 2:</b> {profileData.emergencyContact2.name || "Not provided"} - {profileData.emergencyContact2.number || "Not provided"}</div>
            </div>
          )}
        </div>
      )}

      {activeTile === "status" && (
        <div className="glass-card p-6">
          <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Current Status</h3>
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
          <h4 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Update Status</h4>
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
        </div>
      )}

      {activeTile === "tasks" && (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-h)' }}>Tasks</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setTaskHorizonFilter('7-day')}
                className={`px-3 py-1 rounded text-sm ${taskHorizonFilter === '7-day' ? 'bg-blue-500/20 text-blue-200' : 'bg-white/10 text-white/70'}`}
              >
                7-Day Horizon
              </button>
              <button
                onClick={() => setTaskHorizonFilter('all')}
                className={`px-3 py-1 rounded text-sm ${taskHorizonFilter === 'all' ? 'bg-blue-500/20 text-blue-200' : 'bg-white/10 text-white/70'}`}
              >
                All Tasks
              </button>
            </div>
          </div>
          {tasks.length === 0 ? (
            <p style={{ color: 'var(--text)', opacity: 0.6 }}>No tasks assigned.</p>
          ) : (
            <ul className="space-y-2">
              {tasks
                .filter((task: any) => {
                  if (taskHorizonFilter === 'all') return true;
                  const taskDate = new Date(task.date);
                  const sevenDaysFromNow = new Date();
                  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                  return taskDate <= sevenDaysFromNow && taskDate >= new Date();
                })
                .map((task: any) => (
                <li key={task.id} className="border rounded p-3 bg-white/5" style={{ borderColor: 'var(--border)' }}>
                  <div style={{ color: 'var(--text)' }}><b>Customer:</b> {task.customer}</div>
                  <div style={{ color: 'var(--text)' }}><b>Date:</b> {task.date}</div>
                  <div style={{ color: 'var(--text)' }}><b>Time:</b> {task.time}</div>
                  <div style={{ color: 'var(--text)' }}><b>Address:</b> {task.address}</div>
                  <div style={{ color: 'var(--text)' }}><b>Status:</b> {task.status}</div>
                  {task.status !== 'completed' && (
                    <button
                      onClick={() => updateBookingStatus(task.id.toString(), 'completed')}
                      className="mt-2 bg-green-500/20 hover:bg-green-500/30 px-3 py-1 rounded border transition-all"
                      style={{ color: '#15803d', borderColor: 'rgba(22, 163, 74, 0.3)' }}
                    >
                      Mark Complete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTile === "earnings" && (
        <div className="glass-card p-6">
          <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Earnings</h3>
          <div style={{ color: 'var(--text)' }}>
            <p className="text-2xl font-bold">R{cleaner?.totalEarnings || 0}</p>
            <p style={{ opacity: 0.6 }}>Total Earnings</p>
            <p className="mt-2" style={{ opacity: 0.6 }}>{cleaner?.completedJobs || 0} jobs completed</p>
          </div>
        </div>
      )}

      {activeTile === "performance" && (
        <div className="glass-card p-6">
          <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Performance Metrics</h3>
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between items-center mb-2">
                <span style={{ color: 'var(--text)' }}>KPI Score</span>
                <span className="text-2xl font-bold" style={{ color: '#10b981' }}>{kpiScore}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${kpiScore}%` }}></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4" style={{ borderColor: 'var(--border)' }}>
                <div style={{ color: 'var(--text)', opacity: 0.6 }}>Completed Jobs (7-day)</div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-h)' }}>
                  {tasks.filter((t: any) => t.status === 'completed').length}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4" style={{ borderColor: 'var(--border)' }}>
                <div style={{ color: 'var(--text)', opacity: 0.6 }}>Pending Tasks (7-day)</div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-h)' }}>
                  {tasks.filter((t: any) => t.status !== 'completed').length}
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4" style={{ borderColor: 'var(--border)' }}>
              <div style={{ color: 'var(--text)', opacity: 0.6 }}>Current Status</div>
              <div className={`mt-1 px-3 py-1 rounded-full text-sm font-semibold inline-block ${
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
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTile === "geolocation" && (
        <div className="glass-card p-6">
          <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-h)' }}>Transparency Sync Node</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white/5 rounded-lg p-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div style={{ color: 'var(--text)' }}>Geolocation Sync</div>
                <div style={{ color: 'var(--text)', opacity: 0.6, fontSize: '0.875rem' }}>
                  {geolocationEnabled ? 'Active - Pinging location to backend' : 'Inactive'}
                </div>
              </div>
              <button
                onClick={() => {
                  setGeolocationEnabled(!geolocationEnabled);
                  if (!geolocationEnabled) {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                          setLastLocationPing(new Date());
                        },
                        (error) => {
                          alert('Unable to retrieve location');
                        }
                      );
                    }
                  } else {
                    setCurrentLocation(null);
                    setLastLocationPing(null);
                  }
                }}
                className={`px-4 py-2 rounded-lg transition-all ${geolocationEnabled ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'}`}
              >
                {geolocationEnabled ? 'Disable Sync' : 'Enable Sync'}
              </button>
            </div>
            {currentLocation && (
              <div className="bg-white/5 rounded-lg p-4" style={{ borderColor: 'var(--border)' }}>
                <div style={{ color: 'var(--text)', opacity: 0.6 }}>Current Location</div>
                <div className="mt-1 font-mono text-sm" style={{ color: 'var(--text-h)' }}>
                  Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                </div>
                {lastLocationPing && (
                  <div className="mt-1 text-sm" style={{ color: 'var(--text)', opacity: 0.6 }}>
                    Last ping: {lastLocationPing.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div style={{ color: '#3b82f6', fontSize: '1.25rem' }}>📍</div>
                <div>
                  <h4 className="font-semibold" style={{ color: '#1e40af' }}>Privacy Notice</h4>
                  <p className="text-sm" style={{ color: '#1e40af', opacity: 0.8 }}>
                    Your location is only shared when you're on the way to a job. This helps clients track your arrival for better service coordination.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
