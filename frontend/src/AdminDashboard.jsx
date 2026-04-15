
import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:8000';

export default function AdminDashboard({ user, onSignOut }) {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [user.access_token]);

  async function fetchData() {
    setError('');
    try {
      const [usersRes, bookingsRes] = await Promise.all([
        fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${user.access_token}` } }),
        fetch(`${API_URL}/admin/bookings`, { headers: { Authorization: `Bearer ${user.access_token}` } })
      ]);
      const usersData = await usersRes.json();
      const bookingsData = await bookingsRes.json();
      if (!usersRes.ok) throw new Error(usersData.detail || 'Failed to fetch users');
      if (!bookingsRes.ok) throw new Error(bookingsData.detail || 'Failed to fetch bookings');
      setUsers(usersData);
      setBookings(bookingsData);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    }
  }

  async function updateBookingStatus(bookingId, newStatus) {
    setUpdating(bookingId);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to update booking');
      }
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update booking');
    }
    setUpdating(null);
  }

  return (
    <div className="dashboard-container glass-panel" style={{ padding: 28, margin: '32px auto', gap: 24 }}>
      <div className="dashboard-header">
        <div>
          <h1>Welcome, Admin {user.first_name}!</h1>
          <p style={{ marginTop: 8, color: 'var(--text)' }}>This is the admin dashboard.</p>
        </div>
        <button className="secondary-button" onClick={onSignOut}>Sign Out</button>
      </div>
      <section className="glass-card" style={{ marginBottom: 22 }}>
        <h2>All Users</h2>
        {error && <div className="error-msg">{error}</div>}
        <ul>
          {users.map(u => (
            <li key={u.id}>
              {u.first_name} {u.last_name} ({u.email}) {u.is_admin ? '[admin]' : ''}
            </li>
          ))}
        </ul>
      </section>
      <section className="glass-card" style={{ marginBottom: 22 }}>
        <h2>All Bookings</h2>
        {error && <div className="error-msg">{error}</div>}
        <ul>
          {bookings.map(b => (
            <li key={b.id}>
              User {b.user_id}: {b.date} ({b.timeslot}) - <b>{b.status}</b> {b.special_instructions && `| Notes: ${b.special_instructions}`}
              <select
                value={b.status}
                onChange={e => updateBookingStatus(b.id, e.target.value)}
                disabled={updating === b.id}
                style={{ marginLeft: 12 }}
              >
                <option value="pending">pending</option>
                <option value="confirmed">confirmed</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
              {updating === b.id && <span style={{ marginLeft: 8 }}>Updating...</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
