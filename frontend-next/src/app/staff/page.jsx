// src/app/staff/page.jsx
// Entry point for staff dashboard (cleaners, drivers, web developers, etc.)

import React, { useState } from "react";
import StaffLogin from "../StaffLogin";
import StaffDashboard from "../StaffDashboard";

export default function StaffPage() {
  const [staffSession, setStaffSession] = useState(null); // { staff_id, token, role }
  const handleStaffSignOut = () => setStaffSession(null);

  return (
    <div>
      {!staffSession ? (
        <StaffLogin onAuth={setStaffSession} />
      ) : (
        <StaffDashboard staffId={staffSession.cleaner_id} token={staffSession.token} onSignOut={handleStaffSignOut} />
      )}
    </div>
  );
}
