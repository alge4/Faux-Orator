import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';

interface LocationState {
  from?: {
    pathname: string;
  };
  message?: string;
}

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  
  const { signIn, error, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the url to redirect to after login
  const locationState = location.state as LocationState;
  const from = locationState?.from?.pathname || '/';
  
  useEffect(() => {
    // Set login message based on location state
    if (locationState?.from) {
      setLoginMessage('Please sign in to access this page.');
    } else if (locationState?.message) {
      setLoginMessage(locationState.message);
    }
    
    // If user is already logged in, redirect
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from, locationState]);

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      await signIn(email, password);
      
      // Check if auth was successful
      if (!error) {
        console.log('Login successful, redirecting to:', from);
        navigate(from, { replace: true });
      } else {
        console.error('Login failed:', error);
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-form">
      <h2 className="auth-title">Sign In</h2>
      
      {loginMessage && (
        <div className="auth-message">
          {loginMessage}
        </div>
      )}
      
      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email" className="form-label">Email</label>
          <input
            type="email"
            id="email"
            className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={isSubmitting}
          />
          {formErrors.email && <div className="form-error">{formErrors.email}</div>}
        </div>
        
        <div className="form-group">
          <div className="password-label-row">
            <label htmlFor="password" className="form-label">Password</label>
            <Link to="/forgot-password" className="forgot-password">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            id="password"
            className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={isSubmitting}
          />
          {formErrors.password && <div className="form-error">{formErrors.password}</div>}
        </div>
        
        <button
          type="submit"
          className="btn btn-primary btn-block auth-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      
      <div className="auth-alt-action">
        Don't have an account?{' '}
        <Link to="/register">Create one</Link>
      </div>
    </div>
  );
};

export default Login; 