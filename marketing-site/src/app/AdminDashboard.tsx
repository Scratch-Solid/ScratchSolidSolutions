// AdminDashboard.tsx
// Next.js page for admin dashboard (user, booking, contract, payroll management)

import React, { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAdminData() {
      setLoading(true);
      try {
        const usersRes = await fetch("http://localhost:8000/admin/users", { credentials: "include" });
        const bookingsRes = await fetch("http://localhost:8000/admin/bookings", { credentials: "include" });
        if (!usersRes.ok || !bookingsRes.ok) throw new Error("Failed to fetch admin data");
        setUsers(await usersRes.json());
        setBookings(await bookingsRes.json());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, []);

  if (loading) return <div>Loading admin dashboard...</div>;
  if (error) return <div className="error-msg">{error}</div>;

  return (
    <div className="dashboard-container glass-panel">
      <h2>Admin Dashboard</h2>
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-2">Users</h3>
        <ul className="space-y-1">
          {users.map((u: any) => (
            <li key={u.id} className="border rounded p-2 bg-zinc-50">
              <b>{u.name}</b> ({u.role}) - {u.email}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-bold text-lg mb-2">Bookings</h3>
        <ul className="space-y-1">
          {bookings.map((b: any) => (
            <li key={b.id} className="border rounded p-2 bg-zinc-50">
              <b>Booking #{b.id}</b> - Status: {b.status} | User: {b.user_id} | Cleaner: {b.cleaner_id ?? "-"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
