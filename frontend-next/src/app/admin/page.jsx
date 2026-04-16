import { useState } from "react";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";

export default function AdminPage() {
  const [session, setSession] = useState(null); // { username, token }

  if (!session) {
    return <AdminLogin onAuth={setSession} />;
  }

  return <AdminDashboard session={session} onSignOut={() => setSession(null)} />;
}
