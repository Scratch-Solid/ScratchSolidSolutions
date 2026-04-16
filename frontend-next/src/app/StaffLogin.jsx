// CleanerLogin.jsx
// Login form for cleaners

import React, { useState } from "react";
import PrimaryButton from "./components/PrimaryButton";
import SecondaryButton from "./components/SecondaryButton";

export default function CleanerLogin({ onAuth }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/cleaner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setError(data.detail || "Invalid cleaner credentials");
        return;
      }
      onAuth({ cleaner_id: data.cleaner_id, token: data.token });
    } catch (err) {
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: 400, margin: "60px auto", padding: 32 }}>
      <h2>Cleaner Login</h2>
      <form onSubmit={handleSubmit} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <PrimaryButton type="submit">Login</PrimaryButton>
      </form>
      {error && <div className="error-msg" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
