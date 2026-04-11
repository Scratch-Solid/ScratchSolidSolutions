import { useState } from 'react';
import Auth from './Auth.jsx';
import Dashboard from './Dashboard.jsx';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  const handleSignOut = () => setUser(null);

  if (!user) {
    return <Auth onAuth={setUser} />;
  }

  return <Dashboard user={user} onSignOut={handleSignOut} />;
}

export default App;
