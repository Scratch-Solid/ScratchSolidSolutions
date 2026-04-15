"use client";
import { useState } from "react";
import AdminLogin from "./AdminLogin";
import GlassCard from "../components/GlassCard";
import PrimaryButton from "../components/PrimaryButton";

export default function AdminPage() {
  const [session, setSession] = useState(null); // { username, token }

  if (!session) {
    return <AdminLogin onAuth={setSession} />;
  }

  // Placeholder admin dashboard content
  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <GlassCard>
        <h2>Admin Dashboard</h2>
        <p>Welcome, {session.username}!</p>
        <PrimaryButton onClick={() => setSession(null)} style={{ marginTop: 16 }}>Sign Out</PrimaryButton>
      </GlassCard>
      <GlassCard>
        <h3>Users</h3>
        <p>Coming soon: List and manage users.</p>
      </GlassCard>
      <GlassCard>
        <h3>Bookings</h3>
        <p>Coming soon: View and manage bookings.</p>
      </GlassCard>
      <GlassCard>
        <h3>Analytics</h3>
        <p>Coming soon: Booking and revenue analytics.</p>
      </GlassCard>
    </div>
  );
}
