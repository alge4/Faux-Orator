import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AuthCallback from './components/AuthCallback';
import CreateCampaign from './components/CreateCampaign';
import CampaignDetail from './components/CampaignDetail';
import Home from './components/Home';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import AuthUtils from './utils/auth';
import './App.css';

// Logger component to track route changes
const RouteLogger = () => {
  const location = useLocation();
  
  useEffect(() => {
    console.log('App: Route changed to:', location.pathname);
    console.log('App: isAuthenticated (via token):', !!AuthUtils.getToken());
  }, [location]);
  
  return null;
};

// Temporary component to bypass authentication for development
// Replace ProtectedRoute with this component in development
const DevBypass = ({ children }: { children: React.ReactNode }) => {
  console.log('DevBypass: Bypassing authentication for development');
  return <>{children}</>;
};

// Choose which component to use based on environment
// In production, use ProtectedRoute
// In development, use DevBypass
const RouteGuard = process.env.NODE_ENV === 'production' 
  ? ProtectedRoute 
  : DevBypass;

function App() {
  console.log('App: Rendering App component');
  console.log('App: Using', process.env.NODE_ENV === 'production' ? 'ProtectedRoute' : 'DevBypass');
  
  useEffect(() => {
    // Check if we've been redirected from auth flow and have a token
    const token = AuthUtils.getToken();
    const currentPath = window.location.pathname;
    const sessionFlag = sessionStorage.getItem('isLoggedIn');
    
    console.log('App: Initial auth check on mount', {
      hasToken: !!token,
      currentPath,
      isLoggedIn: !!sessionFlag,
      time: new Date().toISOString()
    });
    
    // If we have a token but aren't on dashboard, redirect (except if at auth callback)
    if (token && sessionFlag === 'true' && 
        currentPath !== '/dashboard' && 
        !currentPath.includes('/auth/callback')) {
      console.log('App: Auth token found, redirecting to dashboard');
      window.location.replace('/dashboard');
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <WebSocketProvider>
          <div className="App">
            <RouteLogger />
            <Routes>
              {/* Public routes */}
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Home />} />
              
              {/* Protected routes */}
              <Route 
                path="/dashboard" 
                element={
                  <RouteGuard>
                    <Dashboard />
                  </RouteGuard>
                } 
              />
              <Route 
                path="/campaigns/new" 
                element={
                  <RouteGuard>
                    <CreateCampaign isOpen={true} onClose={() => {}} onSubmit={() => {}} />
                  </RouteGuard>
                } 
              />
              <Route 
                path="/campaigns/:id" 
                element={
                  <RouteGuard>
                    <CampaignDetail />
                  </RouteGuard>
                } 
              />
              
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </WebSocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
