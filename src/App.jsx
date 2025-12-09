import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import CaptainSignIn from './pages/captain/CaptainSignIn';
import CaptainSignUp from './pages/captain/CaptainSignUp';
import CaptainDashboard from './pages/captain/CaptainDashboard';
import { Toaster } from './components/ui/use-toast.jsx';
import { getAuthKey } from './utils/auth';
import './App.css';

function App() {
  const [authKey, setAuthKey] = useState(getAuthKey());

  useEffect(() => {
    // Listen for storage changes to update auth key
    const handleStorageChange = () => {
      setAuthKey(getAuthKey());
    };

    // Listen for custom token change events
    const handleTokenChange = () => {
      setAuthKey(getAuthKey());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokenChange', handleTokenChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenChange', handleTokenChange);
    };
  }, []);

  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/user/signin" element={<SignIn />} />
        <Route path="/user/signup" element={<SignUp />} />
        <Route path="/user/dashboard" element={<Dashboard key={authKey} />} />
        <Route path="/captain/signin" element={<CaptainSignIn />} />
        <Route path="/captain/signup" element={<CaptainSignUp />} />
        <Route path="/captain/dashboard" element={<CaptainDashboard key={authKey} />} />
        <Route path="/" element={<Navigate to="/user/signin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
