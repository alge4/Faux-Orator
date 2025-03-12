import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './config/authConfig';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import AuthCallback from './components/AuthCallback';
import CreateCampaign from './components/CreateCampaign';
import CampaignDetail from './components/CampaignDetail';
import Home from './components/Home';
import './App.css';

// Initialize MSAL
const msalInstance = new PublicClientApplication(msalConfig);

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <Router>
        <div className="App">
          <Routes>
            {/* Routes accessible to both authenticated and unauthenticated users */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Authenticated routes */}
            <Route 
              path="/dashboard" 
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              } 
            />
            <Route 
              path="/campaigns/new" 
              element={
                <RequireAuth>
                  <CreateCampaign 
                    isOpen={true} 
                    onClose={() => {}} 
                    onSubmit={(name, description) => {
                      console.log('Creating campaign:', name, description);
                    }} 
                  />
                </RequireAuth>
              } 
            />
            <Route 
              path="/campaigns/:id" 
              element={
                <RequireAuth>
                  <CampaignDetail />
                </RequireAuth>
              } 
            />
            
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </MsalProvider>
  );
}

// Custom component to require authentication
function RequireAuth({ children }: { children: JSX.Element }) {
  return (
    <>
      <AuthenticatedTemplate>
        {children}
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <Navigate to="/" replace />
      </UnauthenticatedTemplate>
    </>
  );
}

export default App;
