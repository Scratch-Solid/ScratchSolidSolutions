// CleanerDashboard.jsx
// Dashboard for cleaners: status, profile, tasks, and payroll

import React, { useEffect, useState } from "react";
import GlassCard from "./components/GlassCard";
import PrimaryButton from "./components/PrimaryButton";
import SecondaryButton from "./components/SecondaryButton";

export default function StaffDashboard({ staffId, token, onSignOut }) {
  const [staff, setStaff] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        // Fetch cleaner profile
        const res = await fetch(`/cleaner/${staffId}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch staff dashboard");
        const data = await res.json();
        setStaff(data);
        setStatus(data.status);
        // Fetch tasks/bookings
        const tasksRes = await fetch(`/cleaner/${staffId}/bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTasks(tasksRes.ok ? await tasksRes.json() : []);
        // Fetch payroll (assume /payroll/cleaner/{id} endpoint)
        const payrollRes = await fetch(`/payroll/cleaner/${staffId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPayroll(payrollRes.ok ? await payrollRes.json() : null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [cleanerId, token]);

  const handleStatusChange = async e => {
    e.preventDefault();
    setStatusMsg("");
    try {
      const res = await fetch(`/cleaner/${cleanerId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update status");
      setStatusMsg("Status updated");
    } catch (err) {
      setStatusMsg("Update failed");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!staff) return <div>No data found.</div>;

  return (
    <div className="dashboard-container glass-panel">
      <h2>Staff Dashboard</h2>
      <PrimaryButton onClick={onSignOut} style={{ float: "right", marginTop: -8 }}>Sign Out</PrimaryButton>
      <GlassCard>
        <div>Status: <b>{staff.status}</b></div>
        <form onSubmit={handleStatusChange} style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="idle">Idle</option>
            <option value="on_the_way">On the Way</option>
            <option value="arrived">Arrived</option>
            <option value="completed">Completed</option>
          </select>
          <PrimaryButton type="submit">Update Status</PrimaryButton>
          {statusMsg && <span style={{ marginLeft: 8, color: statusMsg.includes('updated') ? 'green' : 'red' }}>{statusMsg}</span>}
        </form>
        <div style={{ marginTop: 12 }}>Current Earnings: <b>R{staff.current_earnings?.toFixed(2) ?? "0.00"}</b></div>
        <div>Blocked: <b>{staff.blocked ? "Yes" : "No"}</b></div>
        <div>GPS: <b>{staff.gps_lat}, {staff.gps_long}</b></div>
        {staff.profile_picture && (
          <img src={staff.profile_picture} alt="Profile" style={{ width: 96, height: 96, borderRadius: 48, border: '1px solid #ccc', marginTop: 12 }} />
        )}
      </GlassCard>
      <GlassCard>
        <b>Tasks:</b>
        {tasks.length === 0 ? (
          <div style={{ color: '#555' }}>No tasks assigned.</div>
        ) : (
          <ul style={{ marginTop: 8 }}>
            {tasks.map((task) => (
              <li key={task.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, marginBottom: 6, background: '#fafbfc' }}>
                <div><b>Booking #{task.id}</b> - {task.status}</div>
                <div>Start: {task.start_time}</div>
                <div>End: {task.end_time || "-"}</div>
                <div>Type: {task.booking_type}</div>
                <div>Client: {task.user_id}</div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
      <GlassCard>
        <h3>Payroll</h3>
        {payroll ? (
          <div>
            <div>Cycle: <b>{payroll.cycle_start} - {payroll.cycle_end}</b></div>
            <div>Base Rate: <b>R{payroll.base_rate?.toFixed(2) ?? "0.00"}</b></div>
            <div>Weekend Rate: <b>R{payroll.weekend_rate?.toFixed(2) ?? "0.00"}</b></div>
            <div>Deductions: <b>R{payroll.deductions?.toFixed(2) ?? "0.00"}</b></div>
            <div>Total: <b>R{payroll.total?.toFixed(2) ?? "0.00"}</b></div>
          </div>
        ) : <div>No payroll data found.</div>}
      </GlassCard>
    </div>
  );
}
