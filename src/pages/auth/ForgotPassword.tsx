import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import './Auth.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ text: 'Please enter your email address', type: 'error' });
      return;
    }
    
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        throw error;
      }
      
      setMessage({ 
        text: 'Password reset instructions have been sent to your email', 
        type: 'success' 
      });
      setEmail('');
    } catch (error) {
      console.error('Error sending reset email:', error);
      setMessage({ 
        text: 'An error occurred. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="auth-form">
      <h2 className="auth-title">Reset Password</h2>
      
      {message && (
        <div className={`auth-${message.type}`}>
          {message.text}
        </div>
      )}
      
      <p className="auth-description">
        Enter your email address and we'll send you instructions to reset your password.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email" className="form-label">Email</label>
          <input
            type="email"
            id="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            disabled={isSubmitting}
          />
        </div>
        
        <button
          type="submit"
          className="auth-submit"
          disabled={isSubmitting || !email}
        >
          {isSubmitting ? 'Sending...' : 'Send Reset Instructions'}
        </button>
      </form>
      
      <div className="auth-alt-action">
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  );
};

export default ForgotPassword; 