
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
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome, {user.first_name}!</h1>
        <button onClick={onSignOut}>Sign Out</button>
      </div>
      {loading ? <p>Loading...</p> : (
        <>
          <section>
            <h2>Current Booking</h2>
            {currentBooking ? (
              <div className="booking-card">
                <p>Date: {currentBooking.date}</p>
                <p>Timeslot: {currentBooking.timeslot}</p>
                <p>Status: {currentBooking.status}</p>
                {currentBooking.special_instructions && <p>Notes: {currentBooking.special_instructions}</p>}
              </div>
            ) : <p>No current booking.</p>}
          </section>
          <section>
            <h2>Previous Bookings</h2>
            {previousBookings.length === 0 ? <p>No previous bookings.</p> : (
              <ul>
                {previousBookings.map(b => (
                  <li key={b.id}>
                    {b.date} ({b.timeslot}) - {b.status}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2>Book a Cleaning</h2>
            {showBookingForm ? (
              <form onSubmit={handleBook} className="booking-form">
                <input type="date" name="date" value={form.date} onChange={handleFormChange} required />
                <select name="timeslot" value={form.timeslot} onChange={handleFormChange} required>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                </select>
                <input name="special_instructions" placeholder="Special Instructions" value={form.special_instructions} onChange={handleFormChange} />
                <button type="submit">Book</button>
                <button type="button" onClick={() => setShowBookingForm(false)}>Cancel</button>
              </form>
            ) : (
              <button onClick={() => setShowBookingForm(true)}>New Booking</button>
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
