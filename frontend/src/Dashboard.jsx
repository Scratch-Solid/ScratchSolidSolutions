
import React, { useState, useEffect } from 'react';
import './Dashboard.css';

function Dashboard({ user, onSignOut }) {
  const [currentBooking, setCurrentBooking] = useState(null);
  const [previousBookings, setPreviousBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [form, setForm] = useState({ date: '', timeslot: 'morning', special_instructions: '' });
  const [bookingMsg, setBookingMsg] = useState('');

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      setError('');
      try {
        const currRes = await fetch(`/bookings/current?user_id=${user.id}`);
        const currData = await currRes.json();
        setCurrentBooking(currData.current || null);
        const prevRes = await fetch(`/bookings/previous?user_id=${user.id}`);
        const prevData = await prevRes.json();
        setPreviousBookings(Array.isArray(prevData) ? prevData : prevData.bookings || []);
      } catch (err) {
        setError('Failed to load bookings.');
      }
      setLoading(false);
    }
    fetchBookings();
  }, [user.id]);

  const handleFormChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBook = async e => {
    e.preventDefault();
    setBookingMsg('');
    setError('');
    try {
      const res = await fetch('/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, user_id: user.id })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.alternatives) {
          setBookingMsg(`Date already booked. Alternatives: ${data.alternatives.join(', ')}`);
        } else {
          setError(data.detail || 'Booking failed.');
        }
      } else {
        setBookingMsg('Booking successful!');
        setShowBookingForm(false);
      }
    } catch (err) {
      setError('Booking failed.');
    }
  };

  return (
    <div className="dashboard-container glass-panel" style={{ padding: 28, margin: '32px auto', gap: 24 }}>
      <div className="dashboard-header">
        <div>
          <h1>Welcome, {user.first_name}!</h1>
          <p style={{ marginTop: 8, color: 'var(--text)' }}>Your next cleaning booking is just a few clicks away.</p>
        </div>
        <button className="secondary-button" onClick={onSignOut}>Sign Out</button>
      </div>
      {loading ? <p>Loading...</p> : (
        <>
          <section className="glass-card" style={{ marginBottom: 22 }}>
            <h2>Current Booking</h2>
            {currentBooking ? (
              <div className="booking-card">
                <p><strong>Date:</strong> {currentBooking.date}</p>
                <p><strong>Timeslot:</strong> {currentBooking.timeslot}</p>
                <p><strong>Status:</strong> {currentBooking.status}</p>
                {currentBooking.special_instructions && <p><strong>Notes:</strong> {currentBooking.special_instructions}</p>}
              </div>
            ) : <p>No current booking.</p>}
          </section>
          <section className="glass-card" style={{ marginBottom: 22 }}>
            <h2>Previous Bookings</h2>
            {previousBookings.length === 0 ? <p>No previous bookings.</p> : (
              <ul style={{ textAlign: 'left', paddingLeft: 20, marginTop: 18 }}>
                {previousBookings.map(b => (
                  <li key={b.id}>
                    {b.date} ({b.timeslot}) - {b.status}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="glass-card" style={{ marginBottom: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h2>Book a Cleaning</h2>
                <p style={{ marginTop: 8, color: 'var(--text)' }}>Select a date, timeslot, and instructions for your service.</p>
              </div>
              {!showBookingForm && (
                <button className="primary-button" onClick={() => setShowBookingForm(true)}>New Booking</button>
              )}
            </div>
            {showBookingForm && (
              <form onSubmit={handleBook} className="form-row" style={{ marginTop: 24 }}>
                <div className="form-row-inline">
                  <input type="date" name="date" value={form.date} onChange={handleFormChange} required />
                  <select name="timeslot" value={form.timeslot} onChange={handleFormChange} required>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                  </select>
                </div>
                <input name="special_instructions" placeholder="Special Instructions" value={form.special_instructions} onChange={handleFormChange} />
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <button type="submit" className="primary-button">Book</button>
                  <button type="button" className="secondary-button" onClick={() => setShowBookingForm(false)}>Cancel</button>
                </div>
              </form>
            )}
            {bookingMsg && <p className="success-msg">{bookingMsg}</p>}
          </section>
        </>
      )}
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

export default Dashboard;
