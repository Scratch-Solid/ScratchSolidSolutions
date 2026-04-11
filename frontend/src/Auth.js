 import React, { useState } from 'react';

const API_URL = '';

export default function Auth({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    address: '',
    cellphone: '',
    whatsapp: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password.length > 72) {
      setError("Password cannot be longer than 72 characters.");
      return;
    }
    try {
      const endpoint = isLogin ? '/login' : '/signup';
      const body = isLogin
        ? { first_name: form.first_name, password: form.password }
        : form;
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('Server error: Received invalid response. Please contact support if this persists.');
      }
      if (!res.ok) {
        let msg = typeof data === 'object' && (data.detail || data.message)
          ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail))
          : res.statusText || 'Unknown error';
        throw new Error(msg);
      }
      onAuth(data);
    } catch (err) {
      setError(err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)));
    }
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
      <form onSubmit={handleSubmit}>
        <input name="first_name" placeholder="First Name" value={form.first_name} onChange={handleChange} required />
        {!isLogin && <input name="last_name" placeholder="Last Name" value={form.last_name} onChange={handleChange} required />}
        {!isLogin && <input name="address" placeholder="Address" value={form.address} onChange={handleChange} required />}
        {!isLogin && <input name="cellphone" placeholder="Cellphone" value={form.cellphone} onChange={handleChange} required />}
        {!isLogin && <input name="whatsapp" placeholder="WhatsApp" value={form.whatsapp} onChange={handleChange} required />}
        {!isLogin && <input name="email" placeholder="Email (optional)" value={form.email} onChange={handleChange} />}
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required maxLength={72} />
        <button type="submit">{isLogin ? 'Login' : 'Sign Up'}</button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
