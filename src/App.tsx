import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import ConnectionStatus from './components/common/ConnectionStatus';
import './App.css';

// Lazy loaded components
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Campaign = lazy(() => import('./pages/Campaign'));
const CampaignView = lazy(() => import('./pages/CampaignView'));
const NotFound = lazy(() => import('./pages/NotFound'));
const VoiceChatTest = lazy(() => import('./pages/VoiceChatTest'));

// App Routes Component
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/campaign/:id" element={<ProtectedRoute><Campaign /></ProtectedRoute>} />
      <Route path="/campaign/:id/view" element={<ProtectedRoute><CampaignView /></ProtectedRoute>} />
      <Route path="/campaign/:id/details" element={<ProtectedRoute><Campaign /></ProtectedRoute>} />
      <Route path="/voice-chat-test" element={<ProtectedRoute><VoiceChatTest /></ProtectedRoute>} />
      
      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="loading">Loading...</div>}>
          <AppRoutes />
          <ConnectionStatus />
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
