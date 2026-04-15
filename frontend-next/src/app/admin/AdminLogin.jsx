"use client";
import { useState } from "react";
import PrimaryButton from "../components/PrimaryButton";

export default function AdminLogin({ onAuth }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    // TODO: Replace with real admin login endpoint
    if (form.username === "admin" && form.password === "adminpass") {
      onAuth({ username: form.username, token: "mock-admin-token" });
    } else {
      setError("Invalid admin credentials");
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: 400, margin: "60px auto", padding: 32 }}>
      <h2>Admin Login</h2>
      <form onSubmit={handleSubmit} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <input name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <PrimaryButton type="submit">Login</PrimaryButton>
      </form>
      {error && <div className="error-msg" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
