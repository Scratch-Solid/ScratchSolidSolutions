// CleanerDashboard.tsx
// Next.js page for cleaner dashboard (status, profile, earnings, tasks)

import React, { useEffect, useState } from "react";

// For demo: hardcoded cleanerId, replace with auth context in production
const CLEANER_ID = 1;

export default function CleanerDashboard() {
  const [cleaner, setCleaner] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCleanerAndTasks() {
      setLoading(true);
      try {
        // Fetch cleaner profile
        const res = await fetch(`http://localhost:8000/cleaner/${CLEANER_ID}/dashboard`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch cleaner dashboard");
        const data = await res.json();
        setCleaner(data);

        // Fetch bookings assigned to this cleaner (tasks)
        const bookingsRes = await fetch(`http://localhost:8000/cleaner/${CLEANER_ID}/bookings`, {
          credentials: "include",
        });
        if (bookingsRes.ok) {
          const bookings = await bookingsRes.json();
          setTasks(bookings);
        } else {
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!cleaner) return <div>No data found.</div>;

  return (
    <div className="dashboard-container glass-panel">
      <h2>Cleaner Dashboard</h2>
      <div className="mb-2">Status: <b>{cleaner.status}</b></div>
      <div className="mb-2">Current Earnings: <b>R{cleaner.current_earnings?.toFixed(2) ?? "0.00"}</b></div>
      <div className="mb-2">Blocked: <b>{cleaner.blocked ? "Yes" : "No"}</b></div>
      <div className="mb-2">GPS: <b>{cleaner.gps_lat}, {cleaner.gps_long}</b></div>
      {cleaner.profile_picture && (
        <img src={cleaner.profile_picture} alt="Profile" className="w-24 h-24 rounded-full border mt-2" />
      )}
      <div className="mt-4">
        <b>Tasks:</b>
        {tasks.length === 0 ? (
          <div className="text-zinc-700">No tasks assigned.</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {tasks.map((task: any) => (
              <li key={task.id} className="border rounded p-2 bg-zinc-50">
                <div><b>Booking #{task.id}</b> - {task.status}</div>
                <div>Start: {task.start_time}</div>
                <div>End: {task.end_time || "-"}</div>
                <div>Type: {task.booking_type}</div>
                <div>Client: {task.user_id}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
