"use client";

import { useState } from "react";
import Auth from "./Auth";
import Dashboard from "./Dashboard";

export default function HomePage() {
  const [session, setSession] = useState(null); // { user, token }

  const handleSignOut = () => setSession(null);

  if (!session) {
    return <Auth onAuth={setSession} />;
  }

  return <Dashboard user={session.user} token={session.token} onSignOut={handleSignOut} />;
}
