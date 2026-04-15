
import { useState } from 'react';
import Auth from './Auth.jsx';
import Dashboard from './Dashboard.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AdminLogin from './AdminLogin.jsx';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [adminMode, setAdminMode] = useState(false);

  const handleSignOut = () => setUser(null);

  if (!user) {
    return (
      <div>
        {adminMode ? (
          <>
            <AdminLogin onAuth={setUser} />
            <button className="secondary-button" style={{ margin: 16 }} onClick={() => setAdminMode(false)}>
              User Login
            </button>
          </>
        ) : (
          <>
            <Auth onAuth={setUser} />
            <button className="secondary-button" style={{ margin: 16 }} onClick={() => setAdminMode(true)}>
              Admin Login
            </button>
          </>
        )}
      </div>
    );
  }

  if (user.is_admin) {
    return <AdminDashboard user={user} onSignOut={handleSignOut} />;
  }
  return <Dashboard user={user} onSignOut={handleSignOut} />;
}

export default App;
