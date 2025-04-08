import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import './Auth.css';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if we have the recovery token from the URL
    const hash = window.location.hash;
    if (!hash || !hash.includes('type=recovery')) {
      setMessage({
        text: 'Invalid or expired password reset link.',
        type: 'error'
      });
    }
  }, []);
  
  const validateForm = () => {
    if (!password) {
      setMessage({ text: 'Please enter a new password', type: 'error' });
      return false;
    }
    
    if (password.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters', type: 'error' });
      return false;
    }
    
    if (password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        throw error;
      }
      
      setMessage({ 
        text: 'Password has been reset successfully. You will be redirected to login.', 
        type: 'success' 
      });
      
      // Redirect after a delay
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Your password has been reset. Please log in with your new password.' 
          } 
        });
      }, 3000);
    } catch (error) {
      console.error('Error resetting password:', error);
      setMessage({ 
        text: 'An error occurred while resetting your password. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="auth-form">
      <h2 className="auth-title">Set New Password</h2>
      
      {message && (
        <div className={`auth-${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password" className="form-label">New Password</label>
          <input
            type="password"
            id="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            disabled={isSubmitting}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            className="form-control"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            disabled={isSubmitting}
          />
        </div>
        
        <button
          type="submit"
          className="auth-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword; 