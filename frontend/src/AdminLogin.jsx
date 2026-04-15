import React, { useState } from 'react';

const API_URL = 'http://localhost:8000';

export default function AdminLogin({ onAuth }) {
  const [form, setForm] = useState({
    first_name: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = typeof data === 'object' && (data.detail || data.message) ? (data.detail || data.message) : res.statusText || 'Unknown error';
        throw new Error(msg);
      }
      if (!data.user?.is_admin) {
        throw new Error('Not an admin account.');
      }
      onAuth(data);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="auth-container glass-panel" style={{ padding: 28, maxWidth: 520, margin: '40px auto' }}>
      <h2>Admin Login</h2>
      <form onSubmit={handleSubmit} className="form-row" style={{ marginTop: 24 }}>
        <input name="first_name" placeholder="Admin First Name" value={form.first_name} onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <button type="submit" className="primary-button">Login as Admin</button>
      </form>
      {error && <div className="error-msg">{error}</div>}
    </div>
  );
}
