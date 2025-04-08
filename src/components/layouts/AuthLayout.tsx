import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './AuthLayout.css';

const AuthLayout: React.FC = () => {
  const { user, loading } = useAuth();

  // If user is logged in, redirect to dashboard
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-content">
          <div className="auth-logo">
            <h1>Faux Orator</h1>
            <p className="auth-tagline">Your AI D&D Campaign Assistant</p>
          </div>
          <div className="auth-form-container">
            <Outlet />
          </div>
        </div>
        <div className="auth-footer">
          <p>&copy; {new Date().getFullYear()} Faux Orator. All rights reserved.</p>
        </div>
      </div>
      <div className="auth-background">
        <div className="auth-image"></div>
      </div>
    </div>
  );
};

export default AuthLayout; 