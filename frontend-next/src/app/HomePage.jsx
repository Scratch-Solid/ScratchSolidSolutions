"use client";


import { useState } from "react";
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import StaffLogin from "./StaffLogin";
import StaffDashboard from "./StaffDashboard";

export default function HomePage() {
  const [mode, setMode] = useState("user"); // "user" or "cleaner"
  const [session, setSession] = useState(null); // { user, token }
  const [staffSession, setStaffSession] = useState(null); // { staff_id, token, role }

  const handleSignOut = () => setSession(null);
  const handleStaffSignOut = () => setStaffSession(null);

  return (
    <div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", margin: 24 }}>
        <button onClick={() => setMode("user")}>User</button>
        <button onClick={() => setMode("staff")}>Staff</button>
      </div>
      {mode === "user" ? (
        !session ? <Auth onAuth={setSession} /> : <Dashboard user={session.user} token={session.token} onSignOut={handleSignOut} />
      ) : (
            !staffSession ? <StaffLogin onAuth={setStaffSession} /> : <StaffDashboard staffId={staffSession.cleaner_id} token={staffSession.token} onSignOut={handleStaffSignOut} />
      )}
    </div>
  );
}
